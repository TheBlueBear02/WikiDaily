# WikiDaily — Database Structure

## Overview

The database has 3 tables. Two of them (`profiles`, `reading_log`) are user-specific and protected by Row Level Security. One (`daily_articles`) is public read-only, written only by the server-side picker script.

```
auth.users (Supabase built-in)
    │
    └── profiles (one row per user)
            │
            └── reading_log (one row per article read)

daily_articles (one row per day, shared by all users)
```

---

## Table: `profiles`

Stores each user's reading stats. One row per user, created automatically when they sign up via the `handle_new_user` trigger.

| Column           | Type    | Nullable | Default | Description |
|------------------|---------|----------|---------|-------------|
| `user_id`        | uuid    | NO       | —       | Primary key. References `auth.users(id)`. Deleted automatically if the user account is deleted (`ON DELETE CASCADE`). |
| `username`       | text    | YES      | null    | Public display name (collected at signup). Should be unique (recommended via a unique index). |
| `current_streak` | integer | NO       | 0       | Number of consecutive days the user has read an article. Resets to 1 if they miss a day. |
| `max_streak`     | integer | NO       | 0       | The highest `current_streak` the user has ever reached. Never decreases. |
| `last_read`      | date    | YES      | null    | The date of the user's most recent read. Used to calculate whether the streak should increment, reset, or stay the same. Null for brand new users. |
| `total_read`     | integer | NO       | 0       | Total number of articles the user has read. Incremented on every new `reading_log` insert. |

**RLS Policies:**
- `SELECT` — user can only read their own row
- `UPDATE` — user can only update their own row
- No `INSERT` policy needed — the `handle_new_user` trigger handles creation using the service role

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
| `wiki_slug` | text        | NO       | —              | The Wikipedia article slug (e.g. `Game_theory`). Matches the `wiki_slug` in `daily_articles`. |
| `read_at`   | timestamptz | YES      | `NOW()`        | Full timestamp of when the article was marked as read. Useful for future analytics. |
| `read_date` | date        | NO       | `CURRENT_DATE` | The date portion of the read, stored explicitly. Used by the unique constraint to prevent logging the same article twice on the same day. |

**Unique Constraint: `unique_user_date_read`**
`UNIQUE (user_id, read_date)` — a user can only have one log entry per calendar day. Any attempt to insert a second row for the same user on the same date will be rejected at the database level, regardless of app logic.

**RLS Policies:**
- `SELECT` — user can only read their own log entries
- `INSERT` — user can only insert rows where `user_id` matches their own auth ID

---

## Table: `daily_articles`

Stores the featured article for each day. Shared across all users — everyone sees the same article on the same day. Written exclusively by the server-side daily picker script using the service role key.

| Column          | Type | Nullable | Default | Description |
|-----------------|------|----------|---------|-------------|
| `date`          | date | NO       | —       | Primary key. The calendar date this article is featured (e.g. `2026-03-29`). One row per day. |
| `wiki_slug`     | text | NO       | —       | The Wikipedia article slug used to build the API URL: `https://en.wikipedia.org/api/rest_v1/page/summary/{wiki_slug}` |
| `display_title` | text | NO       | —       | The human-readable article title from the Wikipedia API (`displaytitle` field). Cached here so the app doesn't need a Wikipedia API call just to show the title. |
| `image_url`     | text | YES      | null    | Thumbnail image URL from the Wikipedia API (`originalimage.source`). Nullable because not all Wikipedia articles have images. |
| `description`   | text | YES      | null    | Short extract or description from the Wikipedia API (`extract`). Cached here for fast loading. Nullable for articles with no extract. |

**RLS Policies:**
- `SELECT` — anyone can read (including unauthenticated users)
- No `INSERT`, `UPDATE`, or `DELETE` policies — only the server-side picker script can write to this table using the `SUPABASE_SERVICE_ROLE_KEY`

### Daily picker writes (server-side)

The Node script `scripts/daily-picker.js` runs locally or via GitHub Actions (service role key). On each run it:

1. Uses **today’s UTC date** as the primary key `date`.
2. If a row for that date already exists, it exits successfully without changing data (idempotent).
3. Otherwise loads slugs from `scripts/vital-articles.csv`, excludes any `wiki_slug` already present in `daily_articles`, and picks a random unused slug.
4. **GET** `https://en.wikipedia.org/api/rest_v1/page/summary/{wiki_slug}` and maps the response into `display_title` (plain `title`, with HTML stripped from `displaytitle` if needed), `image_url` (`originalimage.source` or null), and `description` (`extract` or null).
5. **INSERT** the full row into `daily_articles`.

The React app can read cached fields from Supabase and does **not** need to call Wikipedia on initial page load for the featured article.

**Troubleshooting — `new row violates row-level security policy for table "daily_articles"` on insert:** the script must use the **service_role** API key (Dashboard → Project Settings → **API** → `service_role` *secret*). If `SUPABASE_SERVICE_ROLE_KEY` is accidentally set to the **anon** `public` key, `SELECT` can still work (public read policy) while `INSERT` is blocked by RLS. The picker decodes the JWT `role` claim and exits early if it is not `service_role`.

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
                      └─── links to daily_articles.wiki_slug
                           (not a FK — slugs are matched by value)
```

> `reading_log.wiki_slug` is not a foreign key to `daily_articles.wiki_slug` by design. This keeps the reading log intact even if a `daily_articles` row is ever edited or deleted.

---

## Streak Logic (how the columns work together)

On every "Mark as Read" action, the app runs this logic using `profiles.last_read`:

```
today = current UTC date

if last_read == today          → already counted, do nothing
if last_read == today - 1 day → current_streak + 1
else                           → current_streak = 1

if current_streak > max_streak → max_streak = current_streak

last_read  = today
total_read = total_read + 1
```

Then a new row is inserted into `reading_log`. If the insert is rejected by the unique constraint, the app knows the user already read today and skips the profile update.
