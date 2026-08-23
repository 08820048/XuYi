import { describe, expect, it } from 'vitest'
import { formatArticleCopyrightText } from '@/lib/article-copyright'

describe('article copyright text', () => {
  it('includes the article link and optional original source', () => {
    const text = formatArticleCopyrightText({
      title: '测试文章',
      articleUrl: 'https://xuyi.dev/test-post',
      sourceUrl: 'https://example.com/original',
    })

    expect(text).toContain('文章标题：测试文章')
    expect(text).toContain('本文链接：https://xuyi.dev/test-post')
    expect(text).toContain('原文链接：https://example.com/original')
  })

  it('omits the original source when absent', () => {
    const text = formatArticleCopyrightText({
      title: '原创文章',
      articleUrl: 'https://xuyi.dev/original-post',
    })

    expect(text).not.toContain('原文链接：')
  })
})
