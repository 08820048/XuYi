import { describe, expect, it } from 'vitest'
import {
  assembleHtml,
  buildBatchInput,
  escapeTranslatedText,
  htmlToPlainText,
  parseBatchOutput,
  planBatches,
  planHtmlTranslation,
  restoreEdgeWhitespace,
  splitSegments,
  translateUnits,
  validateUnitTranslation,
} from '@/lib/html-translate'

// 贴近编辑器真实输出：图片、图注、链接、强调、列表、表格、代码块、行内代码、视频、iframe、公式、推文
const SAMPLE = [
  '<h2 id="intro">第一关：想法</h2>',
  '<p>每个产品都像一张<strong>卡带</strong>，插进去就能玩。详见<a href="https://example.com/a?x=1&amp;y=2" target="_blank">这篇文章</a>。</p>',
  '<figure><img src="/api/images/image/cover.webp" alt="封面图" width="800" height="450"><figcaption>图 1：产品总览</figcaption></figure>',
  '<p><img src="/api/images/image/inline.png" alt=""></p>',
  '<p>第一行<br>第二行，含行内代码 <code>const a = "中文"</code> 和 <kbd>⌘K</kbd>。</p>',
  '<ul><li>先做</li><li>再<em>改</em>，最后<a href="/en">发布</a></li></ul>',
  '<table><thead><tr><th>产品</th><th>状态</th></tr></thead><tbody><tr><td>Ornata</td><td>已上线</td></tr></tbody></table>',
  '<pre><code class="language-ts">const 变量 = "不翻译"\n\nconst b = 2</code></pre>',
  '<video src="/api/images/video/demo.mp4" controls></video>',
  '<iframe src="https://www.youtube.com/embed/abc" title="演示视频"></iframe>',
  '<span class="katex"><span class="katex-html">中文公式</span></span>',
  '<blockquote class="twitter-tweet"><p lang="zh">推文里的中文内容</p></blockquote>',
  '<blockquote><p>做东西最重要的是做完。</p></blockquote>',
  '<p>Already English only.</p>',
  '<hr>',
  '<p>完。</p>',
].join('\n')

/** 模拟翻译：把占位符之外的中文换成 "english"，占位符原样保留 */
function fakeTranslate(source: string) {
  return source.replace(/[㐀-鿿，。：！？；、（）《》“”‘’]+/g, 'english')
}

function translateAll(html: string, translate = fakeTranslate) {
  const plan = planHtmlTranslation(html)
  const out = plan.units.map((unit) => {
    const result = validateUnitTranslation(unit, translate(unit.source))
    if (!result.ok) throw new Error(result.reason)
    return restoreEdgeWhitespace(unit.source, result.text)
  })
  return { plan, html: assembleHtml(plan, out) }
}

const tagsOf = (html: string) => (html.match(/<[^>]+>/g) ?? []).join('')
const mediaOf = (html: string) =>
  (html.match(/<(?:img|video|iframe|source|audio)\b[^>]*>/gi) ?? []).join('\n')

describe('planHtmlTranslation', () => {
  it('round-trips byte-for-byte when nothing is translated', () => {
    const plan = planHtmlTranslation(SAMPLE)
    const identity = plan.units.map((unit) => unit.source)
    expect(assembleHtml(plan, identity)).toBe(SAMPLE)
  })

  it('turns inline tags into placeholders and never exposes attributes to the model', () => {
    const plan = planHtmlTranslation(SAMPLE)
    for (const unit of plan.units) {
      expect(unit.source).not.toMatch(/[<>]/)
      expect(unit.source).not.toContain('href=')
      expect(unit.source).not.toContain('src=')
    }
    const paragraph = plan.units.find((unit) => unit.source.includes('卡带'))!
    expect(paragraph.source).toMatch(/一张⟦\d+⟧卡带⟦\/\d+⟧，插进去就能玩。详见⟦\d+⟧这篇文章⟦\/\d+⟧。/)
  })

  it('keeps code, video, iframe, math, tweets and untranslatable blocks out of the units', () => {
    const plan = planHtmlTranslation(SAMPLE)
    const joined = plan.units.map((unit) => unit.source).join('\n')
    for (const verbatim of ['不翻译', '演示视频', '中文公式', '推文里的中文内容', 'Already English only', '中文"']) {
      expect(joined).not.toContain(verbatim)
    }
    // 行内 code 整个是占位符，里面的中文不进入翻译
    expect(joined).not.toContain('const a')
  })

  it('creates one unit per block, including captions, list items and table cells', () => {
    const texts = planHtmlTranslation(SAMPLE).units.map((unit) => unit.source.replace(/⟦\/?\d+\/?⟧/g, ''))
    expect(texts).toEqual(
      expect.arrayContaining([
        '第一关：想法',
        '图 1：产品总览',
        '先做',
        '产品',
        '状态',
        '已上线',
        '做东西最重要的是做完。',
        '完。',
      ]),
    )
  })
})

describe('translating the HTML', () => {
  it('leaves every tag, attribute and media element byte-identical', () => {
    const { html } = translateAll(SAMPLE)
    expect(tagsOf(html)).toBe(tagsOf(SAMPLE))
    expect(mediaOf(html)).toBe(mediaOf(SAMPLE))
    expect(mediaOf(html)).toContain('src="/api/images/image/cover.webp" alt="封面图" width="800" height="450"')
    expect(html).toContain('href="https://example.com/a?x=1&amp;y=2" target="_blank"')
  })

  it('translates visible text but keeps code and embeds untouched', () => {
    const { html } = translateAll(SAMPLE)
    expect(html).toContain('<h2 id="intro">english</h2>')
    expect(html).toContain('<figcaption>english 1english</figcaption>')
    expect(html).toContain('<code class="language-ts">const 变量 = "不翻译"')
    expect(html).toContain('<code>const a = "中文"</code>')
    expect(html).toContain('<p lang="zh">推文里的中文内容</p>')
    expect(html).toContain('<p>Already English only.</p>')
    // 块外不再残留中文（被保留的代码/嵌入/公式除外）
    const outside = html
      .replace(/<pre>[\s\S]*?<\/pre>/g, '')
      .replace(/<code>[\s\S]*?<\/code>/g, '')
      .replace(/<(?:iframe|video)\b[^>]*>/g, '')
      .replace(/<blockquote class="twitter-tweet">[\s\S]*?<\/blockquote>/g, '')
      .replace(/<span class="katex">[\s\S]*?<\/span><\/span>/g, '')
      .replace(/<[^>]+>/g, '')
    expect(outside).not.toMatch(/[㐀-鿿]/)
  })

  it('preserves inline formatting around translated words', () => {
    const { html } = translateAll(SAMPLE, (s) =>
      s.replace('一张', 'a ').replace('，插进去就能玩。详见', ', plug in and play. See ').replace('这篇文章', 'this post').replace('。', '.'),
    )
    expect(html).toMatch(/<strong>卡带<\/strong>|<strong>english<\/strong>/)
  })
})

describe('validateUnitTranslation', () => {
  const unit = planHtmlTranslation('<p>点击<a href="/x">这里</a>查看<img src="/a.png">图片。</p>').units[0]

  it('accepts a translation that keeps every placeholder', () => {
    const ok = validateUnitTranslation(unit, 'Click ⟦1⟧here⟦/1⟧ to see the ⟦2/⟧ image.')
    expect(ok.ok).toBe(true)
  })

  it.each([
    ['dropped image placeholder', 'Click ⟦1⟧here⟦/1⟧ to see the image.'],
    ['dropped link close', 'Click ⟦1⟧here to see the ⟦2/⟧ image.'],
    ['duplicated placeholder', 'Click ⟦1⟧here⟦/1⟧ ⟦2/⟧ see the ⟦2/⟧ image.'],
    ['renumbered placeholder', 'Click ⟦1⟧here⟦/1⟧ to see the ⟦3/⟧ image.'],
    ['link closed before opened', 'Click ⟦/1⟧here⟦1⟧ to see the ⟦2/⟧ image.'],
    ['bracket style changed', 'Click [[1]]here[[/1]] to see the [[2/]] image.'],
  ])('rejects %s', (_name, translated) => {
    expect(validateUnitTranslation(unit, translated).ok).toBe(false)
  })

  it('neutralizes raw markup in model output', () => {
    const result = validateUnitTranslation(unit, 'Click ⟦1⟧<script>alert(1)</script>⟦/1⟧ & see ⟦2/⟧ a<b.')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.text).not.toContain('<script>')
      expect(result.text).toContain('&lt;script&gt;')
      expect(result.text).toContain('&amp; see')
    }
  })

  it('handles unbalanced inline tags cut by a block boundary', () => {
    const [u] = planHtmlTranslation('<p><strong>加粗开头</p><p>下一段</strong>结束</p>').units
    expect(u.placeholders.some((p) => p.kind === 'open' && p.pair === undefined)).toBe(true)
    expect(validateUnitTranslation(u, '⟦1⟧Bold start').ok).toBe(true)
  })
})

describe('escaping, batching and parsing', () => {
  it('escapes markup characters but keeps existing entities', () => {
    expect(escapeTranslatedText('a < b > c & d &amp; e &#39; f')).toBe('a &lt; b &gt; c &amp; d &amp; e &#39; f')
  })

  it('splits units into batches by size', () => {
    const units = Array.from({ length: 5 }, () => ({ source: '字'.repeat(400), placeholders: [] }))
    expect(planBatches(units, 1000)).toEqual([[0, 1], [2, 3], [4]])
    expect(planBatches([{ source: '字'.repeat(5000), placeholders: [] }], 1000)).toEqual([[0]])
    expect(planBatches([], 1000)).toEqual([])
  })

  it('round-trips the batch wire format and tolerates chatter and fences', () => {
    const input = buildBatchInput([
      { index: 3, text: '你好' },
      { index: 7, text: '世界⟦1/⟧' },
    ])
    expect(input).toBe('<<<3>>>\n你好\n<<<7>>>\n世界⟦1/⟧')
    const parsed = parseBatchOutput('Sure!\n<<<3>>>\nHello\n<<<7>>>\n```\nWorld ⟦1/⟧\n```\n')
    expect(parsed.get(3)).toBe('Hello')
    expect(parsed.get(7)).toBe('World ⟦1/⟧')
  })

  it('splits a unit into translatable text segments for the per-segment fallback', () => {
    expect(splitSegments('点击⟦1⟧这里⟦/1⟧查看⟦2/⟧')).toEqual([
      { text: '点击', translate: true },
      { text: '⟦1⟧', translate: false },
      { text: '这里', translate: true },
      { text: '⟦/1⟧', translate: false },
      { text: '查看', translate: true },
      { text: '⟦2/⟧', translate: false },
    ])
  })

  it('restores edge whitespace and extracts plain text', () => {
    expect(restoreEdgeWhitespace('  你好 ', 'Hello')).toBe('  Hello ')
    expect(htmlToPlainText('<h2>A &amp; B</h2><p>x<br>y</p><script>1</script><img src="/a.png">')).toBe('A & B\nx\ny')
  })
})

describe('translateUnits recovery', () => {
  const html = '<p>点击<a href="/x">这里</a>查看<img src="/a.png">图片。</p><p>第二段文字。</p>'
  const plan = planHtmlTranslation(html)
  const all = plan.units.map((_, i) => i)

  /** 把 `<<<N>>>` 格式的输入逐条交给 fn 处理，再按同样格式返回 */
  const model = (fn: (index: number, text: string) => string | null) => async (input: string) =>
    [...parseBatchOutput(input)]
      .map(([index, text]) => ({ index, out: fn(index, text) }))
      .filter((entry) => entry.out !== null)
      .map((entry) => `<<<${entry.index}>>>\n${entry.out}`)
      .join('\n')

  const english = (text: string) => text.replace(/[㐀-鿿，。：！？；、]+/g, 'english')

  it('accepts a well-behaved batch with no retries', async () => {
    const calls: string[] = []
    const call = model((_, text) => english(text))
    const outcome = await translateUnits(plan.units, all, async (input) => {
      calls.push(input)
      return call(input)
    })
    expect(calls).toHaveLength(1)
    expect(outcome).toMatchObject({ retried: 0, fallback: 0, keptOriginal: 0 })
    expect(assembleHtml(plan, all.map((i) => outcome.results.get(i)!))).toBe(
      '<p>english<a href="/x">english</a>english<img src="/a.png">english</p><p>english</p>',
    )
  })

  it('retries a unit whose placeholders were damaged and keeps the media', async () => {
    let first = true
    const call = model((index, text) => {
      if (index === 0 && first) {
        first = false
        return 'Click here to see the image.' // 占位符全丢
      }
      return english(text)
    })
    const outcome = await translateUnits(plan.units, all, call)
    expect(outcome.retried).toBe(1)
    const result = assembleHtml(plan, all.map((i) => outcome.results.get(i)!))
    expect(result).toContain('<a href="/x">')
    expect(result).toContain('<img src="/a.png">')
  })

  it('falls back to per-segment translation when the model keeps breaking placeholders', async () => {
    const call = model((index, text) => (/⟦/.test(text) && index === 0 ? text.replace(/⟦\/?\d+\/?⟧/g, '') : english(text)))
    const outcome = await translateUnits(plan.units, all, call)
    expect(outcome.fallback).toBe(1)
    expect(outcome.keptOriginal).toBe(0)
    const result = assembleHtml(plan, all.map((i) => outcome.results.get(i)!))
    expect(result).toBe('<p>english<a href="/x">english</a>english<img src="/a.png">english</p><p>english</p>')
  })

  it('keeps the original text of a segment the model never translates, never dropping a tag', async () => {
    // 带占位符的单元永远返回坏结果；纯文字片段「这里」永远翻不出来
    const call = model((_, text) => (/⟦/.test(text) ? 'broken' : text === '这里' ? null : english(text)))
    const outcome = await translateUnits(plan.units, all, call)
    expect(outcome.keptOriginal).toBe(1)
    const result = assembleHtml(plan, all.map((i) => outcome.results.get(i)!))
    expect(result).toContain('<a href="/x">这里</a>')
    expect(result).toContain('<img src="/a.png">')
    expect(result).toContain('<p>english</p>')
  })

  it('never lets model markup through, even in the fallback path', async () => {
    const call = model((index, text) => (/⟦/.test(text) && index === 0 ? 'x' : english(text).replace('english', '<img src=x onerror=alert(1)>')))
    const outcome = await translateUnits(plan.units, all, call)
    const result = assembleHtml(plan, all.map((i) => outcome.results.get(i)!))
    expect(result).not.toContain('<img src=x')
    expect(result).not.toContain('onerror=alert(1)>')
  })
})
