# Playoffs Picture — Development Documentation

## What this is

A static Astro site (deployed as a PWA) that displays the NFL playoff picture: standings,
seeds/bubble/eliminated teams, power rankings, a full-season schedule, matchups, and a "My Teams"
favorites dashboard. All data is pre-scraped into JSON files at build/update time — there is no
runtime API, backend, or database.

## Tech stack

- **Astro 5** (SSG, no server runtime) with SCSS (`lang="scss"` in component `<style>` blocks)
- **Puppeteer** in standalone Node scripts (`scraper/`) to scrape data from third-party
  sites (`nfl.com`, `cbssports.com`)
- **@vite-pwa/astro** for PWA/offline support; Astro inlines the page stylesheet once
- **@vercel/analytics**, deployed on Vercel
- No test framework, no ESLint/Prettier config present in the repo

## Project structure

```
scraper/                   # Standalone Node scripts (not part of the Astro build)
  validate.ts              # Sanity checks run before any JSON is written; a failure exits non-zero so the cron commits nothing
  config.ts                # Season config: SEASON_YEAR, week boundaries, current-week helper
  fetch-standings.ts       # Scrapes cbssports.com -> src/data/standings.json
  fetch-nfl-data.ts        # Scrapes nfl.com (playoff picture, full schedule, power rankings)
                           # -> src/data/playoff-picture.json + src/data/schedule.json

src/
  components/              # atoms/, molecules/, organisms/; each Component/ contains Component.astro + Component.scss
  data/                     # Generated JSON (standings.json, playoff-picture.json, schedule.json) — data, not code
  layouts/Layout.astro
  pages/index.astro         # Single page app; reads data/*.json directly via node:fs at build time
  styles/                   # _variables.scss, _mixins.scss, _themes.scss, _base.scss, main.scss
  utils/clinch.ts           # Clinch/elimination computed from standings records (no scraping)
  utils/team-mapping.ts     # City/full-name -> logo id / abbreviation lookup tables

start-sprite.ts             # Pre-build step: bundles src/images/logos/*.svg into public/sprites.svg
.github/workflows/update-data.yml  # Cron job: runs `npm run update-data` and auto-commits src/data/*.json
```

## Commands

- Node >=22.13 is required; `nvm use` selects the tested version in `.nvmrc`.
  Scrapers and tests execute TypeScript with Node's native type stripping.
- `npm run check` — Astro diagnostics plus strict `tsc --noEmit` across all source and tests.
  Run this, `npm test` and `npm run build` before completing changes; run relevant Chrome suites
  for browser behavior changes. The scraper workflow checks types before collecting new data.
- `npm run test:schedule` — Chrome lazy-week, cache, race, retry, skeleton and offline checks;
  requires a production build and preview on port 4322 (or `SCHEDULE_TEST_URL`).

- `npm run dev` / `npm run build` — runs `start-sprite.ts` first (pre/post hooks), then Astro
- `npm run update-data` — runs both scrapers in sequence, overwrites `src/data/*.json`
- `npm test` — Node built-in test runner (`tests/*.test.ts`, no dependency; `tests/register.ts` maps the `@/` alias). No lint script exists
- `npm run test:modal` — Chrome regression checks for a single schedule-modal event/open per card click;
  requires a production build and preview on port 4322 (or `SCHEDULE_TEST_URL`).
- `npm run test:components` — Chrome checks for CSS/font delivery, Logo sizes, ranking expansion and game rows;
  requires a production build and preview on port 4322 (or `COMPONENTS_TEST_URL`).
- `npm run test:my-teams` — Chrome checks for conditional loading, CLS, carousel, selection and offline use;
  requires a production build and `npm run preview -- --port 4322` (or `MY_TEAMS_TEST_URL`).

## Page priority

My Teams (standalone only) → Projected Matchups → Bubble → Eliminated → Schedule →
Power Rankings → Standings. The navigation follows the same public section order.
The week-8 gate remains in place for playoff projections.

## Data flow (important to understand before editing)

1. `scraper/fetch-standings.ts` scrapes CBS Sports standings table → `src/data/standings.json`
   (seed, team, record per conference).
2. `scraper/fetch-nfl-data.ts` scrapes NFL.com:
   - **Playoff picture** (seeds/bubble/eliminated, with probabilities/trends) via **DOM
     text-matching heuristics** (no stable selectors/IDs available on the source page). **Gated
     behind `PLAYOFF_PICTURE_MIN_WEEK` (week 8, in `scraper/config.ts`)** — before that, standings
     are too volatile for bubble/eliminated to mean anything, so this section is skipped entirely
     and `src/data/playoff-picture.json` keeps empty `bubble`/`eliminated`/`seeds` arrays (the UI
     already handles empty state).
   - **Full season schedule** (`nfl.com/schedules`, all 18 regular season weeks, always scraped
     regardless of the week-8 gate) → written to `src/data/schedule.json`. Used both to enrich
     playoff-picture teams with their next opponent/remaining schedule, and to power the always-on
     `SeasonSchedule` homepage section (fills the gap during weeks 1–7).
   - **Power rankings** (`nfl.com/news/...`) via stable CSS classes (`.nfl-o-ranked-item`) — runs
     every week from week 1, not gated.
3. `scraper/config.ts` centralizes the season year, the 18 weekly boundaries (derived from a single
   `REG18_END` date), and `getCurrentWeekNumber()`. **Update `SEASON_YEAR` and `REG18_END` once at
   the start of each new NFL season** — every other date is derived from them.
4. A GitHub Actions cron (`update-data.yml`) runs the scrapers on a schedule and auto-commits the
   resulting JSON directly to `main` (`file_pattern: src/data/*.json` already covers `schedule.json`).
   **This routinely diverges from any local work touching the same files** (see gotcha below).
5. `src/pages/index.astro` reads `src/data/*.json` synchronously via `node:fs` at build time and
   passes it down as props. My Teams fetches its projected static endpoint only in standalone;
   previous/next weeks load static HTML fragments on demand.
6. `src/utils/team-mapping.ts` bridges the naming inconsistencies between the two data sources
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
- **`scraper/fetch-nfl-data.ts` is season-specific**: only `SEASON_YEAR` and `REG18_END` in
  `scraper/config.ts` need to change at the start of each new NFL season — every other week
  boundary and URL is derived from them.
- **The NFL.com scraping is heuristic-based** (matches team names in arbitrary DOM nodes, infers
  sections by vertical pixel position via `getBoundingClientRect().top`, infers trend
  direction/probability from nearby text via regex). It is expected to break silently if
  nfl.com changes its markup/layout. `scraper/validate.ts` only checks structure (team counts, 7 seeds, 17 games per team), so a subtly wrong value still gets through.
- `src/utils/team-mapping.ts` maps both `'Tampa Bay'` and `'Tampa Bay Buccaneers'` to
  `'buccaneers'`, matching `src/images/logos/buccaneers.svg`. Keep logo filenames and sprite
  mappings in sync.
- Scraper debugging tends to produce scratch artifacts (dumped HTML/JSON snapshots, one-off
  `inspect-*.ts` probes, screenshots). These were previously committed by mistake; the matching
  patterns are now in `.gitignore` (`*_debug.html`, `temp_*.html`, `inspect-*.ts`, etc.) — don't
  commit new ones.
- `MyTeams.astro` contains the fixed-height carousel shell; its colocated `MyTeams.loader.ts`
  initializes the standalone-only loader from `src/app.ts`.
  `Layout.astro` detects standalone (including iOS) before paint; its visibility and sizing rules
  are part of the complete inline page stylesheet. The lazy `my-teams.ts` module loads the projected static
  `/my-teams.json` endpoint and reads/writes `nfl-favorites`. Its molecule styles are compiled with
  `?inline` into the lazy module: normal CSS imports would be hoisted by Astro onto the homepage.
  These resources are excluded from Workbox precaching and cached only after standalone use.
  Remaining games are filtered using `getScheduleWeekNumber()` at runtime, matching SeasonSchedule.
  The organism coordinates `FavoriteTeamCard` and `FavoritesSelector`; the selector's lazy TypeScript module owns
  its draft selection and accepts an `onSave` callback. `utils/favorites.ts` is the shared storage
  contract for MyTeams, Standings and SeasonSchedule. `utils/load-my-teams.ts` fetches dashboard
  data at runtime; `utils/my-teams-data.ts` remains the build-time projection for the JSON endpoint.

## Conventions observed

- Use `@/` for imports from `src/` and `@scraper/` for shared scraper configuration
  imported by the app. Aliases are declared in `tsconfig.json` (editor/Astro) and
  `astro.config.ts` (Vite, SCSS and assets); keep both mappings in sync.
  Standalone Node scraper scripts retain native Node imports.

- Components: `components/{atoms,molecules,organisms}/Component/Component.astro` with
  colocated `Component.scss`. Atoms are presentational elements, molecules compose atoms,
  organisms are page sections (`Header`, `Standings`, `MyTeams`, etc.).
- Runtime-only molecules use a colocated TypeScript renderer/controller (`FavoriteTeamCard`, `GameItem`,
  `FavoritesSelector`). `RankingCard` owns its markup, styles and expansion; `PowerRankings` owns
  the list. Keep modal orchestration separate from `GameItem` presentation.
- `Logo.astro` and its client renderer `Logo.ts` share sizes `md=40`, `lg=55`.
  Matching SCSS tokens are `$logo-md/lg`; keep intrinsic dimensions and CSS in sync.
  TeamRow uses the same `md`/`lg` sizes and passes them directly to Logo; its default is `lg`.
- Use BEM classes with component-owned states (e.g. `season-schedule__tab--active`,
  `standings-table__row--favorite`), always alongside their base class. Keep native states
  such as `[open]`, `[hidden]` and `[aria-current]`. Rename template, SCSS, client selectors,
  static fragments and browser tests together; keep IDs and data hooks stable.
- Component SCSS is loaded by `src/styles/main.scss` in atoms → molecules → organisms order.
  Keep it global: contextual atom overrides and markup generated by client scripts rely on it.
- Production uses Astro `build.inlineStylesheets: 'always'`: the single homepage uses most of
  the stylesheet, so shipping it once avoids a large critical CSS copy plus a full external copy.
  No external page CSS asset is emitted or precached; offline page navigation caches the HTML
  including its styles. CSS is not cached independently of the HTML. Week fragments reuse the
  host page's styles; MyTeams card/selector styles still stay in its standalone-only lazy module.
  Do not purge rules using initial DOM/coverage alone: dynamic states, themes, breakpoints and
  runtime game/favorite markup also consume them.
- Responsive styles are mobile first: base rules for phones, then `wide-mobile` (481px),
  `tablet` (768px), and `desktop` (1024px) mixins using `min-width`.
- `src/app.ts` is the single browser entry loaded by Layout. It initializes the components
  through colocated TypeScript modules (`initHeader`, `initSeasonSchedule`, etc.). When adding
  an interaction, wire its initializer here instead of adding another component `<script>`.
  Vite combines the eager code and shared utilities automatically; do not force all dynamic
  imports into the main bundle. `MyTeams.loader.ts` imports `my-teams.ts` only in standalone.
  My Teams and Workbox remain separate async chunks; Vercel analytics keeps its own loader.
  The before-paint appearance bootstrap remains inline in the head.
- All authored code is TypeScript: app modules, Astro scripts, configuration, scrapers and tests.
  Use shared football types from `src/types/football.ts`; do not add `.js`/`.mjs` source files or
  silence checks with `any`/`@ts-nocheck`. Astro's processed `<script>` blocks support TypeScript.
  `scripts/bootstrap.ts` is compiled and serialized into the head by Layout for synchronous
  theme/standalone detection; keep this function self-contained (no runtime imports/closures).
  Browser output and Workbox asset patterns still use `.js`: TypeScript compiles to JavaScript.
- SCSS variables/mixins are centralized in `src/styles/_variables.scss` and `_mixins.scss`.
  Literal colors live only there; components never hardcode them.
- Spacing uses the shared numeric `$spacing-*` scale: the suffix is its pixel equivalent at
  the default 10px root (`$spacing-12: 1.2rem`). Prefer existing steps; fine steps preserve compact
  layouts. Use negative tokens for optical offsets. Keep `0`, `auto`, geometric percentages,
  font-relative spacing (`0.2em` between record digits) and screen-reader clipping (`-1px`) literal.
- Use `$radius-pill` for pills; `$radius-control[-sm]`, `$radius-inset`, `$radius-modal` and
  `$radius-sheet` for their respective surfaces. Circular `50%` radii are geometric and may stay
  literal. Dialogs share `$modal-header-padding` and `$modal-padding-inline/block`; controls share
  `$control-size-sm/md/lg/xl`. Do not replace typography, borders or layout proportions with spacing tokens.

## Theming (dark / light)

- Theme tokens are the `$theme-dark` / `$theme-light` maps in `_variables.scss`. `_themes.scss`
  emits them as CSS custom properties on `:root` and `:root[data-theme='light']` (dark is the
  default, light is the override). To add a themed token: add the key to **both** maps, then an
  SCSS alias `$name: var(--name)`.
- Theme-dependent SCSS variables (`$text-primary`, `$bg-card`, `$accent-soft`, `$green-text`…)
  are aliases of `var(--token)`, so they are not compile-time colors: don't pass them to
  `rgba()`, `darken()`, `mix()`, etc.
- Use `ink($a)` for overlay tints (white-ish on dark, navy on light) and `shade($a)` for shadows
  and scrims, instead of `rgba($white|$black, $a)`.
- Text green/red on a themed surface: `$green-text`, `$accent-soft`, `$playoff-text` (darker
  variants in the light theme for legibility), not the raw brand colors.
- Surfaces painted with a team color (bye card) keep literal white/black text in both themes.
- Initial theme: `localStorage['nfl-theme']`, else `prefers-color-scheme`. An inline script in
  `Layout.astro` `<head>` sets `data-theme` before paint (no flash); the Header toggle updates
  `data-theme`, `localStorage`, its `aria-label` and the `theme-color` meta. Keep the meta
  colors in sync with `bg-page`.
- Check both themes (and mobile 390px) after any visual change.

## Gotchas

- `_base.scss` declares the only supplied font: Space Grotesk (`$font-numeric`, records and
  numbers); the body uses Arial/sans-serif. The browser loads the local WOFF2 through CSS with
  `font-display: swap`. There is no font preload: in local throttled Chrome measurements it
  competed with the initial page rendering. Keep one font request and verify first paint before
  introducing preload or another family.
- Dart Sass deprecation warnings (`global-builtin`) in the dev log are pre-existing noise;
  use module functions (`string.unquote`, `math.div`) in new code.
- Long team names in matchup cards can break mid-word (`overflow-wrap: anywhere` in `TeamRow.scss`).

## For AI Assistants

- No ticket system for this repo — it's a personal project. Reference the relevant file paths in
  commit messages instead.
