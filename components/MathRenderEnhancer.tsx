'use client'

import { useEffect } from 'react'
import renderMathInElement from 'katex/contrib/auto-render'

export function MathRenderEnhancer({
  containerId,
  html,
}: {
  containerId: string
  html: string
}) {
  useEffect(() => {
    const root = document.getElementById(containerId)
    if (!root) return

    renderMathInElement(root, {
      throwOnError: false,
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true },
      ],
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
      ignoredClasses: ['hljs'],
    })
  }, [containerId, html])

  return null
}
