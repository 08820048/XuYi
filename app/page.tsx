import { getPosts, getPostsCount } from '@/lib/db'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { HomeClient } from '@/components/HomeClient'
import type { HomeTab } from '@/components/home/PortfolioHome'
import { getSiteUrl } from '@/lib/site-config'
import './portfolio-home.css'

const PAGE_SIZE = 20
const BASE_URL = getSiteUrl()

// Cloudflare Workers 缓存策略
export const revalidate = 3600 // 1小时缓存
export const dynamicParams = true

export const metadata = {
  alternates: {
    canonical: BASE_URL,
  },
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>
}) {
  const { page: pageStr, tab } = await searchParams
  const currentPage = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const initialTab: HomeTab = tab === 'blog' || currentPage > 1 ? 'blog' : 'work'

  let posts: Awaited<ReturnType<typeof getPosts>> = []
  let totalCount = 0
  try {
    const env = await getAppCloudflareEnv()
    if (env?.DB) {
      ;[posts, totalCount] = await Promise.all([
        getPosts(env.DB, PAGE_SIZE, (currentPage - 1) * PAGE_SIZE),
        getPostsCount(env.DB),
      ])
    }
  } catch (e) {
    console.error('Homepage: failed to fetch posts', e)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: "XuYi",
            url: BASE_URL,
            description: '写游戏开发，也写 AI。',
            potentialAction: {
              '@type': 'SearchAction',
              target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/search?q={search_term_string}` },
              'query-input': 'required name=search_term_string',
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: "XuYi",
            url: BASE_URL,
            logo: { '@type': 'ImageObject', url: `${BASE_URL}/icon-512.png` },
          }),
        }}
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Noto+Sans+SC:wght@400;500;700&display=swap"
      />
      <HomeClient
        initialTheme="kami"
        posts={posts}
        categories={[]}
        navLinks={[]}
        currentPage={currentPage}
        totalPages={totalPages}
        categorySlugMap={{}}
        initialTab={initialTab}
      />
    </>
  )
}
