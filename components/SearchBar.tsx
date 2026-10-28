'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { useT } from '@/lib/i18n-client'
import { formatLocaleDate, localePath } from '@/lib/i18n'

interface SearchResult {
  slug: string
  title: string
  description: string | null
  category: string | null
  published_at: number
  password: boolean
}

export function SearchBar() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { locale, t } = useT()

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      document.body.style.overflow = 'hidden'
    } else {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}${locale === 'en' ? '&lang=en' : ''}`)
        const data = (await res.json()) as { results?: SearchResult[] }
        setResults(data.results || [])
        setSelectedIndex(0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, locale])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (results.length > 0 && results[selectedIndex]) {
      router.push(localePath(`/${results[selectedIndex].slug}`, locale))
      setIsOpen(false)
    } else if (query.trim()) {
      router.push(localePath(`/search?q=${encodeURIComponent(query.trim())}`, locale))
      setIsOpen(false)
    }
  }

  const handleKeyNav = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    }
  }

  const formatDate = (ts: number) => {
    const date = new Date(ts * 1000)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return t('today')
    if (diffDays === 1) return t('yesterday')
    if (diffDays < 7) return t('daysAgo', { n: diffDays })
    return formatLocaleDate(ts, locale, { month: 'short', day: 'numeric' })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="site-nav-action"
        title={`${t('search')} (⌘K)`}
        aria-label={t('search')}
      >
        <Search className="w-[18px] h-[18px]" />
      </button>

      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[100]"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false) }}
        >
          {/* 遮罩 */}
          <div className="absolute inset-0 bg-[color-mix(in_srgb,#141413_18%,transparent)] dark:bg-black/55" onClick={() => setIsOpen(false)} />

          {/* 搜索面板 */}
          <div className="relative mx-auto mt-[12vh] sm:mt-[18vh] w-[92vw] max-w-[560px]">
            <div className="kami-modal overflow-hidden">

              {/* 输入区 */}
              <form onSubmit={handleSubmit} onKeyDown={handleKeyNav}>
                <div className="flex items-center gap-3 px-5 py-4">
                  <Search className="w-5 h-5 text-[var(--editor-accent)] flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="flex-1 text-base bg-transparent outline-none placeholder:text-[var(--stone-gray)]/60 text-[var(--editor-ink)]"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {loading ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin text-[var(--editor-accent)] flex-shrink-0">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-[var(--stone-gray)] bg-[var(--editor-soft)] border border-[var(--editor-line)] rounded font-mono">
                      ESC
                    </kbd>
                  )}
                </div>
              </form>

              {/* 分割线 */}
              {(results.length > 0 || (query.trim() && !loading)) && (
                <div className="border-t border-[var(--editor-line)]" />
              )}

              {/* 搜索结果 */}
              {results.length > 0 && (
                <div className="max-h-[50vh] overflow-y-auto py-2">
                  {results.map((result, index) => (
                    <Link
                      key={result.slug}
                      href={localePath(`/${result.slug}`, locale)}
                      onClick={() => setIsOpen(false)}
                      className={`block mx-2 px-3 py-2.5 rounded-lg transition-colors ${
                        index === selectedIndex
                          ? 'bg-[var(--kami-tag)]'
                          : 'hover:bg-[var(--kami-ivory)]'
                      }`}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-medium text-[var(--editor-ink)] flex-1 line-clamp-1">
                          {result.title}
                        </h3>
                        <span className="text-[11px] text-[var(--stone-gray)] tabular-nums flex-shrink-0">
                          {formatDate(result.published_at)}
                        </span>
                      </div>
                      {result.description && (
                        <p className="text-xs text-[var(--editor-muted)] line-clamp-1 leading-relaxed">
                          {result.description}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {/* 无结果 */}
              {query.trim() && results.length === 0 && !loading && (
                <div className="px-5 py-10 text-center">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[var(--editor-soft)] flex items-center justify-center">
                    <Search className="w-5 h-5 text-[var(--stone-gray)]" />
                  </div>
                  <p className="text-sm text-[var(--editor-muted)]">{t('noResults')}</p>
                  <p className="text-xs text-[var(--stone-gray)] mt-1">{t('tryOtherKeywords')}</p>
                </div>
              )}

              {/* 底部快捷键提示 */}
              {results.length > 0 && (
                <div className="flex items-center gap-4 px-5 py-2.5 border-t border-[var(--editor-line)] bg-[var(--editor-panel)]/50">
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--stone-gray)]">
                    <kbd className="px-1 py-0.5 bg-[var(--kami-ivory)] border border-[var(--kami-warm-sand)] rounded text-[10px] font-mono">↑↓</kbd>
                    <span>{t('searchShortcutSelect')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--stone-gray)]">
                    <kbd className="px-1 py-0.5 bg-[var(--kami-ivory)] border border-[var(--kami-warm-sand)] rounded text-[10px] font-mono">↵</kbd>
                    <span>{t('searchShortcutOpen')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--stone-gray)]">
                    <kbd className="px-1 py-0.5 bg-[var(--kami-ivory)] border border-[var(--kami-warm-sand)] rounded text-[10px] font-mono">esc</kbd>
                    <span>{t('searchShortcutClose')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
