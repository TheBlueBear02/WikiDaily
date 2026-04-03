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
│   ├── `index.html` icons: `site-logo-noBG.png` — `rel="icon"` with `sizes` 192×192 + 32×32 + unsized fallback; `rel="apple-touch-icon"` 180×180 (home screen / larger surfaces; tab bar size is still OS-controlled)
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js             # `theme.extend.colors.primary`: DEFAULT `#1E2952`, `hover` `#151d3c` (CTAs); `theme.extend.keyframes/animation` for `wd-milestone-twinkle` (ReadingProgressBar)
│   ├── .env.example                   # Copy to .env.local (not committed)
│   └── src/
│       ├── main.jsx                   # Vite entry + React Query provider + auth sync; mounts `components/app/AuthSync`, `AchievementUnlockRunner`, `AchievementToast`
│       ├── App.jsx                    # Routes: /, /history, /game, /auth, /profile, /wiki/:wikiSlug
│       ├── components/
│       │   ├── home/                  # Home route (`/`) — sections used only on Home (or only by Home subtree)
│       │   │   ├── ArticleCard.jsx        # Presentational article card (`h-full w-full` in hero; optional `className`); optional **`actionsLeft`** node rendered **to the left of “Read now”** (bottom row); optional **`actions`** rendered beside the primary CTA. Home hero puts the card in a **`flex-1 min-h-0`** slot above the community bar so it grows with the hero row (with `bodyScrollable` so title/description scroll inside the card). Full-card navigates to `cardHref`; for internal `/wiki/...` routes it stays in-app, and for external Wikipedia URLs it opens in a new tab; "Read now" uses the same target; when `cardHref` is set, uses **`cardInteractiveSurfaceClasses`** from `lib/cardSurface.js` (slate/emerald-tinted background vs white static panels, light shadow, hover lift) so it reads as clickable vs static panels; **always renders a fixed-height media header (`h-[30vh]`)**: if `imageUrl` exists it uses `object-cover` (fills the fixed frame; crops as needed), otherwise it shows a neutral “No image available” placeholder; the media header always includes a bottom-start “Today’s article” badge in `bg-primary` (#1E2952); title prominent; date under title; description shows first two sentences with “...” when truncated; when `showDailyResetCountdown` is true, the countdown renders on the **same bottom row** as the actions (**buttons left**, timer **right**, aligned to the bottom)
│       │   │   ├── HeroAside.jsx          # Left column of the Home hero row: flex-1, **no outer border** (inner sections in `Home.jsx` keep their own borders), `overflow-hidden`, no outer padding (content manages its own); stretches to match article height (`md:items-stretch`). Home composes it as two **bordered inner panels** on a subtle tinted background with a visible **gap** between them (`gap-3`) and **no padding** on that wrapper so panels sit flush to the aside edges: **Achievements (top, `shrink-0` so full content height for 3 progress rows) + Streak leaderboard (bottom, `flex-1 min-h-0` fills remaining space)**
│       │   │   ├── HeroAchievementsSection.jsx # Home hero aside (top): section title **Achievements**; **tight padding (`p-2` / `md:p-2.5`) and small vertical gaps** between rows to keep the block short; 3 compact progress bars (one per achievement type: total_read/random_read/streak) toward the next unlock; each row shows the **next** achievement’s `icon` (left) and title + **`description` directly underneath** (left column), with the stats `label` on the right; signed-out users see a dashed prompt card with copy plus a **Sign in** `NavLink` (same `buildAuthUrl` + primary styling as `Navbar.jsx`)
│       │   │   ├── StreakLeaderboard.jsx  # Home hero aside (bottom ~75%): top **8** users by `profiles.current_streak` (via public Supabase RPC `public_streak_leaderboard`, includes `total_read` for level); `Home.jsx` passes `rows={8}`; header includes a compact title bar + compact countdown strip until weekly reset (UTC Sunday 23:59:59.999); while `useStreakLeaderboard` is loading, rows show pulsing skeleton placeholders (rank + bars); then fixed rows with padding for short lists; row layout: rank (left), username + **reader level** line (`Level n · name` from `lib/levels.js`) (middle), streak (right); each row uses light vertical padding (**`py-1.5`**) and **`h-8`** rank badges; row hover tooltip card uses **square corners** (`rounded-none`, no border-radius)
│       │   │   ├── ReadingProgressBar.jsx # Signed-in Home (after community bar + optional recent reads; before optional Interesting articles): `profiles.total_read` vs personal milestones from `lib/readingMilestones.js`; stars for **first…next** goal; **fill 0→nextGoal**; celebrations + optional preview (`READING_PROGRESS_PREVIEW_ENABLED`, `previewReads`) **off by default**; `prefers-reduced-motion`
│       │   │   ├── CollectiveReadingProgressBar.jsx # Home **hero right column** (below the daily `ArticleCard`, `shrink-0`; **non-compact** layout so block height matches **`ReadingProgressBar`** at the bottom: `px-4 py-4`, `h-12` track, etc.); optional **`compact`** prop for tighter layouts elsewhere; community total via RPC `collective_reads_count` (`useCollectiveReadingTotal`); **COLLECTIVE_READING_MILESTONES** (12 tiers: 250…100k); under-bar labels use `milestoneTrackLabel`; `bg-white` panel (not `bg-slate-50`, so it does not read like clickable `cardInteractiveSurfaceClasses` cards); optional `className` merge on the root `<section>`
│       │   │   ├── RandomWikiSection.jsx     # Home panel: composes `WizardImageCard.jsx` (70% quote + wizard art) + `RandomWikiPickerCard.jsx` (30% clickable picker with `random-cube-noBG.png`)
│       │   │   │   ├── WizardImageCard.jsx  # Presentation card with a left-aligned inspirational quote (now includes a “Quote of the day” `bg-primary` tag above the quote) and a right-aligned wizard helper image; **`CARD_SURFACE_STATIC`** (flat slate border, no lift) to contrast with the adjacent random picker
│       │   │   │   └── RandomWikiPickerCard.jsx  # 30% clickable picker card; calls **`lib/navigateToRandomWikiArticle`** (random page + best-effort `articles` upsert + navigate to `/wiki/:wikiSlug` with `source: 'random'`); **`cardInteractiveSurfaceClasses`** + disabled styles when loading
│       │   │   ├── CraziestFactsSection.jsx # Home **Craziest Facts** (after `RandomWikiSection`): single visible `FactCard`, sort toggle (**Most Popular** / **Newest**), queue + prefetch (`fetchWikiFactsNextBatch`), excludes voted fact ids (`useFactVotes`) and session-seen ids; empty-table and end-of-queue CTAs **Read an article** both use **`navigateToRandomWikiArticle`** (same as random picker); integrates `useVoteFact` / `useSoftDeleteMyFact`
│       │   │   ├── FactCard.jsx              # Fact presentation: article `NavLink`, excerpt, submitter snapshot columns + `lib/levels` + `lib/profileAvatar`; for **own** facts, falls back to `profile` / auth metadata / email (same idea as `ProfileHeader`) when snapshots are empty; **Anonymous** when `user_id` missing or no resolvable name; three actions (Wow / Ok… / Knew), net score line with 300ms fade, 3D Y-flip + parchment back (`WikiDaily` wordmark) or **`prefers-reduced-motion`** opacity transition; **Remove my fact** → soft delete when viewer is submitter
│       │   │   ├── FactSubmitModal.jsx       # Modal to confirm inserting into `wiki_facts` (read-only text, length hint); opened from `WikiIframe.jsx` after text selection; on success, `submitSucceeded` keeps the dialog open with an in-modal confirmation + **Close** (no auto-close)
│       │   │   ├── AchievementProgressTrack.jsx # Achievement progress track (matches CollectiveReadingProgressBar styling); optional `withEndStar` overlays an empty/filled milestone star on the track’s right end (`left: 100%`, centered on the bar end like Reading/Community bars; used by `HeroAchievementsSection`)
│       │   │   ├── LatestReadsSection.jsx # Home “Your recent reads” (signed-in); imports **`../shared/ArticleHistoryCard`**
│       │   │   ├── InterestingArticlesSection.jsx # Home “Interesting articles” (signed-in); imports **`../shared/FavoriteArticleCard`**
│       │   │   └── WeeklyLeaderboard.jsx  # Not wired in the app today (reserved / experimental)
│       │   ├── profile/               # Profile route (`/profile`)
│       │   │   ├── ProfileHeader.jsx      # Profile hero: avatar, handle, reader level, stats strip
│       │   │   ├── StatsRow.jsx           # Three-up stat cards (current streak, max streak, total read)
│       │   │   ├── StatCard.jsx           # Single stat tile (used by `StatsRow`)
│       │   │   ├── ActivityHeatmap.jsx    # Contribution-style calendar for read days
│       │   │   ├── FavoritesGrid.jsx      # Paginated favorites grid; imports **`../shared/FavoriteArticleCard`**
│       │   │   ├── ReadingHistoryGrid.jsx # Paginated reading history; imports **`../shared/ArticleHistoryCard`**
│       │   │   ├── AchievementsGrid.jsx   # Responsive grid of locked/unlocked achievement cards
│       │   │   ├── AchievementCard.jsx    # Single achievement tile (used by `AchievementsGrid`)
│       │   │   ├── NotesGrid.jsx          # Paginated notes list
│       │   │   └── NoteCard.jsx           # Single note row/card (used by `NotesGrid`)
│       │   ├── shared/                # Presentation cards used on both Home and Profile
│       │   │   ├── FavoriteArticleCard.jsx # Interesting articles / Profile favorites: title uses same sans treatment as daily `ArticleCard` (`text-base font-semibold leading-tight tracking-tight text-primary`, 2-line clamp); meta line `text-xs text-slate-500`
│       │   │   ├── ArticleHistoryCard.jsx # Recent reads + Profile reading history: same title/meta typography as `FavoriteArticleCard`; source badge on image
│       │   │   └── MarkAsReadButton.jsx   # (Legacy) Inserts reading_log + updates profile streaks (auth required). Current UX auto-logs reads on article open in `WikiIframe.jsx`.
│       │   ├── layout/                # App chrome (not tied to one route)
│       │   │   ├── Navbar.jsx             # App header (**`sticky top-0 z-50 bg-white`** so the bar stays visible while scrolling); brand **`site-logo-noBG.png`** (`h-10 w-10 object-contain`) + **WikiDaily** title and **Knowledge is Power** subtitle, links to / (no focus ring); **`WikiSearchBar`** (Wikipedia opensearch suggestions → `/wiki/:wikiSlug`); History + **Game** (`/game`) links; signed-in user menu: **amber initials avatar** (same logic as `ProfileHeader` via `lib/profileAvatar.js`) + display name with **reader level** line under it (`Level n · name` from `lib/levels.js` + `profile.total_read`) → Profile / Sign out; while signed in and **`profile` is still null** (and profile query is not in error), the level line shows a **pulse skeleton** — do **not** use `profileQuery.isPending` alone (disabled queries stay `pending` without fetching)
│       │   │   ├── WikiSearchBar.jsx      # Header search: debounced MediaWiki opensearch, dropdown navigation with keyboard; opens in-app reader with `state.source="search"` (`reading_log.source = 'search'` when signed in)
│       │   │   └── StreakBadge.jsx        # Nav streak icon (`streak-icon-noBG.png`) + centered white number overlay (no “Streak:” label); borderless, zoom/cropped image (slightly shifted up with `-translate-y-1`); native tooltip (`title="Streak days"`); auth loading: “Loading…” pill; signed-in: round **pulse skeleton** until **`profile`** exists (not `profileQuery.isPending` alone — same reason as Navbar)
│       │   └── app/                   # Mounted once from `main.jsx` (global side-effects / toasts)
│       │       ├── AuthSync.jsx             # onAuthStateChange → syncs `authUser` cache; **sign-out** removes `profile`/`readingLog` queries; **INITIAL_SESSION** / **SIGNED_IN** invalidate profile + reading history — **not** on **TOKEN_REFRESHED** (JWT refresh must not wipe profile cache)
│       │       ├── AchievementUnlockRunner.jsx # Headless: when profile counters change, checks thresholds and inserts `user_achievements` rows (idempotent)
│       │       └── AchievementToast.jsx      # Toast queue: watches pending `user_achievements.notified=false`, shows one toast at a time, flips notified=true
│       ├── lib/
│       │   ├── cardSurface.js       # `CARD_SURFACE_STATIC` vs `cardInteractiveSurfaceClasses()`: white + neutral border vs slightly darker `bg-slate-50` (emerald tint when collected) + shadow + hover lift (`motion-safe` for translate) for clickable cards (daily `ArticleCard`, random picker, history/favorites grids; quote `WizardImageCard` stays static)
│       │   ├── supabaseClient.js      # Supabase client getter (reads VITE_* env)
│       │   ├── wikipedia.js           # fetch wrapper for WP summary + MediaWiki random page + **`fetchWikipediaOpenSearch`** (opensearch API for navbar article search)
│       │   ├── profileAvatar.js       # `initialsFromUsername` — shared by `ProfileHeader` and `Navbar` (warm amber circle avatars)
│       │   ├── levels.js              # `LEVELS` (0–10 thresholds + names), `getCurrentLevel` / `getNextLevel` from `profiles.total_read` — Profile header reader level; config-only, no DB
│       │   ├── readingMilestones.js   # `READING_MILESTONES` + `COLLECTIVE_READING_MILESTONES` and shared math (`computeVisibleWindow`, `fillPercentFromZero`, `starLeftPctOnTrack`, `computeSegmentProgress`)
│       │   ├── date.js                # UTC date helpers (YYYY-MM-DD); `getNextLeaderboardResetDate` / `getLeaderboardCountdownParts` for weekly reset (UTC Sunday 23:59:59.999); `getNextDailyResetDate` / `getDailyCountdownParts` for daily reset (next UTC midnight)
│       │   ├── achievementProgress.js # `computeAchievementTypeProgress`: bar fill = current profile stat / next locked achievement threshold (matches UI labels); returns `nextLabel`, `nextDescription`, and `nextIcon` for the next locked tier (or last tier when maxed)
│       │   └── achievementChecker.js  # Pure achievement unlock logic: compares profile counters vs `achievements` thresholds
│       ├── hooks/
│       │   ├── useDailyArticle.js     # React Query: today's featured daily `articles` row; if missing, latest daily row (same card UI, no extra banner)
│       │   ├── useDailyArchive.js     # React Query: read public daily `articles` archive (History page)
│       │   ├── useReadingLog.js       # React Query: user reading_log (read_date only) for “collected” markers
│       │   ├── useReadingHistory.js   # React Query: signed-in user's `reading_log` with joined `articles` metadata (latest-first); supports optional `{ limit }` for capped lists (e.g. Home “Your recent reads”)
│       │   ├── useFavorites.js        # React Query: signed-in user's `favorites` with joined `articles` metadata (latest `created_at` first); supports optional `{ limit }` for capped lists (e.g. Home “Interesting articles” uses `limit: 5`); Profile omits `limit` for the full grid
│       │   ├── useStreakLeaderboard.js # React Query: calls public Supabase RPC `public_streak_leaderboard(limit_count)` (default **8**; Home uses 8) to get top users by current streak + `total_read` for level display
│       │   ├── useCollectiveReadingTotal.js # React Query: `collective_reads_count()` → global `reading_log` count (Home community bar)
│       │   ├── useUserProgress.js     # React Query: auth user + profiles (`staleTime` ~60s) + mark-as-read mutation; profile **queryFn** returns after `profiles` SELECT; **`total_read` vs `reading_log` count** reconciliation runs **in the background** and patches cache via `setQueryData`; on successful new read invalidates `collectiveReadingTotal`
│       │   ├── useAchievements.js     # React Query: reads `achievements` definitions + `user_achievements` rows; provides unlocked Set + pending queue + insert/markNotified mutations
│       │   ├── useWikiFacts.js        # `fetchWikiFactsNextBatch`: `select('*')` + ordered by `net_score` or `created_at`; retries without `is_deleted=eq.false` (filters deleted rows in JS) and finally orders by `id` if needed for partial migrations; `display_title` from `wiki_slug`; filters excluded ids client-side; `normalizeWikiFactsError` for readable errors
│       │   ├── useFactVotes.js        # React Query: signed-in user’s `fact_votes` fact ids (sorted array) for Home queue exclusion
│       │   ├── useVoteFact.js         # React Query mutation: upsert `fact_votes` (`up`/`down`); invalidates `factVotes`
│       │   ├── useSubmitFact.js       # React Query mutation: insert `wiki_facts` (profile upsert avoids null `username` overwrite; prefers `profile.username` then auth metadata); used from wiki reader modal
│       │   └── useSoftDeleteMyFact.js # React Query mutation: `wiki_facts.is_deleted = true` for own row (RLS-scoped)
│       └── pages/
│           ├── Auth.jsx
│           ├── Game.jsx                # Wikipedia navigation game route (`/game`): **same hero row layout as Home** (`HeroAside` left column + ~70% right column, `md:items-stretch`, inner `gap-3` on slate-tinted wrapper); **placeholder bordered panels** only until game UI is built — product + phase details: [WikiDaily_Game.md](./WikiDaily_Game.md)
│           ├── Home.jsx                # Order: **`HomeHeroRow` first** (hero: left `HeroAside` = **Achievements** + **Streak leaderboard**; right ~70% = **`flex-1` daily `ArticleCard`** + **`CollectiveReadingProgressBar`** with default sizing to match bottom **Reading goals** bar height), then **`RandomWikiSection`**, then **`CraziestFactsSection`**, then **Your recent reads** (signed-in only; `LatestReadsSection`; latest 5; hidden if empty; **desktop: 5-column grid**, smaller screens: horizontal scroll), then **`ReadingProgressBar`** (reading goals; signed-in only), then **Interesting articles** (signed-in only; `InterestingArticlesSection` + `useFavorites({ limit: 5 })`; `FavoriteArticleCard` grid; hidden if empty; same layout as recent reads; **View all** → `/profile`; **last**). The daily `ArticleCard` uses `bodyScrollable`, passes the **Previous articles** link to `/history` via **`actionsLeft`** (so it sits to the **left of “Read now”**), pins the bottom-row actions + countdown to the bottom of the card body, shows a compact **UTC midnight countdown** (plain text: “New daily article in: HH:MM:SS”), and navigates to `/wiki/:wikiSlug` with navigation state `{ source: 'daily' }` so the reader can auto-log the read when signed in. If the profile query errors, a compact retry strip replaces the personal progress bar.
│           ├── History.jsx
│           ├── Profile.jsx            # Profile: header, stats, heatmap, favorites/history/achievements/notes (`components/profile/*` + shared cards)
│           └── WikiIframe.jsx         # In-app Wikipedia reader (`/wiki/:wikiSlug`) loads **Parsoid HTML** from `https://en.wikipedia.org/api/rest_v1/page/html/{wikiSlug}` (CORS), sanitizes it (drops `<script>` / nested `<iframe>`), injects **`WIKI_READER_APPEARANCE`** overrides from `wikipedia.js` (font family/size/line-height; optional `contentMaxWidth` for a narrow column), and renders it in a same-origin **`iframe[srcDoc]`** so in-article **wiki links** can be intercepted: clicks on `en.wikipedia.org/wiki/...` (or Parsoid-relative `./Title` links) **`navigate()` to `/wiki/:wikiSlug`** with `state.source="link"` (distinct from daily/random/search), which re-triggers the existing **auto `reading_log` insert** for the new slug. If HTML fetch fails, a fallback offers “Open in Wikipedia (new tab)”. Layout is a wide iframe column plus an “Article tools” sidebar on the right that can be collapsed/expanded. **Default behavior:** the tools sidebar starts **collapsed** on article open (and re-collapses when navigating to a different `wikiSlug`) to keep the reading view focused. Above the iframe, the header row shows the article title plus controls in this order: a “Notes” / “Hide notes” toggle button (opens or closes the sidebar), the **DB-backed Interesting toggle** (UI label; data in Supabase `favorites`) (RLS: per-user), then “New random article” on the far right (fetches a MediaWiki random page and navigates to its slug with `state.source="random"`). A one-time best-effort migration imports any legacy localStorage favorites from `wikidaily:favorites` into the DB after sign-in. When signed in, this page **auto-inserts a `reading_log` entry on article open** (best-effort) using `location.state.source` (daily/random/link/search). This page does NOT render a “Mark as read” control. **Craziest Facts submission:** listeners on **`iframe.contentDocument`** (`selectionchange`, `mouseup`, `touchend` for mobile) debounce-read the selection; lengths 10–500 show a fixed **“Submit as Crazy Fact”** button positioned with `getBoundingClientRect()` + iframe offset; **`userId` is read from a ref** so listeners registered at iframe load still work after auth resolves. **`FactSubmitModal`** + **`useSubmitFact`** insert into `wiki_facts` (article row is already best-effort upserted for FKs). Parent `document` selection APIs alone are insufficient because the article body lives inside the iframe document.
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
- Days that have an `articles` row show the article **image + title** and link to the in-app iframe viewer (`/wiki/:wikiSlug`); missing days render a default “empty day” card. Article titles use the same sans treatment as the daily card, scaled for narrow cells (`text-sm font-semibold leading-tight tracking-tight text-primary`, 2-line clamp); the featured date line is `text-xs text-slate-500`.
- The calendar visually **highlights the current UTC day** *when viewing the current UTC month* (a subtle indigo ring + dot), so users can quickly orient themselves in the grid.
- If signed in, the UI marks days as **Read** by looking up the user’s `reading_log.read_date` in a `Set` for \(O(1)\) per-day lookup.
- If a signed-out user clicks “Mark as read”, the app redirects them to `/auth?returnTo=...` and navigates back after login.
- On **sign up**, the app **auto-signs the user in** before redirecting back to `returnTo`. Implementation detail: after `supabase.auth.signUp(...)`, if no session is returned (e.g. email confirmation is required), the UI does **not** redirect and instead shows a “check your email to confirm” message; otherwise it proceeds (or falls back to `signInWithPassword`) so the user lands on Home already authenticated.
- Auth state changes are handled via `components/app/AuthSync.jsx` (which subscribes to `supabase.auth.onAuthStateChange`) so the UI updates instantly after sign-in/out (no refresh). `AuthSync` is mounted once in `main.jsx`.
- `components/app/AuthSync.jsx` updates the React Query cache for `authUser` on every auth event (including session restore and JWT refresh). It **only** clears `profile` / `readingLog` caches on **sign-out**, and **only** invalidates profile + reading history on **INITIAL_SESSION** and **SIGNED_IN** — not on **TOKEN_REFRESHED**, so token refresh does not force a slow profile refetch.

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

- **Visibility**: Rendered only when the user is signed in (`userId` from `useUserProgress`). Signed-out users see no personal progress section. **Placement**: after community bar and optional “Your recent reads”, before optional “Interesting articles”.
- **Data**: `profiles.total_read` from the existing `useUserProgress` / `profile` query (same **background** reconciliation with `reading_log` count as `useUserProgress`; Profile page).
- **Milestones** (config in `lib/readingMilestones.js` → `READING_MILESTONES`): **10, 50, 100, 200, 365, 500** with display names **Apprentice, Scholar, Master, Expert, Sage, Legend**. Same ladder / fill / star behavior as documented previously.
- **Copy**: Section **h2**: **Reading goals** (`id="reading-goals-heading"`).
- **Celebrations**: Short star twinkle when a milestone becomes unlocked **for the first time in this browser**; persistence key **`wikidaily:milestone:celebrated:{userId}:{milestoneKey}`**.
- **Preview (design / QA)**: In `components/home/ReadingProgressBar.jsx`, **disabled by default** via **`READING_PROGRESS_PREVIEW_ENABLED = false`**.
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
