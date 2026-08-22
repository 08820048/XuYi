export type Database = D1Database

// 获取数据库实例（从 Cloudflare Workers 环境）
export function getDB(env: CloudflareEnv) {
  return env.DB
}

// 自动迁移：确保所有表和列存在
// 注意：在 Cloudflare Workers 无状态环境中，进程级标志无效
// 最佳实践：通过 wrangler d1 migrations 管理 schema
// 使用全局标志避免重复执行
let schemaInitialized = false

export async function ensureSchema(db: Database) {
  if (schemaInitialized) return

  try {
    // 安全地添加新列（ALTER TABLE ADD COLUMN 在列已存在时会报错，所以需要 try/catch）
    const columnMigrations = [
      "ALTER TABLE posts ADD COLUMN password TEXT",
      "ALTER TABLE posts ADD COLUMN is_pinned INTEGER DEFAULT 0",
      "ALTER TABLE posts ADD COLUMN is_hidden INTEGER DEFAULT 0",
      "ALTER TABLE posts ADD COLUMN deleted_at INTEGER",
      "ALTER TABLE posts ADD COLUMN cover_image TEXT",
      "ALTER TABLE posts ADD COLUMN post_type TEXT NOT NULL DEFAULT 'original' CHECK(post_type IN ('original', 'repost', 'translation'))",
      "ALTER TABLE posts ADD COLUMN source_url TEXT",
      "ALTER TABLE posts ADD COLUMN previous_content TEXT",
      "ALTER TABLE posts ADD COLUMN previous_html TEXT",
      "ALTER TABLE posts ADD COLUMN content_updated_at INTEGER",
    ]
    for (const sql of columnMigrations) {
      try {
        await db.prepare(sql).run()
      } catch {
        // column already exists
      }
    }

    try {
      await db.prepare(`
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
        )
      `).run()
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_diary_entries_slug ON diary_entries(slug)').run()
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_diary_entries_published ON diary_entries(published_at DESC)').run()
      await normalizeDiaryEntriesSchema(db)
    } catch {
      // table already exists or current DB runtime does not allow this migration
    }

    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS friend_links (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          avatar_url TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          is_visible INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )
      `).run()
      await db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_friend_links_visible_order ON friend_links(is_visible, sort_order, id)'
      ).run()
    } catch {
      // table already exists or current DB runtime does not allow this migration
    }

    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS subscribers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'subscribed', 'unsubscribed')),
          token TEXT UNIQUE NOT NULL,
          subscribed_at INTEGER,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )
      `).run()
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status)').run()
    } catch {
      // table already exists or current DB runtime does not allow this migration
    }

    schemaInitialized = true
  } catch (error: unknown) {
    console.error('Schema migration failed:', error)
  }
}

async function normalizeDiaryEntriesSchema(db: Database) {
  const info = await db.prepare('PRAGMA table_info(diary_entries)').all<{
    name: string
    notnull: number
  }>()
  const columns = info.results || []
  if (columns.length === 0) return

  const titleColumn = columns.find((column) => column.name === 'title')
  const hasLegacyEmailColumns = columns.some((column) => column.name === 'source' || column.name === 'source_email')
  const titleIsRequired = titleColumn?.notnull === 1
  if (!titleIsRequired && !hasLegacyEmailColumns) return

  await db.prepare('DROP TABLE IF EXISTS diary_entries_new').run()
  await db.prepare(`
    CREATE TABLE diary_entries_new (
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
    )
  `).run()
  await db.prepare(`
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
    FROM diary_entries
  `).run()
  await db.prepare('DROP TABLE diary_entries').run()
  await db.prepare('ALTER TABLE diary_entries_new RENAME TO diary_entries').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_diary_entries_slug ON diary_entries(slug)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_diary_entries_published ON diary_entries(published_at DESC)').run()
  await db.prepare(`
    DELETE FROM site_settings
    WHERE key IN (
      'diary_email_enabled',
      'diary_inbound_address',
      'diary_allowed_sender',
      'diary_inbound_secret'
    )
  `).run()
}
