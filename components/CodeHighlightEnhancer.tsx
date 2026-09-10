'use client'

import { useEffect } from 'react'
import hljs from 'highlight.js'
import groovy from 'highlight.js/lib/languages/groovy'

if (!hljs.getLanguage('groovy')) {
  hljs.registerLanguage('groovy', groovy)
}

export function CodeHighlightEnhancer({
  containerId,
  html,
}: {
  containerId: string
  html: string
}) {
  useEffect(() => {
    const root = document.getElementById(containerId)
    if (!root) return

    const blocks = root.querySelectorAll('pre code')
    blocks.forEach((block) => {
      const element = block as HTMLElement
      if (element.closest('pre.shiki, pre.mermaid, .kami-diagram, .math-block-wrapper, .katex')) return
      if (element.dataset.highlighted === 'yes') return
      hljs.highlightElement(element)
    })
  }, [containerId, html])

  return null
}
