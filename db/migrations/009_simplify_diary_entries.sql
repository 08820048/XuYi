PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS diary_entries_new (
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

INSERT OR IGNORE INTO diary_entries_new (
  id, slug, title, content, html, description, status, is_hidden,
  cover_image, deleted_at, published_at, updated_at, view_count
)
SELECT
  id,
  slug,
  NULLIF(title, ''),
  content,
  html,
  description,
  status,
  is_hidden,
  cover_image,
  deleted_at,
  published_at,
  updated_at,
  view_count
FROM diary_entries;

DROP TABLE IF EXISTS diary_entries;
ALTER TABLE diary_entries_new RENAME TO diary_entries;

CREATE INDEX IF NOT EXISTS idx_diary_entries_slug ON diary_entries(slug);
CREATE INDEX IF NOT EXISTS idx_diary_entries_published ON diary_entries(published_at DESC);

DELETE FROM site_settings
WHERE key IN (
  'diary_email_enabled',
  'diary_inbound_address',
  'diary_allowed_sender',
  'diary_inbound_secret'
);

PRAGMA foreign_keys = ON;
