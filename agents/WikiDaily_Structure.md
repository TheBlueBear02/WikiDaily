# WikiDaily — Project Structure

## What This Is
A daily Wikipedia reading app. Every user sees the same article each day, can mark it as read, and builds a streak. Built on React + Supabase + Wikipedia's free REST API.

---

## Folder Structure

```
wikidaily/
├── .github/
│   └── workflows/
│       └── daily-picker.yml          # GitHub Action: picks today's article
│
├── scripts/
│   ├── daily-picker.js               # Node: random unused slug → WP summary → full daily_articles row
│   ├── tweet-today.js                # Node.js: posts today's article to X/Twitter
│   └── vital-articles.csv            # Seed slugs (header: wiki_slug) for the daily picker
│
├── src/
│   ├── main.jsx                      # Vite entry point
│   ├── App.jsx                       # Router setup (/ and /history)
│   │
│   ├── lib/
│   │   ├── supabaseClient.js         # Supabase client init (uses env vars)
│   │   └── wikipedia.js              # fetch wrapper for WP REST API
│   │
│   ├── hooks/
│   │   ├── useDailyArticle.js        # React Query: fetches today's row from Supabase
│   │   ├── useWikiSummary.js         # React Query: fetches WP summary by title
│   │   └── useUserProgress.js        # React Query: reads/writes user_progress table
│   │
│   ├── components/
│   │   ├── ArticleCard.jsx           # Thumbnail + title + extract + CTA button
│   │   ├── StreakBadge.jsx           # Shows current streak count
│   │   ├── MarkAsReadButton.jsx      # Handles the read logic + Supabase update
│   │   └── Navbar.jsx                # Links to / and /history
│   │
│   └── pages/
│       ├── Home.jsx                  # Loads today's article, shows ArticleCard
│       └── History.jsx               # Lists user's history[] from user_progress
│
├── .env.local                        # VITE_* for frontend; SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for scripts (gitignored)
├── vite.config.js
├── tailwind.config.js
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
GET https://en.wikipedia.org/api/rest_v1/page/summary/{wiki_title}
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

---

## Environment Variables Reference

| Variable | Where Used | How to Get It |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | Supabase project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase project Settings → API |
| `SUPABASE_URL` | `scripts/daily-picker.js`, GitHub Actions | Same project URL as above (non-secret) |
| `SUPABASE_SERVICE_ROLE_KEY` | Scripts / GitHub Actions only | Supabase project Settings → API |
| `X_API_KEY` etc. | Tweet script | X Developer Portal |

> **Never** expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code or commit it to Git.
