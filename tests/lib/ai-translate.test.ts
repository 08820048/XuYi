import { describe, expect, it } from 'vitest'
import { buildMetaSystemPrompt, buildUnitSystemPrompt, parseTranslatedMeta } from '@/lib/ai-translate'
import { getTranslationFreshness, hashTranslationSource } from '@/lib/translation-hash'

describe('translation prompts', () => {
  it('explains placeholders and forbids touching markup', () => {
    const prompt = buildUnitSystemPrompt('en')
    expect(prompt).toContain('English')
    expect(prompt).toContain('⟦3⟧ ... ⟦/3⟧')
    expect(prompt).toContain('⟦4/⟧')
    expect(prompt).toContain('<<<N>>>')
    expect(prompt).not.toContain('Additional instructions')
  })

  it('appends custom instructions with higher priority', () => {
    const prompt = buildUnitSystemPrompt('en', '术语表：存档 = save file')
    expect(prompt).toContain('Additional instructions from the author (take precedence)')
    expect(prompt).toContain('术语表：存档 = save file')
    expect(buildMetaSystemPrompt('en', '语气随意')).toContain('语气随意')
  })
})

describe('parseTranslatedMeta', () => {
  it('parses metadata JSON, tolerating fences and chatter', () => {
    expect(parseTranslatedMeta('```json\n{"title":"Hello","description":"World"}\n```')).toEqual({
      title: 'Hello',
      description: 'World',
    })
    expect(parseTranslatedMeta('Sure! {"title":"T","description":""} Done.')).toEqual({ title: 'T', description: '' })
    expect(parseTranslatedMeta('{"description":"x"}')).toBeNull()
    expect(parseTranslatedMeta('not json')).toBeNull()
  })
})

describe('translation freshness', () => {
  it('detects stale translations by a source hash of the title and HTML', async () => {
    const a = await hashTranslationSource('标题', '<p>正文</p>')
    const b = await hashTranslationSource('标题', '<p>正文</p><img src="/new.png">')
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashTranslationSource('标题', '<p>正文</p>')).toBe(a)
    expect(getTranslationFreshness(a, a)).toBe('fresh')
    // 只加了一张图也算中文版本变了
    expect(getTranslationFreshness(a, b)).toBe('stale')
    expect(getTranslationFreshness(null, b)).toBe('unknown')
  })
})
