import { getSupabase } from '../lib/supabaseClient'

const BATCH_TARGET = 10
const CHUNK = 24
const MAX_SCAN = 480

/** Turn PostgREST / Supabase errors into a single readable Error (for UI). */
export function normalizeWikiFactsError(err) {
  if (!err) return new Error('Unknown error')
  if (err instanceof Error && err.message && !err.code) return err
  const parts = [err.message, err.details, err.hint].filter(Boolean)
  return new Error(parts.join(' — ') || 'Request failed')
}

function normalizeFactRow(row) {
  const slug = row.wiki_slug ?? ''
  return {
    id: Number(row.id),
    fact_text: row.fact_text,
    net_score: Number(row.net_score ?? 0),
    up_count: Number(row.up_count ?? 0),
    down_count: Number(row.down_count ?? 0),
    created_at: row.created_at,
    wiki_slug: slug,
    user_id: row.user_id,
    submitter_username: row.submitter_username ?? null,
    submitter_total_read:
      row.submitter_total_read != null ? Number(row.submitter_total_read) : null,
    submitter_current_streak:
      row.submitter_current_streak != null ? Number(row.submitter_current_streak) : null,
    submitter_facts_count:
      row.submitter_facts_count != null ? Number(row.submitter_facts_count) : null,
    submitter_avatar_url: row.submitter_avatar_url ?? null,
    display_title: String(slug).replaceAll('_', ' ').trim() || slug,
    image_url:
      typeof row.articles?.image_url === 'string' && row.articles.image_url.trim()
        ? row.articles.image_url.trim()
        : null,
  }
}

function filterNotDeleted(rows) {
  return (rows ?? []).filter((r) => r.is_deleted !== true)
}

/**
 * Fill missing submitter_username / submitter_total_read from a security-definer RPC so
 * signed-out readers see the same handles as signed-in viewers (FactCard only falls back to
 * auth/profile when the viewer owns the fact).
 */
export async function enrichFactsWithPublicSubmitters(supabase, facts) {
  const ids = [
    ...new Set(
      facts
        .filter(
          (f) =>
            f.user_id &&
            !(String(f.submitter_username ?? '').trim()),
        )
        .map((f) => f.user_id),
    ),
  ]
  if (ids.length === 0) return facts

  const { data, error } = await supabase.rpc('wiki_fact_submitter_lookup', {
    p_user_ids: ids,
  })
  if (error || !data?.length) return facts

  const map = new Map(data.map((r) => [r.user_id, r]))
  return facts.map((f) => {
    if (!f.user_id || String(f.submitter_username ?? '').trim()) return f
    const p = map.get(f.user_id)
    if (!p) return f
    return {
      ...f,
      submitter_username: p.username ?? f.submitter_username,
      submitter_total_read:
        f.submitter_total_read != null ? f.submitter_total_read : p.total_read,
      submitter_current_streak:
        f.submitter_current_streak != null ? f.submitter_current_streak : (p.current_streak != null ? Number(p.current_streak) : null),
      submitter_facts_count:
        f.submitter_facts_count != null ? f.submitter_facts_count : (p.facts_count != null ? Number(p.facts_count) : null),
      submitter_avatar_url:
        f.submitter_avatar_url != null ? f.submitter_avatar_url : (p.avatar_url ?? null),
    }
  })
}

/**
 * One range query. `select('*')` avoids 400 when optional columns (e.g. submitter_*) are not migrated yet.
 */
async function fetchWikiFactsRange({
  supabase,
  orderColumn,
  offset,
  onlyActive,
}) {
  let q = supabase
    .from('wiki_facts')
    .select('*, articles(image_url)')
    .order(orderColumn, { ascending: false })
    .range(offset, offset + CHUNK - 1)

  if (onlyActive) {
    q = q.eq('is_deleted', false)
  }

  return q
}

/**
 * Try a few query shapes so partial DB setups (missing columns / filters) don’t hard-400.
 */
async function fetchWikiFactsRangeWithFallbacks({
  supabase,
  orderColumn,
  offset,
}) {
  const attempts = [
    { order: orderColumn, onlyActive: true },
    { order: orderColumn, onlyActive: false },
    { order: 'id', onlyActive: false },
  ]

  let lastError = null
  for (const a of attempts) {
    const { data, error } = await fetchWikiFactsRange({
      supabase,
      orderColumn: a.order,
      offset,
      onlyActive: a.onlyActive,
    })
    if (!error) {
      const rows = a.onlyActive ? (data ?? []) : filterNotDeleted(data)
      return { data: rows, error: null }
    }
    lastError = error
  }

  return { data: null, error: lastError }
}

/**
 * Scans ordered wiki_facts from scanFrom, collecting up to BATCH_TARGET rows
 * whose ids are not in excludeIds. Returns facts and the next scan offset.
 */
export async function fetchWikiFactsNextBatch({
  sort = 'popular',
  excludeIds,
  scanFrom = 0,
} = {}) {
  const supabase = getSupabase()
  const orderColumn = sort === 'newest' ? 'created_at' : 'net_score'
  const exclude = excludeIds instanceof Set ? excludeIds : new Set()

  const collected = []
  let offset = scanFrom
  let hitEndOfTable = false

  while (collected.length < BATCH_TARGET && offset < MAX_SCAN) {
    const { data, error } = await fetchWikiFactsRangeWithFallbacks({
      supabase,
      orderColumn,
      offset,
    })

    if (error) {
      throw normalizeWikiFactsError(error)
    }

    const rows = data ?? []
    if (rows.length === 0) {
      hitEndOfTable = true
      const tableEmpty =
        scanFrom === 0 && offset === scanFrom && collected.length === 0
      const facts = await enrichFactsWithPublicSubmitters(supabase, collected)
      return {
        facts,
        nextScanFrom: offset,
        exhausted: true,
        tableEmpty,
      }
    }

    for (const row of rows) {
      const id = Number(row.id)
      if (exclude.has(id)) continue
      collected.push(normalizeFactRow(row))
      if (collected.length >= BATCH_TARGET) break
    }

    offset += CHUNK
    if (rows.length < CHUNK) {
      hitEndOfTable = true
      break
    }
  }

  const facts = await enrichFactsWithPublicSubmitters(supabase, collected)

  return {
    facts,
    nextScanFrom: offset,
    exhausted: hitEndOfTable || offset >= MAX_SCAN,
    tableEmpty: false,
  }
}
