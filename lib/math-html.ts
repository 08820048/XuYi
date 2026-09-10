import katex from 'katex'
import {
  CODE_INNER_RE,
  PRE_BLOCK_RE,
  decodeHtmlEntities,
  escapeAttr,
  extractCodeFromPre,
  extractRawLanguage,
  mapHtmlTextChunks,
  stripTags,
} from '@/lib/html-blocks'

type MathSegment =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string; displayMode: boolean }

const MATH_FENCE_LANGS = new Set(['math', 'latex', 'katex', 'tex'])

function isEscaped(text: string, index: number) {
  let slashCount = 0
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) {
    slashCount += 1
  }
  return slashCount % 2 === 1
}

function findClosing(text: string, start: number, close: string, allowDollar = false) {
  for (let cursor = start; cursor < text.length; cursor += 1) {
    if (!text.startsWith(close, cursor) || isEscaped(text, cursor)) continue
    if (allowDollar && close === '$' && text[cursor + 1] === '$') continue
    return cursor
  }
  return -1
}

export function splitMathSegments(text: string): MathSegment[] {
  if (!text.includes('$') && !text.includes('\\(') && !text.includes('\\[')) {
    return [{ type: 'text', value: text }]
  }

  const segments: MathSegment[] = []
  let cursor = 0

  const pushText = (value: string) => {
    if (!value) return
    const last = segments.at(-1)
    if (last?.type === 'text') last.value += value
    else segments.push({ type: 'text', value })
  }

  while (cursor < text.length) {
    const rest = text.slice(cursor)
    const pair =
      rest.startsWith('$$') && !isEscaped(text, cursor) ? { open: '$$', close: '$$', display: true } :
      rest.startsWith('\\[') && !isEscaped(text, cursor) ? { open: '\\[', close: '\\]', display: true } :
      rest.startsWith('\\(') && !isEscaped(text, cursor) ? { open: '\\(', close: '\\)', display: false } :
      rest.startsWith('$') && !isEscaped(text, cursor) && text[cursor + 1] !== '$'
        ? { open: '$', close: '$', display: false }
        : null

    if (!pair) {
      pushText(text[cursor] ?? '')
      cursor += 1
      continue
    }

    const closingIndex = findClosing(text, cursor + pair.open.length, pair.close, pair.close === '$')
    if (closingIndex < 0) {
      pushText(text.slice(cursor))
      break
    }

    const latex = text.slice(cursor + pair.open.length, closingIndex).trim()
    if (!latex) {
      pushText(text.slice(cursor, closingIndex + pair.close.length))
      cursor = closingIndex + pair.close.length
      continue
    }

    segments.push({ type: 'math', value: latex, displayMode: pair.display })
    cursor = closingIndex + pair.close.length
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }]
}

export function containsMathSyntax(text: string) {
  return splitMathSegments(text).some((segment) => segment.type === 'math')
}

export function renderLatex(latex: string, displayMode: boolean) {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'html',
    })
  } catch {
    return `<code>${escapeAttr(latex)}</code>`
  }
}

export function wrapMathHtml(latex: string, displayMode: boolean) {
  const tag = displayMode ? 'div' : 'span'
  return `<${tag} class="math-block-wrapper" data-math-latex="${escapeAttr(latex)}" data-display-mode="${String(displayMode)}">${renderLatex(latex, displayMode)}</${tag}>`
}

function renderMathInText(text: string) {
  const segments = splitMathSegments(text)
  if (!segments.some((segment) => segment.type === 'math')) return text
  return segments.map((segment) => (
    segment.type === 'text' ? segment.value : wrapMathHtml(segment.value, segment.displayMode)
  )).join('')
}

function renderMathCodeBlocks(html: string) {
  if (!/language-(?:math|latex|katex|tex)/i.test(html)) return html

  let next = html.replace(PRE_BLOCK_RE, (preHtml) => {
    const codeMatch = preHtml.match(CODE_INNER_RE)
    const lang = extractRawLanguage(preHtml, codeMatch?.[1] ?? '')
    if (!MATH_FENCE_LANGS.has(lang)) return preHtml
    const latex = extractCodeFromPre(preHtml).trim()
    if (!latex) return preHtml
    return wrapMathHtml(latex, true)
  })

  next = next.replace(
    /<code\b([^>]*language-(?:math|latex|katex|tex)[^>]*)>([\s\S]*?)<\/code>/gi,
    (full, attrs: string, inner: string) => {
      const lang = extractRawLanguage(`<code ${attrs}>`, attrs)
      if (!MATH_FENCE_LANGS.has(lang)) return full
      const latex = decodeHtmlEntities(stripTags(inner)).trim()
      if (!latex) return full
      const displayMode = /math-display/i.test(attrs)
      return wrapMathHtml(latex, displayMode)
    },
  )

  return next
}

export function renderMathInHtml(html: string) {
  if (!html) return html
  const withFences = renderMathCodeBlocks(html)
  if (!withFences.includes('$') && !withFences.includes('\\(') && !withFences.includes('\\[')) {
    return withFences
  }
  return mapHtmlTextChunks(withFences, renderMathInText)
}

export function transformHtmlMathDelimiters(html: string) {
  return renderMathInHtml(html)
}
