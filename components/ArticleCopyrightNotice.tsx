'use client'

import { useEffect, useRef, useState } from 'react'
import { formatArticleCopyrightText } from '@/lib/article-copyright'
import { useT } from '@/lib/i18n-client'

export function ArticleCopyrightNotice({
  containerId,
  title,
  articleUrl,
  sourceUrl,
}: {
  containerId: string
  title: string
  articleUrl: string
  sourceUrl?: string | null
}) {
  const { locale, t } = useT()
  const clipboardNotice = formatArticleCopyrightText({ title, articleUrl, sourceUrl, locale })
  const citationHead = locale === 'zh' ? `XuYi，《${title}》，` : `XuYi, “${title}”, `
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copyCitation() {
    try {
      await navigator.clipboard.writeText(`${citationHead}${articleUrl}`)
    } catch {
      return
    }
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1800)
  }

  useEffect(() => {
    const container = document.getElementById(containerId)
    if (!container) return

    const handleCopy = (event: ClipboardEvent) => {
      const selection = window.getSelection()
      if (!event.clipboardData || !selection || selection.isCollapsed || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      if (!container.contains(range.commonAncestorContainer)) return

      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('pre, code')) return

      const copiedText = selection.toString()
      if (!copiedText.trim()) return

      const copiedHtml = document.createElement('div')
      copiedHtml.append(range.cloneContents())
      copiedHtml.append(document.createElement('hr'))

      const notice = document.createElement('div')
      for (const line of clipboardNotice.split('\n')) {
        const paragraph = document.createElement('p')
        paragraph.textContent = line
        notice.append(paragraph)
      }
      copiedHtml.append(notice)

      event.clipboardData.setData('text/plain', `${copiedText}\n\n---\n${clipboardNotice}`)
      event.clipboardData.setData('text/html', copiedHtml.innerHTML)
      event.preventDefault()
    }

    container.addEventListener('copy', handleCopy)
    return () => container.removeEventListener('copy', handleCopy)
  }, [clipboardNotice, containerId])

  return (
    <section className="kami-note article-copyright-notice" aria-label={t('copyrightTitle')}>
      <div className="cr-mark" aria-hidden="true">
        <span>©</span>
        <small>{new Date().getFullYear()}</small>
      </div>
      <div className="cr-body">
        <p className="kami-label">{t('copyrightTitle')}</p>
        <p className="cr-text">{t('copyrightBody')}</p>
        <div className="cr-cite">
          <code>
            <span className="cr-prompt" aria-hidden="true">❯</span>
            {citationHead}
            <a href={articleUrl}>{articleUrl}</a>
          </code>
          <button type="button" onClick={copyCitation} aria-live="polite">
            {copied ? `${t('copied')} ✓` : t('copyCitation')}
          </button>
        </div>
        {sourceUrl && (
          <p className="cr-source">
            {t('sourceLink')}
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
              {sourceUrl}
            </a>
          </p>
        )}
      </div>
    </section>
  )
}
