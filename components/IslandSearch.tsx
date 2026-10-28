'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
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

/**
 * 灵动岛下方“分离”出来的搜索条 + 结果面板。
 * 搜索条的底色由 SiteIsland 里的粘液滤镜层负责（和岛连在一起），这里只负责里面的内容和结果。
 */
export function IslandSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale, t } = useT()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 380)
      return () => window.clearTimeout(timer)
    }
    setQuery('')
    setResults([])
    setSelected(0)
  }, [open])

  useEffect(() => {
    const trimmed = query.trim()
    if (!open || !trimmed) {
      setResults([])
      setLoading(false)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}${locale === 'en' ? '&lang=en' : ''}`)
        const data = (await res.json()) as { results?: SearchResult[] }
        if (!cancelled) {
          setResults(data.results ?? [])
          setSelected(0)
        }
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 260)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, query, locale])

  function go(slug: string) {
    router.push(localePath(`/${slug}`, locale))
    onClose()
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (results[selected]) go(results[selected].slug)
    else if (query.trim()) {
      router.push(localePath(`/search?q=${encodeURIComponent(query.trim())}`, locale))
      onClose()
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected((index) => Math.min(index + 1, Math.max(results.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected((index) => Math.max(index - 1, 0))
    }
  }

  const trimmed = query.trim()
  const showResults = open && trimmed.length > 0

  return (
    <>
      <form className="island-searchbar" role="search" onSubmit={onSubmit} onKeyDown={onKeyDown} aria-hidden={!open}>
        <svg className="island-searchbar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchArticles')}
          autoComplete="off"
          spellCheck={false}
          tabIndex={open ? 0 : -1}
        />
        {loading ? <span className="island-spinner" aria-hidden="true" /> : <kbd>esc</kbd>}
        <button type="button" className="island-searchbar-close" onClick={onClose} aria-label={t('searchShortcutClose')} tabIndex={open ? 0 : -1}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </form>

      <div className={`island-results${showResults ? ' is-visible' : ''}`} aria-live="polite">
        {results.length > 0 ? (
          <>
            <ul>
              {results.map((result, index) => (
                <li key={result.slug}>
                  <Link
                    href={localePath(`/${result.slug}`, locale)}
                    className={index === selected ? 'is-selected' : undefined}
                    onMouseEnter={() => setSelected(index)}
                    onClick={onClose}
                  >
                    <span className="island-result-top">
                      <strong>{result.title}</strong>
                      <time>{formatLocaleDate(result.published_at, locale, { year: 'numeric', month: 'short', day: 'numeric' })}</time>
                    </span>
                    {result.description && <span className="island-result-desc">{result.description}</span>}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="island-results-hint">
              <span><kbd>↑↓</kbd> {t('searchShortcutSelect')}</span>
              <span><kbd>↵</kbd> {t('searchShortcutOpen')}</span>
              <span><kbd>esc</kbd> {t('searchShortcutClose')}</span>
            </div>
          </>
        ) : showResults && !loading ? (
          <div className="island-results-empty">
            <p>{t('noResults')}</p>
            <span>{t('tryOtherKeywords')}</span>
          </div>
        ) : showResults ? (
          <div className="island-results-empty">
            <span>{t('searching')}</span>
          </div>
        ) : null}
      </div>
    </>
  )
}
