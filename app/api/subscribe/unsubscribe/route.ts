import { getNewsletterSiteUrl, renderSubscriptionResultPage } from '@/lib/newsletter'
import { unsubscribeSubscriberByToken } from '@/lib/db'
import { getRouteEnvWithDb } from '@/lib/server/route-helpers'
import { NextResponse, type NextRequest } from 'next/server'

function htmlResponse(html: string, status = 200) {
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// 退订：通知邮件底部的退订链接。
// GET 给邮件正文里的普通链接用；POST 配合 List-Unsubscribe-Post 实现邮件客户端一键退订（预取器不会发 POST）。
async function handle(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim() || ''

  const route = await getRouteEnvWithDb('数据库未配置')
  const siteName = route.ok ? route.env.NEXT_PUBLIC_SITE_NAME?.trim() || 'XuYi' : 'XuYi'
  const siteUrl = route.ok ? getNewsletterSiteUrl(route.env) : 'https://xuyi.dev'

  if (!route.ok || !token) {
    return htmlResponse(renderSubscriptionResultPage({
      title: '链接无效',
      message: !route.ok
        ? '站点数据库暂不可用，请稍后重试。'
        : '退订链接缺少有效凭证，请回到邮件重新复制完整链接。',
      success: false,
      siteName,
      siteUrl,
    }), 400)
  }

  try {
    const unsubscribed = await unsubscribeSubscriberByToken(route.db, token)

    return htmlResponse(renderSubscriptionResultPage({
      title: unsubscribed ? '已退订' : '链接无效',
      message: unsubscribed
        ? '你已退订博客更新通知，之后不会再收到邮件。如果改变主意，欢迎随时回来重新订阅。'
        : '这个退订链接不存在或已失效。',
      success: unsubscribed,
      siteName,
      siteUrl,
    }), unsubscribed ? 200 : 404)
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return htmlResponse(renderSubscriptionResultPage({
      title: '操作失败',
      message: '站点暂时不可用，请稍后重试。',
      success: false,
      siteName,
      siteUrl,
    }), 500)
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
