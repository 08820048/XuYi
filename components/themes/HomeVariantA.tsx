'use client'

// Kami 纸风格首页：暖米纸 · 衬线层级 · 平面克制

import Link from 'next/link'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { Pagination } from '@/components/Pagination'
import { PostTypeBadge } from '@/components/PostTypeBadge'
import { PostUpdateBadge } from '@/components/PostUpdateBadge'
import { SubscribeForm } from '@/components/SubscribeForm'
import type { HomeProps } from '@/components/HomeClient'

function formatDateShort(ts: number) {
  const d = new Date(ts * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

export function HomeVariantA({
  posts,
  navLinks,
  currentPage,
  totalPages,
}: HomeProps) {
  return (
    <div className="kami-home">
      <SiteHeader navLinks={navLinks} />

      <main className="kami-home-main">
        <section aria-label="文章">
          {posts.length === 0 ? (
            <p className="kami-empty">还没有文章</p>
          ) : (
            <div className="kami-post-list">
              {posts.map((post) => (
                <article key={post.slug} className="kami-post">
                  <Link href={`/${post.slug}`} className="kami-post-link">
                    <div className="kami-post-main">
                      <h3 className="kami-post-title">{post.title}</h3>
                      <div className="kami-post-badges">
                        <PostTypeBadge type={post.post_type} />
                        <PostUpdateBadge post={post} />
                        {post.is_pinned === 1 && (
                          <span className="kami-tag">置顶</span>
                        )}
                        {post.password && (
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-label="加密文章"
                            className="kami-lock"
                          >
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="kami-post-leader" aria-hidden="true" />
                    <time
                      className="kami-post-date"
                      dateTime={new Date(post.published_at * 1000).toISOString()}
                    >
                      {formatDateShort(post.published_at)}
                    </time>
                  </Link>
                </article>
              ))}
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/"
          />
        </section>

        {posts.length > 0 && <SubscribeForm />}
      </main>

      <SiteFooter />
    </div>
  )
}
