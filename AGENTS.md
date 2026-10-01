# Playoffs Picture — Development Documentation

## What this is

A static Astro site (deployed as a PWA) that displays the NFL playoff picture: standings,
seeds/bubble/eliminated teams, power rankings, a full-season schedule, matchups, and a "My Teams"
favorites dashboard. All data is pre-scraped into JSON files at build/update time — there is no
runtime API, backend, or database.

## Tech stack

- **Astro 5** (SSG, no server runtime) with SCSS (`lang="scss"` in component `<style>` blocks)
- **Puppeteer + Cheerio** in standalone Node scripts (`scraper/`) to scrape data from third-party
  sites (`nfl.com`, `cbssports.com`)
- **@vite-pwa/astro** for PWA/offline support, **Critters** for critical CSS inlining
- **@vercel/analytics**, deployed on Vercel
- No test framework, no ESLint/Prettier config present in the repo

## Project structure

```
scraper/                   # Standalone Node scripts (not part of the Astro build)
  config.js                # Season config: SEASON_YEAR, week boundaries, current-week helper
  fetch-standings.js       # Scrapes cbssports.com -> src/data/standings.json
  fetch-nfl-data.js        # Scrapes nfl.com (playoff picture, full schedule, power rankings)
                           # -> src/data/playoff-picture.json + src/data/schedule.json

src/
  components/              # Atomic-design-ish split: flat components + atoms/ + molecules/
  data/                     # Generated JSON (standings.json, playoff-picture.json, schedule.json) — data, not code
  layouts/Layout.astro
  pages/index.astro         # Single page app; reads data/*.json directly via node:fs at build time
  styles/                   # _variables.scss, _mixins.scss, _base.scss, global.scss, main.scss
  utils/team-mapping.js     # City/full-name -> logo id / abbreviation lookup tables

start-sprite.js             # Pre-build step: bundles src/images/logos/*.svg into public/sprites.svg
.github/workflows/update-data.yml  # Cron job: runs `npm run update-data` and auto-commits src/data/*.json
```

## Commands

- `npm run dev` / `npm run build` — runs `start-sprite.js` first (pre/post hooks), then Astro
- `npm run update-data` — runs both scrapers in sequence, overwrites `src/data/*.json`
- No `npm test` / `npm run lint` scripts exist

## Data flow (important to understand before editing)

1. `scraper/fetch-standings.js` scrapes CBS Sports standings table → `src/data/standings.json`
   (seed, team, record per conference).
2. `scraper/fetch-nfl-data.js` scrapes NFL.com:
   - **Playoff picture** (seeds/bubble/eliminated, with probabilities/trends) via **DOM
     text-matching heuristics** (no stable selectors/IDs available on the source page). **Gated
     behind `PLAYOFF_PICTURE_MIN_WEEK` (week 8, in `scraper/config.js`)** — before that, standings
     are too volatile for bubble/eliminated to mean anything, so this section is skipped entirely
     and `src/data/playoff-picture.json` keeps empty `bubble`/`eliminated`/`seeds` arrays (the UI
     already handles empty state).
   - **Full season schedule** (`nfl.com/schedules`, all 18 regular season weeks, always scraped
     regardless of the week-8 gate) → written to `src/data/schedule.json`. Used both to enrich
     playoff-picture teams with their next opponent/remaining schedule, and to power the always-on
     `SeasonSchedule` homepage section (fills the gap during weeks 1–7).
   - **Power rankings** (`nfl.com/news/...`) via stable CSS classes (`.nfl-o-ranked-item`) — runs
     every week from week 1, not gated.
3. `scraper/config.js` centralizes the season year, the 18 weekly boundaries (derived from a single
   `REG18_END` date), and `getCurrentWeekNumber()`. **Update `SEASON_YEAR` and `REG18_END` once at
   the start of each new NFL season** — every other date is derived from them.
4. A GitHub Actions cron (`update-data.yml`) runs the scrapers on a schedule and auto-commits the
   resulting JSON directly to `main` (`file_pattern: src/data/*.json` already covers `schedule.json`).
   **This routinely diverges from any local work touching the same files** (see gotcha below).
5. `src/pages/index.astro` reads `src/data/*.json` synchronously via `node:fs` at build time and
   passes it down as props — everything is static, no client-side fetching of team data.
6. `src/utils/team-mapping.js` bridges the naming inconsistencies between the two data sources
   (e.g. "L.A. Chargers" vs "Los Angeles Chargers" vs "Chargers") to resolve a logo id used with
   `public/sprites.svg`.

## Known fragility / gotchas for future sessions

- **Local work and the `update-data.yml` cron both commit to `main` and both touch
  `src/data/*.json`** — a local push can get rejected as non-fast-forward as soon as the cron has
  committed in the meantime. `.gitattributes` declares `merge=ours` for `src/data/*.json` so a
  normal `git pull`/merge keeps the local version without conflicting (the data is regenerated
  constantly anyway, so losing a remote snapshot is harmless). **One-time setup per clone/machine**:
  run `git config merge.ours.driver true` (the driver itself isn't stored in the repo, only the
  attribute mapping is). Prefer `git pull` before pushing over reaching for `--force`.
- **`scraper/fetch-nfl-data.js` is season-specific**: only `SEASON_YEAR` and `REG18_END` in
  `scraper/config.js` need to change at the start of each new NFL season — every other week
  boundary and URL is derived from them.
- **The NFL.com scraping is heuristic-based** (matches team names in arbitrary DOM nodes, infers
  sections by vertical pixel position via `getBoundingClientRect().top`, infers trend
  direction/probability from nearby text via regex). It is expected to break silently if
  nfl.com changes its markup/layout — there's no schema validation on the scraped output.
- `src/utils/team-mapping.js` has a **known typo baked into the data contract**:
  `'Tampa Bay Buccaneers'` maps to sprite id `'buccaners'` (misspelled) because that's the actual
  filename in `src/images/logos/`. Don't "fix" the typo in the map without also renaming the logo
  file (and vice versa).
- Scraper debugging tends to produce scratch artifacts (dumped HTML/JSON snapshots, one-off
  `inspect-*.js` probes, screenshots). These were previously committed by mistake; the matching
  patterns are now in `.gitignore` (`*_debug.html`, `temp_*.html`, `inspect-*.js`, etc.) — don't
  commit new ones.
- `MyTeams.astro` reads/writes favorite teams via client-side `localStorage`/DOM logic embedded in
  a large inline `<script define:vars>` block — logic lives in the component, not in `src/utils/`.

## Conventions observed

- Components: PascalCase `.astro` files, split into flat "sections" (`Header`, `Standings`,
  `Matchups`, …) plus `components/atoms/` (small, purely presentational) and
  `components/molecules/` (cards composed from atoms).
- Client-side interactivity lives in inline `<script>` (or `<script define:vars>`) tags per
  component rather than shared TS modules.
- SCSS variables/mixins are centralized in `src/styles/_variables.scss` and `_mixins.scss`.

## For AI Assistants

- No ticket system for this repo — it's a personal project. Reference the relevant file paths in
  commit messages instead.
