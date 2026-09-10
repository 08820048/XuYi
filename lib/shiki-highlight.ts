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
}

const KNOWN_LANGS = new Set([
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
  if (!html.includes('<pre')) return html

  try {
    const { highlightHtmlWithShiki } = await import('./shiki-engine')
    return await highlightHtmlWithShiki(html)
  } catch (error) {
    console.error('Shiki highlight failed:', error)
    return html
  }
}
