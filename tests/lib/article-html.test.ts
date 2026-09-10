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

describe('renderMarkdownContent math', () => {
  it('turns markdown math into katex html', async () => {
    const { renderMarkdownContent } = await import('@/lib/markdown')
    const markdownHtml = await renderMarkdownContent('面积 $S=\\pi r^2$\n\n$$\na^2+b^2=c^2\n$$')
    const html = await highlightHtml(markdownHtml)
    expect(html).toContain('katex')
    expect(html).toContain('data-math-latex')
  })
})
