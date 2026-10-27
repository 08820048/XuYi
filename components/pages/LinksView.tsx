import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getPublicFriendLinks } from '@/lib/db'
import { getSiteHeaderData } from '@/lib/site'
import { SiteShell } from '@/components/SiteShell'
import { LangSync } from '@/components/LangSync'
import { t, type Locale } from '@/lib/i18n'

export async function LinksView({ lang = 'zh' }: { lang?: Locale }) {
  const env = await getAppCloudflareEnv()
  if (!env?.DB) {
    return (
      <SiteShell>
          <LangSync locale={lang} />
          <h1 className="kami-display">{t(lang, 'linksTitle')}</h1>
          <p className="kami-lead">{t(lang, 'linksDbDown')}</p>
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
        <LangSync locale={lang} />
        <header className="kami-page-header">
          <p className="kami-label">00 · Links</p>
          <h1 className="kami-display">{t(lang, 'linksTitle')}</h1>
          <p className="kami-lead">{t(lang, 'linksLead')}</p>
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
          <p className="kami-empty">{t(lang, 'linksEmpty')}</p>
        )}
    </SiteShell>
  )
}
