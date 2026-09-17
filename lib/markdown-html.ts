import { escapeAttr, mapHtmlTextChunks } from '@/lib/html-blocks'

const SKIP_TAGS = ['pre', 'code', 'script', 'style', 'textarea', 'a', 'kbd']
const FOOTNOTE_DEF_RE = /<p(?:\s[^>]*)?>\s*\[\^([^\]]+)\]:\s*([\s\S]*?)<\/p>/gi
const FOOTNOTE_REF_RE = /\[\^([^\]]+)\]/g
const MD_LINK_RE = /\[([^\]]+)\]\(\s*<?((?:https?:\/\/|mailto:)[^)\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/gi
const BARE_URL_RE = /(?<![="'\/\w])(https?:\/\/[^\s<]+)/gi
const MD_HR_RE = /<p(?:\s[^>]*)?>\s*(?:-{3,}|\*{3,}|_{3,})\s*<\/p>/gi
const LABEL_URL_P_RE = /<p(?:\s[^>]*)?>\s*([^<>\n]{1,40}?):\s*(https?:\/\/[^\s<]+?)\s*\)?\s*<\/p>/gi
const EMPTY_P_RE = /<p(?:\s[^>]*)?>\s*<\/p>/gi

function footnoteSlug(id: string) {
  return id.trim().replace(/[^\w.-]+/g, '-') || 'note'
}

function trimUrl(raw: string) {
  return raw.replace(/[).,;:!?]+$/g, '')
}

function linkHtml(href: string, label: string) {
  return `<a target="_blank" rel="noopener noreferrer nofollow" href="${escapeAttr(href)}">${label}</a>`
}

function linkifyText(text: string) {
  const withMarkdownLinks = text.replace(MD_LINK_RE, (_, label: string, href: string) => linkHtml(href, label))
  return withMarkdownLinks.replace(BARE_URL_RE, (match) => {
    const href = trimUrl(match)
    const trailing = match.slice(href.length)
    return `${linkHtml(href, href)}${trailing}`
  })
}

function collectFootnotes(html: string) {
  const defs = new Map<string, string>()
  const stripped = html.replace(FOOTNOTE_DEF_RE, (_, id: string, body: string) => {
    const key = footnoteSlug(id)
    if (!defs.has(key)) defs.set(key, body.trim())
    return ''
  })
  return { html: stripped, defs }
}

function renderFootnoteRefs(html: string, defs: Map<string, string>) {
  const counts = new Map<string, number>()
  return mapHtmlTextChunks(
    html,
    (text) =>
      text.replace(FOOTNOTE_REF_RE, (match, id: string) => {
        const key = footnoteSlug(id)
        if (!defs.has(key)) return match
        const index = (counts.get(key) ?? 0) + 1
        counts.set(key, index)
        const refId = index === 1 ? `user-content-fnref-${key}` : `user-content-fnref-${key}-${index}`
        return `<sup><a href="#user-content-fn-${key}" id="${refId}" data-footnote-ref aria-describedby="footnote-label">${id}</a></sup>`
      }),
    SKIP_TAGS,
  )
}

function renderFootnoteSection(defs: Map<string, string>) {
  if (defs.size === 0) return ''

  const items = Array.from(defs.entries()).map(([key, body]) => {
    const backref = `<a href="#user-content-fnref-${key}" data-footnote-backref="" aria-label="回到脚注 ${key}" class="data-footnote-backref">↩</a>`
    return `<li id="user-content-fn-${key}"><p>${body} ${backref}</p></li>`
  })

  return `<section data-footnotes class="footnotes"><h2 class="sr-only" id="footnote-label">脚注</h2><ol>${items.join('')}</ol></section>`
}

export function enhanceMarkdownInHtml(html: string) {
  if (!html) return html

  const collected = collectFootnotes(html)
  let next = renderFootnoteRefs(collected.html, collected.defs)
  next = next.replace(LABEL_URL_P_RE, (_, label: string, href: string) => `<p>${linkHtml(trimUrl(href), label.trim())}</p>`)
  next = mapHtmlTextChunks(next, linkifyText, SKIP_TAGS)
  next = next.replace(MD_HR_RE, '<hr>')
  next = next.replace(EMPTY_P_RE, '')
  return `${next}${renderFootnoteSection(collected.defs)}`
}
