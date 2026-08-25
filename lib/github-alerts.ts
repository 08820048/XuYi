// GitHub 提示框语法（> [!NOTE] / [!TIP] / [!IMPORTANT] / [!WARNING] / [!CAUTION]）
// 编辑器和 remark 都不解析该语法，发布后的 HTML 里标记会原样留在 blockquote 中，
// 这里在展示层把带标记的 blockquote 增强为提示框。

export const GITHUB_ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const

export type GithubAlertType = (typeof GITHUB_ALERT_TYPES)[number]

const GITHUB_ALERT_LABELS: Record<GithubAlertType, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
}

// 图标与 GitHub 一致：info / lightbulb / report / triangle-alert / octagon-alert
const GITHUB_ALERT_ICONS: Record<GithubAlertType, string> = {
  note: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  tip: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  important: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.73-2Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  caution: '<path d="M12 16h.01"/><path d="M12 8v4"/><path d="M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586L2.586 16.73A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414L7.274 2.586A2 2 0 0 1 8.688 2z"/>',
}

const GITHUB_ALERT_MARKER = /^\s*\[!(note|tip|important|warning|caution)\][ \t]*/i

export function parseGithubAlertMarker(text: string): { type: GithubAlertType; rest: string; matched: string } | null {
  const matched = GITHUB_ALERT_MARKER.exec(text)
  if (!matched) return null
  return {
    type: matched[1].toLowerCase() as GithubAlertType,
    rest: text.slice(matched[0].length),
    matched: matched[0],
  }
}

function iconSvg(type: GithubAlertType) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GITHUB_ALERT_ICONS[type]}</svg>`
}

// 从 blockquote 开头移除标记文本（标记可能横跨前几个文本节点）
function stripLeadingText(node: Node, length: number) {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
  let remaining = length
  let current = walker.nextNode()

  while (current && remaining > 0) {
    const text = current.textContent ?? ''
    if (text.length <= remaining) {
      remaining -= text.length
      current.textContent = ''
    } else {
      current.textContent = text.slice(remaining)
      remaining = 0
    }
    current = walker.nextNode()
  }
}

export function applyGithubAlerts(root: ParentNode) {
  const quotes = root.querySelectorAll('blockquote')

  quotes.forEach((quote) => {
    if (quote.classList.contains('github-alert')) return

    const parsed = parseGithubAlertMarker(quote.textContent ?? '')
    if (!parsed) return

    quote.classList.add('github-alert', `github-alert--${parsed.type}`)
    stripLeadingText(quote, parsed.matched.length)

    // 标记独占首段时，移除被清空的段落
    const firstChild = quote.firstElementChild
    if (
      firstChild &&
      firstChild.tagName === 'P' &&
      !firstChild.firstElementChild &&
      !(firstChild.textContent ?? '').trim()
    ) {
      firstChild.remove()
    }

    const title = document.createElement('p')
    title.className = 'github-alert-title'
    title.innerHTML = `${iconSvg(parsed.type)}<span>${GITHUB_ALERT_LABELS[parsed.type]}</span>`
    quote.insertBefore(title, quote.firstChild)
  })
}
