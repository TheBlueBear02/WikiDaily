# WikiDaily — Daily Wiki Game: Implementation Plan

## Overview

A daily Wikipedia navigation game. Every player starts on the same randomly selected article and must reach a pre-selected target article by clicking links within the rendered Wikipedia content. The objective is to reach the target in the fewest clicks or fastest time. Resets at **05:00 UTC** like the daily article (matches the daily picker job schedule).

---

## Current State (already built)

- Wikipedia articles render as in-app HTML (not iframe) — link interception is already possible
- `game_challenges` and `game_sessions` tables exist in the DB with correct RLS and indexes
- `game_leaderboard_clicks` and `game_leaderboard_time` RPCs exist
- Articles table stores cached metadata for any wiki slug

---

## Game Flow

```
User visits /game
    ↓
Fetch today's challenge (start_slug + target_slug) from game_challenges
    ↓
Show pre-game screen (start article info + target article info)
    ↓
User clicks "Start Game" → timer starts → game_sessions row inserted
    ↓
Start article renders in-app
Fixed header bar shows: target article | click counter | timer
    ↓
User clicks Wikipedia links → each click increments counter → new article renders
    ↓
App checks after every navigation: does current slug === target_slug?
    ↓
YES → Game over screen → submit result → show leaderboard rank
```

---

## Database Context

### `game_challenges`
- `id`, `type` ('daily'/'free'), `date` (unique, daily only), `start_slug`, `target_slug`
- Public read — anyone can see today's challenge
- Service role writes only (daily picker script)

### `game_sessions`
- `id`, `challenge_id`, `user_id`, `clicks`, `time_seconds`, `path` (jsonb array of slugs), `completed`, `started_at`, `completed_at`
- RLS: authenticated users read/insert/update own sessions
- Completed sessions readable by anyone (for leaderboard)

### RPCs
- `game_leaderboard_clicks(challenge_id, limit)` — top N by clicks ASC then time ASC
- `game_leaderboard_time(challenge_id, limit)` — top N by time ASC then clicks ASC

---

## Daily Picker Script Changes

The existing `scripts/daily-picker.js` runs daily. Extend it to also insert a `game_challenges` row for today.

**Logic to add:**
1. Check if a `game_challenges` row already exists for today's date — if yes, exit (idempotent)
2. Pick two different slugs from `vital-articles.csv` — one for `start_slug`, one for `target_slug`
3. Ensure both slugs differ from each other and from today's daily article slug
4. Upsert both slugs into `articles` table (same pattern as daily article)
5. Insert into `game_challenges`:
```js
{
  type: 'daily',
  date: todayUtc,
  start_slug: startSlug,
  target_slug: targetSlug
}
```

**Target article selection tip:** pick well-known articles for the target (History, Science, major countries, famous people) — they have more inbound links making them reachable. The start article can be more obscure.

---

## New Routes

| Route | Description |
|---|---|
| `/game` | Game hub — shows today's challenge, leaderboard, and start button |
| `/game/play` | Active game session — article renderer + fixed HUD |
| `/game/result` | Post-game result screen |

---

## New Files to Add

| File | Description |
|---|---|
| `frontend/src/pages/GameHub.jsx` | Pre-game screen and leaderboard |
| `frontend/src/pages/GamePlay.jsx` | Active game session page |
| `frontend/src/pages/GameResult.jsx` | Post-game result and rank display |
| `frontend/src/components/game/GameHUD.jsx` | Fixed header bar during play (target, clicks, timer) |
| `frontend/src/components/game/TargetCard.jsx` | Shows target article info (title + image) |
| `frontend/src/components/game/GameLeaderboard.jsx` | Tabs for clicks and time leaderboards |
| `frontend/src/components/game/PathTrail.jsx` | Shows the articles visited so far |
| `frontend/src/hooks/useGameChallenge.js` | Fetch today's challenge from game_challenges |
| `frontend/src/hooks/useGameSession.js` | Create, update, and complete a game session |
| `frontend/src/hooks/useGameLeaderboard.js` | Fetch leaderboard via RPCs |

### Files to Update

| File | Change |
|---|---|
| `frontend/src/App.jsx` | Add three new game routes |
| `frontend/src/components/Navbar.jsx` | Add "Game" nav link |
| `scripts/daily-picker.js` | Add game challenge insertion logic |

---

## Hook Specifications

### `useGameChallenge()`

Fetches today's daily challenge with article metadata for both start and target.

```js
// React Query key: ['gameChallenge', todayUtc]

// Step 1: get today's challenge
const challenge = await supabase
  .from('game_challenges')
  .select('id, start_slug, target_slug')
  .eq('type', 'daily')
  .eq('date', todayUtc)
  .single()

// Step 2: get metadata for both articles
const articles = await supabase
  .from('articles')
  .select('wiki_slug, display_title, image_url, description')
  .in('wiki_slug', [challenge.start_slug, challenge.target_slug])
```

Returns: `{ challenge, startArticle, targetArticle }`

### `useGameSession()`

Manages the full lifecycle of a game session.

**`startSession(challengeId)`** — inserts a new session row:
```js
const { data } = await supabase
  .from('game_sessions')
  .insert({
    challenge_id: challengeId,
    user_id: userId,
    clicks: 0,
    path: [startSlug],
    completed: false,
    started_at: new Date().toISOString()
  })
  .select('id')
  .single()
// store session id in state
```

**`recordClick(sessionId, newSlug)`** — updates session on every article navigation:
```js
await supabase
  .from('game_sessions')
  .update({
    clicks: currentClicks + 1,
    path: [...currentPath, newSlug]
  })
  .eq('id', sessionId)
```

**`completeSession(sessionId, timeSeconds)`** — marks session as done:
```js
await supabase
  .from('game_sessions')
  .update({
    completed: true,
    time_seconds: timeSeconds,
    completed_at: new Date().toISOString()
  })
  .eq('id', sessionId)
```

**Important:** `recordClick` is called on every navigation. To avoid hammering the DB, debounce or batch updates — only write to Supabase every 3 clicks or on game completion. Store clicks and path in local state between writes.

### `useGameLeaderboard({ challengeId })`

```js
// Clicks leaderboard
const clicks = await supabase
  .rpc('game_leaderboard_clicks', {
    challenge_id_param: challengeId,
    limit_count: 10
  })

// Time leaderboard
const time = await supabase
  .rpc('game_leaderboard_time', {
    challenge_id_param: challengeId,
    limit_count: 10
  })
```

Returns: `{ clicksLeaderboard, timeLeaderboard }`

---

## Component Specifications

### `GameHub.jsx` (pre-game screen)

Shown at `/game`. Does not require auth to view — signed-out users can see the challenge and leaderboard but must sign in to play.

**Layout (top to bottom):**
```
"Today's Challenge"          [date]
─────────────────────────────────────
[Start Article card]   →   [Target Article card]
  image + title              image + title

[ Play Today's Game ]   ← requires auth

─────────────────────────────────────
Leaderboard
[Fewest Clicks | Fastest Time]  ← tabs

#1  @username    Level 3 · Scholar    2 clicks    0:47
#2  @username    Level 5 · Sage       3 clicks    1:12
...

[ Your result: 5 clicks in 2:34 — Rank #12 ]  ← shown if already played
```

**States:**
- Not played today → show "Play Today's Game" button
- Already played → show personal result + rank, no play button
- Not signed in → show "Sign in to play and track your rank"
- No challenge today (picker hasn't run) → show "Today's challenge isn't ready yet. Check back soon."

### `GamePlay.jsx` (active game)

Shown at `/game/play`. Requires auth — redirect to `/auth?returnTo=/game` if signed out.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  [GameHUD — fixed at top]                       │
│  Target: Quantum Mechanics    Clicks: 3  0:47   │
└─────────────────────────────────────────────────┘

[Rendered Wikipedia article HTML]

[PathTrail — fixed at bottom]
Start → Isaac Newton → Physics → ...
```

**On mount:**
1. Verify challenge exists for today
2. Check user hasn't already completed today's challenge — redirect to `/game` if yes
3. Call `startSession(challengeId)` → store `sessionId` in state
4. Start timer (local `setInterval`, 1 second tick)
5. Render start article HTML

**On every link click:**
1. Intercept the click (same pattern as existing wiki article link interception)
2. Extract slug from href
3. Increment local click counter
4. Add slug to local path array
5. Check: `slug === targetSlug`?
   - Yes → stop timer → call `completeSession` → navigate to `/game/result`
   - No → fetch and render new article HTML → call `recordClick` (debounced)

**On page unload / navigation away:**
- Warn user: "Leaving will end your game session"
- If they leave mid-game, the session stays incomplete in the DB (not counted on leaderboard)

### `GameHUD.jsx` (fixed header during play)

Fixed to top of screen during gameplay. Always visible while scrolling the article.

**Contents:**
- Left: target article title + small thumbnail image
- Center: click counter `Clicks: 3`
- Right: live timer `1:47`
- Far right: `Give up` button (marks session incomplete, returns to `/game`)

```
[🎯 Quantum Mechanics img]  Target: Quantum Mechanics  |  Clicks: 3  |  1:47  |  [Give up]
```

### `TargetCard.jsx`

Reusable card showing article info. Used in both `GameHub` and `GameHUD`.

Props: `{ article, size }` — `size: 'large'` for hub, `size: 'small'` for HUD.

Large version shows image, title, and short description.
Small version shows thumbnail and title only.

### `PathTrail.jsx`

Fixed at the bottom of the screen during gameplay. Shows the navigation path so far.

```
Magna Carta → England → British Empire → Science → ...
```

- Truncates from the left if path gets long (show last 5 articles)
- Each item is a plain text label — no links (can't go back)
- Subtle scroll animation when a new article is added

### `GameLeaderboard.jsx`

Tab component with two views: "Fewest Clicks" and "Fastest Time".

Each row shows:
- Rank number
- Username + level (using `levels.js` `getCurrentLevel`)
- Score (clicks count or time formatted as `M:SS`)
- Path length as a secondary detail

Highlight the current user's row if they appear in the top 10.
Show a separate "Your rank" row at the bottom if they're outside the top 10.

### `GameResult.jsx` (post-game screen)

Shown at `/game/result` after completing a game. Reads result from React Query cache or route state.

**Contents:**
```
🏆 You reached Quantum Mechanics!

Clicks: 5       Time: 2:34
Rank by clicks: #12 of 847 players
Rank by time:   #34 of 847 players

Your path:
Magna Carta → England → British Empire → Physics → Quantum Mechanics

[View Leaderboard]    [Share result]    [Play again tomorrow]
```

**Share result (optional for MVP):**
Pre-formatted text for clipboard copy:
```
WikiDaily Game — [date]
Magna Carta → Quantum Mechanics in 5 clicks (2:34) 🏆
Play at wikidaily.com/game
```

---

## Article Rendering in GamePlay

`GamePlay.jsx` uses the same Wikipedia HTML fetch and render pattern as the existing wiki article page — no new rendering logic needed. The key difference is link interception behavior:

**Existing wiki page:** clicking a link navigates to `/wiki/:slug` (new route)
**Game play page:** clicking a link stays on `/game/play`, re-fetches article HTML, increments click counter

The article HTML fetch function already exists in `frontend/src/lib/wikipedia.js`. Reuse it directly.

**Link interception for game:**
```js
// After rendering new article HTML, attach click handlers
articleContainer.querySelectorAll('a[href^="/wiki/"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault()
    const slug = decodeURIComponent(
      link.getAttribute('href').replace('/wiki/', '')
    )
    handleNavigation(slug)  // increment counter, check target, fetch next article
  })
})
```

---

## Timer Implementation

Client-side only — no server involvement.

```js
const [seconds, setSeconds] = useState(0)
const timerRef = useRef(null)

// Start timer when session begins
timerRef.current = setInterval(() => {
  setSeconds(s => s + 1)
}, 1000)

// Stop timer on completion
clearInterval(timerRef.current)

// Format for display
const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
```

The final `seconds` value is what gets written to `game_sessions.time_seconds` on completion.

---

## Session Update Strategy (avoiding DB spam)

Every click should not trigger a DB write — on a fast player that could be 20+ writes per minute.

**Strategy: write every 5 clicks + always write on completion**

```js
// In handleNavigation:
localClicks++
localPath.push(newSlug)

if (localClicks % 5 === 0) {
  // batch write to DB
  recordClick(sessionId, localClicks, localPath)
}

// On game completion — always write final state
completeSession(sessionId, localClicks, seconds, localPath)
```

This means if a user closes the browser mid-game, the session stays incomplete. That's acceptable — incomplete sessions don't appear on the leaderboard.

---

## Auth and Access Rules

| Action | Signed out | Signed in |
|---|---|---|
| View `/game` hub | ✅ can view | ✅ can view |
| See leaderboard | ✅ can view | ✅ can view |
| Play the game | ❌ redirect to auth | ✅ |
| Submit result | ❌ | ✅ |
| Play again same day | — | ❌ one game per challenge per user |

**One game per day enforcement:**
On `GameHub` mount, check if a completed `game_sessions` row exists for the current user and today's `challenge_id`. If yes, show the result instead of the play button.

---

## Page Layout Integration

Add "Game" to the Navbar between "History" and "Profile":

```
WikiDaily    Today  History  Game  Profile    🔥 7    @username
```

---

## To-Do List

### Phase 1 — Daily picker script update
- [ ] Extend `scripts/daily-picker.js` to check if today's game challenge already exists
- [ ] Add logic to pick two different slugs from `vital-articles.csv` for start and target
- [ ] Ensure both differ from today's daily article slug
- [ ] Upsert both slugs into `articles` table
- [ ] Insert row into `game_challenges` with `type: 'daily'`, `date`, `start_slug`, `target_slug`
- [ ] Test script locally — verify `game_challenges` row appears in Supabase
- [ ] Run script twice — verify it's idempotent (no duplicate rows)

### Phase 2 — Hooks
- [ ] Create `useGameChallenge.js` — fetch today's challenge + both article metadata
- [ ] Create `useGameSession.js` — `startSession`, `recordClick`, `completeSession` mutations
- [ ] Create `useGameLeaderboard.js` — fetch both leaderboards via RPCs
- [ ] Test hooks in isolation (can use Supabase Table Editor to manually insert a test challenge)

### Phase 3 — Game Hub page
- [ ] Create `GameHub.jsx` at `/game`
- [ ] Add route to `App.jsx`
- [ ] Add "Game" link to `Navbar.jsx`
- [ ] Build `TargetCard.jsx` (large version) — shows start and target article info
- [ ] Build `GameLeaderboard.jsx` with tabs for clicks and time
- [ ] Handle all states: no challenge, not played, already played, signed out
- [ ] Test with manually inserted challenge and session rows

### Phase 4 — Game Play page
- [ ] Create `GamePlay.jsx` at `/game/play`
- [ ] Add route to `App.jsx`
- [ ] Implement article HTML fetch and render (reuse existing wikipedia.js helper)
- [ ] Implement Wikipedia link interception for game navigation
- [ ] Implement target detection after every navigation
- [ ] Implement local click counter and path array
- [ ] Implement timer (`setInterval`, 1s tick)
- [ ] Implement session batch write strategy (every 5 clicks)
- [ ] Add "already played today" redirect on mount
- [ ] Add "leaving mid-game" warning (browser `beforeunload` event)
- [ ] Build `GameHUD.jsx` — fixed header with target, click count, timer, give up
- [ ] Build `PathTrail.jsx` — fixed footer showing navigation path
- [ ] Test full play-through: start → navigate → reach target

### Phase 5 — Game Result page
- [ ] Create `GameResult.jsx` at `/game/result`
- [ ] Add route to `App.jsx`
- [ ] Show clicks, time, rank by clicks, rank by time
- [ ] Show full path taken
- [ ] Add "Share result" copy-to-clipboard button
- [ ] Handle edge case: user navigates directly to `/game/result` without playing → redirect to `/game`

### Phase 6 — Polish and edge cases
- [ ] Handle no challenge for today (picker hasn't run) — friendly message on hub
- [ ] Handle give up flow — session marked incomplete, return to hub
- [ ] Handle target article with no image gracefully in HUD and cards
- [ ] Handle Wikipedia API failures mid-game — show retry option without losing progress
- [ ] Test with very short paths (1-2 clicks) and very long paths (20+ clicks)
- [ ] Test leaderboard ranking with multiple completed sessions
- [ ] Verify `game_leaderboard_clicks` and `game_leaderboard_time` RPCs return correct ranks
- [ ] Mobile: verify HUD doesn't obscure too much content on small screens
- [ ] Verify timer stops correctly on completion and give up

---

## Edge Cases to Handle

| Case | Handling |
|---|---|
| User already played today | Show result on hub, no play button |
| No challenge for today | Show "check back soon" message |
| Wikipedia API fails mid-game | Show retry button, preserve current click count |
| User navigates away mid-game | Browser warning + session stays incomplete |
| User clicks back button in browser | Treat as navigation away — warn and return to hub |
| Target article has no image | Show placeholder in HUD and cards |
| Very long slug with special characters | Use `decodeURIComponent` on all slugs before comparison |
| User reaches target by typing URL | Not possible — game renderer intercepts all navigation |
| Start slug === target slug | Prevented by DB constraint `CHECK (start_slug <> target_slug)` |
| Two users play simultaneously | No conflict — each has their own `game_sessions` row |

---

## Future Enhancements (not in scope now)

- Free play mode — random start and target, personal best tracking
- Animated path visualization on result screen
- "Same path as #1" comparison on result screen
- Game history on profile page
- Fastest path hint (optional, shown after completing)
- Weekly game challenge with longer time window
