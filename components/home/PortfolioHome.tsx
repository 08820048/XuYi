'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LangSync } from '@/components/LangSync'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteIsland } from '@/components/SiteIsland'
import { localePath, t as translate, type Locale } from '@/lib/i18n'
import { useLocale } from '@/lib/i18n-client'
import { openIslandSearch } from '@/lib/island-search'
import type { PostWithTags } from '@/lib/db'
import type { SiteNavLink } from '@/lib/site'
import { productPlan, profile } from '@/lib/portfolio'
import { GitHubIcon, MailIcon, RssIcon, SearchIcon, ThreadsIcon, WhatsAppIcon, XIcon } from './icons'
import { HomeBackdrop, ProductIndex, TimeLines } from './HomeParts'
import { TrafficStats } from './TrafficStats'
import { PostTypeBadge } from '@/components/PostTypeBadge'
import { PostUpdateBadge } from '@/components/PostUpdateBadge'

export type HomeTab = 'work' | 'blog'

function dateParts(ts: number) {
  const d = new Date(ts * 1000)
  return {
    year: String(d.getFullYear()),
    day: `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`,
  }
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

function PostRows({ posts }: { posts: PostWithTags[] }) {
  const locale = useLocale()
  return (
    <div className="hp-rows">
      {posts.map((post) => {
        const date = dateParts(post.published_at)
        return (
          <Link key={post.slug} href={localePath(`/${post.slug}`, locale)} className="hp-row">
            <time className="hp-date" dateTime={new Date(post.published_at * 1000).toISOString()}>
              {date.day}
              <small>{date.year}</small>
            </time>
            <span className="hp-row-title">
              <h3>{post.title}</h3>
              <PostTypeBadge type={post.post_type} lang={locale} />
              <PostUpdateBadge post={post} />
            </span>
          </Link>
        )
      })}
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
  const bio = (locale === 'en' ? profile.bioEn : profile.bio).join('')
  const tagline = (locale === 'en' ? profile.blogTaglineEn : profile.blogTagline).trim()

  const intro = (
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
  )

  return (
    <>
      <div className="pf-root sv-root">
        <LangSync locale={locale} />
        <SiteIsland navLinks={navLinks} />
        <HomeBackdrop />

        <div className="sv-page">
          <TimeLines />

          {initialTab === 'work' ? (
            <>
              <section className="hp-hero">
                <div>
                  <div className="hp-mark">
                    <h1 aria-label={profile.name}>
                      <span className="hp-ch" aria-hidden="true">X</span>
                      <span className="hp-ch is-blue" aria-hidden="true">u</span>
                      <em>
                        <span className="hp-ch" aria-hidden="true">Y</span>
                        <span className="hp-ch is-blue" aria-hidden="true">i</span>
                      </em>
                    </h1>
                    <div className="hp-guides" aria-hidden="true">
                      <span className="hp-guide is-cap"><b>CAP · 715</b></span>
                      <span className="hp-guide is-x"><b>X-HT · 512</b></span>
                    </div>
                  </div>
                </div>
                <div>
                  <dl className="hp-spec">
                    <div>
                      <dt>{t('specProgress')}</dt>
                      <dd>{translate(locale, 'specProgressValue', { done: productPlan.done, goal: productPlan.goal, percent: Math.round((productPlan.done / productPlan.goal) * 100) })}</dd>
                    </div>
                    <div>
                      <dt>{t('specFocus')}</dt>
                      <dd>{t('specFocusValue')}</dd>
                    </div>
                    <div>
                      <dt>{t('specPrinciple')}</dt>
                      <dd>{t('specPrincipleValue')}</dd>
                    </div>
                    <div>
                      <dt>{t('specContact')}</dt>
                      <dd>
                        <a href={`mailto:${profile.email}`}>{profile.email}</a>
                      </dd>
                    </div>
                  </dl>
                  <p className="hp-bio">
                    {bio}
                    <br />
                    <em>{tagline}</em>
                  </p>
                  {intro}
                </div>
              </section>

              <ProductIndex />
              {posts.length > 0 && (
                <section className="hp-journal" aria-label={t('tabWriting')}>
                  <div className="hp-sec-head">
                    <h2>
                      {t('tabWriting')} <em>/ Journal</em>
                    </h2>
                    <Link className="hp-mono" href={localePath('/?tab=blog', locale)}>
                      {t('viewAllPosts')} →
                    </Link>
                  </div>
                  <PostRows posts={posts.slice(0, 4)} />
                </section>
              )}
            </>
          ) : (
            <>
              <header className="sv-intro">
                <h1 aria-label={profile.name}>
                  {bio}
                  <br />
                  <em>{tagline}</em>
                </h1>
                {intro}
              </header>
              <section className="hp-journal" aria-label={t('tabWriting')}>
                <div className="hp-sec-head">
                  <h2>
                    {t('tabWriting')} <em>/ Journal</em>
                  </h2>
                  <BlogSearch />
                </div>
                <BlogList posts={posts} currentPage={currentPage} totalPages={totalPages} />
              </section>
            </>
          )}

          <section className="sv-statsrow" aria-label="Stats">
            <TrafficStats tab="work" />
            <TrafficStats tab="blog" />
          </section>

          <SiteFooter navLinks={navLinks} />
        </div>
      </div>
    </>
  )
}
