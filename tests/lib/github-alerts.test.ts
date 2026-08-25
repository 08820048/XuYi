import { describe, expect, it } from 'vitest'
import { GITHUB_ALERT_TYPES, parseGithubAlertMarker } from '@/lib/github-alerts'

describe('parseGithubAlertMarker', () => {
  it('recognizes all five GitHub alert types', () => {
    for (const type of GITHUB_ALERT_TYPES) {
      expect(parseGithubAlertMarker(`[!${type.toUpperCase()}]`)).toMatchObject({
        type,
        rest: '',
      })
    }
  })

  it('keeps the text following the marker', () => {
    expect(parseGithubAlertMarker('[!TIP] 利用 Codex 的子代理工作流')).toMatchObject({
      type: 'tip',
      rest: '利用 Codex 的子代理工作流',
    })
  })

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(parseGithubAlertMarker(' \n[!Note]\t提醒')).toMatchObject({
      type: 'note',
      rest: '提醒',
    })
  })

  it('rejects text that does not start with a marker', () => {
    expect(parseGithubAlertMarker('普通引用')).toBeNull()
    expect(parseGithubAlertMarker('前面有文字 [!TIP]')).toBeNull()
    expect(parseGithubAlertMarker('[!UNKNOWN]')).toBeNull()
  })

  it('returns the matched marker text for later stripping', () => {
    const parsed = parseGithubAlertMarker('[!Warning] 小心')
    expect(parsed?.matched).toBe('[!Warning] ')
  })
})
