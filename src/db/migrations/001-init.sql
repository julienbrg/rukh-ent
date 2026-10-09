-- Assistant metadata. Documents stay as Markdown under data/contexts/<name>/.
CREATE TABLE assistants (
  name TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  uai TEXT NOT NULL,
  -- JSON array of class names; empty means the whole school
  classes TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(classes)),
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  model TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ'))
) STRICT;

CREATE INDEX assistants_uai ON assistants (uai);
CREATE INDEX assistants_owner_id ON assistants (owner_id);

-- Server-owned Rukh sessionId per user and assistant
CREATE TABLE conversations (
  user_id TEXT NOT NULL,
  assistant TEXT NOT NULL REFERENCES assistants (name) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
  PRIMARY KEY (user_id, assistant)
) STRICT;

CREATE INDEX conversations_assistant ON conversations (assistant);
