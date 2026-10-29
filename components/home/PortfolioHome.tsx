'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LangSync } from '@/components/LangSync'
import { SiteIsland } from '@/components/SiteIsland'
import { localePath, t as translate, type Locale } from '@/lib/i18n'
import { useLocale } from '@/lib/i18n-client'
import { openIslandSearch } from '@/lib/island-search'
import type { PostWithTags } from '@/lib/db'
import type { SiteNavLink } from '@/lib/site'
import { isSponsorActive } from '@/lib/sponsor'
import { freeProject, productPlan, profile, projects, type Product } from '@/lib/portfolio'
import { AppleIcon, GitHubIcon, MailIcon, RssIcon, SearchIcon, ThreadsIcon, WhatsAppIcon, XIcon } from './icons'
import { TrafficStats } from './TrafficStats'
import { PostTypeBadge } from '@/components/PostTypeBadge'
import { PostUpdateBadge } from '@/components/PostUpdateBadge'

export type HomeTab = 'work' | 'blog'

function ctaLabel(product: Product, locale: Locale) {
  if (locale === 'zh') return product.cta
  if (product.cta.includes('购买')) return translate(locale, 'buy')
  return product.cta.includes('→') ? `${translate(locale, 'visit')} →` : translate(locale, 'visit')
}

function ProductPlan() {
  const locale = useLocale()
  const { goal, done } = productPlan
  const percent = Math.round((done / goal) * 100)
  return (
    <section className="pf-plan" aria-label={translate(locale, 'planAria')}>
      <h2 className="pf-label">100 Products</h2>
      <div className="pf-plan-head">
        <span className="pf-plan-count">{done}</span>
        <span className="pf-plan-goal">/ {goal}</span>
        <span className="pf-plan-percent">{percent}%</span>
      </div>
      <div
        className="pf-plan-grid"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={done}
        aria-label={translate(locale, 'planDone', { done, goal })}
      >
        {Array.from({ length: goal }, (_, i) => (
          <i
            key={i}
            className={i < done ? 'is-done' : i === done ? 'is-next' : undefined}
            style={i < done ? { animationDelay: `${i * 28}ms` } : undefined}
          />
        ))}
      </div>
      <p className="pf-plan-note">{translate(locale, 'planNote')}</p>
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
  const locale = useLocale()
  return (
    <button
      type="button"
      className="pf-search-btn"
      aria-label={translate(locale, 'searchArticles')}
      title={`${translate(locale, 'searchArticles')} (⌘K)`}
      onClick={openIslandSearch}
    >
      <SearchIcon />
    </button>
  )
}

function blogHref(page: number, locale: Locale) {
  return localePath(page <= 1 ? '/?tab=blog' : `/?tab=blog&page=${page}`, locale)
}

function InlineSubscribe() {
  const locale = useLocale()
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
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
      setError(t('invalidEmail'))
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
        setError(res.status === 400 ? t('invalidEmail') : t('submitFailed'))
      }
    } catch {
      setError(t('networkError'))
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
            {t('subscribe')}
          </button>
        )}
      </div>
      <div className={`pf-sub-panel${open ? ' is-open' : ''}`}>
        <div className="pf-sub-panel-inner" inert={!open ? true : undefined}>
          {done ? (
            <p className="pf-sub-ok" role="status">{t('subscribed')}</p>
          ) : (
            <form className="pf-sub-form" noValidate onSubmit={subscribe}>
              <input
                ref={inputRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                placeholder="you@email"
                aria-label={t('emailLabel')}
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
                {t('confirm')}
              </button>
            </form>
          )}
          {error && <p className="pf-sub-error" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  )
}

/** 单个产品卡片：封面（有截图的才有）+ 图标、名称、一句话简介 + 访问入口。整张卡片就是一个链接。 */
function ProductCard({ product }: { product: Product }) {
  const locale = useLocale()
  const desc = locale === 'en' ? product.descEn : product.desc
  // 封面只用图片（视频不在首页自动播放），取第一张
  const cover = product.shots?.find((shot) => !/\.(mp4|webm|mov)$/i.test(shot))

  return (
    <a className={`pr-card${cover ? ' has-cover' : ''}`} href={product.link} target="_blank" rel="noreferrer">
      {cover && (
        <span className="pr-cover">
          <img src={cover} alt="" loading="lazy" width={530} height={336} />
        </span>
      )}
      <span className="pr-body">
        <span className="pr-head">
          <img className="pr-icon" src={product.logo} alt="" width={36} height={36} />
          <h3>{product.name}</h3>
          {product.badge && <span className="pr-badge">{product.badge}</span>}
        </span>
        <span className="pr-desc">{desc}</span>
        <span className="pr-go">
          {product.apple && <AppleIcon />}
          {ctaLabel(product, locale).replace(/\s*→\s*$/, '')}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3.5 8.5 8.5 3.5M4 3.5h4.5V8" />
          </svg>
        </span>
      </span>
    </a>
  )
}

function hasCover(product: Product) {
  return Boolean(product.shots?.some((shot) => !/\.(mp4|webm|mov)$/i.test(shot)))
}

function ProductList() {
  const groups = [
    { label: 'FREE PROJECT', items: freeProject },
    { label: 'PROJECTS', items: projects },
  ]
  return (
    <div className="pr-list">
      {groups.map((group) => {
        const featured = group.items.filter(hasCover)
        const plain = group.items.filter((product) => !hasCover(product))
        return (
          <section key={group.label} aria-label={group.label}>
            <h2 className="pf-label pr-group">{group.label}</h2>
            {featured.length > 0 && (
              <div className="pr-grid">
                {featured.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
            {plain.length > 0 && (
              <div className={`pr-grid${featured.length > 0 ? ' pr-grid-after' : ''}`}>
                {plain.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function PostRows({ posts }: { posts: PostWithTags[] }) {
  const locale = useLocale()
  return (
    <div className="sv-posts">
      {posts.map((post) => (
        <Link key={post.slug} href={localePath(`/${post.slug}`, locale)} className="sv-post">
          <span className="sv-post-title">
            <h3>{post.title}</h3>
            <PostTypeBadge type={post.post_type} lang={locale} />
            <PostUpdateBadge post={post} />
          </span>
          <time dateTime={new Date(post.published_at * 1000).toISOString()}>{formatDate(post.published_at)}</time>
        </Link>
      ))}
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
  const locale = useLocale()
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) pages.push(i)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }

  return (
    <section aria-label={t('tabWriting')}>
      {posts.length === 0 ? (
        <p className="pf-empty">{t(locale === 'en' ? 'noTranslatedPostsYet' : 'noPostsYet')}</p>
      ) : (
        <PostRows posts={posts} />
      )}

      {totalPages > 1 && (
        <nav className="pf-pager" aria-label={t('pagination')}>
          {currentPage > 1 && <Link href={blogHref(currentPage - 1, locale)}>{t('prevPageShort')}</Link>}
          {pages.map((page, i) =>
            page === '...' ? (
              <span key={`dot-${i}`}>…</span>
            ) : (
              <Link key={page} href={blogHref(page, locale)} aria-current={page === currentPage ? 'page' : undefined}>
                {page}
              </Link>
            ),
          )}
          {currentPage < totalPages && <Link href={blogHref(currentPage + 1, locale)}>{t('nextPageShort')}</Link>}
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
  navLinks,
}: {
  posts: PostWithTags[]
  currentPage: number
  totalPages: number
  initialTab: HomeTab
  navLinks?: SiteNavLink[]
}) {
  const locale = useLocale()
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
  const [sponsorActive] = useState(isSponsorActive)
  const bio = (locale === 'en' ? profile.bioEn : profile.bio).join('')
  const tagline = (locale === 'en' ? profile.blogTaglineEn : profile.blogTagline).trim()

  return (
    <>
      <div className="pf-root sv-root">
        <LangSync locale={locale} />
        <SiteIsland navLinks={navLinks} />

        <div className="sv-page">
          <header className="sv-intro">
            <h1 aria-label={profile.name}>
              {bio}
              <br />
              <em>{tagline}</em>
            </h1>
            <div className="sv-intro-side">
              <InlineSubscribe />
              <div className="pf-socials sv-socials">
                <a href={`mailto:${profile.email}`} aria-label={t('emailMe')}>
                  <MailIcon />
                </a>
                <a href={profile.xUrl} target="_blank" rel="noreferrer" aria-label="X">
                  <XIcon />
                </a>
                <a href={profile.github} target="_blank" rel="noreferrer" aria-label="GitHub">
                  <GitHubIcon />
                </a>
                <a href={profile.threads} target="_blank" rel="noreferrer" aria-label="Threads">
                  <ThreadsIcon />
                </a>
                <a href={profile.whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                  <WhatsAppIcon />
                </a>
                <a href="/feed.xml" aria-label="RSS">
                  <RssIcon />
                </a>
              </div>
            </div>
          </header>

          {initialTab === 'work' ? (
            <>
              <ProductList />
              {posts.length > 0 && (
                <section className="sv-teaser" aria-label={t('tabWriting')}>
                  <div className="sv-sec-head">
                    <h2>{t('tabWriting')}</h2>
                    <Link href={localePath('/?tab=blog', locale)}>{t('viewAllPosts')} →</Link>
                  </div>
                  <PostRows posts={posts.slice(0, 4)} />
                </section>
              )}
            </>
          ) : (
            <section className="sv-writing">
              <div className="sv-sec-head">
                <h2>{t('tabWriting')}</h2>
                <BlogSearch />
              </div>
              <BlogList posts={posts} currentPage={currentPage} totalPages={totalPages} />
            </section>
          )}

          <section className="sv-statsrow" aria-label="Stats">
            <ProductPlan />
            <TrafficStats tab={initialTab} />
          </section>

          <footer className="sv-foot">
            <div className="sv-foot-big" aria-hidden="true">
              Xu<i>Yi</i>
            </div>
            <div className="sv-foot-row">
              <div>
                <p className="sv-foot-links">
                  <Link href={localePath('/links', locale)}>{t('linksTitle')}</Link>
                  <Link href={localePath('/diary', locale)}>{t('diaryTitle')}</Link>
                </p>
                <p>
                  {t('collabContact')}{' '}
                  <a href={`mailto:${profile.email}`}>{profile.email}</a>
                </p>
              </div>
              {sponsorActive && (
                <aside className="pf-sponsor" aria-label={t('sponsor')}>
                  <span>{t('sponsor')}</span>
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
    </>
  )
}
