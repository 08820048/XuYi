import {
  getPostBySlug,
  getPostTranslation,
  getPostTranslationLangs,
  getTranslatedPosts,
  incrementViewCount,
  isPubliclyAccessiblePost,
} from '@/lib/db'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { verifyPassword } from '@/lib/password'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { COOKIE_NAME, isAdminAuthenticated } from '@/lib/admin-auth'
import Link from 'next/link'
import { SiteShell } from '@/components/SiteShell'
import { PasswordPrompt } from '@/components/PasswordPrompt'
import { DownloadMarkdown } from '@/components/DownloadMarkdown'
import { PostTypeBadge } from '@/components/PostTypeBadge'
import { PostUpdateBadge } from '@/components/PostUpdateBadge'
import { PostUpdateNotice } from '@/components/PostUpdateNotice'
import { PostUpdateSeenMarker } from '@/components/PostUpdateSeenMarker'
import { ArticleTableOfContents } from '@/components/ArticleTableOfContents'
import { TwitterEmbedsEnhancer } from '@/components/TwitterEmbedsEnhancer'
import { GitHubAlertEnhancer } from '@/components/GitHubAlertEnhancer'
import { MathRenderEnhancer } from '@/components/MathRenderEnhancer'
import { CodeHighlightEnhancer } from '@/components/CodeHighlightEnhancer'
import { DiagramRenderEnhancer } from '@/components/DiagramRenderEnhancer'
import { highlightHtml } from '@/lib/shiki-highlight'
import { ArticleCopyrightNotice } from '@/components/ArticleCopyrightNotice'
import { SubscribeForm } from '@/components/SubscribeForm'
import { getSiteHeaderData } from '@/lib/site'
import { getRelatedPosts } from '@/lib/related-content'
import { getPublicContentCacheNamespace } from '@/lib/cache'
import { getCategoryPath } from '@/lib/route-segments'
import { getSiteUrl } from '@/lib/site-config'
import { LangSync } from '@/components/LangSync'
import { LOCALE_META, formatLocaleDate, localePath, t, type Locale } from '@/lib/i18n'


/** 仅登录后台的管理员可预览草稿译文（?preview=1）；只在带 preview 参数时才读取 cookie。 */
async function canPreviewDraft(preview: boolean): Promise<boolean> {
  if (!preview) return false
  const store = await cookies()
  return isAdminAuthenticated(store.get(COOKIE_NAME)?.value)
}

export async function buildPostMetadata(slug: string, lang: Locale = 'zh', preview = false) {
  const baseUrl = getSiteUrl()
  try {
    const env = await getAppCloudflareEnv()
    if (!env?.DB) return {}

    const post = await getPostBySlug(env.DB, slug, getPublicContentCacheNamespace(env)).catch(() => null)
    if (!post || !isPubliclyAccessiblePost(post)) return {}

    const translation = lang === 'zh' ? null : await getPostTranslation(env.DB, post.id, lang).catch(() => null)
    const draftPreview = translation?.status === 'draft' && (await canPreviewDraft(preview))
    if (lang !== 'zh' && (post.password || !translation || (translation.status !== 'published' && !draftPreview))) {
      return {}
    }
    // 草稿预览页不让搜索引擎收录
    if (draftPreview && translation) {
      return { title: `[Preview] ${translation.title}`, robots: { index: false, follow: false } }
    }

    const title = translation?.title ?? post.title
    const description = translation?.description ?? post.description
    const html = translation?.html ?? post.html

    // Extract first image from HTML for OG image
    const imgMatch = html?.match(/<img[^>]+src="([^"]+)"/)
    const ogImage = post.cover_image || imgMatch?.[1] || `${baseUrl}/icon-512.png`

    // Password-protected articles should not be indexed
    if (post.password) {
      return {
        title,
        robots: { index: false },
      }
    }

    const availableLangs = await getPostTranslationLangs(env.DB, post.id).catch(() => [] as string[])
    const languages: Record<string, string> = {}
    if (availableLangs.length > 0) {
      languages[LOCALE_META.zh.htmlLang] = `${baseUrl}/${post.slug}`
      languages['x-default'] = `${baseUrl}/${post.slug}`
      for (const code of availableLangs) {
        languages[code] = `${baseUrl}${localePath(`/${post.slug}`, code as Locale)}`
      }
    }

    return {
      title,
      description,
      authors: [{ name: 'XuYi' }],
      alternates: {
        canonical: `${baseUrl}${localePath(`/${post.slug}`, lang)}`,
        ...(Object.keys(languages).length > 0 ? { languages } : {}),
      },
      openGraph: {
        title,
        description,
        type: 'article',
        locale: LOCALE_META[lang].ogLocale,
        publishedTime: new Date(post.published_at * 1000).toISOString(),
        modifiedTime: new Date(post.updated_at * 1000).toISOString(),
        authors: ['XuYi'],
        images: [{ url: ogImage }],
      },
      twitter: {
        card: 'summary_large_image' as const,
        site: '@vista8',
        creator: '@vista8',
        title,
        description: description || undefined,
        images: [ogImage],
      },
    }
  } catch {
    return {}
  }
}

export async function PostView({
  slug,
  pwd,
  lang = 'zh',
  preview = false,
}: {
  slug: string
  pwd?: string
  lang?: Locale
  preview?: boolean
}) {

  let env: Awaited<ReturnType<typeof getAppCloudflareEnv>> | undefined
  try {
    env = await getAppCloudflareEnv()
  } catch {
    notFound()
  }
  if (!env?.DB) notFound()
  const db = env!.DB

  const post = await getPostBySlug(db, slug, getPublicContentCacheNamespace(env)).catch(() => null)
  if (!post) notFound()
  if (!isPubliclyAccessiblePost(post)) notFound()

  // 非默认语言：必须有已发布的译文，否则回到中文原文（避免 /en 下出现中文内容）
  const translation = lang === 'zh' ? null : await getPostTranslation(db, post.id, lang).catch(() => null)
  const draftPreview = translation?.status === 'draft' && (await canPreviewDraft(preview))
  if (lang !== 'zh' && (post.password || !translation || !translation.html || (translation.status !== 'published' && !draftPreview))) {
    redirect(`/${post.slug}`)
  }
  const view = translation
    ? {
        ...post,
        title: translation.title,
        description: translation.description,
        content: translation.content,
        html: translation.html,
        content_updated_at: null,
        previous_content: null,
        previous_html: null,
      }
    : post

  const headerData = await getSiteHeaderData(db)
  const activeCategorySlug = headerData.categories.find((category) => category.name === post.category)?.slug ?? null

  let passwordError: string | undefined
  const needsPassword = Boolean(post.password)

  if (needsPassword) {
    if (!pwd) {
      return (
        <SiteShell
          initialTheme={headerData.defaultTheme}
          navLinks={headerData.navLinks}
        >
            <PasswordPrompt />
        </SiteShell>
      )
    }

    const isValid = await verifyPassword(pwd, post.password!)
    if (!isValid) {
      passwordError = '密码错误，请重试'
      return (
        <SiteShell
          initialTheme={headerData.defaultTheme}
          navLinks={headerData.navLinks}
        >
            <PasswordPrompt error={passwordError} />
        </SiteShell>
      )
    }
  }

  // 异步增加阅读计数，不阻塞渲染
  void incrementViewCount(db, slug).catch(console.error)

  // 阅读时间估算（中文按 400 字/分钟）
  const readingMinutes =
    lang === 'zh'
      ? Math.max(1, Math.ceil((view.content?.length || 0) / 400))
      : Math.max(1, Math.ceil((view.content?.trim().split(/\s+/).length || 0) / 220))
  const emptyRelated = { strategy: 'fts' as const, source: 'rules' as const, results: [] }
  const related = lang !== 'zh'
    ? {
        ...emptyRelated,
        results: (await getTranslatedPosts(db, lang, 4).catch(() => []))
          .filter((item) => item.slug !== post.slug)
          .slice(0, 3),
      }
    : !post.password
      ? await getRelatedPosts(db, env, post, 3).catch(() => emptyRelated)
      : emptyRelated
  const highlightedHtml = await highlightHtml(view.html)
  const contentContainerId = `post-content-${post.slug}`
  const articleUrl = `${getSiteUrl()}${localePath(`/${post.slug}`, lang)}`
  const publishedDate = new Date(post.published_at * 1000).toISOString().slice(0, 10).replaceAll('-', '.')

  return (
    <SiteShell
      initialTheme={headerData.defaultTheme}
      navLinks={headerData.navLinks}
    >
        <LangSync locale={lang} />
        {draftPreview && (
          <p className="kami-note" role="status">
            Draft preview — this English version is not published yet and is only visible to you.
          </p>
        )}
        {!post.password && (() => {
          const baseUrl = getSiteUrl()
          const imgMatch = view.html?.match(/<img[^>]+src="([^"]+)"/)
          const ogImage = post.cover_image || imgMatch?.[1] || `${baseUrl}/icon-512.png`
          const jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: view.title,
            description: view.description || '',
            inLanguage: LOCALE_META[lang].htmlLang,
            image: ogImage,
            author: { '@type': 'Person', name: 'XuYi', url: 'https://x.com/vista8' },
            publisher: { '@type': 'Organization', name: 'XuYi', url: baseUrl, logo: { '@type': 'ImageObject', url: `${baseUrl}/icon-512.png` } },
            datePublished: new Date(post.published_at * 1000).toISOString(),
            dateModified: new Date(post.updated_at * 1000).toISOString(),
            mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
            url: articleUrl,
          }
          const breadcrumbLd = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: t(lang, 'home'), item: `${baseUrl}${localePath('/', lang)}` },
              ...(lang === 'zh' && post.category && activeCategorySlug
                ? [{ '@type': 'ListItem', position: 2, name: post.category, item: `${baseUrl}${getCategoryPath(activeCategorySlug)}` }]
                : []),
              { '@type': 'ListItem', position: lang === 'zh' && post.category ? 3 : 2, name: view.title, item: articleUrl },
            ],
          }
          return (
            <>
              <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
              <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
            </>
          )
        })()}
        <div className="relative">
          <article>
            <PostUpdateSeenMarker post={post} />
            <header className="kami-article-header">
              <div className="kami-article-kicker">
                <p className="kami-label">
                  {lang === 'zh' && post.category ? `${post.category} · ${t(lang, 'articleKicker')}` : t(lang, 'articleKicker')}
                </p>
                <span className="kami-post-badges">
                  <PostTypeBadge type={post.post_type} lang={lang} />
                  <PostUpdateBadge post={post} />
                </span>
              </div>
              <h1 className="kami-article-title">
                {view.title}
              </h1>
              <div className="kami-article-meta">
                <time dateTime={publishedDate.replaceAll('.', '-')}>
                  {lang === 'zh' ? publishedDate : formatLocaleDate(post.published_at, lang)}
                </time>
                <span>{t(lang, 'readingMinutes', { n: readingMinutes })}</span>
                <span>{t(lang, 'views', { n: post.view_count })}</span>
                <DownloadMarkdown title={view.title} html={view.html} />
              </div>
              {post.source_url && post.post_type !== 'original' && (
                <div className="kami-note">
                  <p className="kami-label">{t(lang, 'copyrightAndSource')}</p>
                  <p>
                    {post.post_type === 'repost' ? t(lang, 'repostNotice') : t(lang, 'translationNotice')}
                  </p>
                  <p>
                    {t(lang, 'sourceLink')}
                    <a
                      href={post.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {post.source_url}
                    </a>
                  </p>
                </div>
              )}
            </header>

            <PostUpdateNotice post={view} />

            <div
              id={contentContainerId}
              className="rich-content"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
            <GitHubAlertEnhancer containerId={contentContainerId} html={highlightedHtml} />
            <CodeHighlightEnhancer containerId={contentContainerId} html={highlightedHtml} />
            <MathRenderEnhancer containerId={contentContainerId} html={highlightedHtml} />
            <DiagramRenderEnhancer containerId={contentContainerId} html={highlightedHtml} />
            <TwitterEmbedsEnhancer containerId={contentContainerId} html={highlightedHtml} />

            <SubscribeForm minimal />

            <ArticleCopyrightNotice
              containerId={contentContainerId}
              title={view.title}
              articleUrl={articleUrl}
              sourceUrl={post.source_url}
            />

            {related.results.length > 0 && (
              <section className="kami-section related-records">
                <p className="kami-label">02 · Continue</p>
                <h2 className="kami-section-title">{t(lang, 'continueReading')}</h2>
                <div className="kami-post-list">
                  {related.results.map((item) => (
                    <article key={item.slug} className="kami-post">
                      <Link href={localePath(`/${item.slug}`, lang)} className="kami-post-link">
                        <div className="kami-post-main">
                          <h3 className="kami-post-title">{item.title}</h3>
                        </div>
                        <span className="kami-post-leader" aria-hidden="true" />
                        <time
                          className="kami-post-date"
                          dateTime={new Date(item.published_at * 1000).toISOString()}
                        >
                          {new Date(item.published_at * 1000).toISOString().slice(0, 10).replaceAll('-', '.')}
                        </time>
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </article>

          <div className="article-toc-dock">
            <ArticleTableOfContents containerId={contentContainerId} />
          </div>
        </div>
    </SiteShell>
  )
}
