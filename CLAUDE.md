# CLAUDE.md — CurbNTurf Landing Page

## Project Overview
CurbNTurf is an RV hosting and booking marketplace. This repo is the marketing landing page — a premium, heavily animated Angular 17 app designed to convert RVers into guests and property owners into hosts.

**Tagline:** "The RV Freedom Experience"
**Brand voice:** Adventure-forward, freedom-focused, premium but approachable.

---

## Shared Agent Library
Reference skills and agents from: `~/projects/claude-code/`

Available agents:
- `agents/planner.md` — Use when planning new features, sections, or redesigns
- `agents/coder.md` — Use for component builds, GSAP work, debugging, refactors
- `agents/researcher.md` — Use for UX research, competitor analysis, RV market context
- `agents/writer.md` — Use for landing page copy, CTAs, host/guest messaging

To use an agent, read the relevant `.md` file and follow its instructions.

---

## Tech Stack
- **Framework:** Angular 17 (standalone components — no NgModules)
- **Build:** Nx monorepo (v17.3.2)
- **Styling:** Tailwind CSS 3 + SCSS component styles
- **Animations:** GSAP 3.14 + ScrollTrigger
- **3D:** Three.js
- **UI:** Angular Material 17 + Ionic Angular 7.8.6
- **Mobile:** Capacitor 7.6 (iOS + Android, app ID: `org.curbnturd.landing`)
- **Testing:** Jest

---

## Dev Commands
```bash
npm start        # nx serve — dev server at http://localhost:4200
npm run build    # nx build — production build to dist/cnt-workspace
npm test         # nx test — Jest unit tests
nx graph         # visualize project graph
```

---

## Project Structure
```
src/app/
  home/                  # Main landing page (most complex — ~610 lines TS)
  search-results/        # RV listing search results
  listing-details/       # Individual listing detail
  host-space/            # Host promotion page
  footer/                # Reusable footer
  expanding-hero/        # Circle-to-fullscreen reveal animation
  hero-3d/               # Three.js canvas section
  feature-cards/         # Curated collection cards
  trust-section/         # Testimonials / social proof

cnt-theme/               # Webflow-exported design system (CSS, fonts, images)
  css/                   # Generated CSS — DO NOT edit these files directly
  fonts/                 # Variable fonts (Familjen Grotesk, Proxima Nova, Rift Soft)
  images/                # Brand image assets

src/styles.scss          # Global styles — Tailwind, Material theme, animations
tailwind.config.js       # Custom color tokens and font families
```

---

## Routes
| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `HomeComponent` | Main landing page |
| `/search` | `SearchResultsComponent` | Search results |
| `/listing` | `ListingDetailsComponent` | Listing detail |
| `/host` | `HostSpaceComponent` | Host promotion |

---

## Brand Tokens
| Token | Value | Use |
|-------|-------|-----|
| `trinidad` | `#e3530d` | Primary orange — CTAs, highlights |
| `jungle-green` | `#295d42` | Secondary green — backgrounds, accents |
| `cream` | `#f7f5ec` | Main background |
| `dark-text` | `#222222` | Body text |
| `gold` | `#fbd784` | Accent highlights |

**Fonts:** Familjen Grotesk (headline + body), Proxima Nova, Rift Soft
**Tailwind classes:** Use `text-trinidad`, `bg-jungle-green`, `bg-cream`, etc.

---

## Coding Conventions
- All components are **standalone** (`standalone: true`) — never add NgModules
- Prefer **Tailwind utility classes** over writing new SCSS; use component `.scss` only for complex/stateful styles
- Use `isPlatformBrowser()` before any DOM/GSAP/Three.js access (prevents SSR errors)
- Keep components focused — split anything over 200 lines into sub-components
- File naming: `kebab-case` for files, `PascalCase` for classes
- No hardcoded secrets — use `.env`

---

## GSAP / Animation Rules
- Always kill ScrollTrigger instances in `ngOnDestroy()` to prevent memory leaks
- Group related animations into named methods (e.g., `initHeroEntry()`, `initMagneticButtons()`)
- Use `ScrollTrigger.refresh()` after dynamic content loads
- Gate all GSAP calls behind `isPlatformBrowser()` checks

---

## What NOT to Touch
- `cnt-theme/css/` — auto-generated Webflow CSS, never edit directly
- `cnt-theme/images/` — design system assets, don't reorganize
- `node_modules/` — obviously
- The boilerplate `nx-welcome.component.ts` — unused, ignore it

---

## Common Tasks
- **New section on home page:** Add to `home.component.html`, initialize animation in `home.component.ts`, follow existing GSAP patterns
- **New route/page:** Generate standalone component, add to `app.routes.ts`
- **Styling:** Start with Tailwind tokens before writing custom CSS
- **Copy changes:** Match existing brand voice — adventure-forward, concise, conversion-focused
- **Bug fix:** Reproduce → identify root cause → fix → check `ngOnDestroy` cleanup

---

## Notes & Decisions
<!-- Add ongoing decisions, gotchas, and context here as the project evolves -->
- Ionic is integrated for mobile UI patterns but Capacitor handles native deployment
- The `cnt-theme/` folder contains Webflow HTML exports as design references — they are not used in the Angular app directly
- Angular Material theming uses indigo primary / pink accent (may be updated to match brand)
