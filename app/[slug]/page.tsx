import { getPostBySlug, incrementViewCount, isPubliclyAccessiblePost } from '@/lib/db'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { verifyPassword } from '@/lib/password'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { FrontPostAdminBoundary } from '@/components/FrontPostAdminBoundary'
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

// Cloudflare Workers 缓存策略
export const revalidate = 86400 // 24小时缓存
export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const baseUrl = getSiteUrl()
  try {
    const env = await getAppCloudflareEnv()
    const { slug } = await params

    if (!env?.DB) return {}

    const post = await getPostBySlug(env.DB, slug, getPublicContentCacheNamespace(env)).catch(() => null)
    if (!post || !isPubliclyAccessiblePost(post)) return {}

    // Extract first image from HTML for OG image
    const imgMatch = post.html?.match(/<img[^>]+src="([^"]+)"/)
    const ogImage = post.cover_image || imgMatch?.[1] || `${baseUrl}/icon-512.png`

    // Password-protected articles should not be indexed
    if (post.password) {
      return {
        title: post.title,
        robots: { index: false },
      }
    }

    return {
      title: post.title,
      description: post.description,
      authors: [{ name: 'XuYi' }],
      alternates: {
        canonical: `${baseUrl}/${post.slug}`,
      },
      openGraph: {
        title: post.title,
        description: post.description,
        type: 'article',
        publishedTime: new Date(post.published_at * 1000).toISOString(),
        modifiedTime: new Date(post.updated_at * 1000).toISOString(),
        authors: ['XuYi'],
        images: [{ url: ogImage }],
      },
      twitter: {
        card: 'summary_large_image' as const,
        site: '@vista8',
        creator: '@vista8',
        title: post.title,
        description: post.description || undefined,
        images: [ogImage],
      },
    }
  } catch {
    return {}
  }
}

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ pwd?: string }>
}) {
  const { slug } = await params
  const { pwd } = await searchParams

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

  const headerData = await getSiteHeaderData(db)
  const activeCategorySlug = headerData.categories.find((category) => category.name === post.category)?.slug ?? null

  // 密码保护逻辑保持公开路径纯粹，由前台管理员增强层在客户端接管编辑能力
  let passwordError: string | undefined
  const needsPassword = Boolean(post.password)

  if (needsPassword) {
    if (!pwd) {
      return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col">
          <SiteHeader
            initialTheme={headerData.defaultTheme}
            navLinks={headerData.navLinks}
            stickyOnMobile={false}
          />
          <main className="kami-page-main">
            <FrontPostAdminBoundary
              slug={post.slug}
              title={post.title}
              html={post.html}
              category={post.category}
              coverImage={post.cover_image}
              password={post.password}
              publishedAt={post.published_at}
              viewCount={post.view_count}
              content={post.content}
            >
              <PasswordPrompt />
            </FrontPostAdminBoundary>
          </main>
          <SiteFooter />
        </div>
      )
    }

    const isValid = await verifyPassword(pwd, post.password!)
    if (!isValid) {
      passwordError = '密码错误，请重试'
      return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col">
          <SiteHeader
            initialTheme={headerData.defaultTheme}
            navLinks={headerData.navLinks}
            stickyOnMobile={false}
          />
          <main className="kami-page-main">
            <FrontPostAdminBoundary
              slug={post.slug}
              title={post.title}
              html={post.html}
              category={post.category}
              coverImage={post.cover_image}
              password={post.password}
              publishedAt={post.published_at}
              viewCount={post.view_count}
              content={post.content}
            >
              <PasswordPrompt error={passwordError} />
            </FrontPostAdminBoundary>
          </main>
          <SiteFooter />
        </div>
      )
    }
  }

  // 异步增加阅读计数，不阻塞渲染
  void incrementViewCount(db, slug).catch(console.error)

  // 阅读时间估算（中文按 400 字/分钟）
  const textLength = post.content?.length || 0
  const readingMinutes = Math.max(1, Math.ceil(textLength / 400))
  const related = !post.password
    ? await getRelatedPosts(db, env, post, 3).catch(() => ({ strategy: 'fts' as const, source: 'rules' as const, results: [] }))
    : { strategy: 'fts' as const, source: 'rules' as const, results: [] }
  const highlightedHtml = await highlightHtml(post.html)
  const contentContainerId = `post-content-${post.slug}`
  const articleUrl = `${getSiteUrl()}/${post.slug}`
  const publishedDate = new Date(post.published_at * 1000).toISOString().slice(0, 10).replaceAll('-', '.')

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <SiteHeader
        initialTheme={headerData.defaultTheme}
        navLinks={headerData.navLinks}
        stickyOnMobile={false}
      />

      <main className="kami-page-main">
        {!post.password && (() => {
          const baseUrl = getSiteUrl()
          const imgMatch = post.html?.match(/<img[^>]+src="([^"]+)"/)
          const ogImage = post.cover_image || imgMatch?.[1] || `${baseUrl}/icon-512.png`
          const jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.description || '',
            image: ogImage,
            author: { '@type': 'Person', name: 'XuYi', url: 'https://x.com/vista8' },
            publisher: { '@type': 'Organization', name: 'XuYi', url: baseUrl, logo: { '@type': 'ImageObject', url: `${baseUrl}/icon-512.png` } },
            datePublished: new Date(post.published_at * 1000).toISOString(),
            dateModified: new Date(post.updated_at * 1000).toISOString(),
            mainEntityOfPage: { '@type': 'WebPage', '@id': `${baseUrl}/${post.slug}` },
            url: `${baseUrl}/${post.slug}`,
          }
          const breadcrumbLd = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: '首页', item: baseUrl },
              ...(post.category && activeCategorySlug
                ? [{ '@type': 'ListItem', position: 2, name: post.category, item: `${baseUrl}${getCategoryPath(activeCategorySlug)}` }]
                : []),
              { '@type': 'ListItem', position: post.category ? 3 : 2, name: post.title, item: `${baseUrl}/${post.slug}` },
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
            <FrontPostAdminBoundary
              slug={post.slug}
              title={post.title}
              html={post.html}
              category={post.category}
              coverImage={post.cover_image}
              password={post.password}
              publishedAt={post.published_at}
              viewCount={post.view_count}
              content={post.content}
            >
              <article>
                <PostUpdateSeenMarker post={post} />
                <header className="kami-article-header">
                  <div className="kami-article-kicker">
                    <p className="kami-label">
                      {post.category ? `${post.category} · 文章` : '文章'}
                    </p>
                    <span className="kami-post-badges">
                      <PostTypeBadge type={post.post_type} />
                      <PostUpdateBadge post={post} />
                    </span>
                  </div>
                  <h1
                    data-admin-edit-trigger
                    className="kami-article-title"
                  >
                    {post.title}
                  </h1>
                  <div className="kami-article-meta">
                    <time dateTime={publishedDate.replaceAll('.', '-')}>{publishedDate}</time>
                    <span>{readingMinutes} min</span>
                    <span>{post.view_count} views</span>
                    <DownloadMarkdown title={post.title} html={post.html} />
                  </div>
                  {post.source_url && post.post_type !== 'original' && (
                    <div className="kami-note">
                      <p className="kami-label">版权与来源</p>
                      <p>
                        {post.post_type === 'repost'
                          ? '原文著作权归原作者或相关权利人所有。本站仅在授权范围内转载，不代表原作者对本站观点或内容的认可。'
                          : '原作品著作权归原作者或相关权利人所有。本译文由本站完成，译文相关权利的行使仍受原作品授权条款约束。'}
                      </p>
                      <p>
                        原文链接：
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

                <PostUpdateNotice post={post} />

                <div
                  id={contentContainerId}
                  data-admin-edit-trigger
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
                  title={post.title}
                  articleUrl={articleUrl}
                  sourceUrl={post.source_url}
                />

                {related.results.length > 0 && (
                  <section className="kami-section related-records">
                    <p className="kami-label">02 · Continue</p>
                    <h2 className="kami-section-title">继续阅读</h2>
                    <div className="kami-post-list">
                      {related.results.map((item) => (
                        <article key={item.slug} className="kami-post">
                          <Link href={`/${item.slug}`} className="kami-post-link">
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
            </FrontPostAdminBoundary>

          <div className="article-toc-dock">
            <ArticleTableOfContents containerId={contentContainerId} />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
