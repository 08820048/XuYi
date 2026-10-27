/**
 * 在文章 HTML 上做「只换文字」的翻译：纯逻辑，不访问 AI / 数据库，便于测试。
 *
 * 为什么不翻译 `content`：编辑器保存的 `content` 只是纯文本（搜索、摘要用），图片、图注、表格、
 * 视频、排版全在 `html` 里。直接翻译纯文本再渲染，会把这些全部丢掉。
 *
 * 做法：
 *   1. 把 HTML 切成 token，按块级元素划分成「翻译单元」（一个段落、一个列表项、一个单元格……）。
 *   2. 单元里的行内标签（strong / a / img / br / code……）换成占位符 ⟦1⟧…⟦/1⟧ / ⟦2/⟧ 再交给模型，
 *      模型只看到文字和占位符，碰不到标签属性（链接地址、图片地址）。
 *   3. 译文回来后校验占位符一个不少、一个不多、嵌套正确，再把原标签放回去；校验不过就逐段兜底。
 *   4. 代码块、脚本、视频、iframe、公式、推文、图表等整段原样保留，不进入翻译。
 * 因此在构造上，图片/媒体/排版不可能被翻译改动。
 */

import { decodeHtmlEntities, stripTags } from '@/lib/html-blocks'

const CJK = /[㐀-鿿]/

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
])

/** 块级元素：单元的边界 */
const BLOCK_TAGS = new Set([
  'html', 'body', 'p', 'div', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'main',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'blockquote',
  'figure', 'figcaption', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup',
  'details', 'summary', 'form', 'fieldset', 'legend', 'address', 'hr', 'center',
])

/** 整个元素原样保留（含内部所有内容） */
const SKIP_TAGS = new Set([
  'pre', 'script', 'style', 'textarea', 'svg', 'math', 'iframe', 'video', 'audio', 'object',
  'canvas', 'noscript', 'template', 'select', 'head',
])

/** 行内「原子」元素：整个当作一个占位符，内部文字不翻译 */
const ATOMIC_TAGS = new Set(['code', 'kbd', 'samp'])

/** 通过 class 识别的原样保留元素：推文嵌入、Mermaid、KaTeX / 数学块、图表 */
const SKIP_CLASS_RE = /\bclass\s*=\s*(?:"[^"]*\b(?:twitter-tweet|mermaid|katex|katex-display|math-block|kami-diagram)\b[^"]*"|'[^']*\b(?:twitter-tweet|mermaid|katex|katex-display|math-block|kami-diagram)\b[^']*')/i
const SKIP_ATTR_RE = /\bdata-(?:latex|type\s*=\s*["']?math)/i

const TOKEN_RE = /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-zA-Z][^\s/>]*(?:"[^"]*"|'[^']*'|[^>"'])*>|[^<]+|</g
const PLACEHOLDER_RE = /⟦(\/?)(\d+)(\/?)⟧/g

interface Token {
  raw: string
  kind: 'text' | 'tag' | 'comment'
  name: string
  closing: boolean
  selfClosing: boolean
}

function tokenize(html: string): Token[] {
  const tokens: Token[] = []
  for (const match of html.matchAll(TOKEN_RE)) {
    const raw = match[0]
    if (raw.startsWith('<!')) {
      tokens.push({ raw, kind: 'comment', name: '', closing: false, selfClosing: true })
      continue
    }
    const tag = raw.match(/^<(\/?)([a-zA-Z][^\s/>]*)/)
    if (raw.length > 1 && tag) {
      const name = tag[2].toLowerCase()
      tokens.push({
        raw,
        kind: 'tag',
        name,
        closing: tag[1] === '/',
        selfClosing: raw.endsWith('/>') || VOID_TAGS.has(name),
      })
    } else {
      tokens.push({ raw, kind: 'text', name: '', closing: false, selfClosing: false })
    }
  }
  return tokens
}

/** 从 start（一个开标签）找到与之配对的闭标签下标（同名标签计深度）；找不到返回 -1。 */
function findMatchingClose(tokens: Token[], start: number): number {
  const name = tokens[start].name
  let depth = 0
  for (let i = start; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.kind !== 'tag' || token.name !== name) continue
    if (token.closing) {
      depth -= 1
      if (depth === 0) return i
    } else if (!token.selfClosing) {
      depth += 1
    }
  }
  return -1
}

function isSkipElement(token: Token): boolean {
  if (token.kind !== 'tag' || token.closing || token.selfClosing) return false
  return SKIP_TAGS.has(token.name) || SKIP_CLASS_RE.test(token.raw) || SKIP_ATTR_RE.test(token.raw)
}

// ---------------------------------------------------------------------------
// 计划：把 HTML 切成「原样片段」和「翻译单元」
// ---------------------------------------------------------------------------

export interface Placeholder {
  id: number
  kind: 'open' | 'close' | 'void'
  /** 原始标签（或整个原子元素）的 HTML */
  raw: string
  /** 有配对的闭（开）占位符时存在；成对占位符共用同一个 id */
  pair?: number
}

export interface TranslationUnit {
  /** 发给模型的文本：正文 + 占位符 */
  source: string
  placeholders: Placeholder[]
}

export type PlanItem = { type: 'raw'; text: string } | { type: 'unit'; unit: number }

export interface HtmlTranslationPlan {
  items: PlanItem[]
  units: TranslationUnit[]
}

type BufferToken =
  | { kind: 'text'; raw: string }
  | { kind: 'open' | 'close'; raw: string; name: string }
  | { kind: 'void'; raw: string }

function placeholderToken(placeholder: Placeholder): string {
  if (placeholder.kind === 'open') return `⟦${placeholder.id}⟧`
  if (placeholder.kind === 'close') return `⟦/${placeholder.id}⟧`
  return `⟦${placeholder.id}/⟧`
}

function buildUnit(buffer: BufferToken[]): TranslationUnit {
  const placeholders: Placeholder[] = []
  const stack: Array<{ id: number; name: string }> = []
  let source = ''
  let nextId = 1

  for (const token of buffer) {
    if (token.kind === 'text') {
      source += token.raw
      continue
    }
    const id = nextId++
    if (token.kind === 'open') {
      placeholders.push({ id, kind: 'open', raw: token.raw })
      stack.push({ id, name: token.name })
      source += `⟦${id}⟧`
    } else if (token.kind === 'close') {
      const top = stack[stack.length - 1]
      if (top && top.name === token.name) {
        // 成对标签共用同一个 id：⟦3⟧…⟦/3⟧
        stack.pop()
        nextId -= 1
        const open = placeholders.find((p) => p.id === top.id && p.kind === 'open')!
        open.pair = top.id
        placeholders.push({ id: top.id, kind: 'close', raw: token.raw, pair: top.id })
        source += `⟦/${top.id}⟧`
      } else {
        // 没有对应开标签（被块边界截断）：当作独立占位符原样放回
        placeholders.push({ id, kind: 'void', raw: token.raw })
        source += `⟦${id}/⟧`
      }
    } else {
      placeholders.push({ id, kind: 'void', raw: token.raw })
      source += `⟦${id}/⟧`
    }
  }
  return { source, placeholders }
}

/** 把 HTML 切成「原样片段」和「翻译单元」。 */
export function planHtmlTranslation(html: string): HtmlTranslationPlan {
  const tokens = tokenize(html)
  const items: PlanItem[] = []
  const units: TranslationUnit[] = []
  let buffer: BufferToken[] = []

  const pushRaw = (text: string) => {
    if (!text) return
    const last = items[items.length - 1]
    if (last && last.type === 'raw') last.text += text
    else items.push({ type: 'raw', text })
  }

  const flush = () => {
    if (buffer.length === 0) return
    const hasCjk = buffer.some((token) => token.kind === 'text' && CJK.test(token.raw))
    if (hasCjk) {
      units.push(buildUnit(buffer))
      items.push({ type: 'unit', unit: units.length - 1 })
    } else {
      pushRaw(buffer.map((token) => token.raw).join(''))
    }
    buffer = []
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token.kind === 'comment') {
      buffer.push({ kind: 'void', raw: token.raw })
      continue
    }
    if (token.kind === 'text') {
      buffer.push({ kind: 'text', raw: token.raw })
      continue
    }

    // 以下都是标签
    if (isSkipElement(token)) {
      const end = findMatchingClose(tokens, i)
      flush()
      const last = end === -1 ? i : end
      pushRaw(tokens.slice(i, last + 1).map((t) => t.raw).join(''))
      i = last
      continue
    }

    if (!token.closing && ATOMIC_TAGS.has(token.name) && !token.selfClosing) {
      const end = findMatchingClose(tokens, i)
      if (end !== -1) {
        buffer.push({ kind: 'void', raw: tokens.slice(i, end + 1).map((t) => t.raw).join('') })
        i = end
        continue
      }
    }

    if (BLOCK_TAGS.has(token.name)) {
      flush()
      pushRaw(token.raw)
      continue
    }

    // 行内标签
    if (token.selfClosing) buffer.push({ kind: 'void', raw: token.raw })
    else if (token.closing) buffer.push({ kind: 'close', raw: token.raw, name: token.name })
    else buffer.push({ kind: 'open', raw: token.raw, name: token.name })
  }
  flush()

  return { items, units }
}

// ---------------------------------------------------------------------------
// 校验与还原
// ---------------------------------------------------------------------------

/** 译文里的文字不能带原始 < >，也不能有裸 &：模型输出一律当文本处理，避免把标记注入页面。 */
export function escapeTranslatedText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&(?!#?[a-zA-Z0-9]+;)/g, '&amp;')
}

export type UnitValidation = { ok: true; text: string } | { ok: false; reason: string }

/** 校验译文：占位符与原文完全一致（各出现一次、无多余），成对的正确嵌套。通过则返回已转义的译文。 */
export function validateUnitTranslation(unit: TranslationUnit, translated: string): UnitValidation {
  const found: Array<{ kind: 'open' | 'close' | 'void'; id: number }> = []
  for (const match of translated.matchAll(PLACEHOLDER_RE)) {
    const [, leading, id, trailing] = match
    if (leading && trailing) return { ok: false, reason: `占位符格式错误：${match[0]}` }
    found.push({ kind: leading ? 'close' : trailing ? 'void' : 'open', id: Number(id) })
  }

  const expected = new Map(unit.placeholders.map((p) => [`${p.kind}:${p.id}`, p]))
  if (found.length !== expected.size) {
    return { ok: false, reason: `占位符数量不一致（应为 ${expected.size}，实际 ${found.length}）` }
  }
  const seen = new Set<string>()
  for (const item of found) {
    const key = `${item.kind}:${item.id}`
    if (!expected.has(key)) return { ok: false, reason: `出现未知占位符 ${key}` }
    if (seen.has(key)) return { ok: false, reason: `占位符重复 ${key}` }
    seen.add(key)
  }

  // 嵌套：成对占位符必须先开后闭、层级正确（⟦n⟧ 必须在 ⟦/n⟧ 之前，且不交叉）
  const stack: number[] = []
  for (const item of found) {
    if (item.kind === 'open') {
      if (expected.get(`open:${item.id}`)!.pair !== undefined) stack.push(item.id)
    } else if (item.kind === 'close') {
      if (stack.pop() !== item.id) return { ok: false, reason: '成对占位符的嵌套顺序错误' }
    }
  }
  if (stack.length > 0) return { ok: false, reason: '成对占位符缺少闭合' }

  // 占位符之外的文字做转义
  const parts = translated.split(/(⟦\/?\d+\/?⟧)/)
  const text = parts.map((part) => (/^⟦\/?\d+\/?⟧$/.test(part) ? part : escapeTranslatedText(part))).join('')
  return { ok: true, text }
}

/** 把（已校验的）译文里的占位符换回原标签。 */
export function renderUnit(unit: TranslationUnit, translated: string): string {
  const byToken = new Map(unit.placeholders.map((p) => [placeholderToken(p), p.raw]))
  return translated.replace(/⟦\/?\d+\/?⟧/g, (token) => byToken.get(token) ?? '')
}

/** 把每个单元的译文（占位符形式）按原文档顺序拼回完整 HTML。 */
export function assembleHtml(plan: HtmlTranslationPlan, translations: string[]): string {
  return plan.items
    .map((item) => (item.type === 'raw' ? item.text : renderUnit(plan.units[item.unit], translations[item.unit])))
    .join('')
}

// ---------------------------------------------------------------------------
// 批量收发、逐段兜底
// ---------------------------------------------------------------------------

export const DEFAULT_BATCH_CHARS = 1500

/** 把单元按累计长度分批（每批一次模型调用）。返回每批的单元下标。 */
export function planBatches(units: TranslationUnit[], maxChars = DEFAULT_BATCH_CHARS): number[][] {
  const batches: number[][] = []
  let current: number[] = []
  let size = 0
  units.forEach((unit, index) => {
    if (current.length > 0 && size + unit.source.length > maxChars) {
      batches.push(current)
      current = []
      size = 0
    }
    current.push(index)
    size += unit.source.length
  })
  if (current.length > 0) batches.push(current)
  return batches
}

export function buildBatchInput(entries: Array<{ index: number; text: string }>): string {
  return entries.map((entry) => `<<<${entry.index}>>>\n${entry.text}`).join('\n')
}

/** 解析模型返回的批量译文：`<<<N>>>` 后面直到下一个标记的内容。容忍前后多余文字与外层代码围栏。 */
export function parseBatchOutput(raw: string): Map<number, string> {
  const out = new Map<number, string>()
  const markers = [...raw.matchAll(/<<<(\d+)>>>/g)]
  markers.forEach((marker, i) => {
    const start = (marker.index ?? 0) + marker[0].length
    const end = i + 1 < markers.length ? markers[i + 1].index : raw.length
    let text = raw.slice(start, end).trim()
    text = text.replace(/^```[a-z]*\n?|\n?```$/gi, '').trim()
    if (!out.has(Number(marker[1]))) out.set(Number(marker[1]), text)
  })
  return out
}

/** 单元里需要翻译的文字片段（占位符之间的文字，且含中文）。 */
export function splitSegments(source: string): Array<{ text: string; translate: boolean }> {
  return source
    .split(/(⟦\/?\d+\/?⟧)/)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, translate: !/^⟦\/?\d+\/?⟧$/.test(part) && CJK.test(part) }))
}

/** 保留单元首尾空白：模型输出通常会 trim，这里补回，避免行内相邻文字粘在一起。 */
export function restoreEdgeWhitespace(source: string, translated: string): string {
  const lead = source.match(/^\s*/)?.[0] ?? ''
  const trail = source.match(/\s*$/)?.[0] ?? ''
  return `${lead}${translated.trim()}${trail}`
}

/** HTML 转纯文本（译文的 content 字段：搜索与摘要用）。 */
export function htmlToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote|figure|figcaption|table|ul|ol|pre|section|article)>/gi, '\n')
  return decodeHtmlEntities(stripTags(withBreaks))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---------------------------------------------------------------------------
// 带恢复的批量翻译（模型调用由外部注入，便于测试）
// ---------------------------------------------------------------------------

export interface TranslateUnitsResult {
  /** 单元下标 → 译文（占位符形式，已校验、已转义、已补回首尾空白） */
  results: Map<number, string>
  /** 批量校验失败、靠单独重试救回的单元数 */
  retried: number
  /** 靠逐文字片段兜底救回的单元数 */
  fallback: number
  /** 兜底后仍有片段无法翻译而保留了原文的单元数 */
  keptOriginal: number
}

/**
 * 翻译一批单元：先整批调用；校验失败（占位符被丢、改号、嵌套错）的单元单独重试一次；
 * 仍失败的退到「逐文字片段」翻译——占位符根本不发给模型，所以必然合法；片段也翻不出来就保留原文。
 * 任何情况下都不会输出占位符不一致的结果，因此标签、图片、链接地址都不会丢。
 */
export async function translateUnits(
  units: TranslationUnit[],
  indices: number[],
  call: (input: string) => Promise<string>,
): Promise<TranslateUnitsResult> {
  const results = new Map<number, string>()
  const accept = (index: number, output: string | undefined) => {
    if (!output) return false
    const validation = validateUnitTranslation(units[index], output)
    if (!validation.ok) return false
    results.set(index, restoreEdgeWhitespace(units[index].source, validation.text))
    return true
  }

  const batch = parseBatchOutput(
    await call(buildBatchInput(indices.map((index) => ({ index, text: units[index].source })))),
  )
  let failed = indices.filter((index) => !accept(index, batch.get(index)))
  const retried = failed.length

  const stillFailed: number[] = []
  for (const index of failed) {
    const single = parseBatchOutput(await call(buildBatchInput([{ index, text: units[index].source }])))
    if (!accept(index, single.get(index))) stillFailed.push(index)
  }
  failed = stillFailed

  let keptOriginal = 0
  for (const index of failed) {
    const segments = splitSegments(units[index].source)
    const wanted = segments.flatMap((segment, position) => (segment.translate ? [{ position, text: segment.text }] : []))
    const translated = parseBatchOutput(
      await call(buildBatchInput(wanted.map((item) => ({ index: item.position, text: item.text })))),
    )
    let kept = false
    const rebuilt = segments
      .map((segment, position) => {
        if (!segment.translate) return segment.text
        const out = translated.get(position)
        if (!out) {
          kept = true
          return segment.text
        }
        return restoreEdgeWhitespace(segment.text, escapeTranslatedText(out))
      })
      .join('')
    if (kept) keptOriginal += 1
    // 占位符没有经过模型，必然通过校验；校验只是兜底保险
    if (!accept(index, rebuilt)) results.set(index, units[index].source)
  }

  return { results, retried: retried - failed.length, fallback: failed.length, keptOriginal }
}
