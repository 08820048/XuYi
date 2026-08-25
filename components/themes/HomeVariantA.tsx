'use client'

// Variant A: 精致极简 / 工程档案

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
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}.${day}`
}

export function HomeVariantA({
  posts,
  navLinks,
  currentPage,
  totalPages,
}: HomeProps) {
  return (
    <div className="theme-home-refined min-h-full flex flex-col" style={{ background: 'var(--background)' }}>
      <SiteHeader
        navLinks={navLinks}
      />

      <main className="refined-home-main flex-1 mx-auto w-full" style={{ maxWidth: 860, padding: '32px 32px 120px' }}>
        {/* Post list */}
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--stone-gray)', fontSize: 14 }}>
            还没有文章
          </div>
        ) : (
          <>
            <div>
              {posts.map((post) => {
                return (
                  <article
                    key={post.slug}
                    className="archive-post"
                  >
                    <Link
                      href={`/${post.slug}`}
                      className="group archive-post-link refined-post-link"
                    >
                      <div className="archive-post-heading">
                        <h2 className="archive-post-title refined-post-title">
                          {post.title}
                        </h2>
                        <PostTypeBadge type={post.post_type} />
                        <PostUpdateBadge post={post} />
                        {post.is_pinned === 1 && (
                          <span className="archive-post-pinned">置顶</span>
                        )}
                        {post.password && (
                          <svg
                            width="14" height="14" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"
                            aria-label="加密文章"
                          >
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                        )}
                      </div>

                      <span className="archive-post-leader" aria-hidden="true" />
                      <time
                        className="archive-post-date"
                        dateTime={new Date(post.published_at * 1000).toISOString()}
                      >
                        {formatDateShort(post.published_at)}
                      </time>
                    </Link>
                  </article>
                )
              })}
            </div>

            <div style={{ paddingTop: 16 }}>
              <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/" />
            </div>

            <SubscribeForm />
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
