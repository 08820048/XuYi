import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import remarkMath from 'remark-math'

export async function renderMarkdownContent(markdown: string) {
  const result = await remark()
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkHtml, { sanitize: false })
    .process(markdown)

  return String(result)
}
