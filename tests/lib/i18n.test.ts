import { describe, expect, it } from 'vitest'
import {
  alternatePath,
  localeFromPathname,
  localizeNavLabel,
  localePath,
  stripLocalePrefix,
  t,
} from '@/lib/i18n'

describe('i18n paths', () => {
  it('detects locale from pathname', () => {
    expect(localeFromPathname('/')).toBe('zh')
    expect(localeFromPathname('/en')).toBe('en')
    expect(localeFromPathname('/en/hello')).toBe('en')
    expect(localeFromPathname('/english-post')).toBe('zh')
    expect(localeFromPathname(null)).toBe('zh')
  })

  it('strips the locale prefix', () => {
    expect(stripLocalePrefix('/en')).toBe('/')
    expect(stripLocalePrefix('/en/links')).toBe('/links')
    expect(stripLocalePrefix('/entry')).toBe('/entry')
  })

  it('prefixes internal paths only for non-default locales', () => {
    expect(localePath('/', 'en')).toBe('/en')
    expect(localePath('/links', 'en')).toBe('/en/links')
    expect(localePath('/?tab=blog', 'en')).toBe('/en?tab=blog')
    expect(localePath('/diary?page=2', 'en')).toBe('/en/diary?page=2')
    expect(localePath('/links', 'zh')).toBe('/links')
    expect(localePath('/en/links', 'zh')).toBe('/links')
  })

  it('leaves external and anchor links alone', () => {
    expect(localePath('https://x.com/a', 'en')).toBe('https://x.com/a')
    expect(localePath('//cdn.example.com/a', 'en')).toBe('//cdn.example.com/a')
    expect(localePath('#top', 'en')).toBe('#top')
    expect(localePath('mailto:a@b.c', 'en')).toBe('mailto:a@b.c')
  })

  it('computes the alternate-language path', () => {
    expect(alternatePath('/links', 'en')).toBe('/en/links')
    expect(alternatePath('/en/links', 'zh')).toBe('/links')
    expect(alternatePath('/en', 'zh')).toBe('/')
    expect(alternatePath('/', 'en')).toBe('/en')
  })
})

describe('i18n messages', () => {
  it('interpolates variables', () => {
    expect(t('en', 'searchKeyword', { q: 'ai', n: 3 })).toBe('3 articles found for “ai”')
    expect(t('zh', 'daysAgo', { n: 2 })).toBe('2天前')
  })

  it('translates known nav labels and keeps unknown ones', () => {
    expect(localizeNavLabel('关于我', 'en')).toBe('About')
    expect(localizeNavLabel('GitHub', 'en')).toBe('GitHub')
    expect(localizeNavLabel('关于我', 'zh')).toBe('关于我')
  })
})
