import { describe, expect, it } from 'vitest'
import { getDiaryDisplayTitle, getDiaryPath, normalizeDiarySlug } from '@/lib/diary-utils'
import { buildDiaryEntryPayload } from '@/lib/diary-payload'

describe('diary helpers', () => {
  it('normalizes diary slugs with the same URL-safe policy as editor slugs', () => {
    expect(normalizeDiarySlug('  My Day__01!!  ')).toBe('myday_01')
  })

  it('builds encoded diary paths', () => {
    expect(getDiaryPath('2026-08-13-diary')).toBe('/diary/2026-08-13-diary')
  })

  it('accepts html-only diary payloads by deriving plain content', async () => {
    await expect(buildDiaryEntryPayload({
      title: '照片',
      html: '<p>只发了一张图和一句话。</p>',
    })).resolves.toMatchObject({
      title: '照片',
      content: '只发了一张图和一句话。',
      html: '<p>只发了一张图和一句话。</p>',
      status: 'published',
    })
  })

  it('allows diary payloads without a title', async () => {
    await expect(buildDiaryEntryPayload({
      title: '',
      content: '今天只想随手记一句。',
    })).resolves.toMatchObject({
      title: null,
      content: '今天只想随手记一句。',
    })
  })

  it('accepts media-only diary payloads', async () => {
    await expect(buildDiaryEntryPayload({
      html: '<p><img src="https://example.com/photo.jpg"></p>',
    })).resolves.toMatchObject({
      title: null,
      content: '',
      html: '<p><img src="https://example.com/photo.jpg"></p>',
    })
  })

  it('builds a fallback display title when diary title is blank', () => {
    expect(getDiaryDisplayTitle({
      title: null,
      description: '今天散步，看见晚霞。',
      published_at: 1786550400,
    })).toBe('今天散步，看见晚霞。')
  })
})
