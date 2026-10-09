import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import { openDatabase } from '../../db/db.module';
import { ClientsStore } from './clients.store';

const client: OAuthClientInformationFull = {
  client_id: 'c1',
  client_id_issued_at: 1,
  client_name: 'Claude',
  redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
  token_endpoint_auth_method: 'none',
};

describe('ClientsStore', () => {
  it('returns a registered client', () => {
    const store = new ClientsStore(openDatabase(':memory:'));
    expect(store.registerClient(client)).toEqual(client);
    expect(store.getClient('c1')).toEqual(client);
  });

  it('returns undefined for an unknown client', () => {
    const store = new ClientsStore(openDatabase(':memory:'));
    expect(store.getClient('nope')).toBeUndefined();
  });
});
