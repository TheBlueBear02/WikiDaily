# WikiDaily — Database Structure

## Overview

The database has 3 tables:

- `profiles` and `reading_log` are user-specific and protected by Row Level Security (RLS).
- `articles` is public read-only and stores cached article metadata for BOTH daily and random articles.

```
auth.users (Supabase built-in)
    │
    └── profiles (one row per user)
            │
            └── reading_log (one row per article read)

articles (one row per unique wiki page; daily rows are flagged)
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
```

Then a new row is inserted into `reading_log` (with `source = 'daily'` or `source = 'random'` depending on how the article was obtained).

If the insert is rejected by the unique constraint (`UNIQUE (user_id, wiki_slug, read_date)`), the app knows the user already logged this article today and skips the profile update.

### Self-healing `total_read`

`reading_log` is the source of truth for "how many articles the user has read" (it includes both `daily` and `random` via the `source` column).

To prevent drift (e.g. if a `reading_log` insert succeeds but a subsequent `profiles` update fails), the app periodically reconciles `profiles.total_read` to match `COUNT(*)` of that user's `reading_log` rows.
