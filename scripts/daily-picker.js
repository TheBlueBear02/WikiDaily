/**
 * Daily picker: picks an unused wiki_slug from vital-articles.csv, fetches the
 * English Wikipedia REST summary, inserts a full daily_articles row.
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

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      'daily-picker: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local)',
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const todayStr = todayUtcYmd();

  const { data: existing, error: existErr } = await supabase
    .from('daily_articles')
    .select('date')
    .eq('date', todayStr)
    .maybeSingle();

  if (existErr) {
    console.error('daily-picker: Supabase read failed:', existErr.message);
    process.exit(1);
  }
  if (existing) {
    console.log(`daily-picker: row already exists for ${todayStr}, skipping`);
    process.exit(0);
  }

  const { data: usedRows, error: usedErr } = await supabase
    .from('daily_articles')
    .select('wiki_slug');

  if (usedErr) {
    console.error('daily-picker: Supabase list wiki_slug failed:', usedErr.message);
    process.exit(1);
  }

  const used = new Set((usedRows ?? []).map((r) => r.wiki_slug));
  const allSlugs = parseSlugsFromCsv(CSV_PATH);
  const unused = shuffle([...new Set(allSlugs)].filter((s) => !used.has(s)));

  if (unused.length === 0) {
    console.error(
      'daily-picker: every slug in vital-articles.csv is already in daily_articles; add more rows to the CSV',
    );
    process.exit(1);
  }

  let lastError;
  for (const slug of unused) {
    try {
      const json = await fetchWikipediaSummary(slug);
      const partial = rowFromSummary(json, slug);
      const row = {
        date: todayStr,
        wiki_slug: partial.wiki_slug,
        display_title: partial.display_title,
        image_url: partial.image_url,
        description: partial.description,
      };

      const { error: insErr } = await supabase.from('daily_articles').insert(row);

      if (insErr) {
        if (insErr.code === '23505') {
          console.log(`daily-picker: row for ${todayStr} was inserted concurrently, ok`);
          process.exit(0);
        }
        throw insErr;
      }

      console.log(`daily-picker: inserted ${todayStr} → ${row.wiki_slug}`);
      process.exit(0);
    } catch (e) {
      lastError = e;
      console.warn(`daily-picker: candidate "${slug}" failed:`, e.message ?? e);
    }
  }

  console.error(
    'daily-picker: could not insert after trying all unused slugs:',
    lastError?.message ?? lastError,
  );
  process.exit(1);
}

main();
