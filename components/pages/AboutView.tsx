import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getSetting } from '@/lib/db'
import { renderMarkdownContent } from '@/lib/markdown'
import { getSiteHeaderData } from '@/lib/site'
import { SiteShell } from '@/components/SiteShell'
import { MathRenderEnhancer } from '@/components/MathRenderEnhancer'
import { CodeHighlightEnhancer } from '@/components/CodeHighlightEnhancer'
import { DiagramRenderEnhancer } from '@/components/DiagramRenderEnhancer'
import { highlightHtml } from '@/lib/shiki-highlight'
import { TwitterEmbedsEnhancer } from '@/components/TwitterEmbedsEnhancer'
import { GitHubAlertEnhancer } from '@/components/GitHubAlertEnhancer'
import { AboutShowcase } from '@/components/AboutShowcase'
import { LangSync } from '@/components/LangSync'
import type { Locale } from '@/lib/i18n'

const fallbackMarkdowns: Record<Locale, string> = {
  zh: `# 关于我

这里还没有填写内容。

站点管理员可以进入后台 **站点设置 -> 关于我** 编写这页内容。
`,
  en: `# About

Nothing here yet.

The site admin can write this page in **Settings → About** (English version: the about_markdown_en setting).
`,
}

export async function AboutView({ lang = 'zh' }: { lang?: Locale }) {
  const fallbackMarkdown = fallbackMarkdowns[lang]
  const env = await getAppCloudflareEnv()
  const contentContainerId = 'about-markdown-content'

  if (!env?.DB) {
    const html = await highlightHtml(await renderMarkdownContent(fallbackMarkdown))

    return (
      <SiteShell>
          <AboutContent containerId={contentContainerId} html={html} lang={lang} />
      </SiteShell>
    )
  }

  const [headerData, aboutMarkdown, aboutMarkdownEn] = await Promise.all([
    getSiteHeaderData(env.DB),
    getSetting(env.DB, 'about_markdown'),
    lang === 'en' ? getSetting(env.DB, 'about_markdown_en') : Promise.resolve(null),
  ])
  // 英文版未填写时回退到中文版内容，避免出现空页面
  const localized = lang === 'en' && aboutMarkdownEn?.trim() ? aboutMarkdownEn : aboutMarkdown
  const markdown = localized?.trim() ? localized : fallbackMarkdown
  const html = await highlightHtml(await renderMarkdownContent(markdown))

  return (
    <SiteShell
      initialTheme={headerData.defaultTheme}
      navLinks={headerData.navLinks}
    >
        <AboutContent containerId={contentContainerId} html={html} lang={lang} />
    </SiteShell>
  )
}

function AboutContent({
  containerId,
  html,
  lang,
}: {
  containerId: string
  html: string
  lang: Locale
}) {
  return (
    <article>
      <LangSync locale={lang} />
      <AboutShowcase id={containerId} html={html} />
      <CodeHighlightEnhancer containerId={containerId} html={html} />
      <MathRenderEnhancer containerId={containerId} html={html} />
      <DiagramRenderEnhancer containerId={containerId} html={html} />
      <TwitterEmbedsEnhancer containerId={containerId} html={html} />
      <GitHubAlertEnhancer containerId={containerId} html={html} />
    </article>
  )
}
