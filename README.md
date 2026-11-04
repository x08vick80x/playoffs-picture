# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

### Update Data manually

To fetch the latest NFL standings and playoff picture data:

```bash
npm run update-data
```

This command runs the scraper and updates the `src/data/playoff-picture.json` file.

### Schedule loading

The homepage renders only the current week. Selecting another week fetches a static
HTML fragment from `/schedule/REGn`, rendered with the shared `ScheduleRow` component.
Loaded fragments are kept in memory, while only one week stays mounted in the DOM.
The service worker precaches the fragments in the background for offline use; they
are excluded from the sitemap. The client recomputes the current week when opening
an older build, preserves favorite highlighting, and offers a retry after a failed fetch.

To verify this behavior in Chrome, run `npm run build`, start
`npm run preview -- --port 4322`, then run `npm run test:schedule` in another terminal.
Set `SCHEDULE_TEST_URL` to test a different local preview address.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
