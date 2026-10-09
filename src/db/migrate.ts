import type { Database } from 'better-sqlite3';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

const MIGRATION_FILE = /^(\d+)-[\w-]+\.sql$/;

/**
 * Reads `NNN-name.sql` files from `dir`, sorted by number. Numbers must
 * run 1, 2, 3… with no gap, since the version is stored as a single
 * integer in `PRAGMA user_version`.
 */
export function loadMigrations(dir: string): Migration[] {
  const migrations = readdirSync(dir)
    .flatMap((name) => {
      const match = MIGRATION_FILE.exec(name);
      return match
        ? [
            {
              version: Number(match[1]),
              name,
              sql: readFileSync(join(dir, name), 'utf8'),
            },
          ]
        : [];
    })
    .sort((a, b) => a.version - b.version);

  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new Error(
        `Migration ${migration.name} should be numbered ${index + 1}`,
      );
    }
  });
  return migrations;
}

/**
 * Applies the migrations newer than `PRAGMA user_version` in one
 * transaction: either all of them land, or the database is left as it
 * was and the error is thrown. Returns the number applied.
 */
export function migrate(db: Database, migrations: Migration[]): number {
  const current = db.pragma('user_version', { simple: true }) as number;
  if (current > migrations.length) {
    throw new Error(
      `Database is at version ${current}, newer than the ${migrations.length} known migrations`,
    );
  }

  const pending = migrations.slice(current);
  if (pending.length === 0) {
    return 0;
  }
  db.transaction(() => {
    for (const migration of pending) {
      try {
        db.exec(migration.sql);
      } catch (error) {
        throw new Error(`Migration ${migration.name} failed`, {
          cause: error,
        });
      }
    }
    db.pragma(`user_version = ${migrations.length}`);
  })();
  return pending.length;
}
