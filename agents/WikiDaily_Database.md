# WikiDaily — Database Structure

## Overview

The database has 7 tables:

- `profiles`, `reading_log`, `favorites`, `article_notes`, and `user_achievements` are user-specific and protected by Row Level Security (RLS).
- `articles` is public read-only and stores cached article metadata for BOTH daily and random articles.
- `achievements` is public read-only and stores achievement definitions (admin-managed; service role writes only).

```
auth.users (Supabase built-in)
    │
    └── profiles (one row per user)
            │
            ├── reading_log (one row per article read)
            │
            ├── favorites (one row per favorited article)
            │
            ├── article_notes (one note per user per article)
            │
            └── user_achievements (one row per unlocked achievement)

articles (one row per unique wiki page; daily rows are flagged; treated as append-only)
achievements (achievement definitions; admin-managed; public read)
```

---

## Table: `profiles`

Stores each user's reading stats. One row per user, created automatically when they sign up via the `handle_new_user` trigger.

| Column           | Type    | Nullable | Default | Description |
|------------------|---------|----------|---------|-------------|
| `user_id`        | uuid    | NO       | —       | Primary key. References `auth.users(id)`. Deleted automatically if the user account is deleted (`ON DELETE CASCADE`). |
| `username`       | text    | YES      | null    | Public display name (collected at signup). |
| `current_streak` | integer | NO       | 0       | Number of consecutive days the user has read an article. Resets to 1 if they miss a day. |
| `max_streak`     | integer | NO       | 0       | The highest `current_streak` the user has ever reached. Never decreases. |
| `last_read`      | date    | YES      | null    | The date of the user's most recent read. Used to calculate whether the streak should increment, reset, or stay the same. Null for brand new users. |
| `total_read`     | integer | NO       | 0       | Total number of articles the user has read. Incremented on every new `reading_log` insert. |
| `total_random_read` | integer | NO       | 0       | Total number of random articles the user has read. Incremented on every new `reading_log` insert where `source = 'random'`. Used for random-read achievement unlocks. |

**RLS Policies:**

- `SELECT` — user can only read their own row
- `UPDATE` — user can only update their own row
- **Recommended**: allow `INSERT` for the authenticated user's own `user_id` so the app can self-heal if a `profiles` row is manually deleted (useful in development). The `handle_new_user` trigger still creates the row on signup, but this policy enables safe recreation.

**SQL (run in Supabase SQL editor):**

```sql
-- PROFILES: allow a signed-in user to insert their own row
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);
```

If you already have an `INSERT` policy and want to replace it, drop it first:

```sql
drop policy if exists "profiles_insert_own" on public.profiles;
```

**Trigger: `handle_new_user`**

Runs automatically after a new row is inserted into `auth.users` (i.e. every new signup). Creates a blank `profiles` row for that user so the app never has to handle a "profile not found" case.

If you collect `username` on signup, the recommended flow is:

- Frontend calls `supabase.auth.signUp(..., options: { data: { username } })` so `username` is stored in `auth.users.raw_user_meta_data`.
- The `handle_new_user` trigger copies that value into `profiles.username` at insert time.

---

## Public streak leaderboard (Home page)

Because `profiles` is RLS-protected (users can only `SELECT` their own row), the Home page leaderboard must read from a **public** view/RPC that safely exposes only non-sensitive fields.

Recommended approach: a **Security Definer RPC** that returns the top users by `current_streak`.

### RPC: `public.public_streak_leaderboard(limit_count int)`

**What it returns (public):**

- `user_id` (uuid)
- `username` (text, coerced to `'Anonymous'` when null/blank)
- `current_streak` (int)
- `total_read` (int) — used by the Home streak leaderboard UI for reader level (`lib/levels.js`)

**Ordering:**

1. `current_streak DESC`
2. `max_streak DESC` (tie-breaker)
3. `username ASC`
4. `user_id ASC`

**SQL (run in Supabase SQL editor):**

```sql
-- Adding/removing columns changes the function’s return type; drop first if replacing.
drop function if exists public.public_streak_leaderboard(int);

create or replace function public.public_streak_leaderboard(limit_count int default 8)
returns table (
  user_id uuid,
  username text,
  current_streak int,
  total_read int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id,
    coalesce(nullif(btrim(p.username), ''), 'Anonymous') as username,
    p.current_streak,
    coalesce(p.total_read, 0)::int as total_read
  from public.profiles p
  order by
    p.current_streak desc,
    p.max_streak desc,
    username asc,
    p.user_id asc
  limit greatest(1, least(coalesce(limit_count, 8), 50));
$$;

revoke all on function public.public_streak_leaderboard(int) from public;
grant execute on function public.public_streak_leaderboard(int) to anon, authenticated;
```

> Notes:
> - This is intentionally **read-only** and returns only leaderboard-safe fields.
> - If you already deployed the older 3-column version, run the `drop function` above once so the new `returns table` can be applied.
> - If you later want “weekly leaderboard” logic, add a second RPC based on `reading_log` aggregates; do not overload this one.

### RPC: `public.collective_reads_count()`

**Purpose:** Home page **community reading goals** bar. `reading_log` is RLS-protected, so a **security definer** aggregate is required for a global count.

**Returns:** a single `bigint` — `COUNT(*)` on `public.reading_log` (no user data, slugs, or timestamps).

**SQL (run in Supabase SQL editor):**

```sql
create or replace function public.collective_reads_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.reading_log;
$$;

revoke all on function public.collective_reads_count() from public;
grant execute on function public.collective_reads_count() to anon, authenticated;
```

> Notes:
> - **Safe:** one aggregate number only; `anon` and `authenticated` need **execute** so the public Home page can load the bar.
> - **SECURITY DEFINER** bypasses RLS only to count rows; nothing sensitive is returned.
> - Uses `reading_log` as the source of truth (aligned with per-user reconciliation in the app).
> - If this RPC is missing, the Home collective bar shows an error state with **Retry** until the function is deployed.

## Table: `reading_log`

Records every article a user has read. One row per user per day (enforced by the unique constraint). This is the source of truth for the History page.

| Column      | Type        | Nullable | Default        | Description |
|-------------|-------------|----------|----------------|-------------|
| `id`        | bigserial   | NO       | auto-increment | Primary key. Auto-incrementing integer. |
| `user_id`   | uuid        | NO       | —              | References `profiles(user_id)`. Deleted automatically if the profile is deleted (`ON DELETE CASCADE`). |
| `wiki_slug` | text        | YES      | —              | The Wikipedia article slug. Foreign key → `articles(wiki_slug)`. Set to null if the referenced article is ever deleted (`ON DELETE SET NULL`). |
| `read_at`   | timestamptz | YES      | `NOW()`        | Full timestamp of when the article was marked as read. Useful for future analytics. |
| `read_date` | date        | NO       | `CURRENT_DATE` | The date portion of the read, stored explicitly. Used by the unique constraint to prevent logging the same article twice on the same day. |
| `source`    | text        | NO       | `'daily'`       | Tracks where the article came from: `CHECK (source IN ('daily', 'random'))`. |

**Unique Constraint: one row per user+article+day**

`UNIQUE (user_id, wiki_slug, read_date)` — one log entry per user per article per day. This allows multiple different articles on the same day, while preventing double-logging the same article for that day.

**RLS Policies:**

- `SELECT` — user can only read their own log entries
- `INSERT` — user can only insert rows where `user_id` matches their own auth ID

---

## Table: `favorites`

Stores a user's favorited articles (separate from `reading_log`). One row per user per article.

| Column       | Type        | Nullable | Default | Description |
|--------------|-------------|----------|---------|-------------|
| `id`         | bigserial   | NO       | auto-increment | Primary key. Auto-incrementing integer. |
| `user_id`    | uuid        | NO       | —       | References `profiles(user_id)`. Deleted automatically if the profile is deleted (`ON DELETE CASCADE`). |
| `wiki_slug`  | text        | NO       | —       | References `articles(wiki_slug)` with `ON DELETE RESTRICT` to enforce `articles` as append-only. |
| `created_at` | timestamptz | NO       | `NOW()` | When the user favorited the article. |

**Unique Constraint: one favorite per user+article**

`UNIQUE (user_id, wiki_slug)`

**Index (fast list):**

Recommended for Profile favorites list:

`INDEX (user_id, created_at DESC)`

**RLS Policies:**

- `SELECT` — user can only read their own favorites
- `INSERT` — user can only insert favorites for themselves (`auth.uid() = user_id`)
- `DELETE` — user can only delete their own favorites

---

## Table: `article_notes`

Stores a user's private notes per Wikipedia article. One row per user per article.

| Column       | Type        | Nullable | Default | Description |
|--------------|-------------|----------|---------|-------------|
| `id`         | bigserial   | NO       | auto-increment | Primary key. Auto-incrementing integer. |
| `user_id`    | uuid        | NO       | —       | References `profiles(user_id)`. Deleted automatically if the profile is deleted (`ON DELETE CASCADE`). |
| `wiki_slug`  | text        | NO       | —       | References `articles(wiki_slug)` with `ON DELETE RESTRICT` to enforce `articles` as append-only. |
| `content`    | text        | NO       | —       | Note content. Constrained to 10,000 characters to prevent abuse: `CHECK (char_length(content) <= 10000)`. |
| `created_at` | timestamptz | NO       | `NOW()` | When the note row was created. |
| `updated_at` | timestamptz | NO       | `NOW()` | Updated automatically via trigger on every update. |

**Unique Constraint: one note per user+article**

`UNIQUE (user_id, wiki_slug)`

**Index (fast list):**

Recommended for Profile “Recent notes” list:

`INDEX (user_id, updated_at DESC)`

**RLS Policies:**

- `SELECT` — user can only read their own notes
- `INSERT` — user can only insert notes for themselves (`auth.uid() = user_id`)
- `UPDATE` — user can only update their own notes
- `DELETE` — user can only delete their own notes

**SQL (run in Supabase SQL editor):**

```sql
-- ARTICLE_NOTES
create table article_notes (
  id         bigserial primary key,
  user_id    uuid not null references profiles(user_id) on delete cascade,
  wiki_slug  text not null references articles(wiki_slug) on delete restrict,
  content    text not null check (char_length(content) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_user_article_note unique (user_id, wiki_slug)
);

-- Index for fast single note lookup (used in WikiIframe)
create index idx_article_notes_user_slug
  on article_notes (user_id, wiki_slug);

-- Index for recent notes list (used in Profile)
create index idx_article_notes_user_updated
  on article_notes (user_id, updated_at desc);

-- Trigger: auto-update updated_at on edit
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger article_notes_updated_at
  before update on article_notes
  for each row
  execute function update_updated_at();

-- RLS: article_notes
alter table article_notes enable row level security;

create policy "Users can read own notes"
  on article_notes for select
  using (auth.uid() = user_id);

create policy "Users can insert own notes"
  on article_notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notes"
  on article_notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own notes"
  on article_notes for delete
  using (auth.uid() = user_id);
```

---

## Table: `achievements`

Stores achievement definitions. Admin-managed — written once at setup, read by everyone. Never written to by client code.

| Column      | Type        | Nullable | Default | Description |
|-------------|-------------|----------|---------|-------------|
| `id`        | bigserial   | NO       | auto    | Primary key. |
| `type`      | text        | NO       | —       | Achievement category: CHECK (type IN ('total_read', 'random_read', 'streak')). |
| `threshold` | integer     | NO       | —       | The number to reach to unlock (e.g. 10). |
| `label`     | text        | NO       | —       | Display name shown to the user (e.g. "Apprentice"). |
| `description`| text       | NO       | —       | Short description (e.g. "Read 10 articles"). |
| `icon`      | text        | NO       | —       | Emoji used in the UI (e.g. "🎓"). |
| `created_at`| timestamptz | NO       | NOW()   | When the definition was created. |

Unique constraint: UNIQUE (type, threshold) — one definition per type+threshold combination.

RLS Policies:
- SELECT — anyone can read (including unauthenticated users)
- No INSERT, UPDATE, or DELETE policies — only service role can modify definitions

Seeded definitions (14 total):

Total read: 1 (First Step), 5 (Getting Started), 10 (Apprentice), 50 (Scholar), 100 (Master)
Random read: 1 (Explorer), 5 (Adventurer), 10 (Wanderer), 25 (Discoverer), 50 (Pioneer)
Streak: 3 (Hat Trick), 7 (On Fire), 30 (Dedicated), 100 (Legend)

## Table: `user_achievements`

Records which achievements each user has unlocked. One row per user per achievement. Permanent — rows are never deleted.

| Column          | Type        | Nullable | Default | Description |
|-----------------|-------------|----------|---------|-------------|
| `id`            | bigserial   | NO       | auto    | Primary key. |
| `user_id`       | uuid        | NO       | —       | References profiles(user_id). ON DELETE CASCADE. |
| `achievement_id`| bigint      | NO       | —       | References achievements(id). ON DELETE RESTRICT. |
| `unlocked_at`   | timestamptz | NO       | NOW()   | When the achievement was earned. |
| `notified`      | boolean     | NO       | false   | Whether the unlock toast has been shown to the user. Flipped to true after the toast displays. |

Unique constraint: UNIQUE (user_id, achievement_id) — same achievement cannot be unlocked twice.

Index: idx_user_achievements_notified ON (user_id, notified) WHERE notified = false — fast query for pending toast notifications.

RLS Policies:
- SELECT — authenticated users can only read their own rows
- INSERT — authenticated users can only insert their own rows
- UPDATE — authenticated users can only update their own rows (needed to flip notified = true after toast)
- No DELETE policy — achievements are permanent once earned

---

## Table: `articles`

Unified replacement for the old `daily_articles` + `article_cache`.

This table stores cached article metadata for BOTH daily featured articles and random picked articles:

- Daily articles: `is_daily = true` and `featured_date = <today UTC date>`
- Random articles: `is_daily = false` and `featured_date = NULL`

| Column          | Type        | Nullable | Default | Description |
|-----------------|------------|----------|---------|-------------|
| `wiki_slug`     | text       | NO       | —       | Primary key. Wikipedia page key, e.g. `Game_theory`. |
| `featured_date`| date       | YES      | null    | UTC calendar day when the article is featured. `NULL` for random-only articles. Marked `UNIQUE` so only one daily article can exist per day. |
| `display_title`| text       | NO       | —       | Human-readable title cached from the Wikipedia API. |
| `image_url`    | text       | YES      | null    | Thumbnail image URL cached from the Wikipedia API (`originalimage.source`). |
| `description`  | text       | YES      | null    | Short extract cached from the Wikipedia API (`extract`). |
| `cached_at`    | timestamptz| YES      | now()   | When this metadata was cached/upserted. |
| `is_daily`      | boolean    | NO       | false   | Distinguishes daily vs random articles in one table. |

**RLS Policies:**

- `SELECT` — anyone can read (including unauthenticated users)
- No `INSERT`, `UPDATE`, or `DELETE` policies for clients — only the server-side / service-role code can write to this table using `SUPABASE_SERVICE_ROLE_KEY`.

### How daily picker writes work (server-side)

The Node script `scripts/daily-picker.js` runs locally or via GitHub Actions (service role key). On each run it:

1. Uses today's UTC date as `featured_date` for the featured article.
2. If a row already exists for today's featured date, it exits successfully without changing data (idempotent).
3. Otherwise loads slugs from `scripts/vital-articles.csv`, excludes any slug already used for a daily article, and picks a random unused slug.
4. Fetches `https://en.wikipedia.org/api/rest_v1/page/summary/{wiki_slug}` and maps the response into `display_title`, `image_url`, and `description`.
5. **Upserts** into `articles` with conflict target `wiki_slug`:
   - sets `is_daily = true`
   - sets `featured_date = <todayUtc>`
   - updates cached fields and `cached_at`

The React app can read cached fields from Supabase and does NOT need to call Wikipedia on initial page load for the featured article.

**Troubleshooting — `new row violates row-level security policy for table "articles"` on insert/upsert:** the script must use the `service_role` API key (Dashboard -> Project Settings -> API -> `service_role` secret). If `SUPABASE_SERVICE_ROLE_KEY` is accidentally set to the anon/public key, `SELECT` can still work (public read policy) while writes are blocked by RLS.

### How random article writes work (app-side fetch)

When the user clicks the Home page random picker card, the app:

1. Calls the MediaWiki random endpoint to get a random title/slug.
2. Calls Wikipedia REST summary for that slug.
3. Upserts metadata into `articles` with:

- `is_daily = false`
- `featured_date = NULL`
- `wiki_slug` as the conflict target (`onConflict: wiki_slug`)
- cached metadata fields and `cached_at`

Then it navigates to `/wiki/:wikiSlug`.

#### Logging reads on article open

When a signed-in user lands on `/wiki/:wikiSlug`, the app **auto-inserts a `reading_log` row** for that slug + day (best-effort). This is done client-side via the shared `markAsRead` mutation.

The navigation state controls the recorded source:

- Daily navigation: `{ source: 'daily' }`
- Random navigation: `{ source: 'random' }`
- Search navigation: `{ source: 'search' }` (normalized to `random` at write-time)

For random/search navigations, the app also includes a short retry loop for the `reading_log.wiki_slug -> articles.wiki_slug` foreign key timing edge case (navigation can happen before the random `articles` row is cached).

> Note: the DB enforces `CHECK (source IN ('daily','random'))`, so `source: 'search'` is normalized to `random` at write-time.

When the user triggers a random navigation from the article page ("New random article"), the app also **best-effort upserts the random article into `articles`** (same as the Home random picker). This improves the chance that the `reading_log` insert can satisfy the FK constraint.

**Important FK detail:** when caching metadata into `articles` client-side (random/search), the app always upserts using **the route slug** (`/wiki/:wikiSlug`) as `articles.wiki_slug`. Wikipedia's “normalized title” can differ from the URL slug; using the normalized title as the PK can cause `reading_log` inserts (which reference the route slug) to fail the `reading_log.wiki_slug -> articles.wiki_slug` foreign key.

If the user is not signed in, no `reading_log` entry is created.

> Note: if your project keeps `articles` as strict read-only for anon/authenticated clients, this client-side upsert will be blocked by RLS. In that case, move random upserts to a trusted server/edge function (service role) or add a tightly scoped write policy for the intended client role.

---

## Relationships

```
auth.users
  │  (built-in Supabase auth table)
  │
  └─── profiles.user_id  (1-to-1)
            │
            └─── reading_log.user_id  (1-to-many)
                      │
                      └─── reading_log.wiki_slug matches articles.wiki_slug
                           (FK with ON DELETE SET NULL)

profiles.user_id
  │
  └─── favorites.user_id  (1-to-many)
            │
            └─── favorites.wiki_slug matches articles.wiki_slug
                 (FK with ON DELETE RESTRICT)

profiles.user_id
  │
  └─── article_notes.user_id  (1-to-many)
            │
            └─── article_notes.wiki_slug matches articles.wiki_slug
                 (FK with ON DELETE RESTRICT)

profiles.user_id
  │
  └── user_achievements.user_id (1-to-many)
            │
            └── user_achievements.achievement_id matches achievements.id
                (FK with ON DELETE RESTRICT)
```

> `reading_log.wiki_slug` is a foreign key to `articles(wiki_slug)` with `ON DELETE SET NULL`. This means if an article row is ever deleted, the reading log entry is preserved but `wiki_slug` becomes null rather than the row being deleted. This enables Supabase nested joins between the two tables.

---

## "Today's article" query

Daily featured article is selected by `featured_date`:

```sql
SELECT *
FROM articles
WHERE featured_date = CURRENT_DATE;
```

---

## Streak Logic (how the columns work together)

On every "Mark as Read" action, the app runs this logic using `profiles.last_read`:

```
today = current UTC date

if last_read == today           -> streak unchanged (already counted today)
if last_read == today - 1 day  -> current_streak + 1
else                            -> current_streak = 1

if current_streak > max_streak -> max_streak = current_streak

last_read  = today
total_read = total_read + 1
total_random_read = total_random_read + 1  (only when source = 'random')
```

Then a new row is inserted into `reading_log` (with `source = 'daily'` or `source = 'random'` depending on how the article was obtained).

If the insert is rejected by the unique constraint (`UNIQUE (user_id, wiki_slug, read_date)`), the app knows the user already logged this article today and skips the profile update.

## Achievement Unlock Logic

After every successful markAsRead mutation, the frontend checks for newly unlocked achievements by comparing the updated profile values against all achievement thresholds:

- type 'total_read'   → compare profiles.total_read against threshold
- type 'random_read'  → compare profiles.total_random_read against threshold  
- type 'streak'       → compare profiles.current_streak against threshold

For each achievement where the value >= threshold and no existing row in user_achievements:
1. Insert a row into user_achievements with notified = false
2. On next page load (or immediately), query user_achievements WHERE notified = false
3. Show a toast notification for each pending achievement
4. Update notified = true for each shown achievement

The notified column ensures the toast shows exactly once per achievement, even across sessions and devices.

### Self-healing `total_read`

`reading_log` is the source of truth for "how many articles the user has read" (it includes both `daily` and `random` via the `source` column).

To prevent drift (e.g. if a `reading_log` insert succeeds but a subsequent `profiles` update fails), the app periodically reconciles `profiles.total_read` to match `COUNT(*)` of that user's `reading_log` rows.
