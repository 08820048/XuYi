import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getPublicFriendLinks } from '@/lib/db'
import { getSiteHeaderData } from '@/lib/site'
import { SiteShell } from '@/components/SiteShell'

export const metadata = {
  title: '友联',
  description: '一些值得顺路拜访的朋友与站点。',
}

export const dynamic = 'force-dynamic'

export default async function LinksPage() {
  const env = await getAppCloudflareEnv()
  if (!env?.DB) {
    return (
      <SiteShell>
          <h1 className="kami-display">友联</h1>
          <p className="kami-lead">数据库暂不可用。</p>
      </SiteShell>
    )
  }

  const [headerData, links] = await Promise.all([
    getSiteHeaderData(env.DB),
    getPublicFriendLinks(env.DB),
  ])

  return (
    <SiteShell
      initialTheme={headerData.defaultTheme}
      navLinks={headerData.navLinks}
    >
        <header className="kami-page-header">
          <p className="kami-label">00 · Links</p>
          <h1 className="kami-display">友联</h1>
          <p className="kami-lead">一些值得顺路拜访的朋友与站点。</p>
        </header>

        {links.length > 0 ? (
          <div className="kami-card-grid">
            {links.map((link, index) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="kami-card"
              >
                <div className="kami-card-avatar">
                  {link.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={link.avatar_url} alt="" />
                  ) : (
                    link.name.slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="kami-label">Link {String(index + 1).padStart(2, '0')}</p>
                  <h2 className="kami-card-title">{link.name}</h2>
                  <p className="kami-card-desc">
                    {link.description || link.url}
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="kami-empty">还没有公开显示的友联。</p>
        )}
    </SiteShell>
  )
}
