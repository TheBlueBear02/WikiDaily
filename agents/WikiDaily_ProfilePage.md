# WikiDaily — Profile Page Specification

## Route
`/profile` — protected route, requires authentication. Redirect to `/auth?returnTo=/profile` if not signed in.

---

## Data Sources

### Hook: `useUserProgress`
Use the existing hook `useUserProgress` for profile stats (to avoid duplicated `profiles` queries and keep React Query cache invalidation consistent).

Profile stats come from the `profiles` query inside `useUserProgress`:

- `username`
- `current_streak`
- `max_streak`
- `total_read`
- `last_read`

> Note: `useUserProgress` reconciles `profiles.total_read` against the total number of rows in `reading_log` for that user so the "Total Articles Read" stat reflects both **daily** and **random** reads even if a prior profile update ever drifted.

### Reader level (UI-only)

**Reader level** (Level 0–10 with display names) is **not** stored in the database. It is derived on the client from `profiles.total_read` using `getCurrentLevel()` and `getNextLevel()` in `frontend/src/lib/levels.js` (`LEVELS` thresholds are editable in that single file; no migrations). The profile header appends progress: `({total_read} reads → Level {next} at {threshold})` until max level, then `({total_read} reads — max level)`. This is separate from **achievements** (`achievements` / `user_achievements` tiers, toasts, and the profile achievements grid).

### Hook: `useAchievements`
Profile also renders an Achievements section backed by two tables:

- `achievements` (public read): global achievement definitions
- `user_achievements` (RLS): current user unlocks, including `notified` for toast queueing

Implementation:

- `useAchievements({ userId })` queries:
  - `achievements`: `select('id, type, threshold, label, description, icon')`, ordered by `type` then `threshold`, `staleTime: Infinity`
  - `user_achievements`: `select('achievement_id, unlocked_at, notified')` filtered by `user_id`
- Derived values:
  - `unlocked`: `Set<achievement_id>`
  - `pending`: rows where `notified = false` (used by the global toast queue)

### Hook: `useReadingHistory`
Fetches the full reading history with article metadata in a single joined query.

Supports an optional `limit` param for capped lists (e.g. Home “Your recent reads” uses `limit: 5`), while Profile fetches the full list by omitting `limit` (needed for the activity heatmap and for the reading history grid’s client-side “Show more” pagination).

```js
supabase
  .from('reading_log')
  .select(`
    wiki_slug,
    read_at,
    read_date,
    source,
    articles (
      display_title,
      image_url,
      description,
      is_daily,
      featured_date
    )
  `)
  .eq('user_id', userId)
  .order('read_at', { ascending: false })
```

Returns: array of reading log entries with nested article metadata.

### Hook: `useFavorites`
Fetches the user's favorites (separate from reading history) with article metadata in a single joined query.

Supports an optional `limit` param for capped lists (e.g. Home “Interesting articles” uses `limit: 5`), while Profile fetches the full list by omitting `limit` (same pattern as `useReadingHistory`).

```js
supabase
  .from('favorites')
  .select(`
    wiki_slug,
    created_at,
    articles (
      display_title,
      image_url,
      description,
      is_daily,
      featured_date
    )
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
```

Returns: array of favorite entries with nested article metadata.

### Notes (article notes)

Notes are stored in Supabase in `article_notes` (private, per user per article). The Wiki article viewer (`/wiki/:wikiSlug`) loads and saves notes automatically when signed in.

Key behaviors:

- Signed out: notes are saved to `localStorage` under `wikidaily:notes:<wikiSlug>`.
- Signed in: notes are loaded from `article_notes` and saved (debounced) via upsert on `(user_id, wiki_slug)`.
- One-time migration: on first view of an article while signed in, if there is a legacy localStorage note and no DB note yet, the app upserts it into `article_notes` and removes the local copy.
- Clear: user can clear the note (deletes the `article_notes` row for that article).

> Note: `article_notes.wiki_slug` is an FK to `articles(wiki_slug)`. To reduce FK failures on direct navigation, the wiki page does a best-effort cache upsert into `articles` on load (may be blocked by RLS; treated as best-effort).
### Auth data
- `useUserProgress().user` (from `supabase.auth.getUser()`) — for `created_at` (member since date) and `email`

---

## Page Structure (top to bottom)

### 1. Profile Header

**Layout:** horizontal row, left-aligned, padding bottom with a bottom border separator.

**Contents:**
- Avatar circle — 64px diameter, filled with a muted warm tone, displays the first two initials of `username` in uppercase with larger initials text. No photo upload for MVP.
- Username — displayed as plain `username` (no leading `@`) using the same font styling as the Navbar username (sans, medium weight, slate tone), scaled up for the page title (24px on mobile, 30px on `sm`+), with slightly tighter tracking.
- Reader level — `Level {n} · {name} ({total_read} reads → Level {next} at {threshold})` when a next level exists; at max level, `… ({total_read} reads — max level)`. Derived with `getCurrentLevel` + `getNextLevel(profile.total_read ?? 0)` (`frontend/src/lib/levels.js`). Small muted sans-serif (13px, `text-slate-500`).
- Member since — `"Member since [Month Year]"` formatted from `auth.users.created_at`. Small muted sans-serif text (13px).
- Tagline — static text: `"Knowledge is Power"` in small italic serif, faint color, displayed to the immediate left of the wizard illustration on the right side of the header.
- Wizard illustration — static image rendered on the right side of the profile header row, using the asset at `/images/wizard 1.jpg` (served as `/images/wizard%201.jpg`), sized roughly 96×96px with a subtle rounded rectangle mask and soft shadow.

---

### 2. Stats Row

**Layout:** 3 equal-width metric cards in a horizontal grid. Gap 12px. Full width of the page container.

Each card:
- Background: warm surface color (not white — slightly off-white/parchment)
- No border
- Border radius: 8px
- Padding: 1rem
- Label: 12px, uppercase, letter-spaced, muted color — above the number
- Value: 28px, font-weight 500, dark ink color

**The 3 cards:**

| Label | Value | Source |
|---|---|---|
| Current Streak | `current_streak` days | `profiles` |
| Longest Streak | `max_streak` days | `profiles` |
| Total Articles Read | `total_read` | `profiles` |

**Streak card special behavior:**
- If `current_streak >= 7` — add a small amber/gold pill badge next to the number: `"On fire"`
- If `current_streak === 0` — show `"Start today"` in muted text instead of `0 days`

---

### 3. Activity Heatmap

**Layout:** full-width section with a section label above it: `"Reading activity"` in small uppercase muted sans-serif.

**What it is:** a GitHub-style calendar grid. **7 rows** (days Mon–Sun) × **N columns** (weeks), each cell a small square (12px × 12px) with 3px gap.

**Date window & alignment (important):**
- Aligned to **UTC Mondays**.
- **Viewport `md` and up** (`min-width: 768px`): **52 full weeks** (~1 year). `endMonday` = Monday of the current UTC week; `startMonday = endMonday - 51 weeks`. \(52 × 7 = 364\) cells.
- **Below `md`** (narrow / mobile): **13 weeks** (~three months), ending on the same current week: `startMonday = endMonday - 12 weeks`.
- Month labels above the grid: on the full-year view, show abbreviated months on alternating months to reduce crowding; on the compact view, label **every** month that appears in the window.
- Cells after *today (UTC)* are “future” cells and should be visually suppressed (dimmed) and should not show tooltips.

**Cell states:**
- No read that day → faint warm gray fill (empty)
- Read that day → filled with teal/green color
- Today → outlined with a thin border to mark current position

**Color intensity (optional enhancement):**
- For MVP, binary: read = filled teal, not read = empty gray
- Future: intensity based on source (daily = full teal, random = lighter teal)

**Data:** derived from `reading_log` entries — extract all `read_date` values and build a `Set` for O(1) lookup when rendering each cell.

**Month labels:** render abbreviated month names (Jan, Feb, etc.) above the appropriate columns.

**Tooltip on hover (MVP):** show `"[Day, Date] — [Article title if available]"` on cell hover. Use the joined article data from `useReadingHistory`.

> Note: native `title` tooltips are inconsistent (delayed on desktop, absent on touch). This is acceptable for MVP.

---

### 3.5. Achievements

**Placement:** after **Reading history** (`ReadingHistoryGrid`), **before** the **Danger zone** (delete account) block.

**Layout:**
- Section label: `Achievements`
- Right-aligned count: `X / 14 unlocked`
- Compact vertical spacing and narrower card columns than a full-width achievements view
- 3 grouped rows (one per achievement `type`), each with:
  - A compact row header: type label (left) and a **text-only** progress summary (right) — current/next threshold, next achievement label, or `"All unlocked"` — no progress bar. Header uses `flex-wrap` so long progress text can wrap on narrow viewports without horizontal overflow.
  - **Below `md`:** achievement cards for that type use a **2-column CSS grid** (no horizontal scrolling). **`md` and up:** a horizontal, scrollable strip of fixed-width cards (~132px) as before (`AchievementCard` with `compact` sizing).

**Card states:**
- Unlocked: full opacity, subtle teal accent border; shows icon, label, description, and `unlocked_at` formatted as `"Unlocked Mar 29, 2026"`
- Locked: 40% opacity + grayscale; shows icon + label; description is hidden as `???`

**Per-type progress text (no bar on Profile):**
- Types are derived from `achievements.type`:
  - `total_read` → uses `profiles.total_read`
  - `random_read` → uses `profiles.total_random_read`
  - `streak` → uses `profiles.current_streak`
- For each type, labels are computed with `frontend/src/lib/achievementProgress.js` (`computeAchievementTypeProgress`): next locked achievement by ascending `threshold`, current value vs next threshold, and `"All unlocked"` when every achievement in that type is unlocked. The helper also exposes `nextLabel`, `nextDescription`, and `nextIcon` for that tier (used on the home hero achievements strip; when maxed, all three reflect the final tier).

**Loading:** show 3 skeleton rows (one per type), each with a skeleton header line + skeleton cards (no bar skeleton).

**Toast notifications (global):**
- Achievements are unlocked by the app-root runner after reads and inserted into `user_achievements` with `notified=false`.
- A single global toast queue shows pending unlocks one at a time and flips `notified=true` after display.

---

### 3.75. Your notes

**Placement:** after **Activity Heatmap**, before **Interesting articles** (`FavoritesGrid`) and the other grids below it on the page.

**What it is:** a grid of the user’s saved article notes, ordered by most recently updated.

**Data:** query `article_notes` joined to `articles`, ordered by `updated_at DESC`.

Example query (hook: `useRecentNotes`):

```js
supabase
  .from('article_notes')
  .select(`
    wiki_slug,
    content,
    created_at,
    updated_at,
    articles (
      display_title,
      image_url,
      description,
      is_daily,
      featured_date
    )
  `)
  .eq('user_id', userId)
  .order('updated_at', { ascending: false })
```

**Card behavior:**
- Shows article thumbnail (or warm placeholder letter), article title, a 3-line snippet of the note, and `Updated {date}` (UTC formatting).
- Clicking navigates to `/wiki/${wiki_slug}`.

**Pagination:** client-side “Show more” pagination like Reading History (start with 6, add 6 per click).

**Empty state:**
```
"No notes yet."
"Open an article and write notes in the right sidebar."
```
With a button linking to `/`.
### 4. Interesting articles (Favorites Grid)

**Layout:** CSS grid, 3 columns on desktop, 2 on tablet, 1 on mobile. Gap 12px. Full width.

**Section label above:** `"Interesting articles"` with a count in muted text: `"12 marked"`.

**Each card contains:**
- Thumbnail image — full width of card, fixed height 100px, `object-fit: cover`. If `image_url` is null, show a warm parchment placeholder with the first letter of the title centered.
- Article title — `display_title` from articles join. Same sans title treatment as daily `ArticleCard` (scaled for grid: `text-base font-semibold leading-tight tracking-tight text-primary`), 2-line clamp with ellipsis overflow.
- Marked date — `created_at` formatted as `"Marked Mar 29, 2026"`. `text-xs text-slate-500`.
- Clicking any card navigates to `/wiki/${wiki_slug}` — opens the article in the in-app iframe viewer.

**Empty state:**
If `favorites` is empty, show a centered message:
```
"No interesting articles yet."
"Open an article and tap “Mark interesting” to save it here."
```
With a button linking to `/`.

---

### 5. Reading History Grid

**Layout:** CSS grid, 3 columns on desktop, 2 on tablet, 1 on mobile. Gap 12px. Full width.

**Pagination:** Show the **6** most recent reads first (same order as the query: newest `read_at` first). A **Show more** control below the grid adds **6** more entries each click until all loaded rows are shown. The header count remains the total number of articles in history (e.g. `"42 articles"`).

**Section label above:** `"Reading history"` with a count in muted text: `"42 articles"`.

**Each card contains:**
- Thumbnail image — full width of card, fixed height 100px, `object-fit: cover`. If `image_url` is null, show a warm parchment placeholder with the first letter of the title centered.
- Source badge — top-right corner overlay on the image. **Square corners (no rounding)**, small font (10px uppercase):
  - Daily article → amber/gold background, `"Daily"`
  - Random article → teal background, `"Random"`
- Article title — `display_title` from articles join. Same sans title treatment as daily `ArticleCard` (scaled: `text-base font-semibold leading-tight tracking-tight text-primary`), 2-line clamp with ellipsis overflow.
- Date read — `read_date` formatted as `"Mar 29, 2026"`. `text-xs text-slate-500`.
- Clicking any card navigates to `/wiki/${wiki_slug}` — opens the article in the in-app iframe viewer.

**Empty state:**
If `reading_log` is empty, show a centered message:
```
"No articles read yet."
"Read today's article to get started."
```
With a button linking to `/`.

---

### 6. Danger zone (delete account)

**Placement:** **last** section on the profile page — **after** **Achievements** (which follows **Reading history**).

**What it is:** inline `DeleteAccountSection` in `Profile.jsx`: bordered “Danger zone” area with **Delete account** flow (confirm phrase, irreversible copy, cancel).

---

## Component Breakdown

```
Profile.jsx  (page)
├── ProfileHeader.jsx
│     ├── Avatar (initials circle, 64px; initials from `lib/profileAvatar.js`)
│     ├── Username (plain username, sans; page title scale)
│     ├── Reader level (`Level n · name` + next-level progress from `getNextLevel`, 13px muted)
│     ├── Member since (13px muted)
│     └── Tagline ("Knowledge is Power", italic serif faint; right column with wizard)
│
├── StatsRow.jsx
│     └── StatCard.jsx × 3
│           (current_streak, max_streak, total_read)
│
├── ActivityHeatmap.jsx
│     ├── Month labels row
│     ├── Day grid (52×7 desktop, 13×7 narrow)
│     └── Cell hover tooltip
│
├── NotesGrid.jsx
│     └── NoteCard.jsx × N
│
├── FavoritesGrid.jsx
│     └── FavoriteArticleCard.jsx × N
│           ├── Thumbnail (or placeholder)
│           ├── Title (2-line clamp)
│           └── Marked date
│
├── ReadingHistoryGrid.jsx
│     └── ArticleHistoryCard.jsx × N
│           ├── Thumbnail (or placeholder)
│           ├── Source badge (Daily / Random)
│           ├── Title (2-line clamp)
│           └── Date read
│
├── AchievementsGrid.jsx
│     └── AchievementCard.jsx × N (per type; `compact` on Profile)
│
└── DeleteAccountSection (danger zone — inline in `Profile.jsx`; last on page)
```

---

## Files to Add / Change

| Action | File |
|---|---|
| Add | `frontend/src/pages/Profile.jsx` |
| Add | `frontend/src/components/profile/ProfileHeader.jsx` |
| Add | `frontend/src/components/profile/StatsRow.jsx` |
| Add | `frontend/src/components/profile/StatCard.jsx` |
| Add | `frontend/src/components/profile/ActivityHeatmap.jsx` |
| Add | `frontend/src/components/profile/NotesGrid.jsx` |
| Add | `frontend/src/components/profile/NoteCard.jsx` |
| Add | `frontend/src/components/profile/FavoritesGrid.jsx` |
| Add | `frontend/src/components/shared/FavoriteArticleCard.jsx` |
| Add | `frontend/src/components/profile/ReadingHistoryGrid.jsx` |
| Add | `frontend/src/components/shared/ArticleHistoryCard.jsx` |
| Add | `frontend/src/hooks/useReadingHistory.js` |
| Add | `frontend/src/hooks/useFavorites.js` |
| Add | `frontend/src/hooks/useRecentNotes.js` |
| Update | `frontend/src/App.jsx` — add `/profile` route |
| Update | `frontend/src/components/layout/Navbar.jsx` — add profile link/avatar |

---

## Navbar Integration

When signed in, the Navbar shows a **`Profile`** text link next to **`History`** (same active styling), plus a user menu opened from a control that includes an **amber circular initials avatar** (`bg-amber-100`, `text-amber-950`, `rounded-full`) using the same **`initialsFromUsername`** rules and username fallbacks as the profile header (`frontend/src/lib/profileAvatar.js`). Under the truncated display name, a second line shows **`Level {n} · {name}`** from `getCurrentLevel(profile.total_read)` (`frontend/src/lib/levels.js`), `11px` muted. The menu lists **`Profile`** above **`Sign out`**.

Clicking either navigates to `/profile`.

Ensure the Profile NavLink uses the same active styling logic as the History NavLink so the active state is consistent.

---

## Loading & Error States

**Loading:**
- Stats row: show 3 skeleton placeholder cards (pulsing gray rectangles)
- Heatmap: show a gray placeholder rectangle same dimensions as the heatmap
- Interesting articles grid: show 6 skeleton cards in the grid
- History grid: show 6 skeleton cards in the grid

**Error:**
- If the `profiles` query in `useUserProgress` fails: show `"Could not load profile. Please try again."` with a retry button
- If `useFavorites` fails: show the Interesting articles section error card with retry
- If `useReadingHistory` fails: show the profile header and stats (if loaded) and an error message only in the history section

**No data (new user):**
- Stats show all zeros
- Heatmap shows empty grid
- History grid shows the empty state with CTA to read today's article
