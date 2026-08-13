CREATE TABLE IF NOT EXISTS diary_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  html TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'published' CHECK(status IN ('draft', 'published', 'deleted')),
  is_hidden INTEGER DEFAULT 0,
  cover_image TEXT,
  deleted_at INTEGER,
  published_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  view_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_diary_entries_slug ON diary_entries(slug);
CREATE INDEX IF NOT EXISTS idx_diary_entries_published ON diary_entries(published_at DESC);

INSERT OR IGNORE INTO site_settings (key, value) VALUES
  ('diary_nav_enabled', 'false');
