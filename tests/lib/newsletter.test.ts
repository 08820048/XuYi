import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildNewPostNotificationEmail,
  buildSubscribeConfirmationEmail,
  getNewsletterSiteUrl,
  isPublicNewsletterPost,
  normalizeSubscriberEmail,
  pushNewsletterNewPostNotification,
  sendEmailViaResend,
  subscribeEmail,
  type NewsletterEnv,
} from '@/lib/newsletter'
import { upsertPendingSubscriber } from '@/lib/repositories/subscribers'
import type { PostWithTags } from '@/lib/repositories/types'

function createEnv(overrides: Partial<NewsletterEnv> = {}): NewsletterEnv {
  return {
    DB: {} as D1Database,
    NEXT_PUBLIC_SITE_NAME: 'XuYi',
    NEXT_PUBLIC_SITE_URL: 'https://blog.qiaomu.dev',
    RESEND_API_KEY: 're_test_key',
    ...overrides,
  }
}

function createPost(overrides: Partial<PostWithTags> = {}): PostWithTags {
  return {
    id: 1,
    slug: 'hello-world',
    title: '你好世界',
    content: '正文',
    html: '<p>正文</p>',
    description: '这是摘要',
    category: '技术',
    tags: [],
    status: 'published',
    password: null,
    is_pinned: 0,
    is_hidden: 0,
    cover_image: null,
    post_type: 'original',
    source_url: null,
    previous_content: null,
    previous_html: null,
    content_updated_at: null,
    deleted_at: null,
    published_at: 1770000000,
    updated_at: 1770000000,
    view_count: 0,
    ...overrides,
  }
}

describe('newsletter helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('normalizes and validates subscriber emails', () => {
    expect(normalizeSubscriberEmail('  Reader@Example.COM ')).toBe('reader@example.com')
    expect(normalizeSubscriberEmail('not-an-email')).toBeNull()
    expect(normalizeSubscriberEmail('a@b')).toBeNull()
    expect(normalizeSubscriberEmail('')).toBeNull()
    expect(normalizeSubscriberEmail(null)).toBeNull()
    expect(normalizeSubscriberEmail(undefined)).toBeNull()
    expect(normalizeSubscriberEmail(123)).toBeNull()
  })

  it('detects publicly notifiable posts', () => {
    expect(isPublicNewsletterPost(createPost())).toBe(true)
    expect(isPublicNewsletterPost(createPost({ password: 'secret' }))).toBe(false)
    expect(isPublicNewsletterPost(createPost({ is_hidden: 1 }))).toBe(false)
    expect(isPublicNewsletterPost(createPost({ status: 'draft' }))).toBe(false)
    expect(isPublicNewsletterPost(createPost({ deleted_at: 1770000100 }))).toBe(false)
  })

  it('builds a confirmation email with the confirm link', () => {
    const content = buildSubscribeConfirmationEmail({
      siteName: 'XuYi',
      confirmUrl: 'https://blog.qiaomu.dev/api/subscribe/confirm?token=tok',
    })

    expect(content.subject).toContain('XuYi')
    expect(content.html).toContain('https://blog.qiaomu.dev/api/subscribe/confirm?token=tok')
    expect(content.html).toContain('确认订阅')
  })

  it('escapes html-sensitive characters in post titles and links unsubscribe', () => {
    const content = buildNewPostNotificationEmail({
      post: createPost({ title: '<script>alert("x")</script>' }),
      siteName: 'XuYi',
      siteUrl: 'https://blog.qiaomu.dev',
      unsubscribeUrl: 'https://blog.qiaomu.dev/api/subscribe/unsubscribe?token=u',
    })

    expect(content.subject).toBe('新文章｜<script>alert("x")</script>')
    expect(content.html).not.toContain('<script>')
    expect(content.html).toContain('&lt;script&gt;')
    expect(content.html).toContain('https://blog.qiaomu.dev/hello-world')
    expect(content.html).toContain('unsubscribe?token=u')
  })

  it('sends the payload to Resend with bearer auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'email-1' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await sendEmailViaResend('re_test_key', 'XuYi <blog@example.com>', {
      to: 'reader@example.com',
      subject: '标题',
      html: '<p>正文</p>',
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers.Authorization).toBe('Bearer re_test_key')
    const body = JSON.parse(init.body)
    expect(body.from).toBe('XuYi <blog@example.com>')
    expect(body.to).toEqual(['reader@example.com'])
    expect(body.subject).toBe('标题')
  })

  it('throws with response details when Resend rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'domain not verified' }), { status: 403 }),
      ),
    )

    await expect(
      sendEmailViaResend('re_test_key', 'from@example.com', {
        to: 'reader@example.com',
        subject: '标题',
        html: '<p>正文</p>',
      }),
    ).rejects.toThrow('HTTP 403')
  })

  it('rejects invalid emails without touching the database or Resend', async () => {
    const result = await subscribeEmail(createEnv(), 'not-an-email')

    expect(result).toEqual({ ok: false, reason: 'invalid_email' })
  })

  it('throws before any database write when RESEND_API_KEY is missing', async () => {
    const prepare = vi.fn()
    const env = createEnv({ RESEND_API_KEY: undefined, DB: { prepare } as unknown as D1Database })

    await expect(subscribeEmail(env, 'reader@example.com')).rejects.toThrow('RESEND_API_KEY')
    expect(prepare).not.toHaveBeenCalled()
  })
})

describe('pushNewsletterNewPostNotification', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function createEnvWithSubscribers(rows: Array<{ email: string; token: string }>): NewsletterEnv {
    const prepare = vi.fn().mockImplementation((sql: string) => ({
      all: () => Promise.resolve({ results: sql.includes('FROM subscribers') ? rows : [] }),
      first: () => Promise.resolve(null),
      bind: () => ({ run: () => Promise.resolve({ meta: {} }) }),
    }))
    return createEnv({ DB: { prepare } as unknown as D1Database })
  }

  it('skips non-public posts without sending anything', async () => {
    const env = createEnvWithSubscribers([{ email: 'a@example.com', token: 't' }])
    vi.stubGlobal('fetch', vi.fn())

    const result = await pushNewsletterNewPostNotification(env, createPost({ password: 'x' }))

    expect(result).toEqual({ sent: false, skipped: true, reason: 'post_not_public' })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('skips silently when RESEND_API_KEY is missing', async () => {
    const env = createEnv({ RESEND_API_KEY: undefined })

    const result = await pushNewsletterNewPostNotification(env, createPost())

    expect(result).toEqual({ sent: false, skipped: true, reason: 'not_configured' })
  })

  it('skips when there are no confirmed subscribers', async () => {
    const env = createEnvWithSubscribers([])
    vi.stubGlobal('fetch', vi.fn())

    const result = await pushNewsletterNewPostNotification(env, createPost())

    expect(result).toEqual({ sent: false, skipped: true, reason: 'no_subscribers' })
  })

  it('sends one email per subscriber with per-subscriber unsubscribe links and counts failures', async () => {
    const env = createEnvWithSubscribers([
      { email: 'a@example.com', token: 'tok-a' },
      { email: 'b@example.com', token: 'tok-b' },
    ])
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'e1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'boom' }), { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await pushNewsletterNewPostNotification(env, createPost())

    expect(result).toEqual({ sent: true, total: 2, delivered: 1, failed: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const [, firstInit] = fetchMock.mock.calls[0]
    const firstBody = JSON.parse(firstInit.body)
    expect(firstBody.to).toEqual(['a@example.com'])
    expect(firstBody.subject).toBe('新文章｜你好世界')
    expect(firstBody.html).toContain('unsubscribe?token=tok-a')
    expect(firstBody.headers['List-Unsubscribe']).toBe(
      '<https://blog.qiaomu.dev/api/subscribe/unsubscribe?token=tok-a>',
    )
    expect(firstBody.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')

    const [, secondInit] = fetchMock.mock.calls[1]
    expect(JSON.parse(secondInit.body).html).toContain('unsubscribe?token=tok-b')
  })
})

describe('upsertPendingSubscriber', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('falls back to the existing row when a concurrent insert hits the UNIQUE constraint', async () => {
    const existingRow = {
      id: 7,
      email: 'reader@example.com',
      status: 'pending' as const,
      token: 'old-token',
      subscribed_at: null,
      created_at: 1770000000 - 3600,
      updated_at: 1770000000 - 3600,
    }
    let emailLookups = 0
    const prepare = vi.fn().mockImplementation((sql: string) => ({
      run: () => {
        if (sql.includes('INSERT INTO subscribers')) {
          return Promise.reject(new Error('UNIQUE constraint failed: subscribers.email'))
        }
        return Promise.resolve({ meta: {} })
      },
      all: () => Promise.resolve({ results: [] }),
      first: () =>
        Promise.resolve(sql.includes('WHERE email = ?')
          ? (() => {
              emailLookups += 1
              return emailLookups >= 2 ? existingRow : null
            })()
          : null),
      bind: () => ({
        run: () =>
          sql.includes('INSERT INTO subscribers')
            ? Promise.reject(new Error('UNIQUE constraint failed: subscribers.email'))
            : Promise.resolve({ meta: {} }),
        first: () =>
          Promise.resolve(
            sql.includes('WHERE email = ?')
              ? (() => {
                  emailLookups += 1
                  return emailLookups >= 2 ? existingRow : null
                })()
              : null,
          ),
      }),
    }))
    const env = { DB: { prepare } as unknown as D1Database }

    const result = await upsertPendingSubscriber(env.DB, 'reader@example.com', new Date(1770000000 * 1000))

    expect(result.alreadySubscribed).toBe(false)
    expect(result.skippedCooldown).toBe(false)
    expect(result.token).toBeTruthy()
    expect(result.token).not.toBe('old-token')
    expect(emailLookups).toBe(2)
  })

  it('treats a negative elapsed time (db clock ahead) as still within cooldown', async () => {
    const existingRow = {
      id: 7,
      email: 'reader@example.com',
      status: 'pending' as const,
      token: 'old-token',
      subscribed_at: null,
      created_at: 1770000100,
      updated_at: 1770000100, // 比传入的 now 晚 100 秒，模拟 DB 时钟超前
    }
    const prepare = vi.fn().mockImplementation((sql: string) => ({
      run: () => Promise.resolve({ meta: {} }),
      all: () => Promise.resolve({ results: [] }),
      first: () => Promise.resolve(null),
      bind: () => ({
        run: () => Promise.resolve({ meta: {} }),
        first: () =>
          Promise.resolve(sql.includes('WHERE email = ?') ? existingRow : null),
      }),
    }))
    const env = { DB: { prepare } as unknown as D1Database }

    const result = await upsertPendingSubscriber(env.DB, 'reader@example.com', new Date(1770000000 * 1000))

    expect(result).toEqual({ token: 'old-token', alreadySubscribed: false, skippedCooldown: true })
  })
})

describe('getNewsletterSiteUrl', () => {
  it('keeps normal urls and prefixes bare domains', () => {
    expect(getNewsletterSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://blog.qiaomu.dev/' })).toBe('https://blog.qiaomu.dev')
    expect(getNewsletterSiteUrl({ NEXT_PUBLIC_SITE_URL: 'blog.qiaomu.dev' })).toBe('https://blog.qiaomu.dev')
  })

  it('falls back to the default for placeholder or invalid urls instead of fabricating double-scheme urls', () => {
    // 回归：占位域名曾掉进 https 前缀分支，拼出 "https://https//..." 
    expect(getNewsletterSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://blog.example.com' })).toBe('https://xuyi.dev')
    expect(getNewsletterSiteUrl({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' })).toBe('https://xuyi.dev')
    expect(getNewsletterSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://' })).toBe('https://xuyi.dev')
    expect(getNewsletterSiteUrl({})).toBe('https://xuyi.dev')
  })
})
