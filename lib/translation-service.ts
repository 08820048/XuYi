import { completeWithSystemPrompt, getAiRuntimeEnv } from '@/lib/ai'
import {
  buildMetaSystemPrompt,
  buildMetaUserPrompt,
  buildUnitSystemPrompt,
  parseTranslatedMeta,
  type TranslatedMeta,
} from '@/lib/ai-translate'
import {
  assembleHtml,
  htmlToPlainText,
  planBatches,
  planHtmlTranslation,
  translateUnits,
  type HtmlTranslationPlan,
} from '@/lib/html-translate'
import {
  deleteTranslationChunks,
  getSetting,
  getTranslationChunks,
  saveTranslationChunk,
  setTranslationAiState,
  upsertPostTranslation,
} from '@/lib/db'
import { hashTranslationSource } from '@/lib/translation-hash'

/**
 * 分步 AI 翻译。每一步只做少量模型调用，单次请求很短，不依赖后台队列：
 *   start（切单元 + 译标题/摘要）→ chunk × N（逐批翻译，结果暂存）→ finish（拼装 HTML、存为草稿）
 * 浏览器反复调用即可；暂存在数据库里，中途中断后可从已完成的批继续。
 *
 * 翻译对象是文章的 `html`（不是纯文本 `content`）：只替换文字，标签、属性、图片、视频、排版原样保留。
 */

const META_IDX = -1

export const TRANSLATE_PROFILE_SETTING = 'translate_profile_id'
export const TRANSLATE_PROMPT_SETTING = 'translate_prompt'

export interface TranslatablePost {
  id: number
  title: string
  /** 编辑器生成的 HTML：翻译与来源指纹都基于它 */
  html: string
  /** 纯文本，仅用于生成摘要提示 */
  content: string
  description: string | null
}

export interface TranslationContext {
  db: D1Database
  env: Partial<CloudflareEnv> | null | undefined
  post: TranslatablePost
  lang: string
}

export interface TranslationProgress {
  total: number
  done: number
  hash: string
}

export class TranslationConflictError extends Error {}

async function loadAiOptions(ctx: TranslationContext) {
  const [profileSetting, promptSetting] = await Promise.all([
    getSetting(ctx.db, TRANSLATE_PROFILE_SETTING),
    getSetting(ctx.db, TRANSLATE_PROMPT_SETTING),
  ])
  const profileId = Number(profileSetting)
  return {
    profileId: Number.isFinite(profileId) && profileId > 0 ? profileId : undefined,
    customPrompt: promptSetting?.trim() || null,
    db: ctx.db,
    env: getAiRuntimeEnv(ctx.env),
  }
}

function plan(post: TranslatablePost): { plan: HtmlTranslationPlan; batches: number[][] } {
  const htmlPlan = planHtmlTranslation(post.html)
  return { plan: htmlPlan, batches: planBatches(htmlPlan.units) }
}

function sourceHash(post: TranslatablePost) {
  return hashTranslationSource(post.title, post.html)
}

function countDone(stored: { idx: number; source_hash: string }[], hash: string, total: number) {
  return stored.filter((row) => row.idx >= 0 && row.idx < total && row.source_hash === hash).length
}

async function translateMeta(ctx: TranslationContext, hash: string): Promise<TranslatedMeta> {
  const options = await loadAiOptions(ctx)
  const excerpt = ctx.post.content?.trim() || htmlToPlainText(ctx.post.html)
  const raw = await completeWithSystemPrompt(buildMetaUserPrompt(ctx.post.title, ctx.post.description, excerpt), {
    systemPrompt: buildMetaSystemPrompt(ctx.lang, options.customPrompt),
    temperature: 0.3,
    profileId: options.profileId,
    db: options.db,
    env: options.env,
  })
  const meta = parseTranslatedMeta(raw)
  if (!meta) throw new Error('标题/摘要翻译失败：模型没有返回有效 JSON')
  await saveTranslationChunk(ctx.db, ctx.post.id, ctx.lang, META_IDX, hash, JSON.stringify(meta))
  return meta
}

/** 第一步：切单元、译标题/摘要，标记「翻译中」。已有同版本的暂存批会被复用（断点续传）。 */
export async function startTranslation(ctx: TranslationContext): Promise<TranslationProgress> {
  if (!ctx.post.html.trim()) throw new Error('文章正文为空，无法翻译')
  const hash = await sourceHash(ctx.post)
  const { batches } = plan(ctx.post)

  await setTranslationAiState(ctx.db, ctx.post.id, ctx.lang, 'translating')
  await deleteTranslationChunks(ctx.db, ctx.post.id, ctx.lang, hash)

  const stored = await getTranslationChunks(ctx.db, ctx.post.id, ctx.lang)
  if (!stored.some((row) => row.idx === META_IDX && row.source_hash === hash)) {
    await translateMeta(ctx, hash)
  }
  return { total: batches.length, done: countDone(stored, hash, batches.length), hash }
}

/** 第二步（重复）：翻译第 index 批。幂等：已翻译的直接返回。 */
export async function translateChunkStep(
  ctx: TranslationContext,
  index: number,
  expectedHash?: string,
): Promise<TranslationProgress> {
  const hash = await sourceHash(ctx.post)
  if (expectedHash && expectedHash !== hash) {
    throw new TranslationConflictError('翻译期间中文原文被修改，请重新开始翻译')
  }
  const { plan: htmlPlan, batches } = plan(ctx.post)
  if (!Number.isInteger(index) || index < 0 || index >= batches.length) {
    throw new Error(`批次序号越界：${index}`)
  }

  const stored = await getTranslationChunks(ctx.db, ctx.post.id, ctx.lang)
  if (!stored.some((row) => row.idx === index && row.source_hash === hash)) {
    const options = await loadAiOptions(ctx)
    const systemPrompt = buildUnitSystemPrompt(ctx.lang, options.customPrompt)
    const outcome = await translateUnits(htmlPlan.units, batches[index], (input) =>
      completeWithSystemPrompt(input, {
        systemPrompt,
        temperature: 0.3,
        profileId: options.profileId,
        db: options.db,
        env: options.env,
      }),
    )
    const payload: Record<string, string> = {}
    for (const [unitIndex, text] of outcome.results) payload[String(unitIndex)] = text
    const text = JSON.stringify(payload)
    await saveTranslationChunk(ctx.db, ctx.post.id, ctx.lang, index, hash, text)
    stored.push({ idx: index, source_hash: hash, text })
  }
  return { total: batches.length, done: countDone(stored, hash, batches.length), hash }
}

/** 第三步：把各批译文按原文档结构拼回 HTML，存为草稿（需要你预览后再发布），清理暂存。 */
export async function finishTranslation(ctx: TranslationContext): Promise<{ title: string }> {
  const hash = await sourceHash(ctx.post)
  const { plan: htmlPlan, batches } = plan(ctx.post)
  const stored = await getTranslationChunks(ctx.db, ctx.post.id, ctx.lang)
  const current = new Map(stored.filter((row) => row.source_hash === hash).map((row) => [row.idx, row.text]))

  const metaRaw = current.get(META_IDX)
  if (!metaRaw) throw new Error('缺少标题/摘要译文，请重新开始翻译')
  const meta = JSON.parse(metaRaw) as TranslatedMeta

  const translations: string[] = new Array(htmlPlan.units.length)
  batches.forEach((_, batchIndex) => {
    const raw = current.get(batchIndex)
    if (raw === undefined) throw new Error(`第 ${batchIndex + 1} 批尚未翻译完成`)
    for (const [unitIndex, text] of Object.entries(JSON.parse(raw) as Record<string, string>)) {
      translations[Number(unitIndex)] = text
    }
  })
  const missing = translations.findIndex((value) => value === undefined)
  if (missing !== -1) throw new Error(`第 ${missing + 1} 个文字块缺少译文，请重试翻译`)

  const html = assembleHtml(htmlPlan, translations)
  await upsertPostTranslation(ctx.db, ctx.post.id, ctx.lang, {
    title: meta.title,
    content: htmlToPlainText(html),
    html,
    description: meta.description || null,
    status: 'draft',
    sourceHash: hash,
  })
  await deleteTranslationChunks(ctx.db, ctx.post.id, ctx.lang)
  return { title: meta.title }
}

export async function failTranslation(ctx: TranslationContext, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  await setTranslationAiState(ctx.db, ctx.post.id, ctx.lang, 'failed', message)
}
