import { subscribeEmail } from '@/lib/newsletter'
import { getRouteEnvWithDb, jsonError, jsonOk, parseJsonBody } from '@/lib/server/route-helpers'
import type { NextRequest } from 'next/server'

// 公开订阅入口：记录 pending 并发送确认邮件（双重确认第一步）
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

    // 统一话术，不通过响应内容和耗时暴露该邮箱是否已订阅
    return jsonOk({
      success: true,
      message: '确认邮件已发送，请查收并点击确认链接；若该邮箱已订阅过，则不会重复发送。',
    })
  } catch (error) {
    console.error('Subscribe error:', error)
    return jsonError('订阅失败，请稍后重试', 500)
  }
}
