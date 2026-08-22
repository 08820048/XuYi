import { renderSubscriptionResultPage, getNewsletterSiteUrl } from '@/lib/newsletter'
import { confirmSubscriberByToken } from '@/lib/db'
import { getRouteEnvWithDb } from '@/lib/server/route-helpers'
import { NextResponse, type NextRequest } from 'next/server'

function htmlResponse(html: string, status = 200) {
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// 兼容改为直接订阅前已发送的历史确认链接
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim() || ''

  const route = await getRouteEnvWithDb('数据库未配置')
  const siteName = route.ok ? route.env.NEXT_PUBLIC_SITE_NAME?.trim() || 'XuYi' : 'XuYi'
  const siteUrl = route.ok ? getNewsletterSiteUrl(route.env) : 'https://xuyi.dev'

  if (!route.ok || !token) {
    return htmlResponse(renderSubscriptionResultPage({
      title: '链接无效',
      message: !route.ok
        ? '站点数据库暂不可用，请稍后重试。'
        : '确认链接缺少有效凭证，请回到订阅邮件重新复制完整链接。',
      success: false,
      siteName,
      siteUrl,
    }), 400)
  }

  const confirmed = await confirmSubscriberByToken(route.db, token).catch((error) => {
    console.error('Subscribe confirm error:', error)
    return null
  })

  if (confirmed === null) {
    return htmlResponse(renderSubscriptionResultPage({
      title: '操作失败',
      message: '站点暂时不可用，请稍后重试。',
      success: false,
      siteName,
      siteUrl,
    }), 500)
  }

  return htmlResponse(renderSubscriptionResultPage({
    title: confirmed ? '订阅成功' : '链接无效',
    message: confirmed
      ? '感谢订阅！之后博客有新文章时会第一时间邮件通知你。'
      : '这个确认链接不存在或已失效，可以回到博客重新提交订阅。',
    success: confirmed,
    siteName,
    siteUrl,
  }), confirmed ? 200 : 404)
}
