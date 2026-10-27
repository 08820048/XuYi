import { searchPosts, searchTranslatedPosts } from '@/lib/db'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import Link from 'next/link'
import { SiteShell } from '@/components/SiteShell'
import { PostTypeBadge } from '@/components/PostTypeBadge'
import { LangSync } from '@/components/LangSync'
import type { SiteNavLink } from '@/lib/site'
import { getSiteHeaderData } from '@/lib/site'
import type { Theme } from '@/lib/appearance'
import { formatLocaleDate, localePath, t, type Locale } from '@/lib/i18n'

export async function SearchView({ q, lang = 'zh' }: { q?: string; lang?: Locale }) {
  const query = q?.trim() || ''

  let posts: Awaited<ReturnType<typeof searchPosts>> = []
  let navLinks: SiteNavLink[] = []
  let defaultTheme: Theme = 'kami'

  try {
    const env = await getAppCloudflareEnv()
    if (env?.DB) {
      const headerData = await getSiteHeaderData(env.DB)
      navLinks = headerData.navLinks
      defaultTheme = headerData.defaultTheme

      if (query) {
        posts = lang === 'zh'
          ? await searchPosts(env.DB, query, 100)
          : await searchTranslatedPosts(env.DB, lang, query, 100)
      }
    }
  } catch (e) {
    console.error('Search page error:', e)
  }

  return (
    <SiteShell initialTheme={defaultTheme} navLinks={navLinks}>
        <LangSync locale={lang} />
        <header className="kami-page-header">
          <p className="kami-label">00 · Search</p>
          <h1 className="kami-display">{t(lang, 'searchResults')}</h1>
          {query ? (
            <p className="kami-lead">
              {t(lang, 'searchKeyword', { q: query, n: posts.length })}
            </p>
          ) : (
            <p className="kami-lead">{t(lang, 'searchEnterKeyword')}</p>
          )}
        </header>

        {query && posts.length === 0 ? (
          <p className="kami-empty">{t(lang, 'searchNoMatch')}</p>
        ) : query ? (
          <div className="kami-post-list">
            {posts.map((post) => (
              <article key={post.slug} className="kami-post">
                <Link href={localePath(`/${post.slug}`, lang)} className="kami-post-link kami-post-link--stack">
                  <div className="kami-post-main">
                    <h2 className="kami-post-title">
                      {post.title}
                    </h2>
                    <div className="kami-post-badges">
                      <PostTypeBadge type={post.post_type} lang={lang} />
                      {post.password && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label={t(lang, 'encrypted')} className="kami-lock">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      )}
                      {post.is_pinned === 1 && <span className="kami-tag">{t(lang, 'pinned')}</span>}
                    </div>
                    {post.description && (
                      <p className="kami-post-excerpt">{post.description}</p>
                    )}
                    <time className="kami-post-date">{formatLocaleDate(post.published_at, lang)}</time>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : null}
    </SiteShell>
  )
}
