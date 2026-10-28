import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getFriendLinks } from '@/lib/db'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { FriendLinksManager } from './FriendLinksManager'

export const metadata = { title: '友联管理' }

export default async function FriendLinksPage() {
  const env = await getAppCloudflareEnv()
  let links: Awaited<ReturnType<typeof getFriendLinks>> = []

  if (env?.DB) {
    try {
      links = await getFriendLinks(env.DB)
    } catch (error) {
      console.error('Friend links fetch error:', error)
    }
  }

  return (
    <div>
      <AdminPageHeader title="友联" description={`共 ${links.length} 个友联`} />
      <FriendLinksManager initialLinks={links} />
    </div>
  )
}
