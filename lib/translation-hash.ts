/** 中文标题 + 正文 HTML 的指纹，用于判断译文是否基于当前中文版本（Web Crypto，Workers / Node 均可用）。 */
export async function hashTranslationSource(title: string, html: string): Promise<string> {
  const data = new TextEncoder().encode(`${title}\n\u0000\n${html}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export type TranslationFreshness = 'fresh' | 'stale' | 'unknown'

/** source_hash 为空（手动写入的译文）无法判断，按 unknown 处理，不提示过期。 */
export function getTranslationFreshness(
  savedHash: string | null | undefined,
  currentHash: string,
): TranslationFreshness {
  if (!savedHash) return 'unknown'
  return savedHash === currentHash ? 'fresh' : 'stale'
}
