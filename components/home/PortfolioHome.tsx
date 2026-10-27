'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { LangSync } from '@/components/LangSync'
import { formatLocaleDate, localePath, t as translate, type Locale } from '@/lib/i18n'
import { useLocale } from '@/lib/i18n-client'
import type { PostWithTags } from '@/lib/db'
import { isSponsorActive } from '@/lib/sponsor'
import { collections, freeProject, productPlan, profile, projects, type Product } from '@/lib/portfolio'
import { AppleIcon, GitHubIcon, MailIcon, RssIcon, SearchIcon, ThreadsIcon, WhatsAppIcon, XIcon } from './icons'
import { LightboxProvider, ZoomImage, ZoomVideo } from './Lightbox'
import { TrafficStats } from './TrafficStats'
import { PostTypeBadge } from '@/components/PostTypeBadge'
import { PostUpdateBadge } from '@/components/PostUpdateBadge'

export type HomeTab = 'work' | 'blog'

function ctaLabel(product: Product, locale: Locale) {
  if (locale === 'zh') return product.cta
  if (product.cta.includes('购买')) return translate(locale, 'buy')
  return product.cta.includes('→') ? `${translate(locale, 'visit')} →` : translate(locale, 'visit')
}

function VisitButton({ product }: { product: Product }) {
  const locale = useLocale()
  return (
    <a className="pf-btn pf-btn-visit" href={product.link} target="_blank" rel="noreferrer">
      {product.apple && <AppleIcon />}
      {ctaLabel(product, locale)}
      <span className="pf-sr"> {product.name}</span>
    </a>
  )
}

function BigCard({ product, no }: { product: Product; no: string }) {
  const locale = useLocale()
  return (
    <article className="pf-card pf-big sv-cart" data-no={no}>
      <div className="pf-big-top">
        <img className="pf-tile" src={product.logo} alt="" />
        <div className="pf-names">
          <div className="pf-name-line">
            <h3>{product.name}</h3>
            {product.badge && <span className="pf-badge">{product.badge}</span>}
          </div>
          <p className="pf-big-desc">{locale === 'en' ? product.descEn : product.desc}</p>
        </div>
        <VisitButton product={product} />
      </div>
      <div className="pf-shots">
        {product.shots?.map((shot, i) => (
          <div className="pf-shot-frame" key={shot}>
            {/\.(mp4|webm|mov)$/i.test(shot) ? (
              <ZoomVideo src={shot} alt={`${product.name} demo ${i + 1}`} width={530} height={336} />
            ) : (
              <ZoomImage src={shot} alt={`${product.name} screenshot ${i + 1}`} width={530} height={336} />
            )}
          </div>
        ))}
      </div>
    </article>
  )
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

function ThinCard({ product, no }: { product: Product; no: string }) {
  const locale = useLocale()
  return (
    <article className="pf-card pf-thin sv-cart" data-no={no}>
      <img className="pf-tile" src={product.logo} alt="" />
      <div className="pf-names">
        <div className="pf-name-line">
          <h3>{product.name}</h3>
          {product.badge && <span className="pf-badge">{product.badge}</span>}
        </div>
        <p className="pf-thin-desc">{locale === 'en' ? product.descEn : product.desc}</p>
      </div>
      <VisitButton product={product} />
    </article>
  )
}

function ProductSection({ label, products, start = 1 }: { label: string; products: Product[]; start?: number }) {
  return (
    <section aria-label={label}>
      <h2 className="pf-label">{label}</h2>
      {products.map((product, i) => {
        const no = String(start + i).padStart(3, '0')
        return product.size === 'big' ? (
          <BigCard key={product.id} product={product} no={no} />
        ) : (
          <ThinCard key={product.id} product={product} no={no} />
        )
      })}
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
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
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
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}${locale === 'en' ? '&lang=en' : ''}`)
        const data = (await res.json()) as { results?: { slug: string; title: string; published_at: number }[] }
        setResults(data.results ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [open, query, locale])

  return (
    <div className="pf-search">
      <button
        ref={buttonRef}
        type="button"
        className="pf-search-btn"
        aria-label={t('searchArticles')}
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
              aria-label={t('searchArticles')}
            >
              <input
                ref={inputRef}
                value={query}
                placeholder={t('searchArticles')}
                aria-label={t('searchArticles')}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query.trim() && (
                <div className="pf-search-results" aria-live="polite">
                  {loading && results.length === 0 && <p>{t('searching')}</p>}
                  {!loading && results.length === 0 && <p>{t('noResults')}</p>}
                  {results.map((result) => (
                    <Link key={result.slug} href={localePath(`/${result.slug}`, locale)} className="pf-search-hit" onClick={() => setOpen(false)}>
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
        <div className="pf-post-list">
          {posts.map((post) => (
            <Link key={post.slug} href={localePath(`/${post.slug}`, locale)} className="pf-post sv-patch">
              <span className="pf-post-heading">
                <h3>{post.title}</h3>
                <PostTypeBadge type={post.post_type} lang={locale} />
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
}: {
  posts: PostWithTags[]
  currentPage: number
  totalPages: number
  initialTab: HomeTab
}) {
  const router = useRouter()
  const locale = useLocale()
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
  const [sponsorActive] = useState(isSponsorActive)

  function openBlog() {
    if (initialTab === 'blog' && currentPage === 1) return
    router.push(localePath('/?tab=blog', locale))
  }

  function openWork() {
    if (initialTab === 'work') return
    router.push(localePath('/', locale))
  }

  return (
    <LightboxProvider>
      <div className="pf-root sv-root">
        <LangSync locale={locale} />
        <div className="pf-page">
          <header className="sv-hero" aria-label="XuYi">
            <div className="sv-hero-bar">
              <span aria-hidden="true">© 2026 XuYi</span>
              <LanguageSwitch />
            </div>
            <div className="sv-hero-body">
              <div className="sv-hero-main">
                <img className="pf-avatar sv-avatar" src={profile.avatar} alt="XuYi" />
                <h1 className="sv-title" aria-label={profile.name}>
                  <span>Xu</span>
                  <span>Yi</span>
                </h1>
                <p className="sv-bio">{(locale === 'en' ? profile.bioEn : profile.bio).join('')}</p>
                <p className="sv-tagline">{(locale === 'en' ? profile.blogTaglineEn : profile.blogTagline).trim()}</p>
              </div>
              <div className="sv-hero-side">
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
            </div>
          </header>

          <div className="pf-grid sv-grid">
            <div className="pf-right sv-main">
              <div className="pf-switch-row sv-menu-row">
                <div className="sv-menu" role="tablist" aria-label={t('contentSwitch')}>
                  <button type="button" role="tab" aria-selected={initialTab === 'work'} onClick={openWork}>
                    {t('tabWork')}
                  </button>
                  <button type="button" role="tab" aria-selected={initialTab === 'blog'} onClick={openBlog}>
                    {t('tabWriting')}
                  </button>
                </div>
                {initialTab === 'blog' && <BlogSearch />}
              </div>

              {initialTab === 'work' ? (
                <>
                  <ProductSection label="FREE PROJECT" products={freeProject} start={1} />
                  <ProductSection label="PROJECTS" products={projects} start={freeProject.length + 1} />
                </>
              ) : (
                <BlogList posts={posts} currentPage={currentPage} totalPages={totalPages} />
              )}
            </div>

            <aside className="pf-side sv-hud">
              <ProductPlan />

              <section className="pf-collections" aria-label="Inventory">
                <h2 className="pf-label">Inventory</h2>
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

              <TrafficStats tab={initialTab} />
            </aside>
          </div>

          <footer className="pf-foot">
            <div className="pf-foot-row">
              <div>
                <p className="pf-foot-links">
                  <Link href={localePath('/links', locale)}>{t('linksTitle')}</Link>
                  <Link href={localePath('/diary', locale)}>{t('diaryTitle')}</Link>
                </p>
                <p>
                  {t('collabContact')}
                  {' '}
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
    </LightboxProvider>
  )
}
