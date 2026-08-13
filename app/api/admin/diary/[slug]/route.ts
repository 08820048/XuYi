import {
  deleteDiaryEntry,
  getDiaryEntryBySlug,
  updateDiaryEntryBySlug,
} from '@/lib/db'
import { COOKIE_NAME, isAdminAuthenticated } from '@/lib/admin-auth'
import { invalidatePublicContentCache } from '@/lib/cache'
import { buildDiaryDescription, normalizeDiarySlug } from '@/lib/diary-utils'
import { getRouteContextWithDb, jsonError, jsonOk, parseJsonBody } from '@/lib/server/route-helpers'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ slug: string }> }

async function checkAuth(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  return isAdminAuthenticated(token)
}

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!(await checkAuth(req))) {
    return jsonError('Unauthorized', 401)
  }

  const { slug } = await params
  const route = await getRouteContextWithDb('DB not configured')
  if (!route.ok) return route.response

  const entry = await getDiaryEntryBySlug(route.db, slug)
  if (!entry) return jsonError('日记不存在', 404)

  return jsonOk(entry)
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!(await checkAuth(req))) {
    return jsonError('Unauthorized', 401)
  }

  const { slug } = await params
  const route = await getRouteContextWithDb('DB not configured')
  if (!route.ok) return route.response
  const { env, db } = route

  const entry = await getDiaryEntryBySlug(db, slug)
  if (!entry) return jsonError('日记不存在', 404)

  try {
    const payload = await parseJsonBody<{
      slug?: string
      title?: string | null
      content?: string
      html?: string
      description?: string | null
      status?: 'draft' | 'published' | 'deleted'
      is_hidden?: number
      cover_image?: string | null
    }>(req)

    const nextSlug = typeof payload.slug === 'string' ? normalizeDiarySlug(payload.slug) : ''
    const content = typeof payload.content === 'string' ? payload.content : ''
    const description = payload.description !== undefined || payload.content !== undefined
      ? (
          typeof payload.description === 'string' && payload.description.trim()
            ? payload.description.trim()
            : buildDiaryDescription(content)
        )
      : undefined

    await updateDiaryEntryBySlug(db, slug, {
      slug: nextSlug || undefined,
      title: typeof payload.title === 'string'
        ? (payload.title.trim() || null)
        : payload.title,
      content: payload.content,
      html: payload.html,
      description,
      status: payload.status,
      is_hidden: payload.is_hidden,
      cover_image: payload.cover_image,
    })

    await invalidatePublicContentCache(env)

    return jsonOk({ success: true, slug: nextSlug || slug })
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed: diary_entries\.slug/i.test(error.message)) {
      return jsonError('slug 已存在，请换一个', 409)
    }
    console.error('PUT /api/admin/diary/[slug] error:', error)
    return jsonError(error instanceof Error ? error.message : '保存失败', 500)
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!(await checkAuth(req))) {
    return jsonError('Unauthorized', 401)
  }

  const { slug } = await params
  const route = await getRouteContextWithDb('DB not configured')
  if (!route.ok) return route.response
  const { env, db } = route

  try {
    const entry = await getDiaryEntryBySlug(db, slug)
    if (!entry) return jsonError('日记不存在', 404)

    await deleteDiaryEntry(db, slug)
    await invalidatePublicContentCache(env)

    return jsonOk({ success: true })
  } catch (error) {
    console.error('Delete diary failed:', error)
    return jsonError(error instanceof Error ? error.message : '删除失败，请重试', 500)
  }
}
