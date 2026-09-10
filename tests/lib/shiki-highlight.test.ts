import { describe, expect, it } from 'vitest'
import { highlightHtml, resolveLanguage } from '@/lib/shiki-highlight'

describe('highlightHtml', () => {
  it('leaves html without code blocks unchanged', async () => {
    const html = '<p>hello <code>inline</code></p>'
    expect(await highlightHtml(html)).toBe(html)
  })

  it('highlights a python block with shiki tokens', async () => {
    const html = '<pre><code class="language-python">from langchain_core.messages import SystemMessage\n</code></pre>'
    const result = await highlightHtml(html)

    expect(result).toContain('light-plus')
    expect(result).toContain('dark-plus')
    expect(result).toContain('from')
    expect(result).toMatch(/style="[^"]*--shiki-dark/)
    expect(result).not.toContain('language-python')
  })

  it('strips existing highlight.js spans before re-highlighting', async () => {
    const html = '<pre><code class="language-js hljs"><span class="hljs-keyword">const</span> a = <span class="hljs-number">1</span></code></pre>'
    const result = await highlightHtml(html)

    expect(result).toContain('light-plus')
    expect(result).not.toContain('hljs-keyword')
    expect(result).toContain('const')
  })

  it('falls back to plaintext for unknown languages', async () => {
    expect(resolveLanguage('not-a-real-lang')).toBe('text')
    const html = '<pre><code class="language-not-a-real-lang">hello world</code></pre>'
    const result = await highlightHtml(html)
    expect(result).toContain('light-plus')
    expect(result).toContain('hello world')
  })
})
