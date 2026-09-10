import {
  CODE_INNER_RE,
  PRE_BLOCK_RE,
  escapeHtml,
  extractCodeFromPre,
  extractRawLanguage,
} from '@/lib/html-blocks'

export function prepareDiagramBlocks(html: string) {
  if (!html.includes('<pre')) return html

  return html.replace(PRE_BLOCK_RE, (preHtml) => {
    if (/\bclass="[^"]*\bmermaid\b/.test(preHtml) && !/language-mermaid/i.test(preHtml)) {
      return `<div class="kami-diagram">${preHtml}</div>`
    }

    const codeMatch = preHtml.match(CODE_INNER_RE)
    const lang = extractRawLanguage(preHtml, codeMatch?.[1] ?? '')
    if (lang !== 'mermaid') return preHtml

    const source = extractCodeFromPre(preHtml).trim()
    if (!source) return preHtml
    return `<div class="kami-diagram"><pre class="mermaid">${escapeHtml(source)}</pre></div>`
  })
}
