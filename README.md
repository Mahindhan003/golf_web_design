# Golf Tournament Platform — Web

Desktop / responsive web version of the Golf Tournament mobile UX, using the same design system
(colours, type, cards, pill buttons, lime accent) and the same mock data.

## Run

```bash
npx pnpm@9 install   # first time only
npx vite             # http://localhost:5180
```

Sign in with any email and a password of 4+ characters (`wrongpass` / `serverdown` show the error states),
or use **Sign up** to go through account creation and the 3-step golfer profile setup.

## Pages

| URL | Page |
|---|---|
| `#/signin`, `#/signup`, `#/setup` | Sign in, sign up, golfer profile setup |
| `#/home` | Dashboard |
| `#/tournaments` | Tournament grid with search and filters |
| `#/tournaments/:id` | Tournament details |
| `#/courses/:id` | Course details and scorecard |
| `#/profile`, `#/profile/edit` | Profile and edit profile |

Hash URLs work on any static host (e.g. GitHub Pages) without server rewrites.
Build for a sub-path with `BASE_PATH=/repo-name npx vite build`.

## Structure

- `src/App.tsx` — routes and sign-in guard
- `src/router.ts` — tiny hash router
- `src/app-context.tsx` — auth, toast and dialog state
- `src/shell.tsx` — sidebar, top bar, page header, auth split layout, toast, dialog
- `src/components.tsx` — shared UI (same as the mobile project, plus web tweaks)
- `src/data.ts`, `src/types.ts` — mock data and types (shared with mobile)
- `src/screens/` — one file per page

This is a prototype: there is no backend and nothing is saved between page reloads.
"# golf_web_design" 
