import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPostsByCategory, getPostsCountByCategory, getPublicCategories } from '@/lib/db'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { Pagination } from '@/components/Pagination'
import { PostTypeBadge } from '@/components/PostTypeBadge'
import { PostUpdateBadge } from '@/components/PostUpdateBadge'
import { decodeRouteSegment, getCategoryPath } from '@/lib/route-segments'
import { getSiteHeaderData } from '@/lib/site'
import { getSiteUrl } from '@/lib/site-config'

const PAGE_SIZE = 25
const BASE_URL = getSiteUrl()

export const dynamicParams = true
export const revalidate = 3600

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const slug = decodeRouteSegment(rawSlug)

  try {
    const env = await getAppCloudflareEnv()
    if (!env?.DB) return {}

    const categories = await getPublicCategories(env.DB)
    const category = categories.find((item) => item.slug === slug)
    if (!category) return {}

    return {
      title: `${category.name}`,
      alternates: {
        canonical: `${BASE_URL}${getCategoryPath(category.slug)}`,
      },
    }
  } catch {
    return {}
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug: rawSlug } = await params
  const slug = decodeRouteSegment(rawSlug)
  const { page: pageStr } = await searchParams
  const currentPage = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)

  const env = await getAppCloudflareEnv()
  if (!env?.DB) notFound()

  const categories = await getPublicCategories(env.DB)
  const category = categories.find((item) => item.slug === slug)
  if (!category) notFound()

  const [posts, totalCount, headerData] = await Promise.all([
    getPostsByCategory(env.DB, category.name, PAGE_SIZE, (currentPage - 1) * PAGE_SIZE),
    getPostsCountByCategory(env.DB, category.name),
    getSiteHeaderData(env.DB),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div className="min-h-full flex flex-col bg-[var(--background)]">
      <SiteHeader
        initialTheme={headerData.defaultTheme}
        navLinks={headerData.navLinks}
      />

      <main className="kami-page-main">
        <header className="kami-page-header">
          <p className="kami-label">00 · Category</p>
          <h1 className="kami-display">{category.name}</h1>
          <p className="kami-lead">共 {totalCount} 篇文章</p>
        </header>

        {posts.length === 0 ? (
          <p className="kami-empty">
            这个分类下还没有公开文章。
            {' '}
            <Link href="/">返回首页</Link>
          </p>
        ) : (
          <>
            <div className="kami-post-list">
              {posts.map((post) => (
                <article key={post.slug} className="kami-post">
                  <Link href={`/${post.slug}`} className="kami-post-link">
                    <div className="kami-post-main">
                      <h2 className="kami-post-title">{post.title}</h2>
                      <div className="kami-post-badges">
                        <PostTypeBadge type={post.post_type} />
                        <PostUpdateBadge post={post} />
                      </div>
                    </div>
                    <span className="kami-post-leader" aria-hidden="true" />
                    <time className="kami-post-date">{formatDate(post.published_at)}</time>
                  </Link>
                </article>
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              basePath={getCategoryPath(category.slug)}
            />
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
