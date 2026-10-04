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
| `#/tournaments/:id` | Tournament details: schedule, scoring, divisions, eligibility, fees, prizes, local rules, contacts, register / waitlist / withdraw |
| `#/tournaments/:id/leaderboard` | Live leaderboard (gross / net / Stableford, divisions, hole-by-hole cards) |
| `#/tournaments/:id/play` | Live scoring: hole map, distances to the green and hazards, tap-to-measure, mark the ball (tap or GPS), score entry, submit card |
| `#/courses/:id` | Course details: scorecard, tees (rating/slope per gender), hole guide with maps, facilities, contact, directions |
| `#/profile`, `#/profile/edit` | Profile and edit profile |
| `#/admin/tournaments/:id` | Tournament editor: rounds, scoring rules, eligibility, divisions + tees, registration window, fees, prizes, tee sheet, officials, local rules |
| `#/admin/tournaments/:id/live` | Tournament day: tee sheet, field and waitlist, scorecard corrections and verification, start / publish results |
| `#/admin/courses/:id` | Course editor: location (lat/lng), contact & facilities, status, tee sets, women's par/SI, hole guide with a click-to-place map editor |

### Live demo

**Augusta Pines Club Championship** (`t8`) is live. Sign in as a golfer: Home shows "Playing now";
the golfer is on hole 5 of round 1. The rest of the field moves on every few seconds while the leaderboard is open
(or press "Simulate next hole" in the admin live page). Hole maps are drawn on a yard grid generated from par and
yards; in production each point is a GPS coordinate and the map sits on satellite imagery.

Hash URLs work on any static host (e.g. GitHub Pages) without server rewrites.
Build for a sub-path with `BASE_PATH=/repo-name npx vite build`.

## Structure

- `src/App.tsx` — routes and sign-in guard
- `src/router.ts` — tiny hash router
- `src/app-context.tsx` — auth, toast and dialog state
- `src/shell.tsx` — sidebar, top bar, page header, auth split layout, toast, dialog
- `src/components.tsx` — shared UI (same as the mobile project, plus web tweaks)
- `src/data.ts`, `src/types.ts` — mock data and types (shared with mobile)
- `src/golf.ts` — golf rules and defaults: tee sets, hole maps, handicaps, Stableford, tee times
- `src/live.ts` — tournament-day store: field, tee groups, scorecards, marked shots, leaderboard
- `src/hole-map.tsx` — SVG hole map (editor, course guide, live play)
- `src/screens/` — one file per page

This is a prototype: there is no backend. Admin edits and tournament-day data are kept in this browser's localStorage; **Reset demo data** in the admin console restores everything.
"# golf_web_design" 
