'use client'

import { useEffect } from 'react'

const KAMI_MERMAID_THEME = {
  background: '#ffffff',
  fontFamily: 'TsangerJinKai02, "Noto Serif SC", Georgia, serif',
  fontSize: '16px',
  primaryColor: '#e4ecf5',
  primaryTextColor: '#1b365d',
  primaryBorderColor: '#1b365d',
  secondaryColor: '#faf9f5',
  tertiaryColor: '#f5f4ed',
  lineColor: '#6b6a64',
  textColor: '#141413',
  mainBkg: '#faf9f5',
  nodeBorder: '#1b365d',
  clusterBkg: '#f5f4ed',
  clusterBorder: '#e8e6dc',
  titleColor: '#1b365d',
  edgeLabelBackground: '#faf9f5',
  nodeTextColor: '#141413',
}

let mermaidPromise: Promise<typeof import('mermaid').default> | undefined

function loadMermaid() {
  mermaidPromise ??= import('mermaid').then((mod) => {
    const mermaid = mod.default
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: KAMI_MERMAID_THEME,
      flowchart: { htmlLabels: false, curve: 'basis' },
      sequence: { actorMargin: 48, messageFontFamily: KAMI_MERMAID_THEME.fontFamily },
    })
    return mermaid
  })
  return mermaidPromise
}

export function DiagramRenderEnhancer({
  containerId,
  html,
}: {
  containerId: string
  html: string
}) {
  useEffect(() => {
    const root = document.getElementById(containerId)
    if (!root) return

    const nodes = [...root.querySelectorAll<HTMLElement>('pre.mermaid')].filter((node) => {
      if (node.querySelector('svg')) return false
      return Boolean(node.textContent?.trim())
    })
    if (nodes.length === 0) return

    let cancelled = false
    void loadMermaid().then(async (mermaid) => {
      if (cancelled) return
      await mermaid.run({ nodes, suppressErrors: true })
    }).catch((error) => {
      console.error('Mermaid render failed:', error)
    })

    return () => {
      cancelled = true
    }
  }, [containerId, html])

  return null
}
