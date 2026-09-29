-- Additive, global counters only. No recording, transcript, token or score.
CREATE TABLE IF NOT EXISTS reading_cloud_usage (
  bucket TEXT PRIMARY KEY,
  used INTEGER NOT NULL CHECK(used >= 0)
);
