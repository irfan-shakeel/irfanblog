-- NMT SOC Decision Challenge schema (Cloudflare D1)
CREATE TABLE IF NOT EXISTS participants (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name         TEXT NOT NULL,
  email             TEXT NOT NULL,
  email_normalized  TEXT NOT NULL UNIQUE,
  handle            TEXT NOT NULL,
  handle_normalized TEXT NOT NULL UNIQUE,
  session_hash      TEXT,
  is_hidden         INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  last_activity_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_hash);

CREATE TABLE IF NOT EXISTS submissions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  challenge_id   TEXT NOT NULL,
  answers_json   TEXT NOT NULL,
  is_correct     INTEGER NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_submissions_participant ON submissions(participant_id, created_at);

CREATE TABLE IF NOT EXISTS solves (
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  challenge_id   TEXT NOT NULL,
  points         INTEGER NOT NULL,
  solved_at      TEXT NOT NULL,
  PRIMARY KEY (participant_id, challenge_id)
);
CREATE INDEX IF NOT EXISTS idx_solves_time ON solves(solved_at);

CREATE TABLE IF NOT EXISTS event_state (
  id                 INTEGER PRIMARY KEY CHECK (id = 1),
  is_open            INTEGER NOT NULL DEFAULT 0,
  leaderboard_frozen INTEGER NOT NULL DEFAULT 0,
  show_final_results INTEGER NOT NULL DEFAULT 0,
  duration_minutes   INTEGER NOT NULL DEFAULT 20,
  started_at         TEXT,
  ends_at            TEXT,
  frozen_snapshot    TEXT,
  updated_at         TEXT NOT NULL
);
INSERT OR IGNORE INTO event_state (id, updated_at) VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
