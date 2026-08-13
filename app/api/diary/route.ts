import {
  createDiaryEntry,
  getDiaryEntryBySlug,
  updateDiaryEntryBySlug,
} from '@/lib/db'
import { invalidatePublicContentCache } from '@/lib/cache'
import { buildDiaryEntryPayload } from '@/lib/diary-payload'
import {
  ensureAuthenticatedRequest,
  getRouteContextWithDb,
  jsonError,
  jsonOk,
  parseJsonBody,
} from '@/lib/server/route-helpers'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const route = await getRouteContextWithDb('数据库未配置')
    if (!route.ok) return route.response
    const { env, db } = route

    const authError = await ensureAuthenticatedRequest(req, db)
    if (authError) return authError

    const payload = await parseJsonBody<Record<string, unknown>>(req)
    const entryPayload = await buildDiaryEntryPayload(payload)

    const id = await createDiaryEntry(db, {
      ...entryPayload,
      source: 'admin',
      source_email: null,
    })

    await invalidatePublicContentCache(env)

    return jsonOk({
      success: true,
      id,
      slug: entryPayload.slug,
    })
  } catch (error) {
    if (error instanceof Error && /标题和内容不能为空/.test(error.message)) {
      return jsonError(error.message, 400)
    }
    if (error instanceof Error && /UNIQUE constraint failed: diary_entries\.slug/i.test(error.message)) {
      return jsonError('slug 已存在，请换一个', 409)
    }
    console.error('Save diary error:', error)
    return jsonError('保存失败: ' + (error as Error).message, 500)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const route = await getRouteContextWithDb('数据库未配置')
    if (!route.ok) return route.response
    const { env, db } = route

    const authError = await ensureAuthenticatedRequest(req, db)
    if (authError) return authError

    const payload = await parseJsonBody<Record<string, unknown>>(req)
    const currentSlug = typeof payload.current_slug === 'string'
      ? payload.current_slug.trim()
      : (typeof payload.slug === 'string' ? payload.slug.trim() : '')

    if (!currentSlug) {
      return jsonError('slug 不能为空', 400)
    }

    const currentEntry = await getDiaryEntryBySlug(db, currentSlug)
    if (!currentEntry) {
      return jsonError('日记不存在', 404)
    }

    const nextSlug = typeof payload.new_slug === 'string'
      ? payload.new_slug
      : (typeof payload.slug === 'string' ? payload.slug : currentSlug)
    const entryPayload = await buildDiaryEntryPayload({
      ...payload,
      slug: nextSlug,
    })

    await updateDiaryEntryBySlug(db, currentSlug, entryPayload)
    await invalidatePublicContentCache(env)

    return jsonOk({ success: true, slug: entryPayload.slug })
  } catch (error) {
    if (error instanceof Error && /标题和内容不能为空/.test(error.message)) {
      return jsonError(error.message, 400)
    }
    if (error instanceof Error && /UNIQUE constraint failed: diary_entries\.slug/i.test(error.message)) {
      return jsonError('slug 已存在，请换一个', 409)
    }
    console.error('Auto-save diary error:', error)
    return jsonError('自动保存失败: ' + (error as Error).message, 500)
  }
}
