import { HomeView } from '@/components/pages/HomeView'
import { getSiteUrl } from '@/lib/site-config'

const BASE_URL = getSiteUrl()

// Cloudflare Workers 缓存策略
export const revalidate = 3600 // 1小时缓存
export const dynamicParams = true

export const metadata = {
  alternates: {
    canonical: BASE_URL,
    languages: {
      'zh-CN': BASE_URL,
      en: `${BASE_URL}/en`,
      'x-default': BASE_URL,
    },
  },
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>
}) {
  const { page, tab } = await searchParams
  return <HomeView page={page} tab={tab} />
}
