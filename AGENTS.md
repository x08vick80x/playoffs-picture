# Playoffs Picture — Development Documentation

## What this is

A static Astro site (deployed as a PWA) that displays the NFL playoff picture: standings,
seeds/bubble/eliminated teams, power rankings, matchups/schedule, and a "My Teams" favorites
dashboard. All data is pre-scraped into JSON files at build/update time — there is no runtime
API, backend, or database.

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
  fetch-standings.js       # Scrapes cbssports.com -> src/data/standings.json
  fetch-nfl-data.js        # Scrapes nfl.com/standings + nfl.com/schedules -> src/data/playoff-picture.json
  inspect-cbs.js           # One-off debugging helper (not part of the pipeline)

src/
  components/              # Atomic-design-ish split: flat components + atoms/ + molecules/
  data/                     # Generated JSON (standings.json, playoff-picture.json) — data, not code
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
2. `scraper/fetch-nfl-data.js` scrapes NFL.com's playoff-picture page using **DOM text-matching
   heuristics** (no stable selectors/IDs available on the source page) to bucket teams into seeds
   (top 7 from standings), bubble, and eliminated. It also scrapes `nfl.com/schedules` for
   weeks 15–18 matchups.
3. A GitHub Actions cron (`update-data.yml`) runs the scrapers on a schedule and auto-commits the
   resulting JSON directly to `main`.
4. `src/pages/index.astro` reads `src/data/*.json` synchronously via `node:fs` at build time and
   passes it down as props — everything is static, no client-side fetching of team data.
5. `src/utils/team-mapping.js` bridges the naming inconsistencies between the two data sources
   (e.g. "L.A. Chargers" vs "Los Angeles Chargers" vs "Chargers") to resolve a logo id used with
   `public/sprites.svg`.

## Known fragility / gotchas for future sessions

- **`scraper/fetch-nfl-data.js` is season-specific**: the `WEEK_SCHEDULE` array hardcodes the 2025
  season week-boundary dates and the schedule URL hardcodes `/2025/`. This must be updated at the
  start of each new NFL season.
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
