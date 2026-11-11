CREATE TABLE analytics_journeys (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK(mode IN ('demo','devnet')),
  ref TEXT NOT NULL,
  mask INTEGER NOT NULL CHECK(mask BETWEEN 1 AND 4095),
  started_day TEXT NOT NULL
);
CREATE INDEX analytics_cohort ON analytics_journeys(started_day, mode, ref);
