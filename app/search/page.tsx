import { searchPosts } from '@/lib/db'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import Link from 'next/link'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { PostTypeBadge } from '@/components/PostTypeBadge'
import type { SiteNavLink } from '@/lib/site'
import { getSiteHeaderData } from '@/lib/site'
import type { Theme } from '@/lib/appearance'

export const metadata = {
  title: '搜索结果',
  robots: { index: false, follow: true },
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() || ''

  let posts: Awaited<ReturnType<typeof searchPosts>> = []
  let navLinks: SiteNavLink[] = []
  let defaultTheme: Theme = 'kami'

  try {
    const env = await getAppCloudflareEnv()
    if (env?.DB) {
      const headerData = await getSiteHeaderData(env.DB)
      navLinks = headerData.navLinks
      defaultTheme = headerData.defaultTheme

      if (query) {
        posts = await searchPosts(env.DB, query, 100)
      }
    }
  } catch (e) {
    console.error('Search page error:', e)
  }

  return (
    <div className="min-h-full flex flex-col bg-[var(--background)]">
      <SiteHeader
        initialTheme={defaultTheme}
        navLinks={navLinks}
      />

      <main className="kami-page-main">
        <header className="kami-page-header">
          <p className="kami-label">00 · Search</p>
          <h1 className="kami-display">搜索结果</h1>
          {query ? (
            <p className="kami-lead">
              关键词 “{query}” 找到 {posts.length} 篇文章
            </p>
          ) : (
            <p className="kami-lead">请输入搜索关键词</p>
          )}
        </header>

        {query && posts.length === 0 ? (
          <p className="kami-empty">未找到相关文章，试试其他关键词。</p>
        ) : query ? (
          <div className="kami-post-list">
            {posts.map((post) => (
              <article key={post.slug} className="kami-post">
                <Link href={`/${post.slug}`} className="kami-post-link kami-post-link--stack">
                  <div className="kami-post-main">
                    <h2 className="kami-post-title">
                      {post.title}
                    </h2>
                    <div className="kami-post-badges">
                      <PostTypeBadge type={post.post_type} />
                      {post.password && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="加密文章" className="kami-lock">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      )}
                      {post.is_pinned === 1 && <span className="kami-tag">置顶</span>}
                    </div>
                    {post.description && (
                      <p className="kami-post-excerpt">{post.description}</p>
                    )}
                    <time className="kami-post-date">{formatDate(post.published_at)}</time>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  )
}
