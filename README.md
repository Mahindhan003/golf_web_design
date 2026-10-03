# Golf Tournament Platform — Web

Desktop / responsive web version of the Golf Tournament mobile UX, using the same design system
(colours, type, cards, pill buttons, lime accent) and the same mock data.

## Run

```bash
npx pnpm@9 install   # first time only
npx vite             # http://localhost:5180
```

There is **one sign-in page** (`#/signin`) for golfers, organisers and platform staff. The account's role
decides where you land after signing in: platform staff and organisers open the admin console, golfers open the
golfer home. (`#/admin/login` still works and opens the same page.)

- **Golfer:** any other email with any password (`wrongpass` / `serverdown` show the error states)
- **Platform admin:** `admin@gmail.com` / `admin` (more staff logins in `src/admin/access.ts`)
- **Organiser:** `owner@savannahgolf.com` / `savannah` (approved) or `hello@coastalcharity.org` / `coastal` (pending review)

Or use **Sign up** to go through account creation and the golfer profile or organisation setup.

## Pages

| URL | Page |
|---|---|
| `#/signin` | Single sign-in for golfers, organisers and admins (routes by role) |
| `#/signup`, `#/setup`, `#/organizer-setup` | Sign up, golfer profile setup, organisation setup |
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
