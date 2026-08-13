export function normalizeDiaryEmail(value: string) {
  const match = value.match(/<([^<>@\s]+@[^<>\s]+)>/)
  return (match?.[1] || value).trim().toLowerCase()
}

export function isDiarySenderAllowed(sender: string, allowedSender: string | null) {
  const normalizedSender = normalizeDiaryEmail(sender)
  const allowed = (allowedSender || '')
    .split(',')
    .map((item) => normalizeDiaryEmail(item))
    .filter(Boolean)

  return allowed.length > 0 && allowed.includes(normalizedSender)
}

export function isDiaryRecipientAllowed(recipient: string, configuredRecipient: string | null) {
  const configured = normalizeDiaryEmail(configuredRecipient || '')
  if (!configured) return true
  return normalizeDiaryEmail(recipient) === configured
}

export function decodeMimeHeader(value: string): string {
  return value.replace(/=\?([^?]+)\?([bqBQ])\?([^?]+)\?=/g, (_match, charset: string, encoding: string, encoded: string) => {
    try {
      const normalizedCharset = String(charset).toLowerCase()
      if (!['utf-8', 'utf8', 'us-ascii'].includes(normalizedCharset)) {
        return encoded
      }

      if (String(encoding).toLowerCase() === 'b') {
        const binary = atob(String(encoded))
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
        return new TextDecoder('utf-8').decode(bytes)
      }

      const text = String(encoded)
        .replace(/_/g, ' ')
        .replace(/=([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
      const bytes = Uint8Array.from(text, (char) => char.charCodeAt(0))
      return new TextDecoder('utf-8').decode(bytes)
    } catch {
      return encoded
    }
  }).trim()
}

export function decodeQuotedPrintable(value: string): string {
  const unfolded = value.replace(/=\r?\n/g, '')
  const binary = unfolded.replace(/=([0-9a-f]{2})/gi, (_match, hex: string) => (
    String.fromCharCode(parseInt(hex, 16))
  ))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  try {
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return binary
  }
}

function parseHeaderBlock(headerBlock: string): Record<string, string> {
  const headers: Record<string, string> = {}
  const lines = headerBlock.replace(/\r\n/g, '\n').split('\n')
  let currentKey = ''

  for (const line of lines) {
    if (/^\s/.test(line) && currentKey) {
      headers[currentKey] += ` ${line.trim()}`
      continue
    }

    const idx = line.indexOf(':')
    if (idx <= 0) continue
    currentKey = line.slice(0, idx).trim().toLowerCase()
    headers[currentKey] = line.slice(idx + 1).trim()
  }

  return headers
}

function decodePartBody(body: string, headers: Record<string, string>) {
  const encoding = (headers['content-transfer-encoding'] || '').toLowerCase()

  if (encoding === 'base64') {
    try {
      const binary = atob(body.replace(/\s+/g, ''))
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
      return new TextDecoder('utf-8').decode(bytes)
    } catch {
      return body
    }
  }

  if (encoding === 'quoted-printable') {
    return decodeQuotedPrintable(body)
  }

  return body.trim()
}

function extractBoundary(contentType: string) {
  return contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i)?.[1]
    || contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i)?.[2]
    || ''
}

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export type ParsedDiaryEmail = {
  from: string
  to: string
  subject: string
  text: string
  html: string
}

export function parseDiaryEmail(rawEmail: string): ParsedDiaryEmail {
  const normalized = rawEmail.replace(/\r\n/g, '\n')
  const splitIndex = normalized.indexOf('\n\n')
  const headerBlock = splitIndex >= 0 ? normalized.slice(0, splitIndex) : ''
  const body = splitIndex >= 0 ? normalized.slice(splitIndex + 2) : normalized
  const headers = parseHeaderBlock(headerBlock)
  const contentType = headers['content-type'] || ''
  const boundary = extractBoundary(contentType)

  let text = ''
  let html = ''

  if (boundary) {
    const parts = body.split(`--${boundary}`)
    for (const rawPart of parts) {
      const part = rawPart.replace(/^--\s*$/, '').trim()
      if (!part) continue

      const partSplitIndex = part.indexOf('\n\n')
      if (partSplitIndex < 0) continue

      const partHeaders = parseHeaderBlock(part.slice(0, partSplitIndex))
      const partBody = decodePartBody(part.slice(partSplitIndex + 2), partHeaders)
      const partContentType = (partHeaders['content-type'] || '').toLowerCase()

      if (!text && partContentType.includes('text/plain')) {
        text = partBody.trim()
      }
      if (!html && partContentType.includes('text/html')) {
        html = partBody.trim()
      }
    }
  } else {
    const decodedBody = decodePartBody(body, headers)
    if (contentType.toLowerCase().includes('text/html')) {
      html = decodedBody.trim()
    } else {
      text = decodedBody.trim()
    }
  }

  if (!text && html) {
    text = stripHtml(html)
  }

  return {
    from: decodeMimeHeader(headers.from || ''),
    to: decodeMimeHeader(headers.to || ''),
    subject: decodeMimeHeader(headers.subject || ''),
    text,
    html,
  }
}
