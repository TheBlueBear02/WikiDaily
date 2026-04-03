/**
 * Match `articles.wiki_slug` / route keys: Wikipedia URLs use underscores; decoded
 * route params may still contain spaces (`%20` → space).
 */
export function normalizeWikiSlugForDb(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  return s.replaceAll(' ', '_')
}

const WP_SUMMARY_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary'
const WP_PAGE_HTML_BASE = 'https://en.wikipedia.org/api/rest_v1/page/html'
const WP_RANDOM_API_URL =
  'https://en.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*'

export async function fetchWikipediaSummary(wikiSlug) {
  const url = `${WP_SUMMARY_BASE}/${encodeURIComponent(wikiSlug)}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Wikipedia summary failed: HTTP ${res.status}`)
  }

  return res.json()
}

/**
 * MediaWiki opensearch: title suggestions for the main namespace.
 * @returns {{ titles: string[], descriptions: string[] }}
 */
export async function fetchWikipediaOpenSearch(query, { limit = 8 } = {}) {
  const q = String(query ?? '').trim()
  if (!q) return { titles: [], descriptions: [] }

  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'opensearch')
  url.searchParams.set('search', q)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('namespace', '0')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Wikipedia search failed: HTTP ${res.status}`)
  }

  const json = await res.json()
  if (!Array.isArray(json) || json.length < 2) {
    return { titles: [], descriptions: [] }
  }

  const titles = Array.isArray(json[1]) ? json[1] : []
  const descriptions = Array.isArray(json[2]) ? json[2] : []
  return { titles, descriptions }
}

/**
 * Full Parsoid HTML for an article (used by the in-app reader iframe via `srcDoc`).
 * CORS: `access-control-allow-origin: *` on this endpoint.
 */
export async function fetchWikipediaHtml(wikiSlug) {
  const slug = String(wikiSlug ?? '').trim()
  if (!slug) {
    throw new Error('Missing wiki slug.')
  }

  const url = `${WP_PAGE_HTML_BASE}/${encodeURIComponent(slug)}`
  const res = await fetch(url, {
    headers: { Accept: 'text/html' },
  })

  if (!res.ok) {
    throw new Error(`Wikipedia HTML failed: HTTP ${res.status}`)
  }

  return res.text()
}

/**
 * Typography for the in-app Wikipedia reader (`iframe[srcdoc]`). Edit these values to
 * change font family, size, and line height; styles are injected after Wikipedia’s CSS.
 */
export const WIKI_READER_APPEARANCE = {
  /** CSS `font-family` value */
  fontFamily:
    'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  /** Base size for article body (e.g. `17px`, `1.0625rem`) */
  fontSize: '17px',
  lineHeight: 1.65,
  /** Optional max width for the text column (empty string = full iframe width) */
  contentMaxWidth: '',
  /**
   * Padding around the article inside the iframe. CSS shorthand: top, left/right, bottom.
   * Example: `'0.75rem 1rem 1.5rem'` — a little space on the sides without narrowing the column much.
   */
  bodyPadding: '0.75rem 1rem 1.5rem',
}

function buildWikiReaderAppearanceCss() {
  const { fontFamily, fontSize, lineHeight, contentMaxWidth, bodyPadding } =
    WIKI_READER_APPEARANCE
  const pad =
    typeof bodyPadding === 'string' && bodyPadding.trim()
      ? bodyPadding.trim()
      : '0.75rem 1rem 1.5rem'
  const maxWidthBlock =
    contentMaxWidth && String(contentMaxWidth).trim()
      ? `
    .mw-parser-output {
      max-width: ${contentMaxWidth};
      margin-left: auto;
      margin-right: auto;
    }`
      : ''
  return `
/* WikiDaily reader overrides (after MediaWiki styles) */
html {
  -webkit-text-size-adjust: 100%;
}
body {
  padding: ${pad} !important;
  margin: 0 !important;
  color: #0f172a !important;
  /* Base for rem children */
  font-size: ${fontSize} !important;
  font-family: ${fontFamily} !important;
  line-height: ${lineHeight} !important;
  -webkit-font-smoothing: antialiased;
}
/* MediaWiki sets fonts/sizes on .mw-parser-output and block elements — set explicitly */
.mw-parser-output {
  font-family: ${fontFamily} !important;
  font-size: ${fontSize} !important;
  line-height: ${lineHeight} !important;
}
.mw-parser-output p,
.mw-parser-output li,
.mw-parser-output dd,
.mw-parser-output blockquote,
.mw-parser-output td,
.mw-parser-output th {
  font-family: ${fontFamily} !important;
  font-size: ${fontSize} !important;
  line-height: ${lineHeight} !important;
}
.mw-parser-output a {
  font-family: ${fontFamily} !important;
}
.mw-parser-output h1,
.mw-parser-output h2,
.mw-parser-output h3,
.mw-parser-output h4 {
  font-family: ${fontFamily} !important;
  line-height: 1.3 !important;
}
.mw-parser-output h1 { font-size: 1.875em !important; }
.mw-parser-output h2 { font-size: 1.5em !important; }
.mw-parser-output h3 { font-size: 1.25em !important; }
.mw-parser-output h4 { font-size: 1.1em !important; }
${maxWidthBlock}
`
}

/**
 * Remove executable/nested browsing contexts before injecting HTML into `iframe[srcdoc]`,
 * and append reader typography overrides (see {@link WIKI_READER_APPEARANCE}).
 */
export function sanitizeWikiHtmlForIframeSrc(html) {
  const raw = String(html ?? '')
  if (typeof DOMParser === 'undefined') return raw

  const doc = new DOMParser().parseFromString(raw, 'text/html')
  doc.querySelectorAll('script').forEach((el) => el.remove())
  doc.querySelectorAll('iframe').forEach((el) => el.remove())

  const existing = doc.getElementById('wikidaily-reader-appearance')
  if (existing) existing.remove()

  const styleEl = doc.createElement('style')
  styleEl.id = 'wikidaily-reader-appearance'
  styleEl.textContent = buildWikiReaderAppearanceCss()

  const head = doc.head
  if (head) {
    head.appendChild(styleEl)
  } else {
    const htmlEl = doc.documentElement
    const h = doc.createElement('head')
    h.appendChild(styleEl)
    htmlEl.insertBefore(h, htmlEl.firstChild)
  }

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
}

/**
 * Resolve a link inside Wikipedia HTML to a wiki page key (`wiki_slug`), or `null` if
 * the link should use normal navigation (external URL, hash-only, media, etc.).
 * @param {string} href - raw `href` from an `<a>` (may be relative)
 * @param {string} baseUrl - `document.baseURI` from the iframe document
 */
export function parseWikiSlugFromHref(href, baseUrl) {
  const h = String(href ?? '').trim()
  if (!h || h.startsWith('#')) return null

  let url
  try {
    url = new URL(h, String(baseUrl ?? 'https://en.wikipedia.org/wiki/'))
  } catch {
    return null
  }

  if (url.protocol === 'http:' || url.protocol === 'https:') {
    const host = url.hostname.toLowerCase()
    // App is English-only; other language wikis should use normal navigation.
    if (host !== 'en.wikipedia.org') {
      return null
    }
  }

  const path = url.pathname

  const wikiMatch = path.match(/^\/wiki\/(.+)$/)
  if (wikiMatch) {
    try {
      return decodeURIComponent(wikiMatch[1])
    } catch {
      return wikiMatch[1]
    }
  }

  const restMatch = path.match(/^\/api\/rest_v1\/page\/html\/(.+)$/)
  if (restMatch) {
    try {
      return decodeURIComponent(restMatch[1])
    } catch {
      return restMatch[1]
    }
  }

  return null
}

export async function fetchWikipediaRandomPage() {
  const res = await fetch(WP_RANDOM_API_URL, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Wikipedia random page failed: HTTP ${res.status}`)
  }

  const json = await res.json()
  const title =
    json?.query?.random?.[0]?.title &&
    typeof json.query.random[0].title === 'string'
      ? json.query.random[0].title
      : null

  if (!title) {
    throw new Error('Wikipedia random page returned no title')
  }

  // MediaWiki uses underscores for spaces in titles; our `/wiki/:wikiSlug` route
  // expects that same wiki-page key format.
  const wikiSlug = title.replaceAll(' ', '_')

  return { wikiSlug, title }
}

