export const PRE_BLOCK_RE = /<pre\b[^>]*>[\s\S]*?<\/pre>/gi
export const LANGUAGE_CLASS_RE = /(?:language|lang)-([\w+#.-]+)/i
export const CODE_INNER_RE = /<code\b([^>]*)>([\s\S]*?)<\/code>/i

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
])

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, '&')
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function escapeAttr(value: string) {
  return escapeHtml(value).replace(/'/g, '&#39;')
}

export function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, '')
}

export function extractRawLanguage(preHtml: string, codeAttrs = '') {
  const match = `${preHtml.slice(0, 200)} ${codeAttrs}`.match(LANGUAGE_CLASS_RE)
  return (match?.[1] ?? '').trim().toLowerCase().replace(/^\./, '')
}

export function extractCodeFromPre(preHtml: string) {
  const codeMatch = preHtml.match(CODE_INNER_RE)
  const raw = codeMatch?.[2] ?? preHtml.replace(/^<pre\b[^>]*>/i, '').replace(/<\/pre>$/i, '')
  return decodeHtmlEntities(stripTags(raw)).replace(/\n$/, '')
}

export function mapHtmlTextChunks(
  html: string,
  transform: (text: string) => string,
  skipTags = ['pre', 'code', 'script', 'style', 'textarea'],
) {
  const skip = new Set(skipTags)
  let output = ''
  let index = 0
  const stack: string[] = []

  while (index < html.length) {
    if (html[index] !== '<') {
      const nextTag = html.indexOf('<', index)
      const end = nextTag < 0 ? html.length : nextTag
      const chunk = html.slice(index, end)
      output += stack.length > 0 ? chunk : transform(chunk)
      index = end
      continue
    }

    const close = html.indexOf('>', index)
    if (close < 0) {
      output += html.slice(index)
      break
    }

    const tag = html.slice(index, close + 1)
    const name = tag.match(/^<\/?([a-zA-Z0-9:-]+)/)?.[1]?.toLowerCase() ?? ''
    const isClose = tag.startsWith('</')
    const isSelfClosing = tag.endsWith('/>') || VOID_TAGS.has(name)

    if (name && skip.has(name) && !isSelfClosing) {
      if (isClose) {
        if (stack.at(-1) === name) stack.pop()
      } else {
        stack.push(name)
      }
    }

    output += tag
    index = close + 1
  }

  return output
}
