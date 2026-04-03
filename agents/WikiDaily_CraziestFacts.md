# WikiDaily — Craziest Facts Feature Specification

## Overview

A community-driven section on the Home page where users discover interesting facts submitted by other readers. Facts are shown **one card at a time** — the user must interact with each card to advance to the next. Submitting a fact requires selecting text directly from a rendered Wikipedia article page inside the app.

---

## How It Works (User Flow)

### Discovering facts
1. The Home page shows a single fact card
2. User reads the fact and chooses one of three actions:
   - **"Wow really?"** — records an up vote, reveals the net score, flips to next card
   - **"Ok..."** — skips silently, no vote recorded, flips to next card immediately
   - **"Knew already"** — records a down vote, reveals the net score, flips to next card
3. After clicking "Wow really?" or "Knew already" — the net score fades in for 1.5 seconds before the card flips
4. After clicking "Ok..." — the card flips immediately with no score reveal
5. When the queue runs out — a friendly end state is shown

### Submitting a fact
1. User reads a Wikipedia article on the `/wiki/:wikiSlug` page
2. User selects (highlights) a sentence or short paragraph from the article text
3. A "Submit as Crazy Fact" button appears near the selection
4. User clicks the button — a confirmation modal opens with the selected text pre-filled
5. User confirms → fact is inserted into `wiki_facts` and enters the queue for other users
6. The modal stays open and switches to a **Fact submitted** success view (message + **Close**); the user dismisses when ready

**Submitter display (username + level):** Rows store denormalized `submitter_username` and `submitter_total_read` from `profiles` at insert time (DB trigger). Before insert, `useSubmitFact` upserts `profiles` with **`user_id` only** unless it has a non-empty username to set — it prefers the loaded `profile.username`, then `auth` metadata — so an upsert never sends `username: null` and wipes an existing display name (which would leave snapshots empty for everyone else). On the Home card, `FactCard` mirrors `ProfileHeader` fallbacks (profile → metadata → email local-part) **only when the fact’s `user_id` matches the signed-in user**, so the viewer still sees their real handle/level if snapshots are missing (e.g. older rows).

### Sorting
- Default sort: **Most Popular** (`ORDER BY net_score DESC`)
- Alternative sort: **Newest** (`ORDER BY created_at DESC`)
- Toggle sits above the card — changing sort resets the queue from the beginning

---

## Card Layout

```
┌──────────────────────────────────────────┐
│                                          │
│  Mantis Shrimp                           │
│  ──────────────────────────────────────  │
│                                          │
│  "The mantis shrimp can punch with the   │
│   force of a bullet, accelerating at     │
│   over 10,000g of force."                │
│                                          │
│  ──────────────────────────────────────  │
│  [avatar]  @username                     │
│            Level 2 · Seeker              │
│                                          │
│  [Wow really?]  [Ok...]  [Knew already]  │
│                                          │
│      ← after voting (not Ok...) →        │
│            Net score: +47                │
│                                          │
└──────────────────────────────────────────┘
```

**Card elements (top to bottom):**
- Article name — same typography as the daily `ArticleCard` title (`text-2xl font-semibold leading-tight tracking-tight text-primary`), links to `/wiki/${wiki_slug}`
- Thin divider
- Fact text — same body style as the daily article description (`text-sm leading-relaxed text-slate-600`); full text always visible (no line clamp on a single card)
- Thin divider
- Submitter row — small avatar circle (initials) on the left, `@username` and `Level X · Name` stacked on the right
- Three action buttons — equal width, full row
- Net score — hidden until user clicks "Wow really?" or "Knew already". Shows as `Net score: +47`. Fades in with a 300ms animation. Never shown after "Ok..."

---

## Flip Card Animation

The card uses a CSS 3D flip animation between facts.

**Front face** — the fact card (article name, fact text, submitter, buttons)
**Back face** — subtle WikiDaily wordmark or logo centered on a warm parchment background (visible briefly during the flip)

**Interaction timing:**
1. User clicks "Wow really?" or "Knew already"
2. Vote written to DB
3. Net score fades in (300ms)
4. After 1.5 seconds: card flips on Y axis (600ms CSS transition)
5. Next card pre-fetched — loads instantly on front face
6. Card flips back to front showing new fact

For "Ok...":
1. Card flips immediately (no score reveal, no delay)

**CSS implementation:**
```css
.card-container {
  perspective: 1000px;
}
.card {
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}
.card.flipping {
  transform: rotateY(180deg);
}
.card-front, .card-back {
  backface-visibility: hidden;
}
.card-back {
  transform: rotateY(180deg);
}
```

**`prefers-reduced-motion` fallback:** skip the 3D flip, use a 300ms opacity fade instead. Same timing logic applies.

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
- `idx_wiki_facts_user_id` — `(user_id, created_at DESC)` WHERE `is_deleted = FALSE` — profile page (future)

**RLS Policies:**
- `SELECT` — anyone can read facts where `is_deleted = FALSE`
- `INSERT` — authenticated users only, own `user_id`
- `UPDATE` — authenticated users can only update own facts, only to set `is_deleted = TRUE`
- No `DELETE` — only service role

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
| `frontend/src/components/CraziestFactsSection.jsx` | Section container — manages queue, sort, and flip state |
| `frontend/src/components/FactCard.jsx` | Single fact card with flip animation and three action buttons |
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

**Internal state:**
- `queue` — array of fetched facts not yet seen
- `currentIndex` — which fact is currently displayed
- `isFlipping` — true during the 600ms flip animation
- `showScore` — true after voting "Wow really?" or "Knew already", false otherwise
- `sort` — `'popular'` | `'newest'`

**Queue refetch trigger:** when `queue.length - currentIndex <= 3`, silently fetch next batch and append to queue.

**Section layout:**
```
"Craziest Facts"               [Most Popular | Newest]
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

Props: `{ fact, showScore, onVote, isVoting, isFlipping }`

`onVote(type)` — called with `'up'`, `'down'`, or `'skip'`. The parent handles DB writes and flip logic.

**Front face:**
- Article name (same classes as daily `ArticleCard` title; links to `/wiki/slug`)
- Divider
- Full fact text (same body classes as daily article description; no truncation)
- Divider
- Submitter: avatar circle + `@username` + `Level X · Name`
- Three buttons: `[Wow really?]` `[Ok...]` `[Knew already]`
- Net score (hidden until `showScore = true`, never shown after "skip")

**Net score formatting:**
- Positive: `Net score: +47` in green
- Zero: `Net score: 0` in muted gray
- Negative: `Net score: -3` in red

**Button states:**
- Default: outlined, muted
- `isVoting = true`: all three buttons disabled
- Signed out: all three redirect to `/auth?returnTo=/`
- "Ok..." has no active/selected state ever

**Back face:**
- WikiDaily wordmark centered
- Warm parchment background

### `TextSelectionButton.jsx`

- Listens to `selectionchange` on `document`
- Shows when selection length is between 10 and 500 characters
- Positions near selection end using `getBoundingClientRect()`
- Label: `"Submit as Crazy Fact"`
- On click: opens `FactSubmitModal` with selected text
- Only renders when user is signed in and on `/wiki/:wikiSlug`

### `FactSubmitModal.jsx`

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
  │     → isVoting = true (buttons disabled)
  │     → write vote to DB
  │     → on success: isVoting = false, showScore = true
  │     → wait 1500ms
  │     → isFlipping = true
  │     → after 600ms: currentIndex++, isFlipping = false, showScore = false
  │     → IDLE (next card)
  │
  ├── "Ok..." clicked
  │     → isFlipping = true immediately (no DB write, no score)
  │     → after 600ms: currentIndex++, isFlipping = false
  │     → IDLE (next card)
  │
  └── vote mutation fails
        → isVoting = false
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

### Phase 2 — Card UI and flip animation
- [ ] Create `FactCard.jsx` with front and back faces
- [ ] Implement CSS 3D flip on Y axis (600ms)
- [ ] Implement `prefers-reduced-motion` fallback (fade instead of flip)
- [ ] Implement net score fade-in (300ms, hidden for "Ok...")
- [ ] Implement three button states including disabled during `isVoting`
- [ ] Test flip timing: 1.5s delay after vote, immediate for "Ok..."

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
- [ ] Add "Remove my fact" soft delete on user's own cards
- [ ] Test flip animation on mobile browsers
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
