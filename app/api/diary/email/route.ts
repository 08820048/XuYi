import { getSetting } from '@/lib/db'
import { publishDiaryEmail } from '@/lib/diary-email-ingest'
import { getRouteContextWithDb, jsonError, jsonOk, parseJsonBody } from '@/lib/server/route-helpers'
import type { NextRequest } from 'next/server'

type InboundDiaryEmail = {
  from?: string
  to?: string
  subject?: string
  text?: string
  html?: string
  cover_image?: string
}

export async function POST(req: NextRequest) {
  try {
    const route = await getRouteContextWithDb('数据库未配置')
    if (!route.ok) return route.response
    const { env, db } = route

    const secret = await getSetting(db, 'diary_inbound_secret')
    const incomingSecret = req.headers.get('x-diary-secret') || ''
    if (!secret || incomingSecret !== secret) {
      return jsonError('Unauthorized', 401)
    }

    const body = await parseJsonBody<InboundDiaryEmail>(req)
    const from = typeof body.from === 'string' ? body.from.trim() : ''
    const to = typeof body.to === 'string' ? body.to.trim() : ''
    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    const html = typeof body.html === 'string' ? body.html.trim() : ''
    const coverImage = typeof body.cover_image === 'string' ? body.cover_image.trim() : ''

    const result = await publishDiaryEmail(db, env, {
      from,
      to,
      subject,
      text,
      html,
      cover_image: coverImage,
    })

    return jsonOk({ success: true, id: result.id, slug: result.slug })
  } catch (error) {
    if (error instanceof Error && /标题和内容不能为空/.test(error.message)) {
      return jsonError(error.message, 400)
    }
    if (error instanceof Error && /未启用|未允许|不匹配/.test(error.message)) {
      return jsonError(error.message, 403)
    }
    console.error('Inbound diary email failed:', error)
    return jsonError('邮件发布失败: ' + (error as Error).message, 500)
  }
}
