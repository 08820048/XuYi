import { describe, expect, it } from 'vitest'
import { getTranslationFreshness, hashTranslationSource } from '@/lib/translation-hash'

describe('translation freshness', () => {
  it('detects that the Chinese version changed after the English one was written', async () => {
    const a = await hashTranslationSource('标题', '<p>正文</p>')
    const b = await hashTranslationSource('标题', '<p>正文</p><img src="/new.png">')
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashTranslationSource('标题', '<p>正文</p>')).toBe(a)
    expect(getTranslationFreshness(a, a)).toBe('fresh')
    // 只加了一张图也算中文版本变了
    expect(getTranslationFreshness(a, b)).toBe('stale')
    // 没有记录指纹（早期写入）时不提示
    expect(getTranslationFreshness(null, b)).toBe('unknown')
  })
})
