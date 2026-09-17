import { describe, expect, it } from 'vitest'
import { containsMathSyntax, renderMathInHtml, splitMathSegments } from '@/lib/math-html'
import { prepareDiagramBlocks } from '@/lib/diagram-html'
import { highlightHtml } from '@/lib/shiki-highlight'

describe('splitMathSegments', () => {
  it('keeps ordinary text unchanged', () => {
    expect(splitMathSegments('hello world')).toEqual([{ type: 'text', value: 'hello world' }])
  })

  it('extracts inline and display math', () => {
    expect(splitMathSegments('能量 $E=mc^2$ 很大')).toEqual([
      { type: 'text', value: '能量 ' },
      { type: 'math', value: 'E=mc^2', displayMode: false },
      { type: 'text', value: ' 很大' },
    ])
    expect(splitMathSegments('$$\\int_0^1 x dx$$')).toEqual([
      { type: 'math', value: '\\int_0^1 x dx', displayMode: true },
    ])
  })

  it('supports latex paren and bracket delimiters', () => {
    expect(splitMathSegments('令 \\(a+b\\) 成立')).toEqual([
      { type: 'text', value: '令 ' },
      { type: 'math', value: 'a+b', displayMode: false },
      { type: 'text', value: ' 成立' },
    ])
    expect(splitMathSegments('\\[a^2+b^2=c^2\\]')).toEqual([
      { type: 'math', value: 'a^2+b^2=c^2', displayMode: true },
    ])
  })
})

describe('renderMathInHtml', () => {
  it('renders dollar math in paragraphs and skips code', () => {
    const html = '<p>面积 $S=\\pi r^2$</p><pre><code>const price = $10</code></pre>'
    const result = renderMathInHtml(html)

    expect(result).toContain('katex')
    expect(result).toContain('data-math-latex')
    expect(result).toContain('const price = $10')
    expect(containsMathSyntax('面积 $S=\\pi r^2$')).toBe(true)
  })

  it('turns math code fences into display formulas', () => {
    const html = '<pre class="hljs"><code class="language-math">E = mc^2</code></pre>'
    const result = renderMathInHtml(html)

    expect(result).toContain('katex-display')
    expect(result).not.toContain('language-math')
  })

  it('rehydrates katex html that TipTap escaped as text', () => {
    const html = '<p>行内公式：<span data-math-latex="E = mc^2" data-display-mode="true" class="math-block-wrapper">&lt;span class="katex-display"&gt;&lt;span class="katex"&gt;&lt;span class="katex-mathml"&gt;&lt;annotation encoding="application/x-tex"&gt;E = mc^2&lt;/annotation&gt;&lt;/span&gt;&lt;/span&gt;&lt;/span&gt;</span></p>'
    const result = renderMathInHtml(html)

    expect(result).toContain('class="katex"')
    expect(result).not.toContain('&lt;span class="katex')
    expect(result).toContain('data-math-latex="E = mc^2"')
  })
})

describe('prepareDiagramBlocks', () => {
  it('wraps mermaid fences for client rendering', () => {
    const html = '<pre class="hljs"><code class="language-mermaid">flowchart TD\n  A--&gt;B</code></pre>'
    const result = prepareDiagramBlocks(html)

    expect(result).toContain('kami-diagram')
    expect(result).toContain('class="mermaid"')
    expect(result).toContain('A--&gt;B')
    expect(result).not.toContain('language-mermaid')
  })
})

describe('highlightHtml diagrams and math', () => {
  it('does not run shiki on mermaid blocks', async () => {
    const html = '<pre><code class="language-mermaid">flowchart TD\n  A-->B</code></pre>'
    const result = await highlightHtml(html)

    expect(result).toContain('class="mermaid"')
    expect(result).not.toContain('light-plus')
    expect(result).toContain('A--&gt;B')
  })

  it('renders paragraph math without needing the browser', async () => {
    const html = '<p>质能 $E=mc^2$</p>'
    const result = await highlightHtml(html)
    expect(result).toContain('katex')
    expect(result).toContain('E=mc^2')
  })
})

describe('enhanceMarkdownInHtml', () => {
  it('turns leftover markdown links and bare urls into anchors', async () => {
    const { enhanceMarkdownInHtml } = await import('@/lib/markdown-html')
    const html = '<p>看 <a href="https://keep.example">已有链接</a> 和 [Chupin](https://chupin.site) 以及 Chupin简历:https://chupin.site)</p><pre><code>[skip](https://example.com)</code></pre>'
    const result = enhanceMarkdownInHtml(html)

    expect(result).toContain('href="https://keep.example"')
    expect(result).toContain('>Chupin</a>')
    expect(result).toContain('href="https://chupin.site"')
    expect(result).toContain('[skip](https://example.com)')
  })

  it('renders GFM footnotes from stored editor html', async () => {
    const { enhanceMarkdownInHtml } = await import('@/lib/markdown-html')
    const html = [
      '<p>初次筛选大约 7.4 秒。[^1] 实验室数字不必奉为定律。</p>',
      '<p>---</p>',
      '<p></p>',
      '<p>[^1]: The Ladders, <a href="https://example.com/study"><em>Eye-Tracking Study</em> (2018)</a>。7.4 秒指初次筛选。</p>',
      '<p>Chupin简历:https://chupin.site)</p>',
    ].join('')
    const result = enhanceMarkdownInHtml(html)

    expect(result).toContain('data-footnote-ref')
    expect(result).toContain('href="#user-content-fn-1"')
    expect(result).toContain('id="user-content-fn-1"')
    expect(result).toContain('class="footnotes"')
    expect(result).toContain('Eye-Tracking Study')
    expect(result).not.toContain('[^1]:')
    expect(result).toContain('<hr>')
    expect(result).not.toContain('<p></p>')
    expect(result).toContain('>Chupin简历</a>')
    expect(result).not.toContain('Chupin简历:')
  })
})

describe('renderMarkdownContent math', () => {
  it('turns markdown math into katex html', async () => {
    const { renderMarkdownContent } = await import('@/lib/markdown')
    const markdownHtml = await renderMarkdownContent('面积 $S=\\pi r^2$\n\n$$\na^2+b^2=c^2\n$$')
    const html = await highlightHtml(markdownHtml)
    expect(html).toContain('katex')
    expect(html).toContain('data-math-latex')
  })
})
