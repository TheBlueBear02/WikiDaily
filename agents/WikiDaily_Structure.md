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
│       ├── App.jsx                    # Routes: /, /history, /game, /auth, /profile, /wiki/:wikiSlug, /about
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
│       │   │   ├── CraziestFactsSection.jsx # Home **Craziest Facts** (after `RandomWikiSection`): full-width **`bg-primary` header strip** with white light-bulb icon + `<h2>` **`text-white`** (`text-lg font-semibold leading-tight tracking-tight`); sort toggle on-strip (white/primary inversion); body content in padded white area below; single visible `FactCard`, queue + prefetch (`fetchWikiFactsNextBatch`), excludes voted fact ids (`useFactVotes`) and session-seen ids; empty-table and end-of-queue CTAs **Read an article** use **`navigateToRandomWikiArticle`**; integrates `useVoteFact`; advances **immediately** after vote/skip (no flip animation)
│       │   │   ├── FactCard.jsx              # Fact presentation: **`grid w-full min-w-0 items-stretch`** (article panel + external button column **`self-stretch`**, each button **`flex-1`** so the stack matches card height); clickable region (`role="button"`) on quote + footer navigates to `/wiki/:wikiSlug` with `state.highlightFactText` (plus `displayTitle`, `source: 'link'`); title `NavLink` shares that `state` and uses `stopPropagation`; submitter **username without `@`**; hover tooltip portaled to **`document.body`** when `user_id` set (StreakLeaderboard-style card); three vote buttons outside the bordered card (`text-base` black quote); `lib/levels` + `lib/profileAvatar`; own-fact snapshot fallbacks; **Anonymous** when `user_id` missing; no net-score line; soft delete on Profile `MyFactsGrid` only
│       │   │   ├── FactSubmitModal.jsx       # Modal to confirm inserting into `wiki_facts` (read-only text, length hint); opened from `WikiIframe.jsx` after text selection; `<h2>` titles use `text-lg font-semibold leading-tight tracking-tight text-primary` on the modal surface (Home **Craziest Facts** strip uses **`text-white`** on `bg-primary`); on success, `submitSucceeded` keeps the dialog open with an in-modal confirmation + **Close** (no auto-close)
│       │   │   ├── AchievementProgressTrack.jsx # Achievement progress track (matches CollectiveReadingProgressBar styling); optional `withEndStar` overlays an empty/filled milestone star on the track’s right end (`left: 100%`, centered on the bar end like Reading/Community bars; used by `HeroAchievementsSection`)
│       │   │   ├── LatestReadsSection.jsx # Home “Your recent reads” (signed-in); title row + **View all**; **full-width** `h-px bg-slate-200` rule directly under; imports **`../shared/ArticleHistoryCard`**
│       │   │   ├── InterestingArticlesSection.jsx # Home “Interesting articles” (signed-in); imports **`../shared/FavoriteArticleCard`**
│       │   │   └── WeeklyLeaderboard.jsx  # Not wired in the app today (reserved / experimental)
│       │   ├── profile/               # Profile route (`/profile`)
│       │   │   ├── ProfileHeader.jsx      # Profile hero: avatar, handle, reader level, stats strip
│       │   │   ├── StatsRow.jsx           # Three-up stat cards (current streak, max streak, total read)
│       │   │   ├── StatCard.jsx           # Single stat tile (used by `StatsRow`)
│       │   │   ├── ActivityHeatmap.jsx    # Contribution-style calendar for read days
│       │   │   ├── FavoritesGrid.jsx      # Paginated favorites grid; imports **`../shared/FavoriteArticleCard`**
│       │   │   ├── ReadingHistoryGrid.jsx # Paginated reading history; imports **`../shared/ArticleHistoryCard`**
│       │   │   ├── MyFactsGrid.jsx        # Paginated **Your crazy facts**; imports **`../shared/SubmittedFactCard`** + **`useSoftDeleteMyFact`** (per-card delete; same grid + skeleton pattern as `ReadingHistoryGrid`)
│       │   │   ├── AchievementsGrid.jsx   # Responsive grid of locked/unlocked achievement cards
│       │   │   ├── AchievementCard.jsx    # Single achievement tile (used by `AchievementsGrid`)
│       │   │   ├── NotesGrid.jsx          # Paginated notes list
│       │   │   └── NoteCard.jsx           # Single note row/card (used by `NotesGrid`)
│       │   ├── shared/                # Presentation cards used on both Home and Profile
│       │   │   ├── FavoriteArticleCard.jsx # Interesting articles / Profile favorites: title uses same sans treatment as daily `ArticleCard` (`text-base font-semibold leading-tight tracking-tight text-primary`, 2-line clamp); meta line `text-xs text-slate-500`
│       │   │   ├── ArticleHistoryCard.jsx # Recent reads + Profile reading history: same title/meta typography as `FavoriteArticleCard`; source badge on image
│       │   │   ├── SubmittedFactCard.jsx  # Profile **Your crazy facts**: 100px media + title + excerpt + date; with **`onDelete`**, the **Delete fact** control sits in a **footer outside** the `role="link"` region (avoids invalid **button-inside-link** nesting that breaks clicks); without delete, whole card matches `ArticleHistoryCard`-style `cardInteractiveSurfaceClasses`
│       │   │   └── MarkAsReadButton.jsx   # (Legacy) Inserts reading_log + updates profile streaks (auth required). Current UX auto-logs reads on article open in `WikiIframe.jsx`.
│       │   ├── layout/                # App chrome (not tied to one route)
│       │   │   ├── Navbar.jsx             # App header (**`sticky top-0 z-50 bg-white`** so the bar stays visible while scrolling); desktop nav unchanged; **mobile (<md)** collapses links into a hamburger drawer: the desktop link row + desktop user menu + `WikiSearchBar` are hidden, and a ☰ toggle opens a full-width drawer positioned under the bar (`absolute top-full`). Drawer closes on route change (`useLocation().pathname`), backdrop tap, and link tap. Streak: on desktop the `StreakBadge` always renders; on mobile it renders only when signed in (signed-out users see a **Sign in** button in the bar instead of the “Sign in to track streak” prompt). On mobile when signed in, the navbar also shows the user avatar/initials **to the right of the streak** (links to `/profile`). Drawer contains Home/Game (+ Profile when signed in) plus a user section (level line + Sign out) or a Sign in link when signed out. Signed-in user menu (desktop): **amber initials avatar** (same logic as `ProfileHeader` via `lib/profileAvatar.js`) + display name with **reader level** line under it (`Level n · name` from `lib/levels.js` + `profile.total_read`) → Profile / Sign out; while signed in and **`profile` is still null** (and profile query is not in error), the level line shows a **pulse skeleton** — do **not** use `profileQuery.isPending` alone (disabled queries stay `pending` without fetching)
│       │   │   ├── Footer.jsx             # Site footer (`bg-primary`): brand blurb, **Navigate** list (Home/History/Game/Profile, then footer-only links e.g. **About** → `/about` — not in Navbar), **External** (Wikipedia, GitHub), legal strip + CC BY-SA note
│       │   │   ├── WikiSearchBar.jsx      # Header search: debounced MediaWiki opensearch, dropdown navigation with keyboard; opens in-app reader with `state.source="search"` (`reading_log.source = 'search'` when signed in)
│       │   │   └── StreakBadge.jsx        # Nav streak icon (`streak-icon-noBG.png`) + centered white number overlay (no “Streak:” label); borderless, zoom/cropped image (slightly shifted up with `-translate-y-1`); native tooltip (`title="Streak days"`); auth loading: “Loading…” pill; signed-in: round **pulse skeleton** until **`profile`** exists (not `profileQuery.isPending` alone — same reason as Navbar). Streak number: `useMemo` on `profile` + daily `today`/`yesterday` (`lib/date.js`), **`tick` in deps** so rollover timeout forces refresh; **all hooks (including `useMemo`) run before any early return** so hook order stays stable
│       │   └── app/                   # Mounted once from `main.jsx` (global side-effects / toasts)
│       │       ├── AuthSync.jsx             # onAuthStateChange → syncs `authUser` cache; **sign-out** removes `profile`/`readingLog`/`myWikiFacts` queries; **INITIAL_SESSION** / **SIGNED_IN** invalidate profile + reading log + **myWikiFacts** — **not** on **TOKEN_REFRESHED** (JWT refresh must not wipe profile cache)
│       │       ├── AchievementUnlockRunner.jsx # Headless: when profile counters change, checks thresholds and inserts `user_achievements` rows (idempotent)
│       │       └── AchievementToast.jsx      # Toast queue: watches pending `user_achievements.notified=false`, shows one toast at a time, flips notified=true
│       ├── lib/
│       │   ├── cardSurface.js       # `CARD_SURFACE_STATIC` vs `cardInteractiveSurfaceClasses()`: white + neutral border vs slightly darker `bg-slate-50` (emerald tint when collected) + shadow + hover lift (`motion-safe` for translate) for clickable cards (daily `ArticleCard`, random picker, history/favorites grids; quote `WizardImageCard` stays static)
│       │   ├── supabaseClient.js      # Supabase client getter (reads VITE_* env)
│       │   ├── wikipedia.js           # fetch wrapper for WP summary + MediaWiki random page + **`fetchWikipediaOpenSearch`** (opensearch API for navbar article search)
│       │   ├── profileAvatar.js       # `initialsFromUsername` — shared by `ProfileHeader` and `Navbar` (warm amber circle avatars)
│       │   ├── wikiFactHighlight.js   # In-iframe fact passage match (whitespace-normalized), `<mark>` wrap + `scrollIntoView`; strip/reapply helpers for `WikiIframe`
│       │   ├── levels.js              # `LEVELS` (0–10 thresholds + names), `getCurrentLevel` / `getNextLevel` from `profiles.total_read` — Profile header reader level; config-only, no DB
│       │   ├── readingMilestones.js   # `READING_MILESTONES` + `COLLECTIVE_READING_MILESTONES` and shared math (`computeVisibleWindow`, `fillPercentFromZero`, `starLeftPctOnTrack`, `computeSegmentProgress`)
│       │   ├── date.js                # UTC date helpers (YYYY-MM-DD); `getNextLeaderboardResetDate` / `getLeaderboardCountdownParts` for weekly reset (UTC Sunday 23:59:59.999); daily rollover uses **05:00 UTC** (to match the GitHub Action schedule) via `DAILY_RESET_UTC_HOUR`, `todayDailyYmd`, and `getNextDailyResetDate` / `getDailyCountdownParts`
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
│       │   ├── useWikiFacts.js        # `fetchWikiFactsNextBatch`: `select('*')` + ordered by `net_score` or `created_at`; retries without `is_deleted=eq.false` (filters deleted rows in JS) and finally orders by `id` if needed for partial migrations; `display_title` from `wiki_slug`; filters excluded ids client-side; after each batch, enriches rows with empty `submitter_username` via RPC `wiki_fact_submitter_lookup` (so signed-out readers see submitter handles); `normalizeWikiFactsError` for readable errors
│       │   ├── useFactVotes.js        # React Query: signed-in user’s `fact_votes` fact ids (sorted array) for Home queue exclusion
│       │   ├── useVoteFact.js         # React Query mutation: upsert `fact_votes` (`up`/`down`); invalidates `factVotes`
│       │   ├── useSubmitFact.js       # React Query mutation: insert `wiki_facts` (profile upsert avoids null `username` overwrite; prefers `profile.username`, auth metadata, then email local-part); used from wiki reader modal; **onSuccess** invalidates `['myWikiFacts', userId]`
│       │   ├── useSoftDeleteMyFact.js # React Query mutation: `wiki_facts.is_deleted = true` for own row (RLS-scoped); **onSuccess** invalidates `['myWikiFacts', userId]`; throws **`Error`** with PostgREST `message`/`details`/`hint` (Supabase `{ error }` is not `instanceof Error`)
│       │   └── useMyWikiFacts.js      # React Query: signed-in user’s `wiki_facts` (`user_id` match, non-deleted), `created_at` desc; joins `articles` for title/image when PostgREST allows; fallbacks if `is_deleted` filter or embed fails
│       └── pages/
│           ├── Auth.jsx
│           ├── About.jsx               # Static **About** page (`/about`); linked under footer **Navigate** only (not Navbar)
│           ├── Game.jsx                # Wikipedia navigation game route (`/game`): **same hero row layout as Home** (`HeroAside` left column + ~70% right column, `md:items-stretch`, inner `gap-3` on slate-tinted wrapper); **placeholder bordered panels** only until game UI is built — product + phase details: [WikiDaily_Game.md](./WikiDaily_Game.md)
│           ├── Home.jsx                # Order: **`HomeHeroRow` first** (hero: left `HeroAside` = **Achievements** + **Streak leaderboard**; right ~70% = **`flex-1` daily `ArticleCard`** + **`CollectiveReadingProgressBar`** with default sizing to match bottom **Reading goals** bar height), then the remaining sections. **Mobile responsiveness:** below `md`, the hero **prioritizes the daily article first** (daily article + community bar render above the `HeroAside`), while `md+` stays the classic two-column layout (aside left, daily right). Multi-column rows elsewhere **stack** to avoid horizontal scroll (facts + random picker; ad + daily challenge; wizard quote + ad). The daily `ArticleCard` keeps the tall editorial feel on desktop (`md:min-h-[640px]`) but uses smaller mobile typography + a shorter min-height for 390px. Craziest Facts reaction buttons stack vertically on mobile with ≥44px tap targets. Progress bars hide the under-track numeric milestone labels below `md` (stars remain visible). If the profile query errors, a compact retry strip replaces the personal progress bar.
│           ├── History.jsx
│           ├── Profile.jsx            # Profile: header, stats, heatmap, notes, **Your crazy facts** (`MyFactsGrid` + `useMyWikiFacts`), favorites (interesting articles), reading history, achievements, **danger zone (delete account) last** (`components/profile/*` + shared cards)
│           └── WikiIframe.jsx         # In-app Wikipedia reader (`/wiki/:wikiSlug`) loads **Parsoid HTML** from `https://en.wikipedia.org/api/rest_v1/page/html/{wikiSlug}` (CORS), sanitizes it (drops `<script>` / nested `<iframe>`), injects **`WIKI_READER_APPEARANCE`** overrides from `wikipedia.js` (font family/size/line-height; optional `contentMaxWidth` for a narrow column), and renders it in a same-origin **`iframe[srcDoc]`** so in-article **wiki links** can be intercepted: clicks on `en.wikipedia.org/wiki/...` (or Parsoid-relative `./Title` links) **`navigate()` to `/wiki/:wikiSlug`** with `state.source="link"` (distinct from daily/random/search), which re-triggers the existing **auto `reading_log` insert** for the new slug. If HTML fetch fails, a fallback offers “Open in Wikipedia (new tab)”. Layout is a wide iframe column plus an “Article tools” sidebar on the right that can be collapsed/expanded. **Default behavior:** the tools sidebar starts **collapsed** on article open (and re-collapses when navigating to a different `wikiSlug`) to keep the reading view focused. Above the iframe, the header row shows the article title plus controls in this order: a “Notes” / “Hide notes” toggle button (opens or closes the sidebar), the **DB-backed Interesting toggle** (UI label; data in Supabase `favorites`) (RLS: per-user), then “New random article” on the far right (fetches a MediaWiki random page and navigates to its slug with `state.source="random"`). A one-time best-effort migration imports any legacy localStorage favorites from `wikidaily:favorites` into the DB after sign-in. When signed in, this page **auto-inserts a `reading_log` entry on article open** (best-effort) using `location.state.source` (daily/random/link/search). This page does NOT render a “Mark as read” control. **Home → article highlight:** optional `location.state.highlightFactText` (from `FactCard`) runs `wikiFactHighlight.js` after iframe load (and on `location.key` when the slug is unchanged) to wrap the matched passage in `mark.wikidaily-fact-highlight` and `scrollIntoView`. **Craziest Facts submission:** listeners on **`iframe.contentDocument`** (`selectionchange`, `mouseup`, `touchend` for mobile) debounce-read the selection; lengths 10–500 show a fixed **“Submit as Crazy Fact”** button positioned with `getBoundingClientRect()` + iframe offset; **`userId` is read from a ref** so listeners registered at iframe load still work after auth resolves. **`FactSubmitModal`** + **`useSubmitFact`** insert into `wiki_facts` (article row is already best-effort upserted for FKs). Parent `document` selection APIs alone are insufficient because the article body lives inside the iframe document.
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
today = "daily day" date (rollover at 05:00 UTC)

if last_read == today        → do nothing (already counted)
if last_read == yesterday    → streak = streak + 1
else                         → streak = 1

last_read = today
history   = [...history, wiki_title]
```

Notes:
- `current_streak` is **per-day** (only changes once per WikiDaily daily-day, rollover at 05:00 UTC).
- `total_read` is **per successful `reading_log` insert**, so it can increment multiple times in the same day if the user reads multiple different articles.

UI note:
- The navbar streak display is derived from `profiles.current_streak` and `profiles.last_read`, but if `last_read` is neither **today** nor **yesterday** (in daily-day terms), the UI shows **0** immediately even if the DB row hasn’t been updated yet. This ensures missed days visibly break the streak without requiring the user to read again first.

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
