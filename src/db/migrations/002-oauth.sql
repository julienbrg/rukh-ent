-- MCP clients from dynamic client registration (RFC 7591)
CREATE TABLE oauth_clients (
  client_id TEXT PRIMARY KEY,
  -- Full registration response, as JSON
  metadata TEXT NOT NULL CHECK (json_valid(metadata)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ'))
) STRICT;

-- Single-use authorization codes, stored as SHA-256 hashes
CREATE TABLE oauth_codes (
  code_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES oauth_clients (client_id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  resource TEXT NOT NULL,
  -- ENT user the code was approved for, as JSON
  user TEXT NOT NULL CHECK (json_valid(user)),
  -- Unix seconds
  expires_at INTEGER NOT NULL
) STRICT;
