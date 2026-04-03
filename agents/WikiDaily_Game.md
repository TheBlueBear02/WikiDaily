# WikiDaily — Wikipedia Navigation Game

## Route

`/game` — public route (same as Home / History: no auth required to view the page). Per-feature rules (e.g. submitting a daily run, free-play PB storage) will be defined when those flows are implemented.

---

## Product concept

A **Wikipedia navigation challenge**: players start at one article and try to reach a target article by following in-wiki links only (same general idea as “Wikirace” / “Six Degrees of Wikipedia”).

### Daily Challenge

- **One shared puzzle per calendar day** for everyone: same **start** article and same **target** article.
- **Resets at midnight UTC**, aligned with the daily article cadence (same “day” boundary as the rest of WikiDaily).
- **Global leaderboard** with two rankings:
  - **Top scores by click count** (fewer clicks is better).
  - **Top scores by time** (faster is better).
- Positioning: **Wordle-style** — one puzzle per day, comparable scores, shareable.

### Free Play

- **On demand**: random **start** and **target** articles whenever the user wants.
- **Personal bests only** (per user): track the user’s best performance for that mode; **no global leaderboard** for free play.

---

## UI layout (Game page)

The Game route reuses the **Home hero row** layout for visual consistency:

- **Left column** (`HeroAside`): stacked sections with a slate-tinted wrapper and `gap-3` between panels (mirrors Home: achievements + streak column).
- **Right column** (~`70%` on `md+`): primary **play / article** surface on top, **secondary strip** below (mirrors Home: daily card + community bar).

Exact section assignment (which box is daily vs free play vs leaderboards) will be filled in as components land.

---

## Implementation status

| Area | Status |
|------|--------|
| Route + navbar link | Done (`App.jsx`, `Navbar.jsx`) |
| Page shell + hero placeholders | Done (`frontend/src/pages/Game.jsx`) |
| Daily puzzle source (start/target per UTC day) | Not implemented |
| Leaderboards (clicks + time) | Not implemented |
| Free play random pair + personal bests | Not implemented |
| In-app play / link traversal (likely `WikiIframe` or dedicated flow) | Not implemented |

Canonical high-level file map for the rest of the app: [WikiDaily_Structure.md](./WikiDaily_Structure.md). Database changes, if any, should be documented in [WikiDaily_Database.md](./WikiDaily_Database.md) when tables or RPCs are added.
