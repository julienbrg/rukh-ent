import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadMigrations, migrate } from './migrate';

/** Injection token for the shared `better-sqlite3` connection. */
export const DATABASE = Symbol('DATABASE');

const MIGRATIONS_DIR = join(__dirname, 'migrations');

/**
 * Opens `path` (or `:memory:`) in WAL mode with foreign keys on, and
 * applies pending migrations. Throws, with the connection closed, if a
 * migration fails.
 */
export function openDatabase(
  path: string,
  migrationsDir = MIGRATIONS_DIR,
): Database.Database {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db, loadMigrations(migrationsDir));
  } catch (error) {
    db.close();
    throw error;
  }
  return db;
}

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        openDatabase(config.getOrThrow<string>('DB_PATH')),
    },
  ],
  exports: [DATABASE],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE) private readonly db: Database.Database) {}

  onApplicationShutdown(): void {
    this.db.close();
  }
}
