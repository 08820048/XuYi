'use client'

import { useEffect } from 'react'
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
      <p className="kami-label">{t('copyrightTitle')}</p>
      <p>{t('copyrightBody')}</p>
      <p>
        {t('articleLink')}
        <a href={articleUrl}>
          {articleUrl}
        </a>
      </p>
      {sourceUrl && (
        <p>
          {t('sourceLink')}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {sourceUrl}
          </a>
        </p>
      )}
    </section>
  )
}
