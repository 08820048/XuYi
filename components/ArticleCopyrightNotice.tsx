'use client'

import { useEffect } from 'react'
import { ARTICLE_COPYRIGHT_NOTICE, formatArticleCopyrightText } from '@/lib/article-copyright'

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
  const clipboardNotice = formatArticleCopyrightText({ title, articleUrl, sourceUrl })

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
    <section className="article-record-source article-copyright-notice" aria-label="版权声明">
      <div className="article-record-source-label">
        <span aria-hidden>©</span>
        <span>版权声明</span>
      </div>
      <p>{ARTICLE_COPYRIGHT_NOTICE}</p>
      <p className="mt-1">
        本文链接：
        <a
          href={articleUrl}
          className="break-all text-[var(--editor-accent)] underline underline-offset-2 hover:opacity-80"
        >
          {articleUrl}
        </a>
      </p>
      {sourceUrl && (
        <p className="mt-1">
          原文链接：
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-[var(--editor-accent)] underline underline-offset-2 hover:opacity-80"
          >
            {sourceUrl}
          </a>
        </p>
      )}
    </section>
  )
}
