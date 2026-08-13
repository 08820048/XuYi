import { ensureSchema, type Database } from '@/lib/repositories/schema'
import type { CountRow, DiaryEntry } from '@/lib/repositories/types'

export type DiaryStatus = DiaryEntry['status']

export async function getDiaryEntries(
  db: Database,
  limit = 50,
  offset = 0,
  includeDrafts = false,
  includeHidden = false,
  includeDeleted = false,
): Promise<DiaryEntry[]> {
  await ensureSchema(db)

  const conditions: string[] = []
  if (!includeDrafts) {
    conditions.push("status = 'published'")
  }
  if (!includeHidden) {
    conditions.push('is_hidden = 0')
  }
  if (!includeDeleted) {
    conditions.push('deleted_at IS NULL')
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const { results } = await db
    .prepare(
      `SELECT id, slug, title, content, html, description, status, is_hidden, cover_image, deleted_at, published_at, updated_at, view_count
       FROM diary_entries
       ${where}
       ORDER BY published_at DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(limit, offset)
    .all<DiaryEntry>()

  return results
}

export async function getDiaryEntriesCount(
  db: Database,
  includeDrafts = false,
  includeHidden = false,
  includeDeleted = false,
): Promise<number> {
  await ensureSchema(db)

  const conditions: string[] = []
  if (!includeDrafts) {
    conditions.push("status = 'published'")
  }
  if (!includeHidden) {
    conditions.push('is_hidden = 0')
  }
  if (!includeDeleted) {
    conditions.push('deleted_at IS NULL')
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const row = await db.prepare(`SELECT COUNT(*) as count FROM diary_entries ${where}`).first<CountRow>()
  return row?.count ?? 0
}

export async function getDiaryEntryBySlug(db: Database, slug: string): Promise<DiaryEntry | null> {
  await ensureSchema(db)
  const entry = await db
    .prepare(
      `SELECT id, slug, title, content, html, description, status, is_hidden, cover_image, deleted_at, published_at, updated_at, view_count
       FROM diary_entries
       WHERE slug = ?`,
    )
    .bind(slug)
    .first<DiaryEntry>()

  return entry ?? null
}

export async function createDiaryEntry(
  db: Database,
  data: {
    slug: string
    title?: string | null
    content: string
    html: string
    description?: string | null
    status?: DiaryStatus
    is_hidden?: number
    cover_image?: string | null
  },
): Promise<number> {
  await ensureSchema(db)

  const result = await db
    .prepare(
      `INSERT INTO diary_entries (slug, title, content, html, description, status, is_hidden, cover_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.slug,
      data.title ?? null,
      data.content,
      data.html,
      data.description ?? null,
      data.status || 'published',
      data.is_hidden ?? 0,
      data.cover_image ?? null,
    )
    .run()

  return result.meta.last_row_id
}

export async function updateDiaryEntryBySlug(
  db: Database,
  slug: string,
  data: Partial<{
    slug: string
    title: string | null
    content: string
    html: string
    description: string | null
    status: DiaryStatus
    is_hidden: number
    cover_image: string | null
  }>,
): Promise<void> {
  await ensureSchema(db)

  const updates: string[] = []
  const values: unknown[] = []

  if (data.slug !== undefined) {
    updates.push('slug = ?')
    values.push(data.slug)
  }
  if (data.title !== undefined) {
    updates.push('title = ?')
    values.push(data.title)
  }
  if (data.content !== undefined) {
    updates.push('content = ?')
    values.push(data.content)
  }
  if (data.html !== undefined) {
    updates.push('html = ?')
    values.push(data.html)
  }
  if (data.description !== undefined) {
    updates.push('description = ?')
    values.push(data.description)
  }
  if (data.status !== undefined) {
    if (data.status === 'deleted') {
      updates.push("status = 'deleted'")
      updates.push("deleted_at = COALESCE(deleted_at, strftime('%s', 'now'))")
    } else {
      updates.push('status = ?')
      values.push(data.status)
      updates.push('deleted_at = NULL')
    }
  }
  if (data.is_hidden !== undefined) {
    updates.push('is_hidden = ?')
    values.push(data.is_hidden)
  }
  if (data.cover_image !== undefined) {
    updates.push('cover_image = ?')
    values.push(data.cover_image)
  }
  if (updates.length === 0) return

  updates.push("updated_at = strftime('%s', 'now')")
  values.push(slug)

  await db.prepare(`UPDATE diary_entries SET ${updates.join(', ')} WHERE slug = ?`).bind(...values).run()
}

export async function deleteDiaryEntry(db: Database, slug: string): Promise<void> {
  await ensureSchema(db)
  await db.prepare('DELETE FROM diary_entries WHERE slug = ?').bind(slug).run()
}

export async function incrementDiaryEntryViewCount(db: Database, slug: string): Promise<void> {
  await ensureSchema(db)
  await db.prepare('UPDATE diary_entries SET view_count = view_count + 1 WHERE slug = ?').bind(slug).run()
}

export function isPubliclyAccessibleDiaryEntry(
  entry: Pick<DiaryEntry, 'status' | 'is_hidden' | 'deleted_at'> | null | undefined,
): boolean {
  return Boolean(
    entry &&
    entry.status === 'published' &&
    entry.is_hidden === 0 &&
    entry.deleted_at == null,
  )
}
