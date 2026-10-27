import { mapPostWithTags } from '@/lib/repositories/post-mappers'
import { ensureSchema, type Database } from '@/lib/repositories/schema'
import { hashTranslationSource } from '@/lib/translation-hash'
import type { CountRow, Post, PostTranslation, PostWithTags } from '@/lib/repositories/types'

export type TranslationStatus = PostTranslation['status']

export interface PostTranslationInput {
  title: string
  content: string
  html: string
  description?: string | null
  status?: TranslationStatus
  /** AI 翻译时记录中文来源指纹；手动写入可不传 */
  sourceHash?: string | null
}


// 取某篇文章某种语言的译文（含草稿，调用方按需判断 status）
export async function getPostTranslation(
  db: Database,
  postId: number,
  lang: string,
): Promise<PostTranslation | null> {
  await ensureSchema(db)
  return db
    .prepare('SELECT * FROM post_translations WHERE post_id = ? AND lang = ?')
    .bind(postId, lang)
    .first<PostTranslation>()
}

// 文章已有哪些语言的译文（status 为 published 的才算对外可见）
export async function getPostTranslationLangs(
  db: Database,
  postId: number,
  publishedOnly = true,
): Promise<string[]> {
  await ensureSchema(db)
  const { results } = await db
    .prepare(
      `SELECT lang FROM post_translations
       WHERE post_id = ? ${publishedOnly ? "AND status = 'published'" : ''}
       ORDER BY lang`,
    )
    .bind(postId)
    .all<{ lang: string }>()
  return results.map((row) => row.lang)
}

export async function upsertPostTranslation(
  db: Database,
  postId: number,
  lang: string,
  input: PostTranslationInput,
): Promise<void> {
  await ensureSchema(db)
  await db
    .prepare(
      `INSERT INTO post_translations (post_id, lang, title, content, html, description, status, source_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(post_id, lang) DO UPDATE SET
         title = excluded.title,
         content = excluded.content,
         html = excluded.html,
         description = excluded.description,
         status = excluded.status,
         source_hash = excluded.source_hash,
         ai_state = NULL,
         ai_error = NULL,
         updated_at = strftime('%s', 'now')`,
    )
    .bind(
      postId,
      lang,
      input.title,
      input.content,
      input.html,
      input.description ?? null,
      input.status ?? 'published',
      input.sourceHash ?? null,
    )
    .run()
}

export async function setPostTranslationStatus(
  db: Database,
  postId: number,
  lang: string,
  status: TranslationStatus,
): Promise<boolean> {
  await ensureSchema(db)
  const existing = await getPostTranslation(db, postId, lang)
  // 空占位（翻译中/失败且从未成功）不允许发布
  if (!existing || !existing.title || !existing.html) return false
  await db
    .prepare(
      `UPDATE post_translations SET status = ?, updated_at = strftime('%s', 'now')
       WHERE post_id = ? AND lang = ?`,
    )
    .bind(status, postId, lang)
    .run()
  return true
}

export interface PostTranslationSummary {
  post_id: number
  status: TranslationStatus
  /** 有可展示的英文版内容（区别于早期 AI 翻译遗留的空占位行） */
  has_content: boolean
  source_hash: string | null
  updated_at: number
}

// 文章列表用：只取状态，不取正文
export async function getPostTranslationSummaries(
  db: Database,
  postIds: number[],
  lang: string,
): Promise<Map<number, PostTranslationSummary>> {
  const summaries = new Map<number, PostTranslationSummary>()
  if (postIds.length === 0) return summaries
  await ensureSchema(db)

  const placeholders = postIds.map(() => '?').join(',')
  const { results } = await db
    .prepare(
      `SELECT post_id, status, (title != '' AND html != '') AS has_content, source_hash, updated_at
       FROM post_translations
       WHERE lang = ? AND post_id IN (${placeholders})`,
    )
    .bind(lang, ...postIds)
    .all<{
      post_id: number
      status: TranslationStatus
      has_content: number
      source_hash: string | null
      updated_at: number
    }>()

  for (const row of results) {
    summaries.set(row.post_id, {
      post_id: row.post_id,
      status: row.status,
      has_content: Boolean(row.has_content),
      source_hash: row.source_hash,
      updated_at: row.updated_at,
    })
  }
  return summaries
}

export async function deletePostTranslation(db: Database, postId: number, lang: string): Promise<boolean> {
  await ensureSchema(db)
  const existing = await getPostTranslation(db, postId, lang)
  if (!existing) return false
  await db
    .prepare('DELETE FROM post_translations WHERE post_id = ? AND lang = ?')
    .bind(postId, lang)
    .run()
  return true
}

interface TranslatedListRow extends Post {
  t_title: string
  t_description: string | null
}

// 某语言下的公开文章列表：仅包含已发布译文，标题/摘要替换为译文，其余字段沿用原文
export async function getTranslatedPosts(
  db: Database,
  lang: string,
  limit = 50,
  offset = 0,
): Promise<PostWithTags[]> {
  await ensureSchema(db)
  const { results } = await db
    .prepare(
      `SELECT p.id, p.slug, p.title, p.description, p.category, p.tags, p.status, p.password,
              p.is_pinned, p.is_hidden, p.cover_image, p.post_type, p.source_url,
              p.content_updated_at, p.deleted_at, p.published_at, p.updated_at, p.view_count,
              t.title AS t_title, t.description AS t_description
       FROM post_translations t
       JOIN posts p ON p.id = t.post_id
       WHERE t.lang = ? AND t.status = 'published'
         AND p.status = 'published' AND p.deleted_at IS NULL
         AND p.password IS NULL AND p.is_hidden = 0
       ORDER BY p.is_pinned DESC, p.published_at DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(lang, limit, offset)
    .all<TranslatedListRow>()

  return results.map((row) =>
    mapPostWithTags({
      ...row,
      title: row.t_title,
      description: row.t_description ?? row.description,
      // 译文列表不展示中文原文的“有更新”标记
      content_updated_at: null,
    }),
  )
}

export async function getTranslatedPostsCount(db: Database, lang: string): Promise<number> {
  await ensureSchema(db)
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM post_translations t
       JOIN posts p ON p.id = t.post_id
       WHERE t.lang = ? AND t.status = 'published'
         AND p.status = 'published' AND p.deleted_at IS NULL
         AND p.password IS NULL AND p.is_hidden = 0`,
    )
    .bind(lang)
    .first<CountRow>()
  return row?.count ?? 0
}

// 译文全文搜索（标题 + 正文 LIKE，译文量级小，不另建 FTS）
export async function searchTranslatedPosts(
  db: Database,
  lang: string,
  query: string,
  limit = 20,
): Promise<PostWithTags[]> {
  await ensureSchema(db)
  const like = `%${query}%`
  const { results } = await db
    .prepare(
      `SELECT p.id, p.slug, p.title, p.description, p.category, p.tags, p.status, p.password,
              p.is_pinned, p.is_hidden, p.cover_image, p.post_type, p.source_url,
              p.content_updated_at, p.deleted_at, p.published_at, p.updated_at, p.view_count,
              t.title AS t_title, t.description AS t_description
       FROM post_translations t
       JOIN posts p ON p.id = t.post_id
       WHERE t.lang = ? AND t.status = 'published'
         AND (t.title LIKE ? OR t.content LIKE ?)
         AND p.status = 'published' AND p.deleted_at IS NULL
         AND p.password IS NULL AND p.is_hidden = 0
       ORDER BY p.published_at DESC
       LIMIT ?`,
    )
    .bind(lang, like, like, limit)
    .all<TranslatedListRow>()

  return results.map((row) =>
    mapPostWithTags({
      ...row,
      title: row.t_title,
      description: row.t_description ?? row.description,
      // 译文列表不展示中文原文的“有更新”标记
      content_updated_at: null,
    }),
  )
}

/** 取一批文章当前的「中文来源指纹」，用于与译文里记录的 source_hash 比对判断是否过期。 */
export async function getCurrentSourceHashes(db: Database, postIds: number[]): Promise<Map<number, string>> {
  const hashes = new Map<number, string>()
  if (postIds.length === 0) return hashes
  const placeholders = postIds.map(() => '?').join(',')
  const { results } = await db
    .prepare(`SELECT id, title, html FROM posts WHERE id IN (${placeholders})`)
    .bind(...postIds)
    .all<{ id: number; title: string; html: string }>()
  for (const row of results) {
    // 与保存英文版时记录的指纹口径一致：标题 + 编辑器 HTML
    hashes.set(row.id, await hashTranslationSource(row.title, row.html))
  }
  return hashes
}
