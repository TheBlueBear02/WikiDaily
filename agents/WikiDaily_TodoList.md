# WikiDaily — To-Do List

## Recommended Build Order

```
Supabase tables + RLS
    ↓
Daily picker script (so data exists to test with)
    ↓
Vite init + Tailwind + env vars
    ↓
Supabase client + Wikipedia fetch helper
    ↓
React Query hooks (useDailyArticle → useWikiSummary → useUserProgress)
    ↓
ArticleCard + Home page (can see article without auth)
    ↓
Auth flow + MarkAsReadButton + streak logic
    ↓
History page
    ↓
Deploy to Vercel
    ↓
Tweet script + GitHub Action
```

---

## Phase 1 — Supabase Setup
- [X] Create a new Supabase project
- [X] Create the `daily_articles` table (date PK, `wiki_slug`, cached article fields)
- [X] Create the `profiles` table (user_id PK, streak fields, last_read, total_read)
- [X] Create the `reading_log` table (one row per user per day)
- [X] Enable Row Level Security on user-specific tables
- [X] Write RLS policies so users can only read/write their own rows
- [ ] Enable Supabase Auth (Email/Password is enough for MVP)
- [X] Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env.local`

## Phase 2 — Daily Picker Script
- [X] Curate or download the Wikipedia Vital Articles CSV → save as `scripts/vital-articles.csv` (header `wiki_slug`)
- [X] Write `scripts/daily-picker.js`:
  - Reads the CSV; builds unused pool vs existing `daily_articles.wiki_slug`
  - Picks a random unused slug; **GET** English Wikipedia REST summary; inserts full row
  - Inserts `{ date, wiki_slug, display_title, image_url, description }` (UTC `date`, idempotent if today exists)
- [X] Test the script locally: `npm run daily-picker` or `node scripts/daily-picker.js` (requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`)
- [X] Create `.github/workflows/daily-picker.yml` — scheduled cron at 00:00 UTC + `workflow_dispatch`
- [X] Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as GitHub Actions secrets *(Settings → Secrets and variables → Actions; required before the scheduled job can write to Supabase)*

## Phase 3 — Vite + React Project Init
- [X] `npm create vite@latest frontend -- --template react`
- [X] Install dependencies (run inside `frontend/`):
  ```
  npm install
  npm install @supabase/supabase-js @tanstack/react-query react-router-dom
  npm install -D tailwindcss@3 postcss autoprefixer
  npx tailwindcss init -p
  ```
- [X] Configure Tailwind (`tailwind.config.js` + add directives to `src/index.css`)
- [X] Create `src/lib/supabaseClient.js` (getter using `createClient()`)
- [X] Create `src/lib/wikipedia.js` with the summary fetch helper

## Phase 4 — React Query Hooks
- [X] `useDailyArticle.js` — queries `daily_articles` for today’s UTC date → returns the full cached row (incl. `wiki_slug`, `display_title`, `image_url`, `description`)
- [ ] *(Deferred)* `useWikiSummary.js` — optional later if you need richer data than the cached columns
- [X] `useUserProgress.js` — aligned to `profiles` + `reading_log`; supports mark-as-read for already-authenticated users (Phase 6 adds Auth UI)

## Phase 5 — Components & Pages
- [X] `Navbar.jsx` — logo/title links to `/`; nav link to `/history`; user menu (name+avatar) with dropdown “Sign out”
- [X] `StreakBadge.jsx` — reads streak from `useUserProgress` (has a loading state to avoid auth “flash”)
- [X] `ArticleCard.jsx` — presentational card (thumbnail, title, extract, "Read now" link; internal `/wiki/:wikiSlug` navigation)
- [X] `MarkAsReadButton.jsx` — inserts into `reading_log` and updates `profiles` streak fields (works if user is already signed in)
- [X] `Home.jsx` — composes `ArticleCard` + `MarkAsReadButton` using cached `daily_articles` fields; internal viewer route is `/wiki/:wikiSlug`
- [X] `History.jsx` — public archive of past `daily_articles` (latest first; paginate later); day cards navigate to `/wiki/:wikiSlug`
- [X] `WikiIframe.jsx` — in-app Wikipedia viewer at `/wiki/:wikiSlug` using an iframe with a timed fallback to “Open in Wikipedia” if embedding is blocked
- [X] `App.jsx` — routes for `/`, `/history`, `/auth`, and `/wiki/:wikiSlug` (router is in `src/main.jsx`)

**Notes (Phase 5)**:
- **Mark as read requires an authenticated user**. Phase 6 adds the login/signup UI and can enforce route protection.
- **Already read today** is detected via the `reading_log` unique constraint and shown as a non-error UI state.

## Phase 6 — Auth Flow
- [X] Add a Login/Signup page using a custom email/password form (`/auth`)
- [X] Keep `/history` public, but show “collected” markers on cards when signed in (reads `reading_log`)
- [X] Redirect “Mark as read” to `/auth?returnTo=...` when unauthenticated
- [X] Add auth state syncing so sign-in/out instantly updates cached user state (no refresh)
- [X] Ensure the user has a `profiles` row on signup (trigger per `agents/WikiDaily_Database.md`; UI includes a short retry for timing edge cases)

## Phase 7 — X (Twitter) Automation *(Not for the MVP)*
- [ ] Create a developer account on X and get API keys
- [ ] Write `scripts/tweet-today.js`:
  - Reads today's `wiki_slug` from Supabase
  - Fetches the WP summary
  - Posts tweet with title + first sentence + site URL
- [ ] Add to the GitHub Action workflow (runs after `daily-picker.js`)
- [ ] Add X API keys as GitHub Actions secrets

## Phase 8 — Deployment
- [ ] Push repo to GitHub
- [ ] Connect to Vercel (or Netlify) — import the repo
- [ ] Add environment variables in Vercel dashboard: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] Trigger a deploy and verify the live URL

## Phase 9 — Polish *(post-MVP)*
- [ ] Loading skeleton while article fetches
- [ ] Error state if Wikipedia API is down
- [X] Handle the edge case where no article exists yet for today (show the latest available article as a fallback)
- [ ] Mobile-responsive layout pass
- [ ] Add Hebrew (`he.wikipedia.org`) language toggle
