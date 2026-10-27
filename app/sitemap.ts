import type { MetadataRoute } from 'next'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getPosts, getPublicCategories, getTranslatedPosts } from '@/lib/db'
import { getCategoryPath } from '@/lib/route-segments'
import { getSiteUrl } from '@/lib/site-config'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()
  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/links`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/en`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/en/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/en/links`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  try {
    const env = await getAppCloudflareEnv()
    if (env?.DB) {
      // Only published, non-deleted, non-hidden, non-password posts
      const [posts, categories, translatedPosts] = await Promise.all([
        getPosts(env.DB, 1000, 0, false, false, false, false),
        getPublicCategories(env.DB),
        getTranslatedPosts(env.DB, 'en', 1000, 0).catch(() => []),
      ])
      const translatedSlugs = new Set(translatedPosts.map((post) => post.slug))
      for (const post of posts) {
        const hasEnglish = translatedSlugs.has(post.slug)
        entries.push({
          url: `${baseUrl}/${post.slug}`,
          lastModified: new Date(post.published_at * 1000),
          changeFrequency: 'weekly',
          priority: 0.8,
          ...(hasEnglish
            ? {
                alternates: {
                  languages: {
                    'zh-CN': `${baseUrl}/${post.slug}`,
                    en: `${baseUrl}/en/${post.slug}`,
                  },
                },
              }
            : {}),
        })
      }
      for (const post of translatedPosts) {
        entries.push({
          url: `${baseUrl}/en/${post.slug}`,
          lastModified: new Date(post.published_at * 1000),
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: {
            languages: {
              'zh-CN': `${baseUrl}/${post.slug}`,
              en: `${baseUrl}/en/${post.slug}`,
            },
          },
        })
      }

      for (const category of categories) {
        if (category.slug && category.name !== '未分类') {
          entries.push({
            url: `${baseUrl}${getCategoryPath(category.slug)}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
          })
        }
      }
    }
  } catch {}
  return entries
}
