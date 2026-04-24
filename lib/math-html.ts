'use client'

import katex from 'katex'

type MathSegment =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string; displayMode: boolean }

function isEscaped(text: string, index: number) {
  let slashCount = 0
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) {
    slashCount += 1
  }
  return slashCount % 2 === 1
}

function findClosingDelimiter(text: string, start: number, delimiter: '$' | '$$') {
  for (let cursor = start; cursor < text.length; cursor += 1) {
    if (!text.startsWith(delimiter, cursor) || isEscaped(text, cursor)) continue

    if (delimiter === '$') {
      const nextChar = text[cursor + 1] ?? ''
      if (nextChar === '$') continue
    }

    return cursor
  }

  return -1
}

export function splitMathSegments(text: string): MathSegment[] {
  if (!text.includes('$')) return [{ type: 'text', value: text }]

  const segments: MathSegment[] = []
  let cursor = 0

  while (cursor < text.length) {
    const blockStart = !isEscaped(text, cursor) && text.startsWith('$$', cursor) ? cursor : -1
    const inlineStart = text[cursor] === '$' && !isEscaped(text, cursor) ? cursor : -1
    const start = blockStart >= 0 ? blockStart : inlineStart

    if (start < 0) {
      cursor += 1
      continue
    }

    if (start > 0) {
      const previousChunk = text.slice(0, start)
      if (previousChunk) segments.push({ type: 'text', value: previousChunk })
      text = text.slice(start)
      cursor = 0
    }

    const displayMode = text.startsWith('$$')
    const delimiter = displayMode ? '$$' : '$'
    const closingIndex = findClosingDelimiter(text, delimiter.length, delimiter)

    if (closingIndex < 0) {
      segments.push({ type: 'text', value: text })
      return segments
    }

    const latex = text.slice(delimiter.length, closingIndex).trim()
    if (!latex) {
      segments.push({ type: 'text', value: text.slice(0, closingIndex + delimiter.length) })
      text = text.slice(closingIndex + delimiter.length)
      cursor = 0
      continue
    }

    segments.push({ type: 'math', value: latex, displayMode })
    text = text.slice(closingIndex + delimiter.length)
    cursor = 0
  }

  if (text) segments.push({ type: 'text', value: text })
  return segments
}

export function containsMathSyntax(text: string) {
  return splitMathSegments(text).some((segment) => segment.type === 'math')
}

function createMathElement(doc: Document, latex: string, displayMode: boolean) {
  const element = doc.createElement('span')
  element.setAttribute('data-math-latex', latex)
  element.setAttribute('data-display-mode', String(displayMode))
  element.className = 'math-block-wrapper'

  try {
    element.innerHTML = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'html',
    })
  } catch {
    element.textContent = latex
  }

  return element
}

export function transformHtmlMathDelimiters(html: string) {
  if (typeof document === 'undefined' || !html.includes('$')) return html

  const template = document.createElement('template')
  template.innerHTML = html

  const walker = document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        if (parent.closest('code, pre, script, style, textarea, [data-math-latex]')) {
          return NodeFilter.FILTER_REJECT
        }
        return node.textContent?.includes('$')
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT
      },
    },
  )

  const textNodes: Text[] = []
  let current = walker.nextNode()
  while (current) {
    textNodes.push(current as Text)
    current = walker.nextNode()
  }

  textNodes.forEach((node) => {
    const source = node.textContent || ''
    const segments = splitMathSegments(source)
    if (!segments.some((segment) => segment.type === 'math')) return

    const fragment = document.createDocumentFragment()
    segments.forEach((segment) => {
      if (segment.type === 'text') {
        if (segment.value) fragment.appendChild(document.createTextNode(segment.value))
        return
      }

      fragment.appendChild(createMathElement(document, segment.value, segment.displayMode))
    })

    node.parentNode?.replaceChild(fragment, node)
  })

  return template.innerHTML
}
