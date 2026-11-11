CREATE TABLE communities (
 code TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('link_only','contacted','pilot','adopted','paused')),
 adopted_at TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO communities(code,name,status) VALUES
 ('colosseum','Colosseum link','link_only'),('note','note link','link_only'),('community-test','Community test','link_only');
CREATE TABLE learning_feedback (
 id TEXT PRIMARY KEY,
 mode TEXT NOT NULL CHECK(mode IN ('demo','devnet')),
 ref TEXT NOT NULL,
 reason TEXT NOT NULL,
 step TEXT NOT NULL,
 locale TEXT NOT NULL,
 submitted_day TEXT NOT NULL DEFAULT (date('now'))
);
CREATE INDEX feedback_period ON learning_feedback(submitted_day,ref,mode);
