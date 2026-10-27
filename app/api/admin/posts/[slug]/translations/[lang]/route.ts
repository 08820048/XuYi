import {
  deletePostTranslation,
  getPostBySlug,
  getPostTranslation,
  setPostTranslationStatus,
  upsertPostTranslation,
} from '@/lib/db'
import { invalidatePublicContentCache } from '@/lib/cache'
import { isTranslationLang } from '@/lib/i18n'
import { renderMarkdownContent } from '@/lib/markdown'
import { buildAutoDescription } from '@/lib/post-utils'
import {
  ensureAuthenticatedRequest,
  getRouteContextWithDb,
  jsonError,
  jsonOk,
  parseJsonBody,
} from '@/lib/server/route-helpers'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ slug: string; lang: string }> }

// 管理端译文接口：Cookie 或 Bearer Token 均可（便于脚本 / AI 批量写入译文）
async function resolve(req: NextRequest, { params }: Ctx) {
  const { slug, lang } = await params
  if (!isTranslationLang(lang)) return { error: jsonError(`不支持的语言：${lang}`, 400) } as const

  const route = await getRouteContextWithDb('DB not configured')
  if (!route.ok) return { error: route.response } as const

  const authError = await ensureAuthenticatedRequest(req, route.db)
  if (authError) return { error: authError } as const

  const post = await getPostBySlug(route.db, decodeURIComponent(slug))
  if (!post) return { error: jsonError('文章不存在', 404) } as const

  return { route, post, lang } as const
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const resolved = await resolve(req, ctx)
  if ('error' in resolved) return resolved.error
  const translation = await getPostTranslation(resolved.route.db, resolved.post.id, resolved.lang)
  if (!translation) return jsonError('该语言的译文不存在', 404)
  return jsonOk(translation)
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const resolved = await resolve(req, ctx)
  if ('error' in resolved) return resolved.error
  const { route, post, lang } = resolved

  try {
    const payload = await parseJsonBody<Record<string, unknown>>(req)
    const title = typeof payload.title === 'string' ? payload.title.trim() : ''
    const content = typeof payload.content === 'string' ? payload.content.trim() : ''
    const rawHtml = typeof payload.html === 'string' ? payload.html.trim() : ''
    const status = payload.status === 'draft' ? 'draft' : 'published'
    if (!title || !content) return jsonError('标题和内容不能为空', 400)

    const description =
      typeof payload.description === 'string' && payload.description.trim()
        ? payload.description.trim()
        : buildAutoDescription(content)
    const html = rawHtml || (await renderMarkdownContent(content))

    await upsertPostTranslation(route.db, post.id, lang, { title, content, html, description, status })
    await invalidatePublicContentCache(route.env)

    return jsonOk({ success: true, slug: post.slug, lang, status })
  } catch (error) {
    console.error('Upsert translation failed:', error)
    return jsonError(error instanceof Error ? error.message : '保存译文失败', 500)
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const resolved = await resolve(req, ctx)
  if ('error' in resolved) return resolved.error
  const { route, post, lang } = resolved
  const removed = await deletePostTranslation(route.db, post.id, lang)
  if (!removed) return jsonError('该语言的译文不存在', 404)
  await invalidatePublicContentCache(route.env)
  return jsonOk({ success: true })
}

// 发布 / 下线译文：{ status: 'published' | 'draft' }
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const resolved = await resolve(req, ctx)
  if ('error' in resolved) return resolved.error
  const { route, post, lang } = resolved

  const payload = await parseJsonBody<{ status?: unknown }>(req)
  if (payload.status !== 'published' && payload.status !== 'draft') {
    return jsonError("status 必须是 'published' 或 'draft'", 400)
  }
  const ok = await setPostTranslationStatus(route.db, post.id, lang, payload.status)
  if (!ok) return jsonError('没有可发布的译文（不存在、翻译中或翻译失败）', 409)
  await invalidatePublicContentCache(route.env)
  return jsonOk({ success: true, status: payload.status })
}
