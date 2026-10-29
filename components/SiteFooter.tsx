'use client'

import '@/app/footer-v2.css'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { refreshAdminSession, useAdminSession } from '@/lib/admin-session-client'
import { isSponsorActive } from '@/lib/sponsor'
import { splitSiteNavLinks, type SiteNavLink } from '@/lib/site'
import { localePath, localizeNavLabel, t } from '@/lib/i18n'
import { useLocale } from '@/lib/i18n-client'
import { profile } from '@/lib/portfolio'

export function SiteFooter({ navLinks }: { navLinks?: SiteNavLink[] }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sponsorActive] = useState(isSponsorActive)
  const inputRef = useRef<HTMLInputElement>(null)
  const { authenticated: isAdmin } = useAdminSession()
  const pathname = usePathname()
  const locale = useLocale()
  const { footerLinks } = splitSiteNavLinks(navLinks)
  const [year, setYear] = useState<{ label: number; percent: number } | null>(null)

  useEffect(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1).getTime()
    const end = new Date(now.getFullYear() + 1, 0, 1).getTime()
    setYear({ label: now.getFullYear(), percent: Math.round(((now.getTime() - start) / (end - start)) * 100) })
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setPassword('')
      setError('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        await refreshAdminSession()
        setOpen(false)
      } else {
        setError('密码错误')
        setPassword('')
        inputRef.current?.focus()
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <footer className="site-footer mt-auto">
        <div className="ef">
          <div className="ef-grid">
            <div className="ef-brand">
              <p className="ef-label">{profile.name} — {t(locale, 'heroRole')}</p>
              <p className="ef-lead">{(locale === 'en' ? profile.bioEn : profile.bio).join('').trim()}</p>
              {year && (
                <p className="ef-year" aria-label={`${year.label} ${year.percent}%`}>
                  <span>{year.label}</span>
                  <i><b style={{ width: `${year.percent}%` }} /></i>
                  <span>{year.percent}%</span>
                </p>
              )}
            </div>

            <nav className="ef-col" aria-label={t(locale, 'footSite')}>
              <p className="ef-label">{t(locale, 'footSite')}</p>
              <ul>
                <li>
                  <Link href={localePath('/', locale)}>{t(locale, 'tabWork')}</Link>
                </li>
                <li>
                  <Link href={localePath('/?tab=blog', locale)}>{t(locale, 'tabWriting')}</Link>
                </li>
                {footerLinks.map((link) => {
                  const href = localePath(link.url, locale)
                  const label = localizeNavLabel(link.label, locale)
                  const active = pathname === href || pathname.startsWith(`${href}/`)
                  return (
                    <li key={link.url}>
                      {link.openInNewTab || link.url.startsWith('http') ? (
                        <a
                          href={link.url}
                          target={link.openInNewTab ? '_blank' : undefined}
                          rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                        >
                          {label}
                        </a>
                      ) : (
                        <Link href={href} aria-current={active ? 'page' : undefined}>
                          {label}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </nav>

            <div className="ef-col">
              <p className="ef-label">{t(locale, 'footElsewhere')}</p>
              <ul>
                <li><a href={profile.xUrl} target="_blank" rel="noopener noreferrer">X <span aria-hidden="true">↗</span></a></li>
                <li><a href={profile.github} target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a></li>
                <li><a href={profile.threads} target="_blank" rel="noopener noreferrer">Threads <span aria-hidden="true">↗</span></a></li>
                <li><a href="/feed.xml">RSS</a></li>
              </ul>
            </div>

            <div className="ef-col">
              <p className="ef-label">{t(locale, 'footContact')}</p>
              <ul>
                <li><a href={`mailto:${profile.email}`}>{profile.email}</a></li>
              </ul>
              {sponsorActive && (
                <aside aria-label={t(locale, 'sponsor')} className="ef-sponsor">
                  <span className="ef-label">{t(locale, 'sponsor')}</span>
                  <a href="https://bufancv.com" target="_blank" rel="noopener noreferrer">
                    AI简历 <span aria-hidden="true">↗</span>
                  </a>
                </aside>
              )}
            </div>
          </div>

          <div className="ef-mark" aria-hidden="true">
            Xu<i>Yi</i>
          </div>

          <div className="ef-base">
            <span>© 2026</span>
            {isAdmin ? (
              <>
                <Link href="/admin">XuYi</Link>
                <Link href="/editor?new=1" title="写新文章">
                  {locale === 'en' ? 'New post' : '新文章'}
                </Link>
              </>
            ) : (
              <button type="button" onClick={() => setOpen(true)}>
                XuYi
              </button>
            )}
            <span className="ef-set">Set in Newsreader &amp; Geist</span>
            <a className="ef-top" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
              {t(locale, 'footTop')} <span aria-hidden="true">↑</span>
            </a>
          </div>
        </div>
      </footer>

      {/* 密码弹窗 */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--editor-ink)]/30 px-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="kami-modal w-full max-w-[90vw] p-5 sm:max-w-xs sm:p-6">
            <h2 className="kami-section-title mb-4">进入管理后台</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                ref={inputRef}
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="kami-input"
              />
              {error && <p className="text-xs text-[var(--kami-error)]">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !password}
                  className="kami-btn-primary flex-1 py-2.5 disabled:opacity-50"
                >
                  {loading ? '验证中…' : '登录'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="kami-btn-secondary px-4 py-2.5"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
