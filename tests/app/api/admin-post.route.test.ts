import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPostBySlug: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
  isAdminAuthenticated: vi.fn(),
  invalidatePublicContentCache: vi.fn(),
  enqueueBackgroundJob: vi.fn(),
  getRouteContextWithDb: vi.fn(),
  parseJsonBody: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  deletePost: mocks.deletePost,
  getPostBySlug: mocks.getPostBySlug,
  updatePost: mocks.updatePost,
}))

vi.mock('@/lib/admin-auth', () => ({
  COOKIE_NAME: 'qmblog_admin',
  isAdminAuthenticated: mocks.isAdminAuthenticated,
}))

vi.mock('@/lib/cache', () => ({
  invalidatePublicContentCache: mocks.invalidatePublicContentCache,
}))

vi.mock('@/lib/background-jobs', () => ({
  enqueueBackgroundJob: mocks.enqueueBackgroundJob,
}))

vi.mock('@/lib/server/route-helpers', () => ({
  getRouteContextWithDb: mocks.getRouteContextWithDb,
  jsonError: (message: string, status = 500) => Response.json({ error: message }, { status }),
  jsonOk: (data: unknown, status = 200) => Response.json(data, { status }),
  parseJsonBody: mocks.parseJsonBody,
}))

import { PUT } from '@/app/api/admin/posts/[slug]/route'

describe('/api/admin/posts/[slug] route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isAdminAuthenticated.mockResolvedValue(true)
    mocks.getRouteContextWithDb.mockResolvedValue({
      ok: true,
      env: { CACHE: {} },
      db: { kind: 'db' },
      ctx: { waitUntil: vi.fn() },
    })
    mocks.getPostBySlug.mockResolvedValue({ id: 7, slug: 'old-slug' })
    mocks.parseJsonBody.mockResolvedValue({
      slug: 'next_slug',
      title: '文章标题',
      content: '更新后的正文',
      html: '<p>更新后的正文</p>',
      description: '   ',
      tags: ['AI', '写作'],
      cover_image: '/covers/admin.webp',
      status: 'published',
      post_type: 'translation',
      source_url: 'https://example.com/original',
    })
    mocks.invalidatePublicContentCache.mockRejectedValue(new Error('cache down'))
    mocks.enqueueBackgroundJob.mockResolvedValue(undefined)
  })

  it('updates a post, falls back description, and tolerates cache invalidation failures', async () => {
    const request = {
      cookies: {
        get: vi.fn(() => ({ value: 'token' })),
      },
    } as never

    const response = await PUT(request, {
      params: Promise.resolve({ slug: 'old-slug' }),
    })
    const body = await response.json()

    expect(mocks.updatePost).toHaveBeenCalledWith(
      { kind: 'db' },
      7,
      expect.objectContaining({
        slug: 'next_slug',
        title: '文章标题',
        content: '更新后的正文',
        description: '更新后的正文',
        tags: ['AI', '写作'],
        cover_image: '/covers/admin.webp',
        status: 'published',
        post_type: 'translation',
        source_url: 'https://example.com/original',
      }),
    )
    expect(mocks.enqueueBackgroundJob).toHaveBeenCalledTimes(1)
    expect(body).toEqual({ success: true, slug: 'next_slug' })
  })

  it('rejects published reposts without a valid source url', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      title: '转载文章',
      content: '正文',
      status: 'published',
      post_type: 'repost',
      source_url: '',
    })

    const request = {
      cookies: {
        get: vi.fn(() => ({ value: 'token' })),
      },
    } as never

    const response = await PUT(request, {
      params: Promise.resolve({ slug: 'old-slug' }),
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: '转载和翻译文章需要填写有效的原文地址' })
    expect(mocks.updatePost).not.toHaveBeenCalled()
  })
})
