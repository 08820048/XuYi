/**
 * 文章 AI 翻译的纯逻辑：分块、提示词、拼装。不直接访问 AI / 数据库，便于测试。
 *
 * 流程：Markdown 按段落切成若干块（代码块原样保留、不含中文的块不翻译）→ 逐块翻译 → 拼回。
 */

export const TRANSLATE_LANG_NAMES: Record<string, string> = {
  en: 'English',
}

export interface TranslationChunk {
  /** 原文片段（Markdown） */
  text: string
  /** false 表示原样保留：围栏代码块，或不含中文的片段（图片、纯英文、分隔线等） */
  translate: boolean
}

const CJK = /[㐀-鿿]/
export const DEFAULT_CHUNK_CHARS = 1500

function splitLongBlock(block: string, maxChars: number): string[] {
  if (block.length <= maxChars) return [block]

  // 切成最小单元：整行；单行过长再按句子；句子仍过长则硬切。sep 是与前一单元的连接符。
  const units: Array<{ text: string; sep: string }> = []
  block.split('\n').forEach((line, lineIndex) => {
    const lineSep = lineIndex === 0 ? '' : '\n'
    if (line.length <= maxChars) {
      units.push({ text: line, sep: lineSep })
      return
    }
    const sentences = line.match(/[^。！？!?；;.]+[。！？!?；;.]*\s*/g) ?? [line]
    let first = true
    for (const sentence of sentences) {
      for (let i = 0; i < sentence.length; i += maxChars) {
        units.push({ text: sentence.slice(i, i + maxChars), sep: first ? lineSep : '' })
        first = false
      }
    }
  })

  const parts: string[] = []
  let current = ''
  for (const unit of units) {
    const piece = current ? `${unit.sep}${unit.text}` : unit.text
    if (current && current.length + piece.length > maxChars) {
      parts.push(current)
      current = unit.text
    } else {
      current += piece
    }
  }
  if (current) parts.push(current)
  return parts
}

/**
 * 把 Markdown 切成翻译块。相邻的可翻译段落合并到 maxChars 以内，减少调用次数；
 * 围栏代码块（``` / ~~~）永远单独成块且不翻译。
 */
export function splitMarkdownForTranslation(markdown: string, maxChars = DEFAULT_CHUNK_CHARS): TranslationChunk[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: Array<{ text: string; code: boolean }> = []
  let buffer: string[] = []
  let fence: { char: string; length: number } | null = null

  const flush = () => {
    const text = buffer.join('\n').trim()
    if (text) blocks.push({ text, code: false })
    buffer = []
  }

  for (const line of lines) {
    const match = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (fence) {
      buffer.push(line)
      if (match && match[1][0] === fence.char && match[1].length >= fence.length && line.trim() === match[1]) {
        blocks.push({ text: buffer.join('\n'), code: true })
        buffer = []
        fence = null
      }
      continue
    }
    if (match) {
      flush()
      buffer.push(line)
      fence = { char: match[1][0], length: match[1].length }
      continue
    }
    if (line.trim() === '') {
      flush()
      continue
    }
    buffer.push(line)
  }
  if (fence) blocks.push({ text: buffer.join('\n'), code: true }) // 未闭合的围栏按代码处理
  else flush()

  const chunks: TranslationChunk[] = []
  let pending = ''

  const flushPending = () => {
    if (pending) chunks.push({ text: pending, translate: true })
    pending = ''
  }

  for (const block of blocks) {
    if (block.code || !CJK.test(block.text)) {
      flushPending()
      chunks.push({ text: block.text, translate: false })
      continue
    }
    for (const piece of splitLongBlock(block.text, maxChars)) {
      if (pending && pending.length + piece.length + 2 > maxChars) flushPending()
      pending = pending ? `${pending}\n\n${piece}` : piece
    }
  }
  flushPending()
  return chunks
}

/** 把（已翻译的）块拼回 Markdown。 */
export function joinTranslatedChunks(chunks: string[]): string {
  return `${chunks.map((chunk) => chunk.trim()).filter(Boolean).join('\n\n')}\n`
}

export function buildTranslateSystemPrompt(lang: string, customPrompt?: string | null): string {
  const language = TRANSLATE_LANG_NAMES[lang] ?? lang
  const base = `You are a professional translator for a personal tech blog (game development, indie products, AI). Translate the user's Simplified Chinese Markdown into natural, fluent ${language} that reads as if originally written by a native speaker. Keep the author's first-person voice and tone.

Strict rules:
- Output ONLY the translation. No preface, no explanations, no surrounding code fence.
- Preserve all Markdown structure exactly: headings, lists, tables, blockquotes, emphasis, footnotes, line breaks.
- Never translate or alter: code (inline or fenced), URLs, image/link targets, file paths, HTML tags, math ($...$), product and brand names, and anything already in English.
- Translate link text and image alt text, but keep the targets unchanged.
- Keep numbers, dates and units; convert Chinese date formats to natural ${language} dates.
- Do not add or omit content. If the input is a fragment of a longer article, translate only that fragment.`
  const extra = customPrompt?.trim()
  return extra ? `${base}\n\nAdditional instructions from the author (take precedence):\n${extra}` : base
}

export function buildMetaSystemPrompt(lang: string, customPrompt?: string | null): string {
  const language = TRANSLATE_LANG_NAMES[lang] ?? lang
  const extra = customPrompt?.trim()
  return `You translate blog post metadata from Simplified Chinese to ${language}. Return a JSON object only, with keys "title" and "description":
- "title": a natural, concise ${language} title (keep brand and product names).
- "description": an SEO description of at most 160 characters. If the source description is empty, write one from the title and the excerpt.${extra ? `\n\nAdditional instructions from the author (take precedence):\n${extra}` : ''}`
}

export function buildMetaUserPrompt(title: string, description: string | null | undefined, excerpt: string): string {
  return JSON.stringify({ title, description: description ?? '', excerpt: excerpt.slice(0, 600) })
}

export interface TranslatedMeta {
  title: string
  description: string
}

/** 解析模型返回的标题/摘要 JSON；容忍 ```json 围栏与前后多余文字。 */
export function parseTranslatedMeta(raw: string): TranslatedMeta | null {
  const text = raw.trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
    const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
    const description = typeof parsed.description === 'string' ? parsed.description.trim() : ''
    return title ? { title, description } : null
  } catch {
    return null
  }
}

/** 模型偶尔会把整段译文包进 ``` 围栏，这里剥掉最外层（原文本身就是代码块的块不会走到这里）。 */
export function stripOuterFence(output: string): string {
  const match = output.trim().match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/)
  return match ? match[1] : output.trim()
}
