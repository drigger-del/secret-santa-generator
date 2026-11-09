CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exclusions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_a_id INTEGER NOT NULL,
  participant_b_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_a_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_b_id) REFERENCES participants(id) ON DELETE CASCADE,
  UNIQUE(participant_a_id, participant_b_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS draws (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  draw_id INTEGER NOT NULL,
  giver_id INTEGER NOT NULL,
  recipient_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (draw_id) REFERENCES draws(id) ON DELETE CASCADE,
  FOREIGN KEY (giver_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES participants(id) ON DELETE CASCADE,
  UNIQUE(giver_id),
  UNIQUE(recipient_id)
);

CREATE TABLE IF NOT EXISTS access_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL,
  draw_id INTEGER NOT NULL,
  code_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (draw_id) REFERENCES draws(id) ON DELETE CASCADE,
  UNIQUE(participant_id, draw_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_draw ON assignments(draw_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_draw ON access_codes(draw_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_participant ON access_codes(participant_id);
