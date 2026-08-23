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
        categories={headerData.categories}
        activeCategorySlug={slug}
        showCategoryRail
      />

      <main className="page-main public-main flex-1 mx-auto max-w-3xl w-full px-4 sm:px-6 py-10 sm:py-14">
        <header className="public-page-header">
          <p className="public-page-kicker">CATEGORY / 分类</p>
          <h1 className="public-page-title">
            {category.name}
          </h1>
          <p className="mt-3 text-sm text-[var(--editor-muted)]">
            共 {totalCount} 篇文章
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[var(--editor-muted)] mb-2">这个分类下还没有公开文章</p>
            <Link
              href="/"
              className="text-sm text-[var(--editor-accent)] hover:underline underline-offset-2"
            >
              返回首页
            </Link>
          </div>
        ) : (
          <>
            <div className="record-list">
              {posts.map((post, index) => (
                <article
                  key={post.slug}
                  className="group record-list-item"
                  style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both` }}
                >
                  <Link
                    href={`/${post.slug}`}
                    className="record-list-link"
                  >
                    <span className="record-list-index">{String((currentPage - 1) * PAGE_SIZE + index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                    <h2 className="record-list-title">
                      {post.title}
                      <PostTypeBadge type={post.post_type} />
                      <PostUpdateBadge post={post} />
                    </h2>
                    {post.description ? (
                      <p className="text-sm text-[var(--editor-muted)] leading-relaxed line-clamp-2 mb-2.5">
                        {post.description}
                      </p>
                    ) : null}
                    <div className="record-list-meta">
                      <time>{formatDate(post.published_at)}</time>
                      <span>[{category.name}]</span>
                    </div>
                    </div>
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
