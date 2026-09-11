import { listSubscribedSubscribers, upsertSubscribedSubscriber } from '@/lib/repositories/subscribers'
import type { PostWithTags } from '@/lib/repositories/types'

// 邮件订阅（Resend 发送）：直接订阅 + 新文章通知
// API key 属于部署者级 secret，照 FEISHU_BOT_WEBHOOK 惯例放 wrangler secret

export interface NewsletterEnv extends Partial<CloudflareEnv> {
  DB: D1Database
}

const RESEND_API_BASE = 'https://api.resend.com/emails'
const RESEND_TIMEOUT_MS = 10_000
// 分批发送，避免单个订阅者的悬挂请求阻塞后面所有人
const NEWSLETTER_SEND_BATCH_SIZE = 5
const DEFAULT_NEWSLETTER_SITE_NAME = 'XuYi'
const DEFAULT_NEWSLETTER_FROM = 'XuYi <onboarding@resend.dev>'
const DEFAULT_NEWSLETTER_SITE_URL = 'https://xuyi.dev'

export interface SendEmailPayload {
  to: string
  subject: string
  html: string
  text?: string
  /** 附加邮件头，如 List-Unsubscribe */
  headers?: Record<string, string>
}

export interface NewsletterEmailContent {
  subject: string
  html: string
  text: string
}

export type SubscribeEmailResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_email' }

export interface NewsletterPushResult {
  sent: boolean
  skipped?: boolean
  reason?: 'post_not_public' | 'not_configured' | 'no_subscribers'
  total?: number
  delivered?: number
  failed?: number
}

function isPlaceholderSiteUrl(url: URL) {
  const hostname = url.hostname.toLowerCase()
  return hostname === 'your-domain.com'
    || hostname === 'example.com'
    || hostname.endsWith('.example.com')
    || hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '0.0.0.0'
}

// cron / worker 场景拿不到 Next 运行时 env，所以和 feishu-report 一样直接读 env 值
function normalizeSiteUrl(siteUrl: string | undefined) {
  const normalized = (siteUrl || '').trim()
  if (!normalized) return DEFAULT_NEWSLETTER_SITE_URL

  const build = (value: string): string | null => {
    try {
      const url = new URL(value)
      if (isPlaceholderSiteUrl(url)) return null
      return url.toString().replace(/\/+$/, '')
    } catch {
      return null
    }
  }

  // 只有裸域名才补 https:// 前缀；带 scheme 但无效或占位的 URL 直接回默认值，
  // 避免拼出 "https://https//..." 这类坏链接
  const direct = build(normalized)
  if (direct) return direct
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)) {
    const prefixed = build(`https://${normalized}`)
    if (prefixed) return prefixed
  }
  return DEFAULT_NEWSLETTER_SITE_URL
}

export function getNewsletterSiteUrl(env: Pick<NewsletterEnv, 'NEXT_PUBLIC_SITE_URL'>) {
  return normalizeSiteUrl(env.NEXT_PUBLIC_SITE_URL)
}

function getSiteName(env: Pick<NewsletterEnv, 'NEXT_PUBLIC_SITE_NAME'>) {
  return env.NEXT_PUBLIC_SITE_NAME?.trim() || DEFAULT_NEWSLETTER_SITE_NAME
}

function getFromAddress(env: Pick<NewsletterEnv, 'NEWSLETTER_FROM_EMAIL'>) {
  return env.NEWSLETTER_FROM_EMAIL?.trim() || DEFAULT_NEWSLETTER_FROM
}

/** 校验并归一化用户输入的邮箱；不合法返回 null */
export function normalizeSubscriberEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (!email || email.length > 254) return null
  // 简单格式校验：一个 @，域名按点分段且每段非空（拒绝 a@..com 这类）
  const match = /^([^\s@]+)@((?:[^.\s@]+\.)+[^.\s@]{2,})$/.exec(email)
  if (!match) return null
  return email
}

const KAMI = {
  canvas: '#ffffff',
  parchment: '#f5f4ed',
  ivory: '#faf9f5',
  sand: '#e8e6dc',
  ink: '#1b365d',
  nearBlack: '#141413',
  olive: '#504e49',
  stone: '#6b6a64',
  serif: "Georgia, 'Noto Serif SC', 'Songti SC', 'Source Han Serif SC', serif",
} as const

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatPublishedDate(publishedAt: number | null | undefined) {
  if (!publishedAt) return ''
  return new Date(publishedAt * 1000).toISOString().slice(0, 10).replaceAll('-', '.')
}

function buildEmailShell(contentHtml: string, footerHtml: string) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
</head>
<body style="margin:0;padding:0;background:${KAMI.parchment};color:${KAMI.nearBlack};font-family:${KAMI.serif};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${KAMI.parchment}" style="margin:0;padding:0;background:${KAMI.parchment};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${KAMI.canvas}" style="max-width:520px;margin:0 auto;background:${KAMI.canvas};border:1px solid ${KAMI.sand};">
          <tr>
            <td style="padding:36px 36px 28px;color:${KAMI.nearBlack};font-size:15px;line-height:1.75;font-family:${KAMI.serif};">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px 28px;border-top:1px solid ${KAMI.sand};color:${KAMI.stone};font-size:12px;line-height:1.7;font-family:${KAMI.serif};">
              ${footerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildNewPostNotificationEmail(options: {
  post: Pick<PostWithTags, 'title' | 'description' | 'slug' | 'category' | 'published_at'>
  siteName: string
  siteUrl: string
  unsubscribeUrl: string
}): NewsletterEmailContent {
  const { post, siteName, siteUrl, unsubscribeUrl } = options
  const postUrl = `${siteUrl}/${post.slug}`
  const subject = `新文章｜${post.title}`
  const kicker = post.category ? `${post.category} · 新文章` : '新文章'
  const publishedDate = formatPublishedDate(post.published_at)
  const descriptionHtml = post.description
    ? `<p style="margin:14px 0 0;color:${KAMI.olive};font-size:15px;line-height:1.7;font-family:${KAMI.serif};">${escapeHtml(post.description)}</p>`
    : ''
  const metaHtml = publishedDate
    ? `<p style="margin:12px 0 0;color:${KAMI.stone};font-size:11px;letter-spacing:0.08em;font-family:Georgia,'Noto Serif SC',serif;">${publishedDate}</p>`
    : ''
  const html = buildEmailShell(
    `<p style="margin:0 0 28px;padding:0 0 14px;border-bottom:1px solid ${KAMI.sand};color:${KAMI.stone};font-size:12px;letter-spacing:1.2px;font-family:${KAMI.serif};">${escapeHtml(siteName)}</p>` +
    `<p style="margin:0 0 10px;color:${KAMI.stone};font-size:12px;letter-spacing:1.2px;font-family:${KAMI.serif};">${escapeHtml(kicker)}</p>` +
    `<h1 style="margin:0;color:${KAMI.nearBlack};font-size:28px;line-height:1.2;letter-spacing:-0.02em;font-weight:500;font-family:${KAMI.serif};">${escapeHtml(post.title)}</h1>` +
    metaHtml +
    descriptionHtml +
    `<p style="margin:28px 0 0;"><a href="${postUrl}" style="display:inline-block;background:${KAMI.ink};color:${KAMI.ivory};text-decoration:none;font-size:13px;font-weight:500;letter-spacing:0.04em;padding:11px 22px;border-radius:8px;font-family:${KAMI.serif};">阅读全文</a></p>` +
    `<p style="margin:18px 0 0;color:${KAMI.stone};font-size:13px;line-height:1.7;font-family:${KAMI.serif};">或在浏览器打开<br /><a href="${postUrl}" style="color:${KAMI.ink};text-decoration:underline;text-underline-offset:3px;word-break:break-all;">${escapeHtml(postUrl)}</a></p>`,
    `<p style="margin:0 0 6px;color:${KAMI.stone};">你收到这封邮件，是因为订阅了 ${escapeHtml(siteName)} 的更新。</p>` +
    `<p style="margin:0;"><a href="${unsubscribeUrl}" style="color:${KAMI.stone};text-decoration:underline;text-underline-offset:2px;">退订</a></p>`,
  )
  const textLines = [
    `${siteName} · ${kicker}`,
    '',
    post.title,
    publishedDate,
    post.description || '',
    '',
    `阅读全文：${postUrl}`,
    '',
    `你收到这封邮件，是因为订阅了 ${siteName} 的更新。`,
    `退订：${unsubscribeUrl}`,
  ].filter((line, index, lines) => line !== '' || lines[index - 1] !== '')

  return { subject, html, text: textLines.join('\n').trim() }
}

/** 确认 / 退订结果页（API 路由直接渲染，免维护独立页面） */
export function renderSubscriptionResultPage(options: {
  title: string
  message: string
  success: boolean
  siteName: string
  siteUrl: string
}) {
  const { title, message, siteName, siteUrl } = options
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;min-height:100vh;background:${KAMI.parchment};color:${KAMI.nearBlack};font-family:${KAMI.serif};">
  <main style="max-width:420px;margin:0 auto;padding:72px 24px 80px;">
    <p style="margin:0 0 28px;padding:0 0 14px;border-bottom:1px solid ${KAMI.sand};color:${KAMI.stone};font-size:12px;letter-spacing:1.2px;">${escapeHtml(siteName)}</p>
    <h1 style="margin:0;color:${KAMI.nearBlack};font-size:28px;line-height:1.2;letter-spacing:-0.02em;font-weight:500;">${escapeHtml(title)}</h1>
    <p style="margin:16px 0 0;color:${KAMI.olive};font-size:15px;line-height:1.7;">${escapeHtml(message)}</p>
    <p style="margin:36px 0 0;">
      <a href="${siteUrl}" style="display:inline-block;background:${KAMI.ink};color:${KAMI.ivory};text-decoration:none;font-size:13px;font-weight:500;letter-spacing:0.04em;padding:11px 22px;border-radius:8px;">返回 ${escapeHtml(siteName)}</a>
    </p>
  </main>
</body>
</html>`
}

/** 调 Resend 发送一封邮件，错误处理对齐 sendFeishuWebhook */
export async function sendEmailViaResend(
  apiKey: string,
  from: string,
  payload: SendEmailPayload,
): Promise<{ id?: string }> {
  const response = await fetch(RESEND_API_BASE, {
    method: 'POST',
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      ...(payload.text ? { text: payload.text } : {}),
      ...(payload.headers ? { headers: payload.headers } : {}),
    }),
  })
  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(`邮件发送失败：HTTP ${response.status} ${responseText}`)
  }

  try {
    return JSON.parse(responseText) as { id?: string }
  } catch {
    return { }
  }
}

/** 直接订阅；重复提交保持幂等。 */
export async function subscribeEmail(
  env: NewsletterEnv,
  rawEmail: unknown,
): Promise<SubscribeEmailResult> {
  const email = normalizeSubscriberEmail(rawEmail)
  if (!email) {
    return { ok: false, reason: 'invalid_email' }
  }

  await upsertSubscribedSubscriber(env.DB, email)
  return { ok: true }
}

export function isPublicNewsletterPost(post: Pick<PostWithTags, 'status' | 'password' | 'is_hidden' | 'deleted_at'>) {
  return post.status === 'published' && !post.password && post.is_hidden === 0 && post.deleted_at == null
}

/** 发布新文章后给所有已确认订阅者发通知，逐个发送并汇总结果 */
export async function pushNewsletterNewPostNotification(
  env: NewsletterEnv,
  post: PostWithTags,
): Promise<NewsletterPushResult> {
  if (!isPublicNewsletterPost(post)) {
    return { sent: false, skipped: true, reason: 'post_not_public' }
  }

  const apiKey = env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return { sent: false, skipped: true, reason: 'not_configured' }
  }

  const subscribers = await listSubscribedSubscribers(env.DB)
  if (subscribers.length === 0) {
    return { sent: false, skipped: true, reason: 'no_subscribers' }
  }

  const siteName = getSiteName(env)
  const siteUrl = getNewsletterSiteUrl(env)
  const from = getFromAddress(env)

  let delivered = 0
  let failed = 0
  for (let i = 0; i < subscribers.length; i += NEWSLETTER_SEND_BATCH_SIZE) {
    const batch = subscribers.slice(i, i + NEWSLETTER_SEND_BATCH_SIZE)
    // 批内并发，批间串行；单个失败不影响同批其他人（Gmail/Yahoo 批量发件规范要求一键退订头）
    const outcomes = await Promise.all(batch.map(async (subscriber) => {
      const unsubscribeUrl = `${siteUrl}/api/subscribe/unsubscribe?token=${encodeURIComponent(subscriber.token)}`
      const content = buildNewPostNotificationEmail({
        post,
        siteName,
        siteUrl,
        unsubscribeUrl,
      })
      try {
        await sendEmailViaResend(apiKey, from, {
          to: subscriber.email,
          subject: content.subject,
          html: content.html,
          text: content.text,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        })
        return true
      } catch (error) {
        console.error(`Newsletter email to ${subscriber.email} failed:`, error)
        return false
      }
    }))
    for (const ok of outcomes) {
      if (ok) delivered += 1
      else failed += 1
    }
  }

  return { sent: delivered > 0, total: subscribers.length, delivered, failed }
}

/** fire-and-forget，模式与 enqueueFeishuNewPostNotification 一致 */
export function enqueueNewsletterNewPostNotification(
  env: NewsletterEnv,
  post: PostWithTags,
  waitUntil?: (promise: Promise<unknown>) => void,
) {
  const task = pushNewsletterNewPostNotification(env, post).catch((error) => {
    console.error('Newsletter new post notification failed:', error)
  })

  if (waitUntil) {
    waitUntil(task)
    return
  }

  void task
}
