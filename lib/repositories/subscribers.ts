import { nanoid } from 'nanoid'
import type { Database } from '@/lib/repositories/schema'
import { ensureSchema } from '@/lib/repositories/schema'
import type { SubscriberRow } from '@/lib/repositories/types'

// 确认邮件重发冷却：同一邮箱 60 秒内只发一封，防止接口被刷
const RESEND_COOLDOWN_SECONDS = 60

export interface UpsertPendingSubscriberResult {
  token: string
  /** 已经是订阅状态，无需再发确认邮件 */
  alreadySubscribed: boolean
  /** 处于冷却期，本次未重发确认邮件 */
  skippedCooldown: boolean
}

export async function getSubscriberByEmail(db: Database, email: string): Promise<SubscriberRow | null> {
  await ensureSchema(db)
  return db
    .prepare('SELECT id, email, status, token, subscribed_at, created_at, updated_at FROM subscribers WHERE email = ?')
    .bind(email)
    .first<SubscriberRow>()
}

async function insertPendingSubscriber(db: Database, email: string): Promise<string> {
  const token = nanoid(32)
  await db
    .prepare(`
      INSERT INTO subscribers (email, status, token)
      VALUES (?, 'pending', ?)
    `)
    .bind(email, token)
    .run()
  return token
}

async function resetToPending(db: Database, id: number): Promise<string> {
  const token = nanoid(32)
  await db
    .prepare(`
      UPDATE subscribers
      SET status = 'pending', token = ?, subscribed_at = NULL, updated_at = strftime('%s', 'now')
      WHERE id = ?
    `)
    .bind(token, id)
    .run()
  return token
}

async function refreshPendingToken(db: Database, id: number): Promise<string> {
  const token = nanoid(32)
  await db
    .prepare(`
      UPDATE subscribers
      SET token = ?, updated_at = strftime('%s', 'now')
      WHERE id = ?
    `)
    .bind(token, id)
    .run()
  return token
}

function isUniqueEmailConflict(error: unknown) {
  return error instanceof Error && /UNIQUE constraint failed: subscribers\.email/i.test(error.message)
}

/**
 * 双重确认第一步：把邮箱置为待确认状态并返回确认 token。
 * - 新邮箱：插入 pending 记录（并发插入冲突时回退到已存在分支）
 * - 已订阅：直接返回，不再发确认邮件
 * - 待确认且在冷却期内：跳过重发（时钟偏移导致的负差值也算冷却期内）
 * - 已退订 / 冷却期外的待确认：换新 token 并允许重发
 */
export async function upsertPendingSubscriber(
  db: Database,
  email: string,
  now = new Date(),
): Promise<UpsertPendingSubscriberResult> {
  await ensureSchema(db)

  let existing = await getSubscriberByEmail(db, email)

  if (!existing) {
    try {
      const token = await insertPendingSubscriber(db, email)
      return { token, alreadySubscribed: false, skippedCooldown: false }
    } catch (error) {
      // 并发请求同时插入同一邮箱：后者撞 UNIQUE 约束，按已存在分支继续处理
      if (!isUniqueEmailConflict(error)) throw error
      existing = await getSubscriberByEmail(db, email)
      if (!existing) throw error
    }
  }

  if (existing.status === 'subscribed') {
    return { token: existing.token, alreadySubscribed: true, skippedCooldown: false }
  }

  // 不设下界：DB 时钟略超前于应用时钟时 elapsedSeconds 为负，仍应视为冷却期内
  const elapsedSeconds = Math.floor(now.getTime() / 1000) - existing.updated_at
  if (existing.status === 'pending' && elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
    return { token: existing.token, alreadySubscribed: false, skippedCooldown: true }
  }

  const token = existing.status === 'unsubscribed'
    ? await resetToPending(db, existing.id)
    : await refreshPendingToken(db, existing.id)
  return { token, alreadySubscribed: false, skippedCooldown: false }
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
