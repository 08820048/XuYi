import { highlightHtmlWithShiki } from '@/lib/shiki-engine'
import { prepareDiagramBlocks } from '@/lib/diagram-html'
import { renderMathInHtml } from '@/lib/math-html'

export const SHIKI_THEME_LIGHT = 'light-plus'
export const SHIKI_THEME_DARK = 'dark-plus'

const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  md: 'markdown',
  yml: 'yaml',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  rs: 'rust',
  'c++': 'cpp',
  'c#': 'csharp',
  cs: 'csharp',
}

const KNOWN_LANGS = new Set([
  'bash',
  'c',
  'cpp',
  'csharp',
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
  'swift',
  'toml',
  'tsx',
  'typescript',
  'vue',
  'xml',
  'yaml',
  'text',
  'ansi',
  'plaintext',
])

export function resolveLanguage(raw: string) {
  const lang = raw.trim().toLowerCase().replace(/^\./, '')
  if (!lang) return 'text'
  const mapped = LANGUAGE_ALIASES[lang] ?? lang
  return KNOWN_LANGS.has(mapped) ? mapped : 'text'
}

export async function highlightHtml(html: string | null | undefined) {
  if (!html) return ''

  try {
    const withDiagrams = prepareDiagramBlocks(html)
    const withMath = renderMathInHtml(withDiagrams)
    if (!withMath.includes('<pre')) return withMath
    return await highlightHtmlWithShiki(withMath)
  } catch (error) {
    console.error('Article HTML enhance failed:', error)
    return html
  }
}
