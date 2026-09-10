import {
  bundledLanguages,
  createJavaScriptRegexEngine,
  getSingletonHighlighter,
  isSpecialLang,
  type BundledLanguage,
  type Highlighter,
} from 'shiki'

export const SHIKI_THEME_LIGHT = 'light-plus'
export const SHIKI_THEME_DARK = 'dark-plus'

const PRELOADED_LANGS = [
  'bash',
  'c',
  'cpp',
  'css',
  'diff',
  'docker',
  'go',
  'groovy',
  'html',
  'java',
  'javascript',
  'json',
  'jsx',
  'markdown',
  'python',
  'rust',
  'sql',
  'tsx',
  'typescript',
  'xml',
  'yaml',
  'text',
] as const satisfies readonly BundledLanguage[]

const PRE_BLOCK_RE = /<pre\b[^>]*>[\s\S]*?<\/pre>/gi
const LANGUAGE_CLASS_RE = /(?:language|lang)-([\w+#.-]+)/i
const CODE_INNER_RE = /<code\b([^>]*)>([\s\S]*?)<\/code>/i

function decodeHtmlEntities(value: string) {
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

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, '')
}

function extractLanguage(preHtml: string, codeAttrs: string) {
  const match = `${preHtml.slice(0, 200)} ${codeAttrs}`.match(LANGUAGE_CLASS_RE)
  return resolveLanguage(match?.[1] ?? '')
}

export function resolveLanguage(raw: string) {
  const lang = raw.trim().toLowerCase().replace(/^\./, '')
  if (!lang) return 'text'
  if (lang in bundledLanguages || isSpecialLang(lang)) return lang
  return 'text'
}

function extractCode(preHtml: string) {
  const codeMatch = preHtml.match(CODE_INNER_RE)
  const raw = codeMatch?.[2] ?? preHtml.replace(/^<pre\b[^>]*>/i, '').replace(/<\/pre>$/i, '')
  return decodeHtmlEntities(stripTags(raw)).replace(/\n$/, '')
}

async function getHighlighter(langs: string[]) {
  return getSingletonHighlighter({
    themes: [SHIKI_THEME_LIGHT, SHIKI_THEME_DARK],
    langs: [...PRELOADED_LANGS, ...langs],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  })
}

function highlightBlock(highlighter: Highlighter, preHtml: string) {
  if (/\bclass="[^"]*\bshiki\b/.test(preHtml)) return preHtml

  const codeMatch = preHtml.match(CODE_INNER_RE)
  const lang = extractLanguage(preHtml, codeMatch?.[1] ?? '')
  const code = extractCode(preHtml)
  const loaded = new Set(highlighter.getLoadedLanguages())
  const resolved = loaded.has(lang) || isSpecialLang(lang) ? lang : 'text'

  try {
    return highlighter.codeToHtml(code, {
      lang: resolved,
      themes: {
        light: SHIKI_THEME_LIGHT,
        dark: SHIKI_THEME_DARK,
      },
    })
  } catch (error) {
    console.error('Shiki highlight failed:', error)
    return preHtml
  }
}

export async function highlightHtml(html: string) {
  if (!html.includes('<pre')) return html

  const blocks = [...html.matchAll(PRE_BLOCK_RE)]
  if (blocks.length === 0) return html

  const langs = [...new Set(
    blocks.map((match) => {
      const codeMatch = match[0].match(CODE_INNER_RE)
      return extractLanguage(match[0], codeMatch?.[1] ?? '')
    }),
  )]

  const highlighter = await getHighlighter(langs)
  const parts: string[] = []
  let lastIndex = 0

  for (const match of blocks) {
    const index = match.index ?? 0
    parts.push(html.slice(lastIndex, index))
    parts.push(highlightBlock(highlighter, match[0]))
    lastIndex = index + match[0].length
  }

  parts.push(html.slice(lastIndex))
  return parts.join('')
}
