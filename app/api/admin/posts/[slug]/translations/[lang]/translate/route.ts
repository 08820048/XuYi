import { getPostBySlug } from '@/lib/db'
import { isTranslationLang } from '@/lib/i18n'
import {
  failTranslation,
  finishTranslation,
  startTranslation,
  TranslationConflictError,
  translateChunkStep,
  type TranslationContext,
} from '@/lib/translation-service'
import { invalidatePublicContentCache } from '@/lib/cache'
import {
  ensureAuthenticatedRequest,
  getRouteContextWithDb,
  jsonError,
  jsonOk,
  parseJsonBody,
} from '@/lib/server/route-helpers'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ slug: string; lang: string }> }

/**
 * 分步 AI 翻译（Cookie 或 Token 认证）：
 *   { step: 'start' }                      → { total, done, hash }
 *   { step: 'chunk', index, hash }         → { total, done, hash }
 *   { step: 'finish' }                     → { success, title }，译文存为草稿
 * 失败时译文行会被标记为 failed 并记录原因；再次 start 可从已完成的段继续。
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug, lang } = await params
  if (!isTranslationLang(lang)) return jsonError(`不支持的语言：${lang}`, 400)

  const route = await getRouteContextWithDb('DB not configured')
  if (!route.ok) return route.response
  const authError = await ensureAuthenticatedRequest(req, route.db)
  if (authError) return authError

  const post = await getPostBySlug(route.db, decodeURIComponent(slug))
  if (!post || post.status === 'deleted') return jsonError('文章不存在', 404)

  const body = await parseJsonBody<{ step?: string; index?: number; hash?: string }>(req)
  const ctx: TranslationContext = {
    db: route.db,
    env: route.env,
    post: { id: post.id, title: post.title, content: post.content, description: post.description },
    lang,
  }

  try {
    switch (body.step) {
      case 'start':
        return jsonOk(await startTranslation(ctx))
      case 'chunk':
        return jsonOk(await translateChunkStep(ctx, Number(body.index), body.hash))
      case 'finish': {
        const result = await finishTranslation(ctx)
        await invalidatePublicContentCache(route.env)
        return jsonOk({ success: true, ...result })
      }
      default:
        return jsonError('step 必须是 start / chunk / finish', 400)
    }
  } catch (error) {
    if (error instanceof TranslationConflictError) {
      await failTranslation(ctx, error).catch(() => {})
      return jsonError(error.message, 409)
    }
    console.error(`Translation step "${body.step}" failed:`, error)
    await failTranslation(ctx, error).catch(() => {})
    return jsonError(error instanceof Error ? error.message : '翻译失败', 500)
  }
}
