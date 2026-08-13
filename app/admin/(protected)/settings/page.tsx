import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getSetting, getCategories, getFriendLinks } from '@/lib/db'
import { detectRuntimeCapabilities } from '@/lib/runtime-capabilities'
import { SettingsManager } from './SettingsManager'

export const metadata = { title: '站点设置' }

export default async function SettingsPage() {
  let navLinks = ''
  let customJs = ''
  let aboutMarkdown = ''
  let bodyFont = ''
  let diaryNavEnabled = ''
  let diaryEmailEnabled = ''
  let diaryInboundAddress = ''
  let diaryAllowedSender = ''
  let diaryInboundSecret = ''
  let categories: Awaited<ReturnType<typeof getCategories>> = []
  let friendLinks: Awaited<ReturnType<typeof getFriendLinks>> = []
  let runtimeCapabilities = detectRuntimeCapabilities()

  try {
    const env = await getAppCloudflareEnv()
    runtimeCapabilities = detectRuntimeCapabilities(env)
    if (env?.DB) {
      navLinks = (await getSetting(env.DB, 'nav_links')) || ''
      customJs = (await getSetting(env.DB, 'custom_js')) || ''
      aboutMarkdown = (await getSetting(env.DB, 'about_markdown')) || ''
      bodyFont = (await getSetting(env.DB, 'body_font')) || ''
      diaryNavEnabled = (await getSetting(env.DB, 'diary_nav_enabled')) || ''
      diaryEmailEnabled = (await getSetting(env.DB, 'diary_email_enabled')) || ''
      diaryInboundAddress = (await getSetting(env.DB, 'diary_inbound_address')) || ''
      diaryAllowedSender = (await getSetting(env.DB, 'diary_allowed_sender')) || ''
      diaryInboundSecret = (await getSetting(env.DB, 'diary_inbound_secret')) || ''
      ;[categories, friendLinks] = await Promise.all([
        getCategories(env.DB),
        getFriendLinks(env.DB),
      ])
    }
  } catch {}

  return (
    <div className="space-y-6">
      <h1
        className="text-2xl font-medium text-[var(--editor-ink)]"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        站点设置
      </h1>
      <SettingsManager
        initialNavLinks={navLinks}
        initialCustomJs={customJs}
        initialAboutMarkdown={aboutMarkdown}
        initialCategories={categories}
        initialFriendLinks={friendLinks}
        initialBodyFont={bodyFont}
        initialDiaryNavEnabled={diaryNavEnabled}
        initialDiaryEmailEnabled={diaryEmailEnabled}
        initialDiaryInboundAddress={diaryInboundAddress}
        initialDiaryAllowedSender={diaryAllowedSender}
        initialDiaryInboundSecret={diaryInboundSecret}
        initialRuntimeCapabilities={runtimeCapabilities}
      />
    </div>
  )
}
