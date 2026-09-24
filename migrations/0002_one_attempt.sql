-- V2: one final submission per participant per case.
-- Replaces the V1 retry model (submissions + solves). V1 tables are dropped; the event
-- is reset before this migration is applied, so no data is lost.
CREATE TABLE IF NOT EXISTS attempts (
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  challenge_id   TEXT NOT NULL,
  answers_json   TEXT NOT NULL,
  passed         INTEGER NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  submitted_at   TEXT NOT NULL,
  PRIMARY KEY (participant_id, challenge_id)
);
CREATE INDEX IF NOT EXISTS idx_attempts_time ON attempts(submitted_at);
DROP TABLE IF EXISTS solves;
DROP TABLE IF EXISTS submissions;
