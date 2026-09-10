import { createHighlighterCore, isSpecialLang } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import lightPlus from '@shikijs/themes/light-plus'
import darkPlus from '@shikijs/themes/dark-plus'
import type { HighlighterCore, LanguageInput } from 'shiki/core'
import { resolveLanguage } from '@/lib/shiki-highlight'

export const SHIKI_THEME_LIGHT = 'light-plus'
export const SHIKI_THEME_DARK = 'dark-plus'

const LANG_LOADERS = {
  bash: () => import('@shikijs/langs/bash'),
  c: () => import('@shikijs/langs/c'),
  cpp: () => import('@shikijs/langs/cpp'),
  css: () => import('@shikijs/langs/css'),
  diff: () => import('@shikijs/langs/diff'),
  docker: () => import('@shikijs/langs/docker'),
  go: () => import('@shikijs/langs/go'),
  groovy: () => import('@shikijs/langs/groovy'),
  html: () => import('@shikijs/langs/html'),
  java: () => import('@shikijs/langs/java'),
  javascript: () => import('@shikijs/langs/javascript'),
  json: () => import('@shikijs/langs/json'),
  jsx: () => import('@shikijs/langs/jsx'),
  markdown: () => import('@shikijs/langs/markdown'),
  python: () => import('@shikijs/langs/python'),
  rust: () => import('@shikijs/langs/rust'),
  sql: () => import('@shikijs/langs/sql'),
  tsx: () => import('@shikijs/langs/tsx'),
  typescript: () => import('@shikijs/langs/typescript'),
  xml: () => import('@shikijs/langs/xml'),
  yaml: () => import('@shikijs/langs/yaml'),
} as const satisfies Record<string, LanguageInput>

const PRE_BLOCK_RE = /<pre\b[^>]*>[\s\S]*?<\/pre>/gi
const LANGUAGE_CLASS_RE = /(?:language|lang)-([\w+#.-]+)/i
const CODE_INNER_RE = /<code\b([^>]*)>([\s\S]*?)<\/code>/i

let highlighterPromise: Promise<HighlighterCore> | undefined

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

function extractCode(preHtml: string) {
  const codeMatch = preHtml.match(CODE_INNER_RE)
  const raw = codeMatch?.[2] ?? preHtml.replace(/^<pre\b[^>]*>/i, '').replace(/<\/pre>$/i, '')
  return decodeHtmlEntities(stripTags(raw)).replace(/\n$/, '')
}

function getHighlighter() {
  highlighterPromise ??= createHighlighterCore({
    themes: [lightPlus, darkPlus],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  })
  return highlighterPromise
}

function highlightBlock(highlighter: HighlighterCore, preHtml: string) {
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

export async function highlightHtmlWithShiki(html: string) {
  const blocks = [...html.matchAll(PRE_BLOCK_RE)]
  if (blocks.length === 0) return html

  const highlighter = await getHighlighter()
  const langs = [...new Set(
    blocks.map((match) => {
      const codeMatch = match[0].match(CODE_INNER_RE)
      return extractLanguage(match[0], codeMatch?.[1] ?? '')
    }),
  )]

  await Promise.all(
    langs.map(async (lang) => {
      if (highlighter.getLoadedLanguages().includes(lang) || isSpecialLang(lang)) return
      const loader = LANG_LOADERS[lang as keyof typeof LANG_LOADERS]
      if (loader) await highlighter.loadLanguage(loader)
    }),
  )

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
