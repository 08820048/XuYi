import { mapPostWithTags } from '@/lib/repositories/post-mappers'
import type { Database } from '@/lib/repositories/schema'
import type { Post, PostWithTags } from '@/lib/repositories/types'

// 全文搜索（FTS5，回退 LIKE）
export async function searchPosts(
  db: Database,
  query: string,
  limit = 20,
  includeDrafts = false,
  includeEncrypted = false,
  includeHidden = false,
  includeDeleted = false,
): Promise<PostWithTags[]> {
  let results: Post[]

  const conditions: string[] = []
  if (!includeDrafts) conditions.push("posts.status = 'published'")
  if (!includeEncrypted) conditions.push('posts.password IS NULL')
  if (!includeHidden) conditions.push('posts.is_hidden = 0')
  if (!includeDeleted) conditions.push('posts.deleted_at IS NULL')
  const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

  const likePosts = () =>
    db
      .prepare(
        `SELECT * FROM posts
         WHERE (title LIKE ? OR content LIKE ?)
         ${whereClause}
         ORDER BY published_at DESC
         LIMIT ?`,
      )
      .bind(`%${query}%`, `%${query}%`, limit)
      .all<Post>()

  try {
    const ftsResult = await db
      .prepare(
        `SELECT posts.* FROM posts_fts
         JOIN posts ON posts.id = posts_fts.rowid
         WHERE posts_fts MATCH ?
         ${whereClause}
         ORDER BY rank
         LIMIT ?`,
      )
      .bind(query, limit)
      .all<Post>()
    // unicode61 keeps a run of CJK as one token, so a substring MATCH returns
    // an empty set instead of throwing. Fall back to LIKE in that case.
    results = ftsResult.results?.length ? ftsResult.results : (await likePosts()).results
  } catch {
    results = (await likePosts()).results
  }

  return results.map(mapPostWithTags)
}
