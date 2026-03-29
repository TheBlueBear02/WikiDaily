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
- [X] Create the `daily_articles` table (date PK, wiki_title text)
- [X] Create the `user_progress` table (user_id, streak, last_read, history jsonb)
- [X] Enable Row Level Security on `user_progress`
- [X] Write RLS policy: users can SELECT/UPDATE only where `user_id = auth.uid()`
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
- [ ] `npm create vite@latest wikidaily -- --template react`
- [ ] Install dependencies:
  ```
  npm install @supabase/supabase-js @tanstack/react-query react-router-dom
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  ```
- [ ] Configure Tailwind (`tailwind.config.js` + add directives to `index.css`)
- [ ] Create `src/lib/supabaseClient.js` with `createClient()`
- [ ] Create `src/lib/wikipedia.js` with the summary fetch helper

## Phase 4 — React Query Hooks
- [ ] `useDailyArticle.js` — queries `daily_articles` for today's date → returns `wiki_title`
- [ ] `useWikiSummary.js` — takes a `wiki_title`, calls the WP REST API → returns article data
- [ ] `useUserProgress.js` — fetches `user_progress` for the logged-in user; exposes `markAsRead()` mutation

## Phase 5 — Components & Pages
- [ ] `Navbar.jsx` — links to `/` and `/history`, shows streak badge
- [ ] `StreakBadge.jsx` — reads streak from `useUserProgress`
- [ ] `ArticleCard.jsx` — renders thumbnail, title, extract, "Read Full Article" link
- [ ] `MarkAsReadButton.jsx` — runs the streak logic on click, calls Supabase update
- [ ] `Home.jsx` — composes `ArticleCard` + `MarkAsReadButton` using the two hooks
- [ ] `History.jsx` — maps over `history[]` array, fetches WP titles, lists past articles
- [ ] `App.jsx` — sets up `<BrowserRouter>` with routes for `/` and `/history`

## Phase 6 — Auth Flow
- [ ] Add a Login/Signup page (or modal) using Supabase Auth UI or a custom form
- [ ] Protect `/history` and the Mark as Read button — redirect to login if not authenticated
- [ ] Create a `user_progress` row on first login (use a Supabase Edge Function or handle in the hook)

## Phase 7 — X (Twitter) Automation *(optional for MVP)*
- [ ] Create a developer account on X and get API keys
- [ ] Write `scripts/tweet-today.js`:
  - Reads today's `wiki_title` from Supabase
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
- [ ] Handle the edge case where no article exists yet for today (show a fallback)
- [ ] Mobile-responsive layout pass
- [ ] Add Hebrew (`he.wikipedia.org`) language toggle
