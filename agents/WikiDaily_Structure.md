# WikiDaily — Project Structure

## What This Is
A daily Wikipedia reading app. Every user sees the same article each day, can mark it as read, and builds a streak. Built on React + Supabase + Wikipedia's free REST API.

---

## Folder Structure

```
WikiDaily/
├── .github/
│   └── workflows/
│       └── daily-picker.yml          # GitHub Action: picks today's article
│
├── frontend/                          # Vite + React app (deploy this folder)
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── .env.example                   # Copy to .env.local (not committed)
│   └── src/
│       ├── main.jsx                   # Vite entry + React Query provider
│       ├── App.jsx                    # Routes: / and /history
│       ├── components/
│       │   ├── ArticleCard.jsx        # Presentational article card (reused by Home/History)
│       │   ├── MarkAsReadButton.jsx   # Inserts reading_log + updates profile streaks (auth required)
│       │   ├── Navbar.jsx             # App header + nav links + streak badge
│       │   └── StreakBadge.jsx        # Shows streak; avoids auth “flash” with loading state
│       ├── lib/
│       │   ├── supabaseClient.js      # Supabase client getter (reads VITE_* env)
│       │   ├── wikipedia.js           # fetch wrapper for WP REST API (optional; may be deferred)
│       │   └── date.js                # UTC date helpers (YYYY-MM-DD)
│       ├── hooks/
│       │   ├── useDailyArticle.js     # React Query: read today's daily_articles row
│       │   ├── useDailyArchive.js     # React Query: read public daily_articles archive (History page)
│       │   └── useUserProgress.js     # React Query: auth user + profiles + mark-as-read mutation
│       └── pages/
│           ├── Home.jsx
│           └── History.jsx
│
├── scripts/
│   ├── daily-picker.js               # Node: random unused slug → WP summary → full daily_articles row
│   ├── tweet-today.js                # Node.js: posts today's article to X/Twitter
│   └── vital-articles.csv            # Seed slugs (header: wiki_slug) for the daily picker
│
├── .env.local                        # VITE_* for frontend; SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for scripts (gitignored)
└── package.json
```

---

## Database Schema (Supabase)

Canonical column details and RLS: see [WikiDaily_Database.md](./WikiDaily_Database.md).

### Table: `daily_articles`
| Column          | Type | Notes |
|-----------------|------|--------|
| `date`          | date | **Primary Key** (UTC calendar day) |
| `wiki_slug`     | text | Wikipedia page key, e.g. `Game_theory` |
| `display_title` | text | Human-readable title (cached from Wikipedia) |
| `image_url`     | text | Nullable; thumbnail from Wikipedia API |
| `description`   | text | Nullable; extract from Wikipedia API |

### Table: `user_progress` *(or `profiles` / `reading_log` — see WikiDaily_Database.md)*

> Enable **Row Level Security (RLS)** on user-specific tables so users can only read/write their own data.

---

## Key Logic

### Wikipedia Fetch
```
GET https://en.wikipedia.org/api/rest_v1/page/summary/{wiki_slug}
```
Returns: `displaytitle`, `extract`, `originalimage.source`, `content_urls.desktop.page`

### Mark as Read (streak logic)
```
today = current date (UTC)

if last_read == today        → do nothing (already counted)
if last_read == yesterday    → streak = streak + 1
else                         → streak = 1

last_read = today
history   = [...history, wiki_title]
```

**Implementation note (MVP)**: the app inserts into `reading_log` first. If the insert fails due to the unique constraint (`UNIQUE (user_id, read_date)`), it treats the action as “already read today” (no streak changes). Profile streak math is currently computed client-side (acceptable for MVP; could be made atomic later via a Postgres function/RPC).

---

## Frontend Fallback Behavior

If there is no `daily_articles` row for the current UTC date (e.g. the picker hasn’t run yet), the frontend falls back to showing the **most recent** row in `daily_articles` by `date DESC` so the Home page never appears empty once data exists.

## Environment Variables Reference

| Variable | Where Used | How to Get It |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend (`frontend/.env.local`) | Supabase project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Frontend (`frontend/.env.local`) | Supabase project Settings → API |
| `SUPABASE_URL` | `scripts/daily-picker.js`, GitHub Actions | Same project URL as above (non-secret) |
| `SUPABASE_SERVICE_ROLE_KEY` | Scripts / GitHub Actions only | Supabase project Settings → API |
| `X_API_KEY` etc. | Tweet script | X Developer Portal |

> **Never** expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code or commit it to Git.
