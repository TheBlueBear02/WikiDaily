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
│   ├── tailwind.config.js             # `theme.extend.colors.primary`: DEFAULT `#1E2952`, `hover` `#151d3c` (CTAs)
│   ├── .env.example                   # Copy to .env.local (not committed)
│   └── src/
│       ├── main.jsx                   # Vite entry + React Query provider + auth sync
│       ├── App.jsx                    # Routes: /, /history, /auth, /wiki/:wikiSlug
│       ├── components/
│       │   ├── ArticleCard.jsx        # Presentational article card (`h-full w-full` in hero; optional `className`); Home places it in a ~70% column beside `HeroAside` with gap. Full-card navigates to `cardHref`; for internal `/wiki/...` routes it stays in-app, and for external Wikipedia URLs it opens in a new tab; "Read now" uses the same target; image uses contain (no crop) with a bottom-start “Today’s article” badge in `bg-primary` (#1E2952); title prominent; date under title; description shows first two sentences with “...” when truncated
│       │   ├── HeroAside.jsx          # Left column of the Home hero row: flex-1, bordered panel, `overflow-hidden`, no outer padding (content manages its own); stretches to match article height (`md:items-stretch`)
│       │   ├── WeeklyLeaderboard.jsx  # Hero aside: `bg-primary` bar with uppercase “LEADERBOARD” (`text-xl` / `md:text-2xl`); countdown below on `bg-slate-50` (UTC Sunday 23:59:59 reset); body lists ranks or empty state
│       │   ├── MarkAsReadButton.jsx   # Inserts reading_log + updates profile streaks (auth required)
│       │   ├── RandomWikiSection.jsx   # Home panel: picks a random page and navigates to `/wiki/:wikiSlug` (passes `location.state.displayTitle`)
│       │   ├── AuthSync.jsx           # onAuthStateChange → invalidates user-scoped React Query caches (mounted in main.jsx)
│       │   ├── Navbar.jsx             # App header; logo/title links to / (no focus ring); History link; user menu (display name → Sign out, menu panel and control are content-width)
│       │   └── StreakBadge.jsx        # Shows streak; avoids auth “flash” with loading state
│       ├── lib/
│       │   ├── supabaseClient.js      # Supabase client getter (reads VITE_* env)
│       │   ├── wikipedia.js           # fetch wrapper for WP summary + MediaWiki random page
│       │   └── date.js                # UTC date helpers (YYYY-MM-DD); `getNextLeaderboardResetDate` / `getLeaderboardCountdownParts` for weekly reset (UTC Sunday 23:59:59.999)
│       ├── hooks/
│       │   ├── useDailyArticle.js     # React Query: read today's daily_articles row
│       │   ├── useDailyArchive.js     # React Query: read public daily_articles archive (History page)
│       │   ├── useReadingLog.js       # React Query: user reading_log (read_date only) for “collected” markers
│       │   ├── useLeaderboardCountdown.js # 1s interval: remaining days/hours/minutes until leaderboard reset
│       │   └── useUserProgress.js     # React Query: auth user + profiles + mark-as-read mutation
│       └── pages/
│           ├── Auth.jsx
│           ├── Home.jsx                # Hero row (`HomeHeroRow`): `HeroAside` + `WeeklyLeaderboard` always shown on the left for loading, error, empty, and success; right column (~70%) is skeleton, message, or `ArticleCard`
│           ├── History.jsx
│           └── WikiIframe.jsx         # In-app Wikipedia viewer (`/wiki/:wikiSlug`) using an iframe + timed fallback link if embedding is blocked (uses `location.state?.displayTitle` for the iframe title)
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

### Wikipedia Random Page
```
GET https://en.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*
```
Returns: `query.random[0].title` (converted to `wikiSlug` by replacing spaces with underscores).

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

### Auth UX (Phase 6)
- `/history` is public and rendered as a **calendar month grid**.
- The History page supports **month navigation** via the URL query param `?month=YYYY-MM` (defaults to the current UTC month). Navigating to months with no rows still renders the full calendar, showing “No article yet” for each day.
- The History page includes **Prev / Next** month controls (and Refresh), but no dedicated “Today” button; the default month remains the current UTC month.
- For the selected month, it fetches `daily_articles` scoped to that month (`date >= firstOfMonth` and `date <= lastOfMonth`) and renders a small **day card** for each calendar day.
- Days that have a `daily_articles` row show the article **image + title** and link to the in-app iframe viewer (`/wiki/:wikiSlug`); missing days render a default “empty day” card.
- The calendar visually **highlights the current UTC day** *when viewing the current UTC month* (a subtle indigo ring + dot), so users can quickly orient themselves in the grid.
- If signed in, the UI marks days as **Read** by looking up the user’s `reading_log.read_date` in a `Set` for \(O(1)\) per-day lookup.
- If a signed-out user clicks “Mark as read”, the app redirects them to `/auth?returnTo=...` and navigates back after login.
- On **sign up**, the app **auto-signs the user in** before redirecting back to `returnTo`. Implementation detail: after `supabase.auth.signUp(...)`, if no session is returned (e.g. email confirmation is required), the UI does **not** redirect and instead shows a “check your email to confirm” message; otherwise it proceeds (or falls back to `signInWithPassword`) so the user lands on Home already authenticated.
- Auth state changes are handled via `AuthSync.jsx` (which subscribes to `supabase.auth.onAuthStateChange`) so the UI updates instantly after sign-in/out (no refresh). `AuthSync` is mounted once in `main.jsx`.
- `AuthSync.jsx` also updates the React Query cache for `authUser` on `SIGNED_IN` / `SIGNED_OUT` so components like `Navbar` reflect auth changes immediately without waiting for a refetch.

### Header display name
- The navbar display name prefers `profiles.username`.
- If that hasn’t loaded yet, it falls back to `authUser.user_metadata.username`.
- If neither is present, it falls back to the email local-part (before `@`), then `Account`.

### Buttons (square corners)
- Native `<button>` elements use square corners: `frontend/src/index.css` sets `border-radius: 0 !important` on `button` so Tailwind `rounded-*` utilities cannot round them.
- Link-styled controls that read as buttons (e.g. ArticleCard “Read now”, navbar History / Sign in) use `rounded-none` in their Tailwind classes.

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
