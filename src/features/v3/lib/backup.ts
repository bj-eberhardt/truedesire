export function formatJsonMaybe(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

export function safeBackupFilename(codeOrFallback: string | null | undefined): string {
  const base = String(codeOrFallback ?? 'backup').trim()
  const safe = base.replace(/[^a-zA-Z0-9_-]+/g, '') || 'backup'
  return `${safe}.json`
}

export function downloadTextFile(opts: { filename: string; content: string; mime?: string }): void {
  const { filename, content, mime } = opts
  const blob = new Blob([content], { type: mime ?? 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

