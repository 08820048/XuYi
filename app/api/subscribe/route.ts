import { subscribeEmail } from '@/lib/newsletter'
import { getRouteEnvWithDb, jsonError, jsonOk, parseJsonBody } from '@/lib/server/route-helpers'
import type { NextRequest } from 'next/server'

// 公开订阅入口：邮箱校验通过后直接订阅
export async function POST(req: NextRequest) {
  try {
    const route = await getRouteEnvWithDb('数据库未配置')
    if (!route.ok) return route.response
    const { env, db } = route

    const payload = await parseJsonBody<{ email?: unknown }>(req)
    const result = await subscribeEmail({ ...env, DB: db }, payload.email)

    if (!result.ok) {
      return jsonError('邮箱格式不正确', 400)
    }

    return jsonOk({
      success: true,
      message: '订阅成功，新文章发布时会通过邮件通知你。',
    })
  } catch (error) {
    console.error('Subscribe error:', error)
    return jsonError('订阅失败，请稍后重试', 500)
  }
}
