/**
 * Daily picker: picks an unused wiki_slug from vital-articles.csv, fetches the
 * English Wikipedia REST summary, upserts a full daily row into `articles`.
 * CSV format: first row is header `wiki_slug`; each following row is one slug (underscores).
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(process.cwd(), '.env.local') });
dotenv.config({ path: join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CSV_PATH = join(__dirname, 'vital-articles.csv');
const WP_SUMMARY = (slug) =>
  `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;

const UA = 'WikiDailyBot/1.0 (daily picker; open-source)';

/** Decode `role` from a Supabase JWT without verifying the signature (debug / guardrail only). */
function jwtRole(key) {
  if (!key || typeof key !== 'string') return null;
  const parts = key.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

function todayUtcYmd() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseSlugsFromCsv(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].toLowerCase();
  const start = header === 'wiki_slug' || header.startsWith('wiki_slug') ? 1 : 0;
  const slugs = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#')) continue;
    const slug = line.split(',')[0]?.trim();
    if (slug) slugs.push(slug);
  }
  return slugs;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toWikiSlugFromTitle(title) {
  return String(title).replace(/ /g, '_');
}

async function fetchWikipediaSummary(slug) {
  const res = await fetch(WP_SUMMARY(slug), {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function stripHtml(s) {
  return String(s).replace(/<[^>]*>/g, '').trim();
}

function rowFromSummary(json, fallbackSlug) {
  const normalized = json.titles?.normalized || json.title || fallbackSlug;
  const wiki_slug = toWikiSlugFromTitle(normalized);
  const display_title =
    json.title?.trim() ||
    stripHtml(json.displaytitle || '') ||
    wiki_slug.replace(/_/g, ' ');
  return {
    wiki_slug,
    display_title,
    image_url: json.originalimage?.source ?? null,
    description: json.extract ?? null,
  };
}

/**
 * Picks two slugs from vital-articles.csv (excluding the daily article slug) and
 * inserts a game_challenges row for today. Idempotent — safe to call on re-runs.
 */
async function pickGameChallenge(supabase, todayStr, dailySlug, allSlugs) {
  // Idempotency check
  const { data: existing, error: existErr } = await supabase
    .from('game_challenges')
    .select('id')
    .eq('type', 'daily')
    .eq('date', todayStr)
    .maybeSingle();

  if (existErr) {
    console.warn('daily-picker: game challenge check failed:', existErr.message);
    return;
  }
  if (existing) {
    console.log(`daily-picker: game challenge already exists for ${todayStr}, skipping`);
    return;
  }

  // Pick 2 candidates that differ from the daily article
  const candidates = shuffle([...new Set(allSlugs)].filter((s) => s !== dailySlug));
  const picked = [];

  for (const slug of candidates) {
    if (picked.length >= 2) break;
    try {
      const json = await fetchWikipediaSummary(slug);
      const partial = rowFromSummary(json, slug);
      // Upsert into articles without overwriting existing daily metadata
      const { error: upsertErr } = await supabase.from('articles').upsert(
        {
          wiki_slug: partial.wiki_slug,
          display_title: partial.display_title,
          image_url: partial.image_url,
          description: partial.description,
        },
        { onConflict: 'wiki_slug', ignoreDuplicates: true },
      );
      if (upsertErr) {
        console.warn(`daily-picker: game article upsert failed for "${slug}":`, upsertErr.message);
        continue;
      }
      picked.push(partial.wiki_slug);
    } catch (e) {
      console.warn(`daily-picker: game candidate "${slug}" failed:`, e.message ?? e);
    }
  }

  if (picked.length < 2) {
    console.error('daily-picker: could not pick 2 game challenge slugs');
    return;
  }

  const [start_slug, target_slug] = picked;
  const { error: insertErr } = await supabase.from('game_challenges').insert({
    type: 'daily',
    date: todayStr,
    start_slug,
    target_slug,
  });

  if (insertErr) {
    if (insertErr.code === '23505') {
      console.log('daily-picker: game challenge concurrent insert conflict, ok');
      return;
    }
    console.error('daily-picker: game challenge insert failed:', insertErr.message);
    return;
  }

  console.log(`daily-picker: game challenge ${todayStr}: ${start_slug} → ${target_slug}`);
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      'daily-picker: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local)',
    );
    process.exitCode = 1;
    return;
  }

  const keyRole = jwtRole(SUPABASE_SERVICE_ROLE_KEY);
  if (keyRole && keyRole !== 'service_role') {
    console.error(
      'daily-picker: SUPABASE_SERVICE_ROLE_KEY must be the service_role key (Dashboard → Project Settings → API → service_role secret).',
    );
    console.error(
      `daily-picker: This JWT has role "${keyRole}" — inserts will hit RLS if you pasted the anon key by mistake.`,
    );
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const todayStr = todayUtcYmd();

  const { data: existing, error: existErr } = await supabase
    .from('articles')
    .select('wiki_slug')
    .eq('featured_date', todayStr)
    .eq('is_daily', true)
    .maybeSingle();

  if (existErr) {
    console.error('daily-picker: Supabase read failed:', existErr.message);
    process.exitCode = 1;
    return;
  }
  // Parse CSV early so allSlugs is available in all branches (including early returns).
  const allSlugs = parseSlugsFromCsv(CSV_PATH);

  if (existing) {
    console.log(`daily-picker: daily article already exists for ${todayStr}, skipping`);
    await pickGameChallenge(supabase, todayStr, existing.wiki_slug, allSlugs);
    return;
  }

  const { data: usedRows, error: usedErr } = await supabase
    .from('articles')
    .select('wiki_slug')
    .eq('is_daily', true);

  if (usedErr) {
    console.error('daily-picker: Supabase list wiki_slug failed:', usedErr.message);
    process.exitCode = 1;
    return;
  }

  const used = new Set((usedRows ?? []).map((r) => r.wiki_slug));
  const unused = shuffle([...new Set(allSlugs)].filter((s) => !used.has(s)));

  if (unused.length === 0) {
    console.error(
      'daily-picker: every slug in vital-articles.csv is already used as a daily article; add more rows to the CSV',
    );
    process.exitCode = 1;
    return;
  }

  let lastError;
  for (const slug of unused) {
    try {
      const json = await fetchWikipediaSummary(slug);
      const partial = rowFromSummary(json, slug);
      const row = {
        wiki_slug: partial.wiki_slug,
        display_title: partial.display_title,
        image_url: partial.image_url,
        description: partial.description,
        // Promote to the featured daily article for today.
        is_daily: true,
        featured_date: todayStr,
      };

      const { error: insErr } = await supabase
        .from('articles')
        .upsert(
          row,
          {
            // `wiki_slug` is the PK, but we still set it as onConflict for clarity.
            onConflict: 'wiki_slug',
            ignoreDuplicates: false,
          },
        );

      if (insErr) {
        if (insErr.code === '23505') {
          console.log(
            `daily-picker: daily featured_date conflict for ${todayStr} (concurrent run), ok`,
          );
          return;
        }
        throw insErr;
      }

      console.log(`daily-picker: upserted daily ${todayStr} → ${row.wiki_slug}`);
      await pickGameChallenge(supabase, todayStr, row.wiki_slug, allSlugs);
      return;
    } catch (e) {
      lastError = e;
      console.warn(`daily-picker: candidate "${slug}" failed:`, e.message ?? e);
    }
  }

  console.error(
    'daily-picker: could not insert after trying all unused slugs:',
    lastError?.message ?? lastError,
  );
  process.exitCode = 1;
  return;
}

main();
