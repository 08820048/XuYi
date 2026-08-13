import { describe, expect, it } from 'vitest'
import { getDiaryPath, normalizeDiarySlug } from '@/lib/diary-utils'
import { buildDiaryEntryPayload } from '@/lib/diary-payload'
import {
  decodeMimeHeader,
  isDiaryRecipientAllowed,
  isDiarySenderAllowed,
  parseDiaryEmail,
} from '@/lib/diary-email'

describe('diary helpers', () => {
  it('normalizes diary slugs with the same URL-safe policy as editor slugs', () => {
    expect(normalizeDiarySlug('  My Day__01!!  ')).toBe('myday_01')
  })

  it('builds encoded diary paths', () => {
    expect(getDiaryPath('2026-08-13-diary')).toBe('/diary/2026-08-13-diary')
  })

  it('matches configured inbound email senders exactly after trimming and lowercasing', () => {
    expect(isDiarySenderAllowed('Me <Me@Example.com>', 'admin@example.com,me@example.com')).toBe(true)
    expect(isDiarySenderAllowed('other@example.com', 'admin@example.com,me@example.com')).toBe(false)
    expect(isDiarySenderAllowed('me@example.com', '')).toBe(false)
  })

  it('matches configured diary recipient when present', () => {
    expect(isDiaryRecipientAllowed('Diary <diary@example.com>', 'diary@example.com')).toBe(true)
    expect(isDiaryRecipientAllowed('notes@example.com', 'diary@example.com')).toBe(false)
    expect(isDiaryRecipientAllowed('notes@example.com', '')).toBe(true)
  })

  it('decodes UTF-8 MIME headers', () => {
    expect(decodeMimeHeader('=?UTF-8?B?5pel6K6w?=')).toBe('日记')
  })

  it('extracts plain text and html from multipart email', () => {
    const raw = [
      'From: Me <me@example.com>',
      'To: Diary <diary@example.com>',
      'Subject: =?UTF-8?B?5LuK5pel6ZqP6K6w?=',
      'Content-Type: multipart/alternative; boundary="abc"',
      '',
      '--abc',
      'Content-Type: text/plain; charset=utf-8',
      '',
      '今天散步，看见晚霞。',
      '--abc',
      'Content-Type: text/html; charset=utf-8',
      '',
      '<p>今天散步，看见晚霞。</p>',
      '--abc--',
      '',
    ].join('\r\n')

    expect(parseDiaryEmail(raw)).toEqual({
      from: 'Me <me@example.com>',
      to: 'Diary <diary@example.com>',
      subject: '今日随记',
      text: '今天散步，看见晚霞。',
      html: '<p>今天散步，看见晚霞。</p>',
    })
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
})
