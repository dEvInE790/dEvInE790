// Only send people back to our own apps after payment (prevents open redirects).
// APP_URLS: comma-separated web origins, e.g. "https://tutorhaven.ng,http://localhost:5173"
const APP_SCHEMES = ['exp:', 'exps:', 'tutorhaven:']

export function isAllowedRedirect(target: string | null | undefined, appUrls: string): boolean {
  if (!target) return false
  let url: URL
  try {
    url = new URL(target)
  } catch {
    return false
  }
  if (APP_SCHEMES.includes(url.protocol)) return true
  const origins = appUrls.split(',').map((s) => s.trim()).filter(Boolean)
  return origins.some((o) => {
    try {
      return new URL(o).origin === url.origin
    } catch {
      return false
    }
  })
}

export function withParams(target: string, params: Record<string, string>): string {
  const url = new URL(target)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return url.toString()
}
