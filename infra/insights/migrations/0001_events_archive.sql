-- Permanent archive of Workers Analytics Engine rows.
--
-- Analytics Engine keeps raw rows for three months. The Insights Worker copies
-- every row of each UTC day into `events` (see src/archive.ts), oldest day
-- first, so nothing is lost when Analytics Engine expires it.
--
-- `events` holds one row per Analytics Engine row with every original column
-- unchanged: `timestamp` exactly as the SQL API returns it (UTC,
-- 'YYYY-MM-DD hh:mm:ss'), `_sample_interval` (one stored row stands for that
-- many events), `index1`, `blob1`..`blob20` and `double1`..`double20`, plus the
-- source `dataset`.
--
-- `occurrence` keeps true duplicates: Analytics Engine can hold several
-- identical rows in the same second (for example a client retry). Within one
-- UTC day, the first row with a given content is occurrence 0, the next
-- identical one 1, and so on. Identical rows are indistinguishable, so this
-- numbering is the same on every re-export.
--
-- `row_hash` is the SHA-256 (hex) of the JSON array
-- [dataset, timestamp, _sample_interval, index1, blob1..blob20,
--  double1..double20, occurrence]; its UNIQUE index makes re-exports
-- idempotent through INSERT OR IGNORE.
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  dataset TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  _sample_interval INTEGER NOT NULL,
  index1 TEXT NOT NULL,
  blob1 TEXT NOT NULL,
  blob2 TEXT NOT NULL,
  blob3 TEXT NOT NULL,
  blob4 TEXT NOT NULL,
  blob5 TEXT NOT NULL,
  blob6 TEXT NOT NULL,
  blob7 TEXT NOT NULL,
  blob8 TEXT NOT NULL,
  blob9 TEXT NOT NULL,
  blob10 TEXT NOT NULL,
  blob11 TEXT NOT NULL,
  blob12 TEXT NOT NULL,
  blob13 TEXT NOT NULL,
  blob14 TEXT NOT NULL,
  blob15 TEXT NOT NULL,
  blob16 TEXT NOT NULL,
  blob17 TEXT NOT NULL,
  blob18 TEXT NOT NULL,
  blob19 TEXT NOT NULL,
  blob20 TEXT NOT NULL,
  double1 REAL,
  double2 REAL,
  double3 REAL,
  double4 REAL,
  double5 REAL,
  double6 REAL,
  double7 REAL,
  double8 REAL,
  double9 REAL,
  double10 REAL,
  double11 REAL,
  double12 REAL,
  double13 REAL,
  double14 REAL,
  double15 REAL,
  double16 REAL,
  double17 REAL,
  double18 REAL,
  double19 REAL,
  double20 REAL,
  occurrence INTEGER NOT NULL,
  row_hash TEXT NOT NULL
);

CREATE UNIQUE INDEX events_row_hash ON events (row_hash);
CREATE INDEX events_timestamp ON events (timestamp);

-- One row per dataset and UTC day that has been exported.
-- `rows`: rows of that day now in `events`.
-- `expected_rows`: row count Analytics Engine reported for the day at the last
-- export. `complete` becomes 1 only once the day is fully past (the day before
-- yesterday or older) and the archive holds at least the expected rows;
-- `attempts` counts exports, so a day whose counts never agree is accepted
-- after a few tries instead of blocking the oldest-first backfill.
CREATE TABLE archive_days (
  dataset TEXT NOT NULL,
  day TEXT NOT NULL,
  rows INTEGER NOT NULL,
  expected_rows INTEGER NOT NULL,
  exported_at TEXT NOT NULL,
  complete INTEGER NOT NULL DEFAULT 0 CHECK (complete IN (0, 1)),
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dataset, day)
);
