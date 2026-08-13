import { invalidatePublicContentCache } from '@/lib/cache'
import { createDiaryEntry, getSetting } from '@/lib/db'
import {
  isDiaryRecipientAllowed,
  isDiarySenderAllowed,
  type ParsedDiaryEmail,
} from '@/lib/diary-email'
import { buildDiaryEntryPayload } from '@/lib/diary-payload'

export type PublishDiaryEmailResult = {
  id: number
  slug: string
}

export async function publishDiaryEmail(
  db: D1Database,
  env: Partial<CloudflareEnv>,
  input: ParsedDiaryEmail & { cover_image?: string },
): Promise<PublishDiaryEmailResult> {
  const enabled = await getSetting(db, 'diary_email_enabled')
  if (enabled !== 'true') {
    throw new Error('邮件发布未启用')
  }

  const allowedSender = await getSetting(db, 'diary_allowed_sender')
  if (!input.from || !isDiarySenderAllowed(input.from, allowedSender)) {
    throw new Error('发件人未允许')
  }

  const inboundAddress = await getSetting(db, 'diary_inbound_address')
  if (input.to && !isDiaryRecipientAllowed(input.to, inboundAddress)) {
    throw new Error('收件邮箱不匹配')
  }

  const title = input.subject.trim() || '今日随记'
  const content = input.text.trim()
  const html = input.html.trim()

  const payload = await buildDiaryEntryPayload({
    title,
    content,
    html,
    status: 'published',
    cover_image: input.cover_image || '',
  })

  const id = await createDiaryEntry(db, {
    ...payload,
    source: 'email',
    source_email: input.from,
  })

  await invalidatePublicContentCache(env)

  return { id, slug: payload.slug }
}
