import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPostsByCategory, getPostsCountByCategory, getPublicCategories } from '@/lib/db'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { SiteShell } from '@/components/SiteShell'
import { Bookshelf, type ShelfBook } from '@/components/Bookshelf'
import { Pagination } from '@/components/Pagination'
import { PostTypeBadge } from '@/components/PostTypeBadge'
import { PostUpdateBadge } from '@/components/PostUpdateBadge'
import { decodeRouteSegment, getCategoryPath } from '@/lib/route-segments'
import { getSiteHeaderData } from '@/lib/site'
import { getSiteUrl } from '@/lib/site-config'
import { chunkIntoLayers, POSTS_PER_SHELF_PAGE, shelfYearLabel } from '@/lib/bookshelf-layout'

const PAGE_SIZE = POSTS_PER_SHELF_PAGE
const BASE_URL = getSiteUrl()

export const dynamicParams = true
export const revalidate = 3600

function formatDateShort(ts: number) {
  const d = new Date(ts * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
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

  const layers = chunkIntoLayers(posts).map((layerPosts) => ({
    key: layerPosts[0]?.slug ?? 'empty',
    label: shelfYearLabel(layerPosts.map((post) => post.published_at)),
    books: layerPosts.map((post): ShelfBook => ({
      key: post.slug,
      href: `/${post.slug}`,
      title: post.title,
      spineText: post.title,
      meta: <span>{formatDateShort(post.published_at)}</span>,
      badges: (
        <>
          <PostTypeBadge type={post.post_type} />
          <PostUpdateBadge post={post} />
          {post.password ? <span className="kami-tag">加密</span> : null}
        </>
      ),
    })),
  }))

  return (
    <SiteShell
      initialTheme={headerData.defaultTheme}
      navLinks={headerData.navLinks}
    >
      <header className="kami-page-header shelf-hero">
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
          {layers.map((layer) => (
            <Bookshelf
              key={layer.key}
              label={layer.label}
              books={layer.books}
              emptyText="这个分类下还没有公开文章。"
            />
          ))}

          <div className="shelf-after">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              basePath={getCategoryPath(category.slug)}
            />
          </div>
        </>
      )}
    </SiteShell>
  )
}
