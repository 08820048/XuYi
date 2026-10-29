import { describe, expect, it } from 'vitest'
import { buildGreeting, greetingLocale } from '@/lib/greeting'

describe('greetingLocale', () => {
  it('always English under /en', () => {
    expect(greetingLocale('en', 'zh-CN', { country: 'CN' })).toBe('en')
  })
  it('follows a Chinese browser even when the IP is abroad', () => {
    expect(greetingLocale('zh', 'zh-CN', { country: 'US' })).toBe('zh')
  })
  it('English browser outside China gets English', () => {
    expect(greetingLocale('zh', 'en-US', { country: 'US' })).toBe('en')
  })
  it('English browser inside China falls back to Chinese (IP decides)', () => {
    expect(greetingLocale('zh', 'en-US', { country: 'CN' })).toBe('zh')
  })
  it('no browser hint: IP country decides', () => {
    expect(greetingLocale('zh', undefined, { country: 'JP' })).toBe('en')
    expect(greetingLocale('zh', undefined, { country: 'TW' })).toBe('zh')
  })
})

describe('buildGreeting', () => {
  it('uses the Chinese city name and the time of day', () => {
    expect(buildGreeting('zh', { country: 'CN', city: 'Shanghai' }, 20)).toBe('晚上好，欢迎来自上海的朋友')
    expect(buildGreeting('zh', { country: 'CN', city: 'Hangzhou' }, 8)).toBe('早上好，欢迎来自杭州的朋友')
    expect(buildGreeting('zh', { country: 'CN', city: 'Hangzhou' }, 2)).toContain('夜深了')
  })
  it('falls back to province, then country, then no place', () => {
    expect(buildGreeting('zh', { country: 'CN', region: 'Zhejiang', city: 'Lanxi' }, 14)).toBe('下午好，欢迎来自浙江的朋友')
    expect(buildGreeting('zh', { country: 'DE', city: 'Leipzig' }, 14)).toBe('下午好，欢迎来自德国的朋友')
    expect(buildGreeting('zh', {}, 14)).toBe('下午好，欢迎来访')
  })
  it('English uses the city as given', () => {
    expect(buildGreeting('en', { country: 'US', city: 'San Francisco' }, 9)).toBe('Good morning, welcome from San Francisco')
    expect(buildGreeting('en', {}, 9)).toBe('Good morning, welcome')
  })
})
