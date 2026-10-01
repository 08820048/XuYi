'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PostWithTags } from '@/lib/db'
import { isSponsorActive } from '@/lib/sponsor'
import { collections, freeProject, profile, projects, type Product } from '@/lib/portfolio'
import { AppleIcon, GitHubIcon, MailIcon, RssIcon, SearchIcon, XIcon } from './icons'
import { LightboxProvider, ZoomImage } from './Lightbox'
import { PostTypeBadge } from '@/components/PostTypeBadge'
import { PostUpdateBadge } from '@/components/PostUpdateBadge'

export type HomeTab = 'work' | 'blog'

function VisitButton({ product }: { product: Product }) {
  return (
    <a className="pf-btn pf-btn-visit" href={product.link} target="_blank" rel="noreferrer">
      {product.apple && <AppleIcon />}
      {product.cta}
      <span className="pf-sr"> {product.name}</span>
    </a>
  )
}

function BigCard({ product }: { product: Product }) {
  return (
    <article className="pf-card pf-big">
      <div className="pf-big-top">
        <img className="pf-tile" src={product.logo} alt="" />
        <div className="pf-names">
          <div className="pf-name-line">
            <h3>{product.name}</h3>
            {product.badge && <span className="pf-badge">{product.badge}</span>}
          </div>
          <p className="pf-big-desc">{product.desc}</p>
        </div>
        <VisitButton product={product} />
      </div>
      <div className="pf-shots">
        {product.shots?.map((shot, i) => (
          <ZoomImage key={shot} src={shot} alt={`${product.name} 界面截图 ${i + 1}`} width={530} height={336} />
        ))}
      </div>
    </article>
  )
}

function ThinCard({ product }: { product: Product }) {
  return (
    <article className="pf-card pf-thin">
      <img className="pf-tile" src={product.logo} alt="" />
      <div className="pf-names">
        <div className="pf-name-line">
          <h3>{product.name}</h3>
          {product.badge && <span className="pf-badge">{product.badge}</span>}
        </div>
        <p className="pf-thin-desc">{product.desc}</p>
      </div>
      {product.miniCode ? (
        <ZoomImage className="pf-mini-code" src={product.miniCode} alt="鸭小账小程序码，微信扫码打开" width={80} height={80} />
      ) : (
        <VisitButton product={product} />
      )}
    </article>
  )
}

function ProductSection({ label, products }: { label: string; products: Product[] }) {
  return (
    <section aria-label={label}>
      <h2 className="pf-label">{label}</h2>
      {products.map((product) =>
        product.size === 'big' ? <BigCard key={product.id} product={product} /> : <ThinCard key={product.id} product={product} />
      )}
    </section>
  )
}

function formatDate(ts: number) {
  const d = new Date(ts * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

function BlogSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ slug: string; title: string; published_at: number }[]>([])
  const [loading, setLoading] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 30)
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.clearTimeout(focusTimer)
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    const trimmed = query.trim()
    if (!open || !trimmed) {
      setResults([])
      setLoading(false)
      return
    }
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        const data = (await res.json()) as { results?: { slug: string; title: string; published_at: number }[] }
        setResults(data.results ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [open, query])

  return (
    <div className="pf-search">
      <button
        ref={buttonRef}
        type="button"
        className="pf-search-btn"
        aria-label="搜索文章"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <SearchIcon />
      </button>
      {open &&
        createPortal(
          <div className="pf-search-backdrop">
            <div
              ref={panelRef}
              className="pf-search-panel"
              role="dialog"
              aria-modal="true"
              aria-label="搜索文章"
            >
              <input
                ref={inputRef}
                value={query}
                placeholder="搜索文章"
                aria-label="搜索文章"
                onChange={(event) => setQuery(event.target.value)}
              />
              {query.trim() && (
                <div className="pf-search-results" aria-live="polite">
                  {loading && results.length === 0 && <p>搜索中…</p>}
                  {!loading && results.length === 0 && <p>没有找到相关文章</p>}
                  {results.map((result) => (
                    <Link key={result.slug} href={`/${result.slug}`} className="pf-search-hit" onClick={() => setOpen(false)}>
                      <span>{result.title}</span>
                      <time dateTime={new Date(result.published_at * 1000).toISOString()}>{formatDate(result.published_at)}</time>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

function blogHref(page: number) {
  return page <= 1 ? '/?tab=blog' : `/?tab=blog&page=${page}`
}

function InlineSubscribe() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && !done) inputRef.current?.focus()
  }, [open, done])

  useEffect(() => {
    if (!open || done || loading || email.trim()) return
    const timer = window.setTimeout(() => {
      setOpen(false)
      setEmail('')
      setError('')
    }, 4000)
    return () => window.clearTimeout(timer)
  }, [open, done, loading, email])

  useEffect(() => {
    if (!done) return
    const timer = window.setTimeout(() => {
      setDone(false)
      setOpen(false)
      setEmail('')
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [done])

  function close() {
    if (loading) return
    setOpen(false)
    setEmail('')
    setError('')
    setDone(false)
  }

  function onBlur(event: React.FocusEvent<HTMLInputElement>) {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.form?.contains(next)) return
    if (!event.currentTarget.value.trim() && !done) close()
  }

  async function subscribe(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || loading || done) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('请输入有效的邮箱地址。')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        setDone(true)
      } else {
        setError(res.status === 400 ? '请输入有效的邮箱地址。' : '提交失败，请稍后重试。')
      }
    } catch {
      setError('网络错误，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pf-sub">
      <div className="pf-btn-row">
        <a className="pf-btn pf-btn-dark" href={profile.xUrl} target="_blank" rel="noreferrer">
          Follow on <XIcon />
        </a>
        {!open && (
          <button className="pf-btn pf-btn-light" type="button" aria-expanded={false} onClick={() => setOpen(true)}>
            订阅
          </button>
        )}
      </div>
      <div className={`pf-sub-panel${open ? ' is-open' : ''}`}>
        <div className="pf-sub-panel-inner" inert={!open ? true : undefined}>
          {done ? (
            <p className="pf-sub-ok" role="status">已订阅</p>
          ) : (
            <form className="pf-sub-form" noValidate onSubmit={subscribe}>
              <input
                ref={inputRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                placeholder="you@email"
                aria-label="邮箱"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (error) setError('')
                }}
                onBlur={onBlur}
              />
              <button
                className="pf-btn pf-btn-dark pf-sub-send"
                type="submit"
                disabled={loading}
                onMouseDown={(event) => event.preventDefault()}
              >
                确认
              </button>
            </form>
          )}
          {error && <p className="pf-sub-error" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  )
}

function BlogList({
  posts,
  currentPage,
  totalPages,
}: {
  posts: PostWithTags[]
  currentPage: number
  totalPages: number
}) {
  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) pages.push(i)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }

  return (
    <section aria-label="博客">
      {posts.length === 0 ? (
        <p className="pf-empty">还没有文章</p>
      ) : (
        <div className="pf-post-list">
          {posts.map((post) => (
            <Link key={post.slug} href={`/${post.slug}`} className="pf-post">
              <span className="pf-post-heading">
                <h3>{post.title}</h3>
                <PostTypeBadge type={post.post_type} />
                <PostUpdateBadge post={post} />
              </span>
              <span className="pf-post-leader" aria-hidden="true" />
              <time dateTime={new Date(post.published_at * 1000).toISOString()}>
                {formatDate(post.published_at)}
              </time>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="pf-pager" aria-label="分页">
          {currentPage > 1 && <Link href={blogHref(currentPage - 1)}>上一页</Link>}
          {pages.map((page, i) =>
            page === '...' ? (
              <span key={`dot-${i}`}>…</span>
            ) : (
              <Link key={page} href={blogHref(page)} aria-current={page === currentPage ? 'page' : undefined}>
                {page}
              </Link>
            ),
          )}
          {currentPage < totalPages && <Link href={blogHref(currentPage + 1)}>下一页</Link>}
        </nav>
      )}
    </section>
  )
}

export function PortfolioHome({
  posts,
  currentPage,
  totalPages,
  initialTab,
}: {
  posts: PostWithTags[]
  currentPage: number
  totalPages: number
  initialTab: HomeTab
}) {
  const router = useRouter()
  const [sponsorActive] = useState(isSponsorActive)

  function openBlog() {
    if (initialTab === 'blog' && currentPage === 1) return
    router.push('/?tab=blog')
  }

  function openWork() {
    if (initialTab === 'work') return
    router.push('/')
  }

  return (
    <LightboxProvider>
      <div className="pf-root">
        <div className="pf-page">
          <div className="pf-grid">
            <aside className="pf-side">
              <section className="pf-card pf-identity" aria-label="身份">
                <div className="pf-avatar-row">
                  <img className="pf-avatar" src={profile.avatar} alt="XuYi" />
                  <a className="pf-btn pf-btn-light pf-btn-icon" href={`mailto:${profile.email}`} aria-label="发邮件给 XuYi">
                    <MailIcon />
                  </a>
                </div>
                <h1 className="pf-name">{profile.name}</h1>
                <p className="pf-bio">{`${profile.bio.join('')}${profile.blogTagline}`}</p>
                <InlineSubscribe />
                <hr className="pf-divider" />
                <div className="pf-socials">
                  <a href={profile.xUrl} target="_blank" rel="noreferrer" aria-label="X">
                    <XIcon />
                  </a>
                  <a href={profile.github} target="_blank" rel="noreferrer" aria-label="GitHub">
                    <GitHubIcon />
                  </a>
                  <a href="/feed.xml" aria-label="RSS">
                    <RssIcon />
                  </a>
                </div>
              </section>

              <section className="pf-collections" aria-label="产品图标">
                <h2 className="pf-label">My Project Collections</h2>
                <ul className="pf-icon-row">
                  {collections.map((item) => (
                    <li key={item.name}>
                      <a href={item.link} target="_blank" rel="noreferrer" aria-label={item.name}>
                        <img className="pf-tile" src={item.logo} alt="" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>

            <div className="pf-right">
              <div className="pf-switch-row">
                <div className="pf-switch" role="tablist" aria-label="内容切换">
                  <span className={`pf-switch-pill${initialTab === 'blog' ? ' is-blog' : ''}`} aria-hidden="true" />
                  <button type="button" role="tab" aria-selected={initialTab === 'work'} onClick={openWork}>
                    作品
                  </button>
                  <button type="button" role="tab" aria-selected={initialTab === 'blog'} onClick={openBlog}>
                    写作
                  </button>
                </div>
                {initialTab === 'blog' && <BlogSearch />}
              </div>

              {initialTab === 'work' ? (
                <>
                  <ProductSection label="FREE PROJECT" products={freeProject} />
                  <ProductSection label="PROJECTS" products={projects} />
                </>
              ) : (
                <BlogList posts={posts} currentPage={currentPage} totalPages={totalPages} />
              )}
            </div>
          </div>

          <footer className="pf-foot">
            <div className="pf-foot-row">
              <div>
                <p className="pf-foot-links">
                  <Link href="/about">关于</Link>
                  <Link href="/links">友联</Link>
                  <Link href="/diary">日记</Link>
                </p>
                <p>
                  合作交流,请联系:
                  {' '}
                  <a href={`mailto:${profile.email}`}>{profile.email}</a>
                </p>
              </div>
              {sponsorActive && (
                <aside className="pf-sponsor" aria-label="赞助">
                  <span>赞助</span>
                  <span aria-hidden="true">·</span>
                  <a href="https://bufancv.com" target="_blank" rel="noopener noreferrer">
                    AI简历
                  </a>
                </aside>
              )}
            </div>
          </footer>
        </div>
      </div>
    </LightboxProvider>
  )
}
