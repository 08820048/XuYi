'use client'

// Variant A: 精致极简 — evolution of current design
// Better rhythm, date/meta sidebar, restrained metadata, subtle hover

import Link from 'next/link'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { Pagination } from '@/components/Pagination'
import { PostTypeBadge } from '@/components/PostTypeBadge'
import { PostUpdateBadge } from '@/components/PostUpdateBadge'
import type { HomeProps } from '@/components/HomeClient'

function formatDateShort(ts: number) {
  const d = new Date(ts * 1000)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}.${day}`
}

function formatYear(ts: number) {
  return new Date(ts * 1000).getFullYear()
}

export function HomeVariantA({
  posts,
  categories,
  navLinks,
  currentPage,
  totalPages,
}: HomeProps) {
  return (
    <div className="theme-home-refined min-h-full flex flex-col" style={{ background: 'var(--background)' }}>
      <SiteHeader
        navLinks={navLinks}
        categories={categories}
      />

      <main className="refined-home-main flex-1 mx-auto w-full" style={{ maxWidth: 860, padding: '0 32px 120px' }}>
        {/* Post list */}
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--stone-gray)', fontSize: 14 }}>
            还没有文章
          </div>
        ) : (
          <>
            <div>
              {posts.map((post, i) => {
                return (
                  <article
                    key={post.slug}
                    style={{
                      borderTop: `1px solid var(--editor-line)`,
                      marginTop: i === 0 ? 20 : 0,
                    }}
                  >
                    <Link
                      href={`/${post.slug}`}
                      className="group refined-post-link"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '72px 1fr',
                        gap: 28,
                        padding: '32px 0',
                        textDecoration: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {/* Date sidebar */}
                      <div style={{
                        paddingTop: 5,
                        fontSize: 12,
                        color: 'var(--stone-gray)',
                        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                        lineHeight: 1.6,
                        flexShrink: 0,
                      }}>
                        <div>{formatDateShort(post.published_at)}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>{formatYear(post.published_at)}</div>
                      </div>

                      {/* Content */}
                      <div>
                        <h2 className="refined-post-title text-[var(--editor-ink)] transition-colors duration-200 group-hover:text-[var(--editor-accent)]" style={{
                          margin: 0,
                          fontSize: 22,
                          fontWeight: 700,
                          lineHeight: 1.35,
                          letterSpacing: 0,
                          fontFamily: 'Georgia, "Noto Serif SC", serif',
                        }}>
                          {post.title}
                          <PostTypeBadge type={post.post_type} className="ml-2 align-middle" />
                          <PostUpdateBadge post={post} className="ml-2 align-middle" />
                          {post.password && (
                            <svg
                              width="15" height="15" viewBox="0 0 24 24"
                              fill="none" stroke="currentColor" strokeWidth="2"
                              strokeLinecap="round" strokeLinejoin="round"
                              style={{ display: 'inline', marginLeft: 8, verticalAlign: 'middle', color: 'var(--stone-gray)' }}
                            >
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                          )}
                        </h2>

                        {post.description && (
                          <p style={{
                            margin: '10px 0 0',
                            fontSize: 14,
                            lineHeight: 1.75,
                            color: 'var(--editor-muted)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {post.description}
                          </p>
                        )}

                        <div style={{
                          marginTop: 12,
                          fontSize: 12,
                          color: 'var(--stone-gray)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}>
                          {post.category && (
                            <>
                              <span style={{ color: 'var(--editor-accent)', fontWeight: 500 }}>{post.category}</span>
                              <span aria-hidden>·</span>
                            </>
                          )}
                          {post.is_pinned === 1 && (
                            <>
                              <span>置顶</span>
                              <span aria-hidden>·</span>
                            </>
                          )}
                          <span>阅读全文</span>
                          <span aria-hidden>→</span>
                        </div>
                      </div>
                    </Link>
                  </article>
                )
              })}
            </div>

            <div style={{ paddingTop: 16 }}>
              <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/" />
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
