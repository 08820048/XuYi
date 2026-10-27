import { describe, expect, it } from 'vitest'
import {
  buildTranslateSystemPrompt,
  joinTranslatedChunks,
  parseTranslatedMeta,
  splitMarkdownForTranslation,
  stripOuterFence,
} from '@/lib/ai-translate'
import { getTranslationFreshness, hashTranslationSource } from '@/lib/translation-hash'

describe('splitMarkdownForTranslation', () => {
  it('keeps fenced code blocks verbatim and untranslated', () => {
    const md = '先介绍一下。\n\n```ts\nconst a = "中文字符串"\n\nconst b = 2\n```\n\n再总结一下。'
    const chunks = splitMarkdownForTranslation(md)
    const code = chunks.find((chunk) => chunk.text.startsWith('```'))
    expect(code).toEqual({ text: '```ts\nconst a = "中文字符串"\n\nconst b = 2\n```', translate: false })
    expect(chunks.filter((chunk) => chunk.translate)).toHaveLength(2)
  })

  it('does not close a fence on a shorter or different fence marker', () => {
    const md = '````md\n```\n中文\n```\n````\n\n正文。'
    const chunks = splitMarkdownForTranslation(md)
    expect(chunks[0].translate).toBe(false)
    expect(chunks[0].text.endsWith('````')).toBe(true)
    expect(chunks[1]).toEqual({ text: '正文。', translate: true })
  })

  it('skips blocks without Chinese characters', () => {
    const chunks = splitMarkdownForTranslation('![cover](/a.png)\n\n---\n\nPlain English line.\n\n你好')
    expect(chunks.map((chunk) => chunk.translate)).toEqual([false, false, false, true])
  })

  it('packs adjacent paragraphs up to the size limit', () => {
    const paragraph = '这是一个段落。'.repeat(20) // 140 chars
    const md = Array.from({ length: 6 }, () => paragraph).join('\n\n')
    const chunks = splitMarkdownForTranslation(md, 400)
    expect(chunks.every((chunk) => chunk.translate)).toBe(true)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((chunk) => chunk.text.length <= 400)).toBe(true)
    // 内容不丢
    expect(chunks.map((chunk) => chunk.text).join('\n\n')).toBe(md)
  })

  it('splits an oversized paragraph on line and sentence boundaries without losing text', () => {
    const longLine = '第一句话。第二句话！第三句话？'.repeat(60)
    const md = `${longLine}\n- 列表项一\n- 列表项二`
    const chunks = splitMarkdownForTranslation(md, 200)
    expect(chunks.every((chunk) => chunk.text.length <= 200)).toBe(true)
    const rejoined = chunks.map((chunk) => chunk.text).join('')
    expect(rejoined.replace(/\s/g, '')).toBe(md.replace(/\s/g, ''))
  })

  it('returns no chunks for empty input', () => {
    expect(splitMarkdownForTranslation('  \n\n ')).toEqual([])
  })
})

describe('translation helpers', () => {
  it('joins chunks with blank lines and a trailing newline', () => {
    expect(joinTranslatedChunks(['A', ' B ', '', 'C'])).toBe('A\n\nB\n\nC\n')
  })

  it('parses metadata JSON, tolerating fences and chatter', () => {
    expect(parseTranslatedMeta('```json\n{"title":"Hello","description":"World"}\n```')).toEqual({
      title: 'Hello',
      description: 'World',
    })
    expect(parseTranslatedMeta('Sure! {"title":"T","description":""} Done.')).toEqual({ title: 'T', description: '' })
    expect(parseTranslatedMeta('{"description":"x"}')).toBeNull()
    expect(parseTranslatedMeta('not json')).toBeNull()
  })

  it('strips only an outer markdown fence', () => {
    expect(stripOuterFence('```markdown\n# Hi\n\ntext\n```')).toBe('# Hi\n\ntext')
    expect(stripOuterFence('# Hi\n\n```ts\ncode\n```')).toBe('# Hi\n\n```ts\ncode\n```')
  })

  it('appends custom instructions to the system prompt', () => {
    const prompt = buildTranslateSystemPrompt('en', '术语表：存档 = save file')
    expect(prompt).toContain('English')
    expect(prompt).toContain('术语表：存档 = save file')
    expect(buildTranslateSystemPrompt('en')).not.toContain('Additional instructions')
  })
})

describe('translation freshness', () => {
  it('detects stale translations by source hash', async () => {
    const a = await hashTranslationSource('标题', '正文')
    const b = await hashTranslationSource('标题', '正文改了')
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashTranslationSource('标题', '正文')).toBe(a)
    expect(getTranslationFreshness(a, a)).toBe('fresh')
    expect(getTranslationFreshness(a, b)).toBe('stale')
    expect(getTranslationFreshness(null, b)).toBe('unknown')
  })
})
