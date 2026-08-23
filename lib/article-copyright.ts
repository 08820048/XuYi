export const ARTICLE_COPYRIGHT_NOTICE =
  '本文内容版权归作者或相关权利人所有。转载、引用或其他使用请遵循相应授权条款，并保留本文链接。'

export function formatArticleCopyrightText({
  title,
  articleUrl,
  sourceUrl,
}: {
  title: string
  articleUrl: string
  sourceUrl?: string | null
}) {
  return [
    `版权声明：${ARTICLE_COPYRIGHT_NOTICE}`,
    `文章标题：${title}`,
    `本文链接：${articleUrl}`,
    ...(sourceUrl ? [`原文链接：${sourceUrl}`] : []),
  ].join('\n')
}
