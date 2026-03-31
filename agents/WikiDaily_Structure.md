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
│   ├── favicon uses `public/images/streak-icon.png` (streak branding)
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js             # `theme.extend.colors.primary`: DEFAULT `#1E2952`, `hover` `#151d3c` (CTAs); `theme.extend.keyframes/animation` for `wd-milestone-twinkle` (ReadingProgressBar)
│   ├── .env.example                   # Copy to .env.local (not committed)
│   └── src/
│       ├── main.jsx                   # Vite entry + React Query provider + auth sync
│       ├── App.jsx                    # Routes: /, /history, /auth, /wiki/:wikiSlug
│       ├── components/
│       │   ├── ArticleCard.jsx        # Presentational article card (`h-full w-full` in hero; optional `className`); Home places it in a ~70% column beside `HeroAside` with gap. Full-card navigates to `cardHref`; for internal `/wiki/...` routes it stays in-app, and for external Wikipedia URLs it opens in a new tab; "Read now" uses the same target; image uses contain (no crop) with a bottom-start “Today’s article” badge in `bg-primary` (#1E2952); title prominent; date under title; description shows first two sentences with “...” when truncated
│       │   ├── HeroAside.jsx          # Left column of the Home hero row: flex-1, bordered panel, `overflow-hidden`, no outer padding (content manages its own); stretches to match article height (`md:items-stretch`)
│       │   ├── StreakLeaderboard.jsx  # Hero aside: ranks users by highest `profiles.current_streak` (via public Supabase RPC); header shows countdown until weekly reset (UTC Sunday 23:59:59.999); list shows fixed number of rows and pads with blank rows if not enough users; row layout: rank (left), username (middle), streak (right)
│       │   ├── MarkAsReadButton.jsx   # Inserts reading_log + updates profile streaks (auth required)
│       │   ├── ReadingProgressBar.jsx # Signed-in Home only: `profiles.total_read` vs **10…500**; stars for **first…next** goal (previous filled); **fill 0→nextGoal**; **≥500** full ladder + 100%; `Next: {Name} ({value})` / **All milestones unlocked**; celebrations `wikidaily:milestone:celebrated:{userId}:{milestoneKey}`; optional preview (`READING_PROGRESS_PREVIEW_ENABLED`, `previewReads`) **off by default**; `prefers-reduced-motion`
│       │   ├── RandomWikiSection.jsx     # Home panel: composes `WizardImageCard.jsx` (70% quote + wizard art) + `RandomWikiPickerCard.jsx` (30% clickable picker with dice image)
│       │   │   ├── WizardImageCard.jsx  # Presentation card with a left-aligned inspirational quote (now includes a “Quote of the day” `bg-primary` tag above the quote) and a right-aligned wizard helper image
│       │   │   └── RandomWikiPickerCard.jsx  # 30% clickable picker card (random page fetch + Wikipedia summary fetch + `articles` upsert as random + navigate to `/wiki/:wikiSlug`)
│       │   ├── AuthSync.jsx             # onAuthStateChange → invalidates user-scoped React Query caches (mounted in main.jsx)
│       │   ├── Navbar.jsx             # App header; logo/title links to / (no focus ring); History link; user menu (display name → Sign out, menu panel and control are content-width)
│       │   └── StreakBadge.jsx        # Nav streak icon (`streak-icon.png`) + centered white number overlay (no “Streak:” label); borderless, zoom/cropped image (slightly shifted up with `-translate-y-1`) to reduce PNG white bg; native tooltip (`title="Streak days"`); avoids auth “flash” with loading state
│       ├── lib/
│       │   ├── supabaseClient.js      # Supabase client getter (reads VITE_* env)
│       │   ├── wikipedia.js           # fetch wrapper for WP summary + MediaWiki random page
│       │   └── date.js                # UTC date helpers (YYYY-MM-DD); `getNextLeaderboardResetDate` / `getLeaderboardCountdownParts` for weekly reset (UTC Sunday 23:59:59.999)
│       ├── hooks/
│       │   ├── useDailyArticle.js     # React Query: read today's featured daily `articles` row
│       │   ├── useDailyArchive.js     # React Query: read public daily `articles` archive (History page)
│       │   ├── useReadingLog.js       # React Query: user reading_log (read_date only) for “collected” markers
│       │   ├── useStreakLeaderboard.js # React Query: calls public Supabase RPC `public_streak_leaderboard(limit_count)` to get top users by current streak
│       │   └── useUserProgress.js     # React Query: auth user + profiles + mark-as-read mutation
│       └── pages/
│           ├── Auth.jsx
│           ├── Home.jsx                # Order: **`HomeHeroRow` first** (today’s article is primary), then **`ReadingProgressBar`** when signed in (`useUserProgress` → `profile.total_read`), then **`RandomWikiSection`**. Hero: `HeroAside` + `StreakLeaderboard` left; right ~70% is skeleton, message, or `ArticleCard` (no “Mark as read” on Home). If the profile query errors, a compact retry strip replaces the progress bar.
│           ├── History.jsx
│           └── WikiIframe.jsx         # In-app Wikipedia viewer (`/wiki/:wikiSlug`) using an iframe + timed fallback link if embedding is blocked (uses `location.state?.displayTitle` for the iframe title). Layout is a wide iframe column plus an “Article tools” sidebar on the right that can be collapsed/expanded. **Default behavior:** the tools sidebar starts **collapsed** on article open (and re-collapses when navigating to a different `wikiSlug`) to keep the reading view focused. Above the iframe, the header row shows the article title plus controls in this order: a “Notes” / “Hide notes” toggle button (opens or closes the sidebar), the **DB-backed Favorites toggle** stored in Supabase `favorites` (RLS: per-user), then “New random article” on the far right (fetches a MediaWiki random page and navigates to its slug with `state.source="random"`). A one-time best-effort migration imports any legacy localStorage favorites from `wikidaily:favorites` into the DB after sign-in. When open, the sidebar focuses on note-taking: a per-article notes textarea stored in `localStorage` (`wikidaily:notes:{wikiSlug}`); the top-row “Hide notes” toggle closes the sidebar. This page does NOT render a “Mark as read” control.
│
├── scripts/
│   ├── daily-picker.js               # Node: random unused slug → WP summary → upsert daily row into `articles`
│   ├── tweet-today.js                # Node.js: posts today's article to X/Twitter
│   └── vital-articles.csv            # Seed slugs (header: wiki_slug) for the daily picker
│
├── .env.local                        # VITE_* for frontend; SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for scripts (gitignored)
└── package.json
```

---

## Database Schema (Supabase)

Canonical column details and RLS: see [WikiDaily_Database.md](./WikiDaily_Database.md).

### Table: `articles`
| Column          | Type | Notes |
|-----------------|------|--------|
| `wiki_slug`     | text | **Primary Key** (Wikipedia page key, e.g. `Game_theory`) |
| `is_daily`      | bool | `true` for featured daily articles; `false` for random-read articles |
| `featured_date` | date | Nullable; `is_daily=true` rows use `featured_date` (unique per day) |
| `display_title` | text | Cached from Wikipedia |
| `image_url`     | text | Nullable; cached thumbnail |
| `description`   | text | Nullable; cached extract |

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

Notes:
- `current_streak` is **per-day** (only changes once per UTC day).
- `total_read` is **per successful `reading_log` insert**, so it can increment multiple times in the same day if the user reads multiple different articles.

**Implementation note (MVP)**: the app inserts into `reading_log` first. If the insert fails due to the unique constraint (`UNIQUE (user_id, wiki_slug, read_date)`), it treats the action as “already logged this article today” (no streak changes). Profile streak math is currently computed client-side (acceptable for MVP; could be made atomic later via a Postgres function/RPC).

### Auth UX (Phase 6)
- `/history` is public and rendered as a **calendar month grid**.
- The History page supports **month navigation** via the URL query param `?month=YYYY-MM` (defaults to the current UTC month). Navigating to months with no rows still renders the full calendar, showing “No article yet” for each day.
- The History page includes **Prev / Next** month controls (and Refresh), but no dedicated “Today” button; the default month remains the current UTC month.
- For the selected month, it fetches daily featured `articles` scoped to that month (`featured_date >= firstOfMonth` and `featured_date <= lastOfMonth`, with `is_daily=true`) and renders a small **day card** for each calendar day.
- Days that have an `articles` row show the article **image + title** and link to the in-app iframe viewer (`/wiki/:wikiSlug`); missing days render a default “empty day” card.
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

## Home — Reading progress (gamification)

- **Visibility**: Rendered only when the user is signed in (`userId` from `useUserProgress`). Signed-out users see no progress section (MVP).
- **Data**: `profiles.total_read` from the existing `useUserProgress` / `profile` query (same reconciliation with `reading_log` count as Profile).
- **Milestones** (config in `ReadingProgressBar.jsx` → `READING_MILESTONES`): **10, 50, 100, 200, 365, 500** with display names **Apprentice, Scholar, Master, Expert, Sage, Legend** (intermediate **200** for momentum). The bar lists **every milestone from the first through the current next goal** — **earlier tiers stay visible** as stars (filled when `total_read` ≥ that value). **Fill** runs **0 → nextGoal** (`total_read / nextGoal`). When **`total_read` ≥ 500**, **all six** milestones show, bar at 100%; right label **“All milestones unlocked”**. Goal counts sit **close** to the bar: shorter track row (`h-9`), label row `h-4` + **negative** `mt` (`-mt-2`) so numbers tuck under the stars; **fixed** layout height so it does not resize when milestone count changes.
- **Copy**: Left: total articles read (or empty-state prompt at 0). Right (until complete): **`Next: {displayName} ({value})`**.
- **Celebrations**: Short star twinkle when a milestone becomes unlocked **for the first time in this browser**; persistence key **`wikidaily:milestone:celebrated:{userId}:{milestoneKey}`** (e.g. `reads_365`). Cleanup on effect unmount writes keys so React Strict Mode does not double-celebrate.
- **Preview (design / QA)**: Implemented in `ReadingProgressBar.jsx` but **disabled by default** via **`READING_PROGRESS_PREVIEW_ENABLED = false`** (set to `true` to show the collapsible **“Preview article count”** UI and honor **`previewReads`** in the URL; otherwise the site uses real `profiles.total_read` only). When enabled: dev or **`VITE_ENABLE_PROGRESS_PREVIEW=true`** for production; celebrations are skipped while preview is active.
- **Accessibility**: `prefers-reduced-motion: reduce` disables the twinkle and shortens bar motion.

## Frontend Fallback Behavior

If there is no daily featured `articles` row for the current UTC date (e.g. the picker hasn’t run yet), the frontend falls back to showing the **most recent** daily featured row by `featured_date DESC` so the Home page never appears empty once data exists.

## Environment Variables Reference

| Variable | Where Used | How to Get It |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend (`frontend/.env.local`) | Supabase project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Frontend (`frontend/.env.local`) | Supabase project Settings → API |
| `SUPABASE_URL` | `scripts/daily-picker.js`, GitHub Actions | Same project URL as above (non-secret) |
| `SUPABASE_SERVICE_ROLE_KEY` | Scripts / GitHub Actions only | Supabase project Settings → API |
| `X_API_KEY` etc. | Tweet script | X Developer Portal |

> **Never** expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code or commit it to Git.
