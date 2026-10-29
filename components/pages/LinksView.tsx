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
        <header className="pg-head">
          <div className="pg-head-row">
            <h1 className="pg-title">
              {t(lang, 'linksTitle')} <em>/ Links</em>
            </h1>
            <span className="pg-count">{String(links.length).padStart(2, '0')}</span>
          </div>
          <p className="pg-lead">{t(lang, 'linksLead')}</p>
        </header>

        {links.length > 0 ? (
          <div className="lk-grid">
            {links.map((link, index) => {
              let host = link.url
              try {
                host = new URL(link.url).host.replace(/^www\./, '')
              } catch {}
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lk-cell"
                >
                  <span className="lk-top">
                    <span className="lk-no">{String(index + 1).padStart(3, '0')}</span>
                    <span className="lk-arrow" aria-hidden="true">↗</span>
                  </span>
                  <span className="lk-main">
                    <span className="lk-avatar">
                      {link.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={link.avatar_url} alt="" />
                      ) : (
                        link.name.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    <span className="lk-text">
                      <h2 className="lk-name">{link.name}</h2>
                      <span className="lk-desc">{link.description || host}</span>
                    </span>
                  </span>
                  <span className="lk-host">{host}</span>
                </a>
              )
            })}
          </div>
        ) : (
          <p className="kami-empty">{t(lang, 'linksEmpty')}</p>
        )}
    </SiteShell>
  )
}
