-- Read-efficiency: per-participant score aggregates, a versioned leaderboard cache and
-- indexes that match the real query patterns. Aggregates are always RECOMPUTED from the
-- attempts table (never incremented), so they cannot drift from the source of truth.
ALTER TABLE participants ADD COLUMN score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE participants ADD COLUMN solved INTEGER NOT NULL DEFAULT 0;
ALTER TABLE participants ADD COLUMN attempted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE participants ADD COLUMN last_solve_at TEXT;

UPDATE participants SET
  score = (SELECT COALESCE(SUM(points_awarded),0) FROM attempts a WHERE a.participant_id = participants.id),
  solved = (SELECT COALESCE(SUM(passed),0) FROM attempts a WHERE a.participant_id = participants.id),
  attempted = (SELECT COUNT(*) FROM attempts a WHERE a.participant_id = participants.id),
  last_solve_at = (SELECT MAX(submitted_at) FROM attempts a WHERE a.participant_id = participants.id AND a.passed = 1);

-- Leaderboard order: score, passed, time current score was reached, registration time.
CREATE INDEX IF NOT EXISTS idx_participants_board
  ON participants (is_hidden, score DESC, solved DESC, last_solve_at ASC, created_at ASC, id ASC);
-- Latest captures: newest passed submissions first.
CREATE INDEX IF NOT EXISTS idx_attempts_passed_time ON attempts (passed, submitted_at);
-- Per-case progress: covering index for GROUP BY challenge_id.
CREATE INDEX IF NOT EXISTS idx_attempts_challenge ON attempts (challenge_id, passed, participant_id);

-- Versioned cache: data_version bumps on every change that can affect the public board.
ALTER TABLE event_state ADD COLUMN data_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE event_state ADD COLUMN board_cache TEXT;
ALTER TABLE event_state ADD COLUMN board_cache_version INTEGER NOT NULL DEFAULT -1;
ALTER TABLE event_state ADD COLUMN board_cache_at TEXT;
