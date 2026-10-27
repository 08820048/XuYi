import { getPosts, getPostsCount, getTranslatedPosts, getTranslatedPostsCount } from '@/lib/db'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { HomeClient } from '@/components/HomeClient'
import type { HomeTab } from '@/components/home/PortfolioHome'
import { getSiteUrl } from '@/lib/site-config'
import { LOCALE_META, localePath, t, type Locale } from '@/lib/i18n'
import '@/app/portfolio-home.css'
import '@/app/home-v2.css'

const PAGE_SIZE = 20
const BASE_URL = getSiteUrl()

export async function HomeView({
  page: pageStr,
  tab,
  lang = 'zh',
}: {
  page?: string
  tab?: string
  lang?: Locale
}) {
  const currentPage = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const initialTab: HomeTab = tab === 'blog' || currentPage > 1 ? 'blog' : 'work'

  let posts: Awaited<ReturnType<typeof getPosts>> = []
  let totalCount = 0
  try {
    const env = await getAppCloudflareEnv()
    if (env?.DB) {
      ;[posts, totalCount] =
        lang === 'zh'
          ? await Promise.all([
              getPosts(env.DB, PAGE_SIZE, (currentPage - 1) * PAGE_SIZE),
              getPostsCount(env.DB),
            ])
          : await Promise.all([
              getTranslatedPosts(env.DB, lang, PAGE_SIZE, (currentPage - 1) * PAGE_SIZE),
              getTranslatedPostsCount(env.DB, lang),
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
            url: `${BASE_URL}${localePath('/', lang)}`,
            description: t(lang, 'siteDescription'),
            inLanguage: LOCALE_META[lang].htmlLang,
            potentialAction: {
              '@type': 'SearchAction',
              target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}${localePath('/search', lang)}?q={search_term_string}` },
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
