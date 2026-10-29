import { NextResponse } from 'next/server'
import { getAppCloudflareContext } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

/**
 * 访客的大致位置（国家 / 省 / 城市），直接取 Cloudflare 在请求上附带的信息，只用来在灵动岛里打个招呼。
 * 不读取、不记录、不存储 IP；本地开发和拿不到时返回空对象，前端会自动退回成不带地名的问候。
 */
export async function GET() {
  let place: { country?: string; region?: string; city?: string } = {}
  try {
    const cf = (await getAppCloudflareContext()).cf as
      | { country?: string; region?: string; city?: string }
      | undefined
    if (cf) place = { country: cf.country, region: cf.region, city: cf.city }
  } catch {
    // 本地开发没有 cf：保持空对象
  }
  return NextResponse.json(place, { headers: { 'Cache-Control': 'private, no-store' } })
}
