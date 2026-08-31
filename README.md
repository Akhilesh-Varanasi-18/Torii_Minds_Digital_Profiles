# Torii Digital Portfolios

One public link, one portfolio per employee code. No login. Enter an employee
code to open a portfolio; create one by entering a name + code, fill the
sections, drag them into any order, and it's live at `/{employeeCode}`.

Built for **three organizations × light/dark = six themes**, all driven from a
single global token file, switchable from the top of every page — the logo
swaps per org + mode automatically.

## Stack
- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** (utilities mapped to CSS-variable theme tokens)
- **Framer Motion** (animation) · **dnd-kit** (drag-to-reorder)
- **MongoDB Atlas** (one flexible document per employee code)

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000
```
`.env.local` holds `MONGODB_URI` and `MONGODB_DB` (already set). Optional:
`GITHUB_TOKEN` raises the GitHub fetch rate limit.

## How it's organized
```
src/
  app/
    page.tsx                 landing (enter code / create)
    [code]/page.tsx          public portfolio (server-rendered)
    [code]/edit/page.tsx     the editor
    api/portfolio/…          create / read / update
    api/coding/fetch/…       fetch coding-platform stats
    globals.css              ← THE SIX THEMES live here
  lib/
    themes.ts                org metadata + per-mode logo mapping
    coding.ts                per-platform stat adapters
    mongodb.ts               Atlas connection
  components/                ThemeProvider, ThemeSwitcher, Logo, editor, portfolio
  types/portfolio.ts         the data model
```

## Theming
Every color is a semantic CSS variable (`--bg`, `--surface`, `--ink`,
`--primary`, `--gradient`, …) defined six times in `globals.css` under
`[data-org][data-mode]` selectors. To retune a brand, edit those values — the
whole app follows. Add an org by adding a token block + an entry in
`lib/themes.ts`.

## Coding-profile fetchers
| Platform | Method | Reliability |
|---|---|---|
| LeetCode | GraphQL | ✅ good |
| GitHub | official API | ✅ good |
| Codeforces | official API | ✅ good |
| CodeChef / HackerRank / GeeksforGeeks | HTML scrape | ⚠️ fragile — may need upkeep |

Stats are fetched on add and cached in the document; each profile has a refresh
button. Failed fetches degrade to a "link only" card.

## Demo
A sample portfolio lives at **`/TM0001`** (employee "Aarav Sharma"). Delete it
any time from the DB, or just leave it as a reference.
