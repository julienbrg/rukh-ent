import { Inject, Injectable } from '@nestjs/common';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import Database from 'better-sqlite3';
import { DATABASE } from '../../db/db.module';

/**
 * Clients from dynamic client registration. The SDK generates the id and
 * secret and validates the metadata; this only persists it.
 */
@Injectable()
export class ClientsStore implements OAuthRegisteredClientsStore {
  constructor(@Inject(DATABASE) private readonly db: Database.Database) {}

  getClient(clientId: string): OAuthClientInformationFull | undefined {
    const row = this.db
      .prepare('SELECT metadata FROM oauth_clients WHERE client_id = ?')
      .get(clientId) as { metadata: string } | undefined;
    return row ? JSON.parse(row.metadata) : undefined;
  }

  registerClient(
    client: OAuthClientInformationFull,
  ): OAuthClientInformationFull {
    this.db
      .prepare('INSERT INTO oauth_clients (client_id, metadata) VALUES (?, ?)')
      .run(client.client_id, JSON.stringify(client));
    return client;
  }
}
