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
│       ├── main.jsx                   # Vite entry + React Query provider + auth sync; also mounts AchievementUnlockRunner + AchievementToast globally
│       ├── App.jsx                    # Routes: /, /history, /auth, /wiki/:wikiSlug
│       ├── components/
│       │   ├── ArticleCard.jsx        # Presentational article card (`h-full w-full` in hero; optional `className`); Home hero puts the card in a **`flex-1 min-h-0`** slot above the community bar so it grows with the hero row (with `bodyScrollable` so title/description scroll inside the card). Full-card navigates to `cardHref`; for internal `/wiki/...` routes it stays in-app, and for external Wikipedia URLs it opens in a new tab; "Read now" uses the same target; when `cardHref` is set, uses **`cardInteractiveSurfaceClasses`** from `lib/cardSurface.js` (slate/emerald-tinted background vs white static panels, light shadow, hover lift) so it reads as clickable vs static panels; **always renders a 16:9 media header**: if `imageUrl` exists it uses `object-contain` (no crop), otherwise it shows a neutral “No image available” placeholder; the media header always includes a bottom-start “Today’s article” badge in `bg-primary` (#1E2952); title prominent; date under title; description shows first two sentences with “...” when truncated
│       │   ├── HeroAside.jsx          # Left column of the Home hero row: flex-1, **no outer border** (inner sections in `Home.jsx` keep their own borders), `overflow-hidden`, no outer padding (content manages its own); stretches to match article height (`md:items-stretch`). Home composes it as two **bordered inner panels** on a subtle tinted background with a visible **gap** between them (`gap-3`) and **no padding** on that wrapper so panels sit flush to the aside edges: **Achievements (top, `shrink-0` so full content height for 3 progress rows) + Streak leaderboard (bottom, `flex-1 min-h-0` fills remaining space)**
│       │   ├── HeroAchievementsSection.jsx # Home hero aside (top): section title **Achievements**; **tight padding (`p-2` / `md:p-2.5`) and small vertical gaps** between rows to keep the block short; 3 compact progress bars (one per achievement type: total_read/random_read/streak) toward the next unlock; each row shows the **next** achievement’s `icon` (left) and title + **`description` directly underneath** (left column), with the stats `label` on the right; signed-out users see a dashed prompt card with copy plus a **Sign in** `NavLink` (same `buildAuthUrl` + primary styling as `Navbar.jsx`)
│       │   ├── StreakLeaderboard.jsx  # Home hero aside (bottom ~75%): top **8** users by `profiles.current_streak` (via public Supabase RPC `public_streak_leaderboard`); `Home.jsx` passes `rows={8}`; header includes a compact title bar + compact countdown strip until weekly reset (UTC Sunday 23:59:59.999); while `useStreakLeaderboard` is loading, rows show pulsing skeleton placeholders (rank + bars); then fixed rows with padding for short lists; row layout: rank (left), username (middle), streak (right); each row uses light vertical padding (**`py-1.5`**) and **`h-8`** rank badges
│       │   ├── MarkAsReadButton.jsx   # (Legacy) Inserts reading_log + updates profile streaks (auth required). Current UX auto-logs reads on article open in `WikiIframe.jsx`.
│       │   ├── ReadingProgressBar.jsx # Signed-in Home **last** (after community bar + optional recent reads): `profiles.total_read` vs personal milestones from `lib/readingMilestones.js`; stars for **first…next** goal; **fill 0→nextGoal**; celebrations + optional preview (`READING_PROGRESS_PREVIEW_ENABLED`, `previewReads`) **off by default**; `prefers-reduced-motion`
│       │   ├── CollectiveReadingProgressBar.jsx # Home **hero right column** (below the daily `ArticleCard`, `shrink-0`; **non-compact** layout so block height matches **`ReadingProgressBar`** at the bottom: `px-4 py-4`, `h-12` track, etc.); optional **`compact`** prop for tighter layouts elsewhere; community total via RPC `collective_reads_count` (`useCollectiveReadingTotal`); **COLLECTIVE_READING_MILESTONES** (12 tiers: 250…100k); under-bar labels use `milestoneTrackLabel`; `bg-white` panel (not `bg-slate-50`, so it does not read like clickable `cardInteractiveSurfaceClasses` cards); optional `className` merge on the root `<section>`
│       │   ├── RandomWikiSection.jsx     # Home panel: composes `WizardImageCard.jsx` (70% quote + wizard art) + `RandomWikiPickerCard.jsx` (30% clickable picker with dice image)
│       │   │   ├── WizardImageCard.jsx  # Presentation card with a left-aligned inspirational quote (now includes a “Quote of the day” `bg-primary` tag above the quote) and a right-aligned wizard helper image; **`CARD_SURFACE_STATIC`** (flat slate border, no lift) to contrast with the adjacent random picker
│       │   │   └── RandomWikiPickerCard.jsx  # 30% clickable picker card (random page fetch + Wikipedia summary fetch + `articles` upsert as random + navigate to `/wiki/:wikiSlug`); **`cardInteractiveSurfaceClasses`** + disabled styles when loading
│       │   ├── AuthSync.jsx             # onAuthStateChange → invalidates user-scoped React Query caches (mounted in main.jsx)
│       │   ├── AchievementUnlockRunner.jsx # Headless app-root component: when profile counters change, checks thresholds and inserts `user_achievements` rows (idempotent)
│       │   ├── AchievementToast.jsx      # App-root toast queue: watches pending `user_achievements.notified=false`, shows one toast at a time, flips notified=true
│       │   ├── AchievementProgressTrack.jsx # Shared achievement progress track (matches CollectiveReadingProgressBar styling); optional `withEndStar` overlays an empty/filled milestone star on the track’s right end (`left: 100%`, centered on the bar end like Reading/Community bars; used by `HeroAchievementsSection`)
│       │   ├── AchievementsGrid.jsx      # Profile section: responsive grid showing locked/unlocked achievement cards
│       │   ├── AchievementCard.jsx       # Single card used by AchievementsGrid (locked: ???, unlocked: shows date)
│       │   ├── Navbar.jsx             # App header; logo/title links to / (no focus ring); **`WikiSearchBar`** (Wikipedia opensearch suggestions → `/wiki/:wikiSlug`); History link; signed-in user menu: **amber initials avatar** (same logic as `ProfileHeader` via `lib/profileAvatar.js`) + display name → Profile / Sign out
│       │   ├── WikiSearchBar.jsx      # Header search: debounced MediaWiki opensearch, dropdown navigation with keyboard; opens in-app reader with `state.source="search"` (auto-logged as a non-daily read when signed in)
│       │   └── StreakBadge.jsx        # Nav streak icon (`streak-icon.png`) + centered white number overlay (no “Streak:” label); borderless, zoom/cropped image (slightly shifted up with `-translate-y-1`) to reduce PNG white bg; native tooltip (`title="Streak days"`); avoids auth “flash” with loading state
│       ├── lib/
│       │   ├── cardSurface.js       # `CARD_SURFACE_STATIC` vs `cardInteractiveSurfaceClasses()`: white + neutral border vs slightly darker `bg-slate-50` (emerald tint when collected) + shadow + hover lift (`motion-safe` for translate) for clickable cards (daily `ArticleCard`, random picker, history/favorites grids; quote `WizardImageCard` stays static)
│       │   ├── supabaseClient.js      # Supabase client getter (reads VITE_* env)
│       │   ├── wikipedia.js           # fetch wrapper for WP summary + MediaWiki random page + **`fetchWikipediaOpenSearch`** (opensearch API for navbar article search)
│       │   ├── profileAvatar.js       # `initialsFromUsername` — shared by `ProfileHeader` and `Navbar` (warm amber circle avatars)
│       │   ├── readingMilestones.js   # `READING_MILESTONES` + `COLLECTIVE_READING_MILESTONES` and shared math (`computeVisibleWindow`, `fillPercentFromZero`, `starLeftPctOnTrack`, `computeSegmentProgress`)
│       │   ├── date.js                # UTC date helpers (YYYY-MM-DD); `getNextLeaderboardResetDate` / `getLeaderboardCountdownParts` for weekly reset (UTC Sunday 23:59:59.999)
│       │   ├── achievementProgress.js # `computeAchievementTypeProgress`: bar fill = current profile stat / next locked achievement threshold (matches UI labels); returns `nextLabel`, `nextDescription`, and `nextIcon` for the next locked tier (or last tier when maxed)
│       │   └── achievementChecker.js  # Pure achievement unlock logic: compares profile counters vs `achievements` thresholds
│       ├── hooks/
│       │   ├── useDailyArticle.js     # React Query: today's featured daily `articles` row; if missing, latest daily row (same card UI, no extra banner)
│       │   ├── useDailyArchive.js     # React Query: read public daily `articles` archive (History page)
│       │   ├── useReadingLog.js       # React Query: user reading_log (read_date only) for “collected” markers
│       │   ├── useReadingHistory.js   # React Query: signed-in user's `reading_log` with joined `articles` metadata (latest-first); supports optional `{ limit }` for capped lists (e.g. Home “Your recent reads”)
│       │   ├── useStreakLeaderboard.js # React Query: calls public Supabase RPC `public_streak_leaderboard(limit_count)` (default **8**; Home uses 8) to get top users by current streak
│       │   ├── useCollectiveReadingTotal.js # React Query: `collective_reads_count()` → global `reading_log` count (Home community bar)
│       │   ├── useUserProgress.js     # React Query: auth user + profiles + mark-as-read mutation; on successful new read invalidates `collectiveReadingTotal`
│       │   └── useAchievements.js     # React Query: reads `achievements` definitions + `user_achievements` rows; provides unlocked Set + pending queue + insert/markNotified mutations
│       └── pages/
│           ├── Auth.jsx
│           ├── Home.jsx                # Order: **`HomeHeroRow` first** (hero: left `HeroAside` = **Achievements** + **Streak leaderboard**; right ~70% = **`flex-1` daily `ArticleCard`** + **`CollectiveReadingProgressBar`** with default sizing to match bottom **Reading goals** bar height), then **`RandomWikiSection`**, then **Your recent reads** (signed-in only; shows latest 5 reads; renders only when the user has ≥1 read; **desktop shows all 5 cards without scrolling**, smaller screens use a horizontal scroll row), then **`ReadingProgressBar`** (reading goals; signed-in only; **last**). The daily `ArticleCard` uses `bodyScrollable` and navigates to `/wiki/:wikiSlug` with navigation state `{ source: 'daily' }` so the reader can auto-log the read when signed in. If the profile query errors, a compact retry strip replaces the personal progress bar.
│           ├── History.jsx
│           └── WikiIframe.jsx         # In-app Wikipedia viewer (`/wiki/:wikiSlug`) using an iframe + timed fallback link if embedding is blocked (uses `location.state?.displayTitle` for the iframe title). Layout is a wide iframe column plus an “Article tools” sidebar on the right that can be collapsed/expanded. **Default behavior:** the tools sidebar starts **collapsed** on article open (and re-collapses when navigating to a different `wikiSlug`) to keep the reading view focused. Above the iframe, the header row shows the article title plus controls in this order: a “Notes” / “Hide notes” toggle button (opens or closes the sidebar), the **DB-backed Favorites toggle** stored in Supabase `favorites` (RLS: per-user), then “New random article” on the far right (fetches a MediaWiki random page and navigates to its slug with `state.source="random"`). A one-time best-effort migration imports any legacy localStorage favorites from `wikidaily:favorites` into the DB after sign-in. When signed in, this page **auto-inserts a `reading_log` entry on article open** (best-effort) using `location.state.source` (daily/random/search; search is normalized to random at write time). This page does NOT render a “Mark as read” control.
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

### Wikipedia search (navbar)
```
GET https://en.wikipedia.org/w/api.php?action=opensearch&search={query}&limit=8&namespace=0&format=json&origin=*
```
Returns a JSON array: `[searchTerm, titles[], descriptions[], urls[]]`. The app uses `titles` (and optional `descriptions` in the dropdown) and navigates to `/wiki/{wikiSlug}` with spaces in the chosen title converted to underscores, matching the random-page slug convention.

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

### Personal bar (`ReadingProgressBar`)

- **Visibility**: Rendered only when the user is signed in (`userId` from `useUserProgress`). Signed-out users see no personal progress section. **Placement**: last section on Home (after community bar and optional “Your recent reads”).
- **Data**: `profiles.total_read` from the existing `useUserProgress` / `profile` query (same reconciliation with `reading_log` count as Profile).
- **Milestones** (config in `lib/readingMilestones.js` → `READING_MILESTONES`): **10, 50, 100, 200, 365, 500** with display names **Apprentice, Scholar, Master, Expert, Sage, Legend**. Same ladder / fill / star behavior as documented previously.
- **Copy**: Section **h2**: **Reading goals** (`id="reading-goals-heading"`).
- **Celebrations**: Short star twinkle when a milestone becomes unlocked **for the first time in this browser**; persistence key **`wikidaily:milestone:celebrated:{userId}:{milestoneKey}`**.
- **Preview (design / QA)**: In `ReadingProgressBar.jsx`, **disabled by default** via **`READING_PROGRESS_PREVIEW_ENABLED = false`**.
- **Accessibility**: `prefers-reduced-motion: reduce` disables the twinkle and shortens bar motion.

### Community bar (`CollectiveReadingProgressBar`)

- **Visibility**: In the **home hero** right column under the daily article card (before `RandomWikiSection`); also shown to **everyone** (signed in or out).
- **Data**: `useCollectiveReadingTotal` → Supabase RPC **`collective_reads_count()`** → **`COUNT(*)` on `reading_log`**. After a successful new read (`markAsRead` returns `{ status: 'ok' }`), `useUserProgress` invalidates the **`collectiveReadingTotal`** query so the bar refreshes.
- **Milestones** (`COLLECTIVE_READING_MILESTONES`, `lib/readingMilestones.js`): **250, 750, 1k, 2.5k, 5k, 7.5k, 10k, 17.5k, 25k, 35k, 50k, 100k** — display names **Spark, Ember, Gathering, Ripple, Momentum, Drift, Movement, Swell, Wave, Flood, Tide, Ocean**. Under-bar labels: `milestoneTrackLabel` (values under 1000 as digits; **k** form at 1000+, with one decimal when not a whole thousand, e.g. `2.5k`, `17.5k`). Right label at max tier: **“All community milestones unlocked”**.
- **UX**: Panel uses **`bg-white`** with a neutral border (same family as the personal goals bar below; avoids the slate-tinted fill used for interactive cards). If the RPC is not deployed, **isError** shows a short message and **Retry** (`refetch`).

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
