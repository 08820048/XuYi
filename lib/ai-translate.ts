/**
 * 文章 AI 翻译的提示词与标题/摘要解析。HTML 切分、占位符、校验见 lib/html-translate.ts。
 */

export const TRANSLATE_LANG_NAMES: Record<string, string> = {
  en: 'English',
}

/** 翻译「单元」：一小段文字，可能带占位符 ⟦1⟧…⟦/1⟧（成对，包住一段文字）与 ⟦2/⟧（单个：图片、换行、行内代码）。 */
export function buildUnitSystemPrompt(lang: string, customPrompt?: string | null): string {
  const language = TRANSLATE_LANG_NAMES[lang] ?? lang
  const base = `You are a professional translator for a personal tech blog (game development, indie products, AI). Translate Simplified Chinese text fragments into natural, fluent ${language} that reads as if originally written by a native speaker. Keep the author's first-person voice and tone.

The input is a list of fragments. Each starts with a line "<<<N>>>" followed by the text of fragment N. A fragment is plain text (one paragraph, heading, list item, caption or table cell) that may contain placeholders:
- paired placeholders ⟦3⟧ ... ⟦/3⟧ wrap a span of text (bold, italic, a link);
- single placeholders ⟦4/⟧ stand for an image, a line break or inline code.

Strict rules:
- Translate only the human-readable text. Keep EVERY placeholder exactly as written: do not drop, duplicate, renumber, reorder across pairs, or reformat them. A paired placeholder must still wrap the corresponding translated words, and pairs must stay properly nested.
- Keep HTML entities such as &amp; &lt; &gt; &nbsp; as they are. Never output raw < or > characters. Do not add Markdown or HTML.
- Do not translate product and brand names, code, URLs, numbers, or text that is already in ${language}.
- Do not add or omit content.
- Output format: for each fragment, in the same order, write the line "<<<N>>>" with the same N, then the translation. Output nothing else: no preface, no notes, no code fence.`
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
