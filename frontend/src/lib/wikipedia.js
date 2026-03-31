const WP_SUMMARY_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary'
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

