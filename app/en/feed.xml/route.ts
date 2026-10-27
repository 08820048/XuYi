import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getSiteUrl } from '@/lib/site-config'

const SITE_URL = getSiteUrl()
const SITE_TITLE = 'XuYi'
const SITE_DESCRIPTION = 'Writing about game development, and AI.'

interface RssPost {
  slug: string
  title: string
  description: string | null
  html: string | null
  published_at: number
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// 英文 RSS：仅包含已发布的英文译文，条目链接指向 /en/{slug}
export async function GET() {
  let posts: RssPost[] = []

  try {
    const env = await getAppCloudflareEnv()
    if (env?.DB) {
      const { results } = await env.DB
        .prepare(
          `SELECT p.slug, t.title, t.description, t.html, p.published_at
           FROM post_translations t
           JOIN posts p ON p.id = t.post_id
           WHERE t.lang = 'en' AND t.status = 'published'
             AND p.status = 'published' AND p.deleted_at IS NULL
             AND p.password IS NULL AND p.is_hidden = 0
           ORDER BY p.published_at DESC
           LIMIT 50`,
        )
        .all()
      posts = results as unknown as RssPost[]
    }
  } catch {
    // ignore
  }

  const items = posts
    .map((p) => {
      const link = `${SITE_URL}/en/${p.slug}`
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(p.description || '')}</description>
      <content:encoded><![CDATA[${(p.html || '').replaceAll(']]>', ']]]]><![CDATA[>')}]]></content:encoded>
      <pubDate>${new Date(p.published_at * 1000).toUTCString()}</pubDate>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${SITE_TITLE}</title>
    <link>${SITE_URL}/en</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/en/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
