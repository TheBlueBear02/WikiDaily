const WP_SUMMARY_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary'

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

