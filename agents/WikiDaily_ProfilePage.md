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

### Hook: `useReadingHistory`
Fetches the full reading history with article metadata in a single joined query.

Supports an optional `limit` param for capped lists (e.g. Home “Latest reads” uses `limit: 5`), while Profile fetches the full list by omitting `limit`.

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

**What it is:** a GitHub-style calendar grid. 52 columns (weeks) × 7 rows (days Mon–Sun). Each cell is a small square (12px × 12px) with 3px gap.

**Date window & alignment (important):**
- Render **52 full weeks** aligned to **UTC Mondays**.
- Compute `endMonday` = Monday of the current UTC week, and `startMonday = endMonday - 51 weeks`.
- Render all \(52 × 7 = 364\) cells for dates from `startMonday` through the end of the last week.
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

### 4. Favorites Grid

**Layout:** CSS grid, 3 columns on desktop, 2 on tablet, 1 on mobile. Gap 12px. Full width.

**Section label above:** `"Favorites"` with a count in muted text: `"12 saved"`.

**Each card contains:**
- Thumbnail image — full width of card, fixed height 100px, `object-fit: cover`. If `image_url` is null, show a warm parchment placeholder with the first letter of the title centered.
- Article title — `display_title` from articles join. Serif font, 14px, font-weight 500, 2-line clamp with ellipsis overflow.
- Saved date — `created_at` formatted as `"Saved Mar 29, 2026"`. Sans-serif, 11px, muted color.
- Clicking any card navigates to `/wiki/${wiki_slug}` — opens the article in the in-app iframe viewer.

**Empty state:**
If `favorites` is empty, show a centered message:
```
"No favorites yet."
"Open an article and tap “Add to favorites” to save it here."
```
With a button linking to `/`.

---

### 5. Reading History Grid

**Layout:** CSS grid, 3 columns on desktop, 2 on tablet, 1 on mobile. Gap 12px. Full width.

**Section label above:** `"Reading history"` with a count in muted text: `"42 articles"`.

**Each card contains:**
- Thumbnail image — full width of card, fixed height 100px, `object-fit: cover`. If `image_url` is null, show a warm parchment placeholder with the first letter of the title centered.
- Source badge — top-right corner overlay on the image. **Square corners (no rounding)**, small font (10px uppercase):
  - Daily article → amber/gold background, `"Daily"`
  - Random article → teal background, `"Random"`
- Article title — `display_title` from articles join. Serif font, 14px, font-weight 500, 2-line clamp with ellipsis overflow.
- Date read — `read_date` formatted as `"Mar 29, 2026"`. Sans-serif, 11px, muted color.
- Clicking any card navigates to `/wiki/${wiki_slug}` — opens the article in the in-app iframe viewer.

**Empty state:**
If `reading_log` is empty, show a centered message:
```
"No articles read yet."
"Read today's article to get started."
```
With a button linking to `/`.

---

## Component Breakdown

```
Profile.jsx  (page)
├── ProfileHeader.jsx
│     ├── Avatar (initials circle, 64px; initials from `lib/profileAvatar.js`)
│     ├── Username (@username, serif 24px)
│     ├── Member since (13px muted)
│     └── Tagline ("Knowledge is Power", italic serif faint)
│
├── StatsRow.jsx
│     └── StatCard.jsx × 3
│           (current_streak, max_streak, total_read)
│
├── ActivityHeatmap.jsx
│     ├── Month labels row
│     ├── Day grid (52 × 7 cells)
│     └── Cell hover tooltip
│
├── FavoritesGrid.jsx
│     └── FavoriteArticleCard.jsx × N
│           ├── Thumbnail (or placeholder)
│           ├── Title (2-line clamp)
│           └── Saved date
│
└── ReadingHistoryGrid.jsx
      └── ArticleHistoryCard.jsx × N
            ├── Thumbnail (or placeholder)
            ├── Source badge (Daily / Random)
            ├── Title (2-line clamp)
            └── Date read
```

---

## Files to Add / Change

| Action | File |
|---|---|
| Add | `frontend/src/pages/Profile.jsx` |
| Add | `frontend/src/components/ProfileHeader.jsx` |
| Add | `frontend/src/components/StatsRow.jsx` |
| Add | `frontend/src/components/StatCard.jsx` |
| Add | `frontend/src/components/ActivityHeatmap.jsx` |
| Add | `frontend/src/components/FavoritesGrid.jsx` |
| Add | `frontend/src/components/FavoriteArticleCard.jsx` |
| Add | `frontend/src/components/ReadingHistoryGrid.jsx` |
| Add | `frontend/src/components/ArticleHistoryCard.jsx` |
| Add | `frontend/src/hooks/useReadingHistory.js` |
| Add | `frontend/src/hooks/useFavorites.js` |
| Update | `frontend/src/App.jsx` — add `/profile` route |
| Update | `frontend/src/components/Navbar.jsx` — add profile link/avatar |

---

## Navbar Integration

When signed in, the Navbar shows a **`Profile`** text link next to **`History`** (same active styling), plus a user menu opened from a control that includes an **amber circular initials avatar** (`bg-amber-100`, `text-amber-950`, `rounded-full`) using the same **`initialsFromUsername`** rules and username fallbacks as the profile header (`frontend/src/lib/profileAvatar.js`). The menu lists **`Profile`** above **`Sign out`**.

Clicking either navigates to `/profile`.

Ensure the Profile NavLink uses the same active styling logic as the History NavLink so the active state is consistent.

---

## Loading & Error States

**Loading:**
- Stats row: show 3 skeleton placeholder cards (pulsing gray rectangles)
- Heatmap: show a gray placeholder rectangle same dimensions as the heatmap
- Favorites grid: show 6 skeleton cards in the grid
- History grid: show 6 skeleton cards in the grid

**Error:**
- If the `profiles` query in `useUserProgress` fails: show `"Could not load profile. Please try again."` with a retry button
- If `useFavorites` fails: show the favorites section error card with retry
- If `useReadingHistory` fails: show the profile header and stats (if loaded) and an error message only in the history section

**No data (new user):**
- Stats show all zeros
- Heatmap shows empty grid
- History grid shows the empty state with CTA to read today's article
