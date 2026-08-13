// open-next generates this module during the Cloudflare build step.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- generated artifact may be absent during clean Next type-checks
import { default as handler } from './.open-next/worker.js'
import { consumeBackgroundJobBatch, type BackgroundJob, type BackgroundJobEnv } from './lib/background-jobs'
import { parseDiaryEmail } from './lib/diary-email'
import { publishDiaryEmail } from './lib/diary-email-ingest'
import { pushFeishuBlogReport, type FeishuReportEnv } from './lib/feishu-report'

interface QueueMessage<T> {
  body: T
  ack?: () => void
  retry?: () => void
}

interface QueueBatch<T> {
  messages: Array<QueueMessage<T>>
}

interface ForwardableEmailMessage {
  from: string
  to: string
  raw: ReadableStream
  setReject?: (reason: string) => void
}

async function readEmailRaw(stream: ReadableStream): Promise<string> {
  const text = await new Response(stream).text()
  return text
}

const customWorker = {
  fetch: handler.fetch,

  async scheduled(controller: { scheduledTime: number; cron: string }, env: FeishuReportEnv, ctx?: { waitUntil?: (promise: Promise<unknown>) => void }) {
    const task = pushFeishuBlogReport(env, {
      now: new Date(controller.scheduledTime),
    }).catch((error) => {
      console.error('Feishu report cron failed:', error)
    })

    if (ctx?.waitUntil) {
      ctx.waitUntil(task)
      return
    }

    await task
  },

  async queue(batch: QueueBatch<BackgroundJob>, env: BackgroundJobEnv) {
    await consumeBackgroundJobBatch(batch, env)
  },

  async email(message: ForwardableEmailMessage, env: Partial<CloudflareEnv>) {
    try {
      if (!env.DB) {
        message.setReject?.('DB is not configured')
        return
      }

      const parsed = parseDiaryEmail(await readEmailRaw(message.raw))
      await publishDiaryEmail(env.DB, env, {
        ...parsed,
        from: parsed.from || message.from,
        to: parsed.to || message.to,
      })
    } catch (error) {
      console.error('Diary email ingestion failed:', error)
      message.setReject?.(error instanceof Error ? error.message : 'Diary email ingestion failed')
    }
  },
}

export default customWorker

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- generated artifact may be absent during clean Next type-checks
export { DOQueueHandler, DOShardedTagCache } from './.open-next/worker.js'
