import { completeWithSystemPrompt, getAiRuntimeEnv } from '@/lib/ai'
import {
  buildMetaSystemPrompt,
  buildMetaUserPrompt,
  buildTranslateSystemPrompt,
  joinTranslatedChunks,
  parseTranslatedMeta,
  splitMarkdownForTranslation,
  stripOuterFence,
  type TranslatedMeta,
  type TranslationChunk,
} from '@/lib/ai-translate'
import {
  deleteTranslationChunks,
  getSetting,
  getTranslationChunks,
  saveTranslationChunk,
  setTranslationAiState,
  upsertPostTranslation,
} from '@/lib/db'
import { renderMarkdownContent } from '@/lib/markdown'
import { hashTranslationSource } from '@/lib/translation-hash'

/**
 * 分步 AI 翻译。每一步只做一次模型调用，单次请求很短，不依赖后台队列：
 *   start（切块 + 译标题/摘要）→ chunk × N（逐段翻译，结果暂存）→ finish（拼装、渲染、存为草稿）
 * 浏览器反复调用即可；暂存在数据库里，中途中断后可从已完成的段继续。
 */

const META_IDX = -1
/** 译文比原文短得离谱（< 25%）基本是模型截断或拒答，按失败处理 */
const MIN_LENGTH_RATIO = 0.25

export const TRANSLATE_PROFILE_SETTING = 'translate_profile_id'
export const TRANSLATE_PROMPT_SETTING = 'translate_prompt'

export interface TranslatablePost {
  id: number
  title: string
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

function plan(post: TranslatablePost): { chunks: TranslationChunk[]; translatable: number[] } {
  const chunks = splitMarkdownForTranslation(post.content)
  const translatable: number[] = []
  chunks.forEach((chunk, i) => {
    if (chunk.translate) translatable.push(i)
  })
  return { chunks, translatable }
}

function countDone(stored: { idx: number; source_hash: string }[], hash: string, total: number) {
  return stored.filter((row) => row.idx >= 0 && row.idx < total && row.source_hash === hash).length
}

async function translateMeta(ctx: TranslationContext, hash: string): Promise<TranslatedMeta> {
  const options = await loadAiOptions(ctx)
  const raw = await completeWithSystemPrompt(
    buildMetaUserPrompt(ctx.post.title, ctx.post.description, ctx.post.content),
    {
      systemPrompt: buildMetaSystemPrompt(ctx.lang, options.customPrompt),
      temperature: 0.3,
      profileId: options.profileId,
      db: options.db,
      env: options.env,
    },
  )
  const meta = parseTranslatedMeta(raw)
  if (!meta) throw new Error('标题/摘要翻译失败：模型没有返回有效 JSON')
  await saveTranslationChunk(ctx.db, ctx.post.id, ctx.lang, META_IDX, hash, JSON.stringify(meta))
  return meta
}

/** 第一步：切块、译标题/摘要，标记「翻译中」。已有同版本的暂存段会被复用（断点续传）。 */
export async function startTranslation(ctx: TranslationContext): Promise<TranslationProgress> {
  const hash = await hashTranslationSource(ctx.post.title, ctx.post.content)
  const { translatable } = plan(ctx.post)
  if (translatable.length === 0 && !ctx.post.content.trim()) throw new Error('文章正文为空，无法翻译')

  await setTranslationAiState(ctx.db, ctx.post.id, ctx.lang, 'translating')
  await deleteTranslationChunks(ctx.db, ctx.post.id, ctx.lang, hash)

  const stored = await getTranslationChunks(ctx.db, ctx.post.id, ctx.lang)
  if (!stored.some((row) => row.idx === META_IDX && row.source_hash === hash)) {
    await translateMeta(ctx, hash)
  }
  return { total: translatable.length, done: countDone(stored, hash, translatable.length), hash }
}

/** 第二步（重复）：翻译第 index 个可翻译块。幂等：已翻译的直接返回。 */
export async function translateChunkStep(
  ctx: TranslationContext,
  index: number,
  expectedHash?: string,
): Promise<TranslationProgress> {
  const hash = await hashTranslationSource(ctx.post.title, ctx.post.content)
  if (expectedHash && expectedHash !== hash) {
    throw new TranslationConflictError('翻译期间中文原文被修改，请重新开始翻译')
  }
  const { chunks, translatable } = plan(ctx.post)
  if (!Number.isInteger(index) || index < 0 || index >= translatable.length) {
    throw new Error(`段落序号越界：${index}`)
  }

  const stored = await getTranslationChunks(ctx.db, ctx.post.id, ctx.lang)
  if (!stored.some((row) => row.idx === index && row.source_hash === hash)) {
    const source = chunks[translatable[index]].text
    const options = await loadAiOptions(ctx)
    const output = stripOuterFence(
      await completeWithSystemPrompt(source, {
        systemPrompt: buildTranslateSystemPrompt(ctx.lang, options.customPrompt),
        temperature: 0.3,
        profileId: options.profileId,
        db: options.db,
        env: options.env,
      }),
    )
    if (!output) throw new Error(`第 ${index + 1} 段翻译结果为空`)
    if (output.length < source.length * MIN_LENGTH_RATIO) {
      throw new Error(`第 ${index + 1} 段译文异常偏短，疑似被截断，请重试`)
    }
    await saveTranslationChunk(ctx.db, ctx.post.id, ctx.lang, index, hash, output)
    stored.push({ idx: index, source_hash: hash, text: output })
  }
  return { total: translatable.length, done: countDone(stored, hash, translatable.length), hash }
}

/** 第三步：拼装、渲染 HTML，存为草稿（需要你预览后再发布），清理暂存。 */
export async function finishTranslation(ctx: TranslationContext): Promise<{ title: string }> {
  const hash = await hashTranslationSource(ctx.post.title, ctx.post.content)
  const { chunks, translatable } = plan(ctx.post)
  const stored = await getTranslationChunks(ctx.db, ctx.post.id, ctx.lang)
  const byIdx = new Map(stored.filter((row) => row.source_hash === hash).map((row) => [row.idx, row.text]))

  const metaRaw = byIdx.get(META_IDX)
  if (!metaRaw) throw new Error('缺少标题/摘要译文，请重新开始翻译')
  const meta = JSON.parse(metaRaw) as TranslatedMeta

  const missing = translatable.findIndex((_, n) => !byIdx.has(n))
  if (missing !== -1) throw new Error(`第 ${missing + 1} 段尚未翻译完成`)

  let n = 0
  const parts = chunks.map((chunk) => (chunk.translate ? (byIdx.get(n++) as string) : chunk.text))
  const content = joinTranslatedChunks(parts)
  const html = await renderMarkdownContent(content)

  await upsertPostTranslation(ctx.db, ctx.post.id, ctx.lang, {
    title: meta.title,
    content,
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
