# WikiDaily — Craziest Facts Feature Specification

## Overview

A community-driven section on the Home page where users discover interesting facts submitted by other readers. Facts are shown **one card at a time** — the user must interact with each card to advance to the next. Submitting a fact requires selecting text directly from a rendered Wikipedia article page inside the app.

---

## How It Works (User Flow)

### Discovering facts
1. The Home page shows a single fact card
2. **Open the source article:** Clicking the fact quote, submitter row, or article title navigates to `/wiki/:wikiSlug` with router `state` that includes `highlightFactText` (the stored fact string), `displayTitle`, and `source: 'link'`. The in-app reader (`WikiIframe`) finds that text inside the Parsoid HTML (whitespace-normalized match, with an optional shorter prefix fallback for very long quotes), wraps it in a yellow `<mark class="wikidaily-fact-highlight">`, and scrolls it into view (`smooth`, `block: 'center'`). If the text cannot be found (article drift, markup differences), the article still loads with no highlight.
3. User reads the fact and chooses one of three actions:
   - **"Wow really?"** — records an up vote, then **advances to the next fact immediately** after the mutation succeeds (no card animation)
   - **"Ok..."** — skips silently, no vote recorded, **next fact immediately**
   - **"Knew already"** — records a down vote, then **next fact immediately** after the mutation succeeds
4. **No flip / fade between facts** — the queue simply shows the next card. **No net score line on the card** (scores still drive **Most Popular** sort in the database)
5. When the queue runs out — a friendly end state is shown

### Submitting a fact
1. User reads a Wikipedia article on the `/wiki/:wikiSlug` page
2. User selects (highlights) a sentence or short paragraph from the article text
3. A "Submit as Crazy Fact" button appears near the selection
4. User clicks the button — a confirmation modal opens with the selected text pre-filled
5. User confirms → fact is inserted into `wiki_facts` and enters the queue for other users
6. The modal stays open and switches to a **Fact submitted** success view (message + **Close**); the user dismisses when ready

**Submitter display (username + level):** Rows store denormalized `submitter_username` and `submitter_total_read` from `profiles` at insert time (DB trigger). Before insert, `useSubmitFact` upserts `profiles` with **`user_id` only** unless it has a non-empty username to set — it prefers the loaded `profile.username`, then auth metadata, then the **email local-part** — so an upsert never sends `username: null` and wipes an existing display name (which would leave snapshots empty for everyone else). On the Home card, `FactCard` mirrors `ProfileHeader` fallbacks (profile → metadata → email local-part) **only when the fact’s `user_id` matches the signed-in user**. For **signed-out** viewers, `fetchWikiFactsNextBatch` calls the security-definer RPC `wiki_fact_submitter_lookup` for facts whose snapshot username is still empty, so anonymous users see the same public handle/level as everyone else when `profiles` has data (deploy [scripts/sql/wiki_fact_submitter_lookup.sql](../scripts/sql/wiki_fact_submitter_lookup.sql)).

### Sorting
- Default sort: **Most Popular** (`ORDER BY net_score DESC`)
- Alternative sort: **Newest** (`ORDER BY created_at DESC`)
- Toggle sits above the card — changing sort resets the queue from the beginning

---

## Card Layout

```
┌────────────────────────────────────┐    Wow really?
│  "The mantis shrimp can punch…"    │       Ok…
│                                    │  Knew already
│  Submitted by:      Based on:      │
│  ────────────────────────────────   │
│  [avatar]  username   Mantis Shrimp│
│            Level 2 · Seeker (link) │
└────────────────────────────────────┘
```

**Card elements (top to bottom):**
- **Layout:** Root is a CSS grid (`grid-cols-[minmax(0,1fr)_auto]`, `items-stretch`, `gap-x-3`): bordered **card** only wraps the article panel; the three reaction buttons sit in a **separate column** to the right (no shared border / shadow with the card, `w-[9.5rem]`). That column **`self-stretch`**s to the full row height (matches the card); **"Wow really?"** and **"Knew already"** use **`flex-1 min-h-0`** so they share the remaining height **after** the middle row; **"Ok…"** is **`shrink-0`** with **`py-2`** (same vertical padding as up/down, but no `flex-1` so it stays a compact middle band); up/down rows add **`flex-row gap-2`** with Reddit-style arrows **left** of the label.
- **Card chrome (article panel only):** Bordered panel uses `bg-white`, `shadow-sm`, and on hover a short transition (`duration-200`) to slightly lift (`motion-safe:hover:-translate-y-px`), deepen shadow (`hover:shadow-md`), and tint the surface (`hover:bg-slate-50/90`) with a slightly stronger border (`hover:border-slate-300`) — consistent with interactive card surfaces elsewhere (`SubmittedFactCard`, `cardInteractiveSurfaceClasses`).
- **Clickable article region** (`role="button"`, keyboard Enter/Space): fact quote, then label row + divider + footer (submitter + title). Opens the reader with `highlightFactText` so the submitted passage is marked and scrolled into view. Focus ring uses `focus-visible:ring-2` on `primary`.
- Fact text first — slightly larger than the daily article description body (`text-base leading-relaxed text-black`); scrollable when long (`flex-1` + `min-h-0` + `overflow-y-auto`)
- **Label row** (above the divider): **`Submitted by:`** (left) and **`Based on:`** (right), `text-[11px] font-medium text-slate-500`; then thin **`h-px`** divider; then **footer row** — avatar, **username** (no **`@`** prefix) / **Anonymous** + `Level X · Name`, display title `NavLink` (`text-right`) to `/wiki/${wiki_slug}` (same navigation `state` as the outer click handler; `stopPropagation` on the link). When the fact has a **`user_id`**, hovering the **avatar + submitter text** (`cursor-default`) opens a **fixed-position tooltip** portaled to **`document.body`** (`FactSubmitterTooltip`, same chrome as **`StreakLeaderboard`** user cards: initials, name, level, **Total reads**, next-level blurb; `role="tooltip"`, `pointer-events-none`, short hide delay via **`useFactSubmitterTooltip`**; **`aria-describedby`** while visible; dismissed when **`fact.id`** changes)
- Three action buttons — fixed-width column (`w-[9.5rem]`), **outside** the bordered card, **full height** of the card row (`self-stretch`); **"Wow really?"** and **"Knew already"** use **`flex-1`** and a horizontal row (`flex-row`, `gap-2`) with **Reddit-style solid block arrows** to the **left** of the label (`RedditStyleUpArrow` / `RedditStyleDownArrow` in `FactCard.jsx`): filled triangle + rectangular stem, sharp corners — up **`#FF4500`**, down **`#9494FF`**, `viewBox="0 0 24 28"` (wider geometry), rendered ~`h-7 w-6`; middle **"Ok…"** has no icon, **`shrink-0 py-2`**; voting does not open the article (`role="group"` + `aria-label="Fact reactions"`)
- Vote error line (only when the vote mutation fails) — small rose text full width below the grid row (`col-span-2`)

**Implementation notes:** Highlight logic lives in `frontend/src/lib/wikiFactHighlight.js` (`stripWikiFactHighlights`, `highlightFactTextInWikiDocument`). `WikiIframe` applies it on iframe `load` and again when `location.key` / `highlightFactText` changes while the slug is unchanged (same `srcDoc` does not reload the iframe).

---

## Transitions between facts

There is **no** 3D flip, opacity fade, or timed delay after a vote or skip. `CraziestFactsSection` pops the current fact from the queue and React re-renders `FactCard` with the next row — buttons stay disabled only while `useVoteFact` is pending for up/down.

---

## Database Schema

### Table: `wiki_facts`

Stores submitted facts. One fact per submission — text cannot be edited after submission.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | bigserial | NO | auto | Primary key |
| `user_id` | uuid | YES | — | FK → `profiles(user_id)` ON DELETE SET NULL. Nullable so facts survive if the user deletes their account |
| `wiki_slug` | text | NO | — | FK → `articles(wiki_slug)` ON DELETE CASCADE. The source article |
| `fact_text` | text | NO | — | The selected text. CHECK: between 10 and 500 characters |
| `up_count` | integer | NO | 0 | Cached count of 'up' votes. Updated by trigger |
| `down_count` | integer | NO | 0 | Cached count of 'down' votes. Updated by trigger |
| `net_score` | integer | NO | 0 | `up_count - down_count`. Used for popularity sorting. Updated by trigger |
| `is_deleted` | boolean | NO | false | Soft delete flag. Users can set on own facts. Service role for moderation |
| `created_at` | timestamptz | NO | NOW() | Submission timestamp |

**Indexes:**
- `idx_wiki_facts_net_score` — `(net_score DESC)` WHERE `is_deleted = FALSE` — popularity sort
- `idx_wiki_facts_created_at` — `(created_at DESC)` WHERE `is_deleted = FALSE` — newest sort
- `idx_wiki_facts_wiki_slug` — `(wiki_slug, net_score DESC)` WHERE `is_deleted = FALSE` — per-article list
- `idx_wiki_facts_user_id` — `(user_id, created_at DESC)` WHERE `is_deleted = FALSE` — Profile **Your crazy facts** (`useMyWikiFacts` / `MyFactsGrid`)

**RLS Policies:**
- `SELECT` — anyone can read facts where `is_deleted = FALSE`; **plus** authenticated users can read **their own** rows regardless of `is_deleted` (`wiki_facts_select_own`), so soft-delete `UPDATE` does not hit “new row violates row-level security policy”
- `INSERT` — authenticated users only, own `user_id` (use `(select auth.uid()) = user_id` in SQL)
- `UPDATE` — authenticated users can only soft-delete **active** own rows: `USING` requires `is_deleted = false`, `WITH CHECK` requires `is_deleted IS TRUE`; use `(select auth.uid())` for stable evaluation
- No `DELETE` — only service role

**Existing project:** if soft delete fails with an RLS error, run [scripts/sql/fix_wiki_facts_soft_delete_rls.sql](../scripts/sql/fix_wiki_facts_soft_delete_rls.sql) in the Supabase SQL editor.

---

### Table: `fact_votes`

One row per user per fact. The "Ok..." action **never writes to this table**.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | bigserial | NO | auto | Primary key |
| `fact_id` | bigint | NO | — | FK → `wiki_facts(id)` ON DELETE CASCADE |
| `user_id` | uuid | NO | — | FK → `profiles(user_id)` ON DELETE CASCADE |
| `vote` | text | NO | — | CHECK IN `('up', 'down')`. "Ok..." never writes here |
| `created_at` | timestamptz | NO | NOW() | When the vote was first cast |
| `updated_at` | timestamptz | NO | NOW() | Auto-updated by trigger when vote changes |

**Unique constraint:** `UNIQUE (fact_id, user_id)` — one vote per user per fact.

**Index:**
- `idx_fact_votes_user` — `(user_id, fact_id)` — fast vote state lookup

**RLS Policies:**
- `SELECT` — authenticated users read own votes only
- `INSERT` — authenticated users only, own `user_id`
- `UPDATE` — authenticated users can change own vote
- `DELETE` — authenticated users can remove own vote

---

### Triggers

**`fact_votes_sync_counts`** — fires AFTER INSERT, UPDATE, or DELETE on `fact_votes`. Recounts `up_count`, `down_count`, and `net_score` on the parent `wiki_facts` row from scratch.

**`fact_votes_updated_at`** — fires BEFORE UPDATE on `fact_votes`. Sets `updated_at = NOW()`.

---

### Relationships

```
profiles.user_id
  │
  ├── wiki_facts.user_id (1-to-many, SET NULL on profile delete)
  │         │
  │         └── fact_votes.fact_id (1-to-many, CASCADE on fact delete)
  │
  └── fact_votes.user_id (1-to-many, CASCADE on profile delete)

articles.wiki_slug
  │
  └── wiki_facts.wiki_slug (1-to-many, CASCADE on article delete)
```

---

## Frontend Implementation

### New files to add

| File | Description |
|---|---|
| `frontend/src/hooks/useWikiFacts.js` | Fetch fact queue in batches with sort support |
| `frontend/src/hooks/useFactVotes.js` | Fetch all voted fact IDs for current user (for filtering) |
| `frontend/src/hooks/useSubmitFact.js` | Submit a new fact mutation |
| `frontend/src/hooks/useVoteFact.js` | Cast or remove a vote mutation |
| `frontend/src/components/CraziestFactsSection.jsx` | Section container — manages queue, sort, prefetch, vote advance (no transition animation) |
| `frontend/src/components/FactCard.jsx` | Single fact card UI and three action buttons |
| `frontend/src/components/FactSubmitModal.jsx` | Confirmation modal for fact submission |
| `frontend/src/components/TextSelectionButton.jsx` | Floating button that appears on text selection |

### Files to update

| File | Change |
|---|---|
| `frontend/src/pages/WikiIframe.jsx` | Add text selection logic for fact submission |
| `frontend/src/pages/Home.jsx` | Add `CraziestFactsSection` |

---

## Hook Specifications

### `useWikiFacts({ sort, excludeIds })`

Fetches a batch of 10 facts. `excludeIds` is a Set of already-voted fact IDs — excluded from results so users never see the same card twice.

```js
// React Query key: ['wikiFacts', sort, page]

supabase
  .from('wiki_facts')
  .select(`
    id,
    fact_text,
    net_score,
    up_count,
    down_count,
    created_at,
    wiki_slug,
    articles (display_title),
    profiles (username, total_read)
  `)
  .eq('is_deleted', false)
  .not('id', 'in', `(${[...excludeIds].join(',')})`)  // exclude voted facts
  .order(sort === 'popular' ? 'net_score' : 'created_at', { ascending: false })
  .limit(10)
```

### `useFactVotes({ userId })`

Fetches all fact IDs the current user has already voted on. Used to filter the queue.

```js
// React Query key: ['factVotes', userId]

supabase
  .from('fact_votes')
  .select('fact_id')
  .eq('user_id', userId)
```

Returns a `Set<fact_id>` for O(1) filtering.

### `useSubmitFact()`

```js
supabase
  .from('wiki_facts')
  .insert({
    user_id: userId,
    wiki_slug: wikiSlug,
    fact_text: selectedText.trim()
  })
```

On success: invalidate `['wikiFacts']`.

### `useVoteFact()`

"Ok..." never calls this. Only "Wow really?" and "Knew already".

```js
// Cast or change vote:
supabase
  .from('fact_votes')
  .upsert(
    { fact_id: factId, user_id: userId, vote: voteType },
    { onConflict: 'fact_id,user_id' }
  )
```

On success: invalidate `['factVotes', userId]`.

---

## Component Specifications

### `CraziestFactsSection.jsx`

Renders exactly one `FactCard` at a time. Manages all queue and transition state internally.

**Internal state (representative):**
- `queue` — array of fetched facts; the visible card is always `queue[0]`
- `sort` — `'popular'` | `'newest'`
- Loading / exhausted / error flags, `sessionSeen` for prefetch excludes, etc.

**Queue refetch trigger:** when `queue.length <= 3` (and not exhausted), silently fetch the next batch and append.

**Section layout:**
- Outer `<section>`: full width, `bg-white`, **no** border on the section wrapper.
- **Header strip:** full-width `bg-primary` bar (`px-4 py-3 md:px-6`), flat (no rounded corners / shadow). **LTR:** white light-bulb outline SVG (`currentColor` / `aria-hidden`) + `<h2>` **Craziest Facts** with `text-lg font-semibold leading-tight tracking-tight text-white`. Sort toggle sits on the same strip (`sm+`: row, space-between); toggle container `border-white/35`, active segment `bg-white text-primary`, inactive `text-white/95 hover:bg-white/10`.
- **Body:** `px-4 py-4 md:px-6` wrapping errors, skeleton, `FactCard`, and empty states (those inner blocks keep their own borders as before).
- **`FactSubmitModal` `<h2>` titles** (**Submit a Crazy Fact**, **Fact submitted**) stay **`text-lg font-semibold leading-tight tracking-tight text-primary`** on the modal’s white surface (not the strip’s white-on-primary treatment).

```
┌──────────────────────────────────────────────────────┐  ← primary strip
│ (light bulb) Craziest Facts [ Most Popular | Newest ] │
└──────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│                   [ FactCard ]                      │
└─────────────────────────────────────────────────────┘
```

**End of queue state:**
```
You've seen all the facts!
Read more articles and submit your own discoveries.
[Read an article →]
```
**Loading state:** one skeleton card matching card dimensions.

**Empty DB state:**
```
No facts yet — be the first to share something amazing.
[Read an article →]
```

Both **Read an article** CTAs (empty table and end of queue) call **`navigateToRandomWikiArticle`**: random Wikipedia page, navigate to `/wiki/:slug` with `source: 'random'` (same as the Home **Random Article** card), plus best-effort `articles` upsert for `reading_log` FK compatibility.

### `FactCard.jsx`

Props: `{ fact, onVote, buttonsLocked, voteError, userId, user, profile }` (parent supplies auth context for submitter display fallbacks)

`onVote(type)` — called with `'up'`, `'down'`, or `'skip'`. The parent handles DB writes and queue advance.

**Layout:**
- Root wrapper: `grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-stretch gap-x-3` (full width of the Craziest Facts body column); fragment wraps grid + optional **`createPortal`** tooltip
- Bordered card column: `min-h-[240px]`, `p-4`, border + shadow + hover lift; fact quote scrolls (`flex-1` + `min-h-0` + `overflow-y-auto`); label row + divider + footer pinned below quote; **submitter handle** rendered **without** `@`
- **Submitter hover:** when `fact.user_id` is set, **`useFactSubmitterTooltip`** + **`FactSubmitterTooltip`** (see Card Layout bullet)
- Reaction buttons in a separate grid column (`w-[9.5rem]`, `self-stretch`, `flex-col gap-2`); up/down `flex-1`, **Ok…** `shrink-0 py-2`; up/down rows are `flex-row` with wider Reddit-style arrows (`w-6`) left of text; vote error row `col-span-2` below

**Button states:**
- Default: outlined, muted
- While `useVoteFact` is pending (up/down): all three buttons disabled
- Signed out: all three redirect to `/auth?returnTo=/`
- "Ok..." has no active/selected state ever

### `TextSelectionButton.jsx`

- Listens to `selectionchange` on `document`
- Shows when selection length is between 10 and 500 characters
- Positions near selection end using `getBoundingClientRect()`
- Label: `"Submit as Crazy Fact"`
- On click: opens `FactSubmitModal` with selected text
- Only renders when user is signed in and on `/wiki/:wikiSlug`

### `FactSubmitModal.jsx`

- **Modal `<h2>` typography:** **Submit a Crazy Fact** and **Fact submitted** use `text-lg font-semibold leading-tight tracking-tight text-primary` (same as the Home **Craziest Facts** section title; sans — never `font-serif` on these headings). The read-only textarea keeps `font-serif` for the wiki excerpt.
- Title: `"Submit a Crazy Fact"`
- Read-only textarea with selected text
- Character count: `"142 / 500"`
- Source: `"From: {display_title}"`
- Warning: `"Facts cannot be edited after submission"`
- Buttons: `Cancel` | `Submit Fact`
- Loading and error states
- Prop `submitSucceeded`: when true after a successful insert, the modal does not auto-close; it shows title **Fact submitted**, a short success message (Craziest Facts on home), emerald-accent panel, and a single **Close** button

---

## Interaction State Machine

```
IDLE (card visible, buttons active)
  │
  ├── "Wow really?" or "Knew already" clicked
  │     → vote mutation pending (buttons disabled)
  │     → write vote to DB
  │     → on success: pop queue → IDLE (next card, no animation)
  │
  ├── "Ok..." clicked
  │     → pop queue immediately (no DB write)
  │     → IDLE (next card)
  │
  └── vote mutation fails
        → show inline error on card
        → buttons re-enabled
        → card does NOT advance
        → IDLE (same card)
```

---

## Page Layout After Changes

### Home page (top to bottom):
```
Navbar
HomeHeroRow (today's article)
ReadingProgressBar
RandomWikiSection
CraziestFactsSection   ← new
CommunityProgressBar
StreakLeaderboard
```

### Wiki article page:
```
Navbar
Article header bar (title, mark as read, favorite, notes)
[Rendered Wikipedia HTML]
TextSelectionButton    ← new, floats near selection
```

---

## To-Do List

### Phase 1 — Text selection and submission
- [ ] Create `TextSelectionButton.jsx` — listens to `selectionchange`, positions near selection
- [ ] Create `FactSubmitModal.jsx` — confirmation modal with character count
- [ ] Create `useSubmitFact.js` hook — insert mutation with cache invalidation
- [ ] Wire `TextSelectionButton` into the wiki article page (signed-in users only)
- [ ] Test text selection on desktop
- [ ] Verify 10–500 character constraint enforced in UI before submission

### Phase 2 — Card UI
- [ ] Create `FactCard.jsx` — bordered layout, fact body + footer row + three buttons (no flip / back face)
- [ ] Implement three button states including disabled while vote mutation is pending
- [ ] Test advance: after successful up/down vote, next card shows immediately; skip advances immediately

### Phase 3 — Queue management and home section
- [ ] Create `useWikiFacts.js` — batch fetch with sort and exclude filter
- [ ] Create `useFactVotes.js` — fetch all voted IDs for current user
- [ ] Create `useVoteFact.js` — upsert mutation
- [ ] Create `CraziestFactsSection.jsx` — queue state, sort toggle, single card slot
- [ ] Wire queue refetch when ≤ 3 cards remain
- [ ] Filter already-voted facts from queue for signed-in users
- [ ] Add `CraziestFactsSection` to `Home.jsx`
- [ ] Test sort toggle resets queue
- [ ] Test end-of-queue state
- [ ] Test empty DB state
- [ ] Test signed-out behavior (facts visible, buttons redirect to auth)
- [ ] Test vote mutation failure — card stays, error shown, buttons re-enabled

### Phase 4 — Edge cases and polish
- [ ] Handle null `user_id` on facts — show "Anonymous"
- [x] "Remove my fact" soft delete — **Profile** "My Facts" grid only (not on Home `FactCard`)
- [ ] Test fact card layout and scrolling on mobile browsers
- [ ] Test text selection on mobile (may need different trigger)
- [ ] Verify `up_count`, `down_count`, `net_score` update correctly after voting

---

## Edge Cases to Handle

| Case | Handling |
|---|---|
| User deletes account | `wiki_facts.user_id` becomes null — show "Anonymous" |
| Article removed from `articles` | Facts cascade delete |
| Fact text < 10 chars | Blocked by UI check + DB constraint |
| Fact text > 500 chars | Blocked by UI check + DB constraint |
| User votes on own fact | Allowed at DB level — optionally block in UI |
| Vote mutation fails | Show inline error, do not advance card |
| Queue runs out | Show end state with CTA |
| Sort toggle mid-session | Reset queue, fetch fresh batch in new order |
| Text selection on mobile | `selectionchange` unreliable — consider long-press trigger |
| Wikipedia HTML rendering issues | Test and add CSS overrides as needed |

---

## Notes for Future Phases

- **Profile page** — "My Facts" section with submitted facts and vote counts
- **Per-article facts** — facts from current article shown at bottom of wiki article page
- **Moderation** — report button flagging for service-role review
- **Fact categories** — inherit category from parent article once categories are built
