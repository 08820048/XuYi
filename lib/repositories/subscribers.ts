import { nanoid } from 'nanoid'
import type { Database } from '@/lib/repositories/schema'
import { ensureSchema } from '@/lib/repositories/schema'
import type { SubscriberRow } from '@/lib/repositories/types'

export async function getSubscriberByEmail(db: Database, email: string): Promise<SubscriberRow | null> {
  await ensureSchema(db)
  return db
    .prepare('SELECT id, email, status, token, subscribed_at, created_at, updated_at FROM subscribers WHERE email = ?')
    .bind(email)
    .first<SubscriberRow>()
}

/** 直接订阅；重复提交保持幂等，重新订阅时更换退订 token。 */
export async function upsertSubscribedSubscriber(db: Database, email: string): Promise<void> {
  await ensureSchema(db)
  const token = nanoid(32)
  await db
    .prepare(`
      INSERT INTO subscribers (email, status, token, subscribed_at)
      VALUES (?, 'subscribed', ?, strftime('%s', 'now'))
      ON CONFLICT(email) DO UPDATE SET
        status = 'subscribed',
        token = CASE
          WHEN subscribers.status = 'subscribed' THEN subscribers.token
          ELSE excluded.token
        END,
        subscribed_at = CASE
          WHEN subscribers.status = 'subscribed' THEN subscribers.subscribed_at
          ELSE excluded.subscribed_at
        END,
        updated_at = strftime('%s', 'now')
    `)
    .bind(email, token)
    .run()
}

/** 双重确认第二步：点击邮件里的确认链接 */
export async function confirmSubscriberByToken(db: Database, token: string): Promise<boolean> {
  const existing = await getSubscriberByToken(db, token)
  if (!existing || existing.status === 'unsubscribed') return false
  if (existing.status === 'subscribed') return true

  await db
    .prepare(`
      UPDATE subscribers
      SET status = 'subscribed', subscribed_at = strftime('%s', 'now'), updated_at = strftime('%s', 'now')
      WHERE id = ?
    `)
    .bind(existing.id)
    .run()
  return true
}

export async function getSubscriberByToken(db: Database, token: string): Promise<SubscriberRow | null> {
  await ensureSchema(db)
  return db
    .prepare('SELECT id, email, status, token, subscribed_at, created_at, updated_at FROM subscribers WHERE token = ?')
    .bind(token)
    .first<SubscriberRow>()
}

/** 退订：幂等，token 不存在返回 false */
export async function unsubscribeSubscriberByToken(db: Database, token: string): Promise<boolean> {
  const existing = await getSubscriberByToken(db, token)
  if (!existing) return false
  if (existing.status === 'unsubscribed') return true

  await db
    .prepare(`
      UPDATE subscribers
      SET status = 'unsubscribed', updated_at = strftime('%s', 'now')
      WHERE id = ?
    `)
    .bind(existing.id)
    .run()
  return true
}

/** 发新文章通知时取所有已确认订阅者（email + 各自的退订 token） */
export async function listSubscribedSubscribers(
  db: Database,
): Promise<Array<Pick<SubscriberRow, 'email' | 'token'>>> {
  await ensureSchema(db)
  return db
    .prepare('SELECT email, token FROM subscribers WHERE status = \'subscribed\' ORDER BY id ASC')
    .all<{ email: string; token: string }>()
    .then((result) => result.results || [])
}
