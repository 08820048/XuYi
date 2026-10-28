import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getSiteHeaderData } from '@/lib/site'
import { SiteShell } from '@/components/SiteShell'
import { NotFoundContent } from '@/components/NotFoundContent'

export default async function NotFound() {
  const env = await getAppCloudflareEnv().catch(() => null)
  const headerData = env?.DB ? await getSiteHeaderData(env.DB).catch(() => null) : null
  return (
    <SiteShell initialTheme={headerData?.defaultTheme} navLinks={headerData?.navLinks}>
      <NotFoundContent />
    </SiteShell>
  )
}
