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
- **Organiser:** `owner@savannahgolf.com` / `savannah` (approved) or `hello@coastalcharity.org` / `coastal` (pending review, email not yet verified — use **Open verification link (demo)** in the console banner)
- Five wrong passwords on a console account lock it for 15 minutes (this browser session)

Or use **Sign up** to go through account creation and the golfer profile or organisation setup.

## Pages

| URL | Page |
|---|---|
| `#/signin` | Single sign-in for golfers, organisers and admins (routes by role) |
| `#/signup`, `#/setup`, `#/organizer-setup` | Sign up (golfer or organiser: first / last name, terms + optional marketing consent, common passwords blocked). Golfer setup (spec: `Docs/REGISTER GOLFER.txt`): verify email (demo link, or verify later — needed before registering for a tournament) → about you (age 13+, juniors flagged, ratings choice for non-binary / prefer not to say, optional address, emergency contact) → your game (Handicap Index or "not yet", plus handicaps as +2.0, issuing body, home club, membership) → preferences (contact method, dietary). Organisation setup (spec: `Docs/REGISTER ORGANIZER.txt`) |
| `#/home` | Dashboard |
| `#/tournaments` | Tournament grid with search and filters |
| `#/tournaments/:id` | Tournament details: schedule, scoring, divisions, eligibility, fees, prizes, local rules, contacts, register / waitlist / withdraw |
| `#/tournaments/:id/leaderboard` | Live leaderboard (gross / net / Stableford, divisions, hole-by-hole cards) |
| `#/tournaments/:id/play` | Live scoring: hole map, distances to the green and hazards, tap-to-measure, mark the ball (tap or GPS), score entry, submit card |
| `#/courses/:id` | Course details: scorecard, tees (rating/slope per gender), hole guide with maps, facilities, contact, directions |
| `#/profile`, `#/profile/edit` | Profile and edit profile |
| `#/admin/tournaments/new`, `#/admin/tournaments/:id` | Create / edit tournament wizard (spec: `Docs/CREATE TOURNAMENT - REVISED.txt`): **A · Essentials** (basics, format & participation, rounds & course, divisions & tees, handicap & scoring, tie-breaks) → **B · Setup** (registration, fees with tax, tee sheet with preview, rules & pace of play & officials, scoring & results, prizes, visibility) → **C · Review & publish** (summary, blocking errors, warnings). Drafts need only a name; format and fee lock once golfers register; live / completed tournaments are read-only |
| `#/admin/tournaments/:id/live` | Tournament day: tee sheet, field and waitlist, scorecard corrections and verification, start / publish results |
| `#/admin/courses/new`, `#/admin/courses/:id` | Create / edit course wizard (spec: `Docs/CREATE COURSE.txt`): **A · Course & location** (facility and course name, holes, type, unit, description, cover photo; address with postal-code check and map pin; contact, facilities, dress code, status) → **B · Tees & scorecard** (tee sets with men's / women's rating and slope, front / back 9 ratings; scorecard grid with par, stroke index, women's values, yards per tee, hole notes, WHS stroke-index guidance) → **C · Review & activate**. Courses are Draft → Active → Archived; only Active courses can be chosen for tournaments. Changing ratings on an active course creates a new ratings version from today and keeps the old one in its history |
| `#/admin/organizers` | Organiser review (platform admins): oldest first, review checklist (email verified, website matches owner email, registration number / Golf Canada ID, duplicates), approve (only once the owner has verified their email) or reject with a reason — decided once; then suspend / reactivate. Every decision is kept in the history |
| `#/admin/organisation` | Organisation profile (organisers): review status, details, verification and events; editable. While pending: drafts only, no team invites |

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
- `src/account-rules.ts` — sign-up rules shared with mobile (postal codes, blocked passwords, names, golfer profile steps)
- `src/golf.ts` — golf rules and defaults: tee sets, hole maps, handicaps, Stableford, tee times
- `src/live.ts` — tournament-day store: field, tee groups, scorecards, marked shots, leaderboard
- `src/hole-map.tsx` — SVG hole map (editor, course guide, live play)
- `src/screens/` — one file per page
- `src/admin/TournamentWizard.tsx` + `tournament-setup.ts`, `src/admin/CourseWizard.tsx` + `course-setup.ts` — the wizards (screens + rules); `wizard-ui.tsx` holds the shared wizard parts
- Design rules: `.claude/skills/golf-ux-design/SKILL.md` (repo root)

This is a prototype: there is no backend. Admin edits and tournament-day data are kept in this browser's localStorage; **Reset demo data** in the admin console restores everything.
"# golf_web_design" 
