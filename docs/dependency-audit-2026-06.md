# Dependency Audit — June 2026 (P60)

Snapshot of `npm audit` + `npm outdated` against the
`cnt-landing` workspace, captured 2026-06-25 after P59.

## Headline numbers

- **100 vulnerabilities**: 1 critical · 59 high · 35
  moderate · 5 low
- **60 outdated direct dependencies**
- Angular ecosystem is **4 majors behind** (17 → 21)
- Nx is **6 majors behind** (17 → 23)

The Angular drift is the dominant risk: every high-severity
CVE in the Angular packages applies because we ship 17.1.3
which has known XSS, cache-poisoning, and DoS issues that
post-17.3 patches address.

---

## A · Security advisories (prioritized)

### Critical (1)

| Package | Path | Severity | Issue |
|---|---|---|---|
| `shell-quote` (transitive) | dev-tooling | **8.1 critical** | Command injection via newlines in `.op` values ([GHSA-w7jw-789q-3m8p](https://github.com/advisories/GHSA-w7jw-789q-3m8p)) |

**Action:** Transitive through dev tooling only (not in
runtime bundle). Resolution: `npm dedupe` after a major
update of nx / build-angular pulls a non-vulnerable
shell-quote. Standalone update not feasible (pinned by
upstream).

### High — Angular ecosystem (XSS + cache poisoning, production-impacting)

Multiple direct CVEs against the version of Angular we
ship:

- `@angular/core` 17.1.3 — i18n XSS, SVG XSS, hydration DOM
  clobbering, template namespace bypass
- `@angular/common` 17.1.3 — XSRF token leakage via
  protocol-relative URLs, HTTP cache info-leak, DoS in
  number/date formatting, weak 32-bit cache key
- `@angular/compiler` 17.1.3 — two-way property binding
  sanitization bypass, SVG animation XSS
- `@angular/forms`, `@angular/router`,
  `@angular/platform-browser` — propagated through the same
  bumps

**Action:** Bundle as a single Angular major-bump ship.
Not a hotfix — requires testing all components. Scope: M-L.

### High — dev-tooling / build chain (lower production risk)

`@angular-devkit/build-angular`, `@angular/cli`,
`@babel/*`, `@nx/*`, `@sigstore/*`, `esbuild`,
`http-proxy-middleware`, `inquirer`, `picomatch`,
`piscina`, `postcss`, `undici`, `vite`, `webpack`,
`webpack-dev-server`, `node-gyp`, `make-fetch-happen`.

**Action:** Resolved by the same nx / Angular major bump.
Dev tooling — affects build server only, not the deployed
bundle, so the practical risk is lower than the Angular
runtime CVEs.

### Moderate (35)

`@angular-devkit/architect`, `@angular-devkit/core`,
`@babel/runtime`, `@cypress/request`, ajv, body-parser,
brace-expansion, etc. All tooling chain. Auto-resolves
with the same nx / Angular upgrades.

### Low (5)

Minor / quality-of-life. Not actioned.

---

## B · Major-version drift

Direct deps where current major < latest major. Grouped
by upgrade family.

| Family | Current | Latest | Cascade |
|---|---|---|---|
| **Angular** (animations, cdk, cli, common, compiler, compiler-cli, core, forms, language-service, material, platform-*, router, devkit, schematics) | 17.x | 20–21.x | Single coordinated upgrade. Touches every component. |
| **Nx** (`@nx/*`) | 17.3 | 23.0 | Includes build pipeline + workspace generators. Couples with Angular bump. |
| **Capacitor** (android, cli, core, ios) | 7.6 | 8.4 | Mobile build only — doesn't affect web. Small ship. |
| **Ionic** (`@ionic/angular`) | 7.8 | 8.8 | Couples with Angular bump if used; check usage. |
| **ESLint** + plugins | 8.48 | 10.6 | Lint config refactor. Modest ship. |
| **TypeScript** | 5.3 | 6.0 | Strict mode behavior changes. Tied to Angular major. |
| **Jest** + jest-preset-angular + jest-environment-jsdom | 29 | 30 (preset 17) | Test infra. Couples loosely with Angular. |
| **Cypress** + plugins | 13 | 15 | E2E runner. Standalone if E2E lands later. |
| **Prettier** | 2.8 | 3.9 | Trailing-comma defaults flipped. Annoying but contained. |
| **Tailwind** | 3.4 | 4.3 | v4 is the new engine; **breaking**. Defer until ready for a styling pass. |
| **`@types/node`** | 18.16 | 26.0 | Type updates only; pulls with Node runtime bump. |

---

## C · Minor + patch drift (selected)

| Package | Current | Latest | Note |
|---|---|---|---|
| `gsap` | 3.14.2 | 3.15.0 | Patch — safe to bump. |
| `aws-amplify` | 6.17 | 6.18 | Minor. |
| `rxjs` | 7.8.1 | 7.8.2 | Patch. |
| `autoprefixer` | 10.4.27 | 10.5.2 | Minor. |
| `zone.js` | 0.14.10 | 0.16.2 | Couples with Angular major. |
| `postcss` | 8.5.8 | 8.5.16 | Patch — pull with build chain. |

---

## D · Bundle-cost outliers

Spot-checked from the build output (P52):

- **Leaflet** (`leaflet` + `leaflet.markercluster`) — flagged
  by Angular CLI as a CommonJS bailout. A newer leaflet
  ships ESM; check if there's a 2.x line that solves the
  bailout. Could shave ~30 KB.
- **GSAP** — currently eager in main bundle (~38 KB). P52
  considered deferring but TBT was already 0; revisit if
  bundle analysis (T4.1) flags unused JS as the biggest
  win.
- **Material / CDK** — only the date picker is used at the
  module level. Already lazy-loaded via @defer on hero
  (P52); audit other surfaces.
- **Three.js** — used in hero-3d (`/Users/dustinreed/projects/cnt-landing/libs/feature/home/`).
  Lazy-loaded by Angular's route splitting. Acceptable.

---

## E · Deprecated direct deps

None flagged in this run. (Some transitives like `inflight`
and `glob@7` are likely deprecated, but they're not direct.)

---

## Recommended next ships (priority order)

| Rank | Ship | Type | Scope | Notes |
|---|---|---|---|---|
| **1** | **Angular 17 → 18 → 19 → 20 → 21 incremental** | Security | L (multi-step) | Resolves 60+ high-severity CVEs in the runtime. Run one major at a time via `ng update`; verify every surface between steps. Coordinate with @nx/angular bumps. |
| **2** | Nx 17 → 23 incremental | Tooling | M-L | Cascades with #1. Required to keep `@angular/cli` aligned. |
| **3** | Capacitor 7 → 8 | Mobile | S-M | Independent. Verify Android + iOS native builds (T2.10). |
| **4** | Ionic 7 → 8 | Mobile | S-M | Couples with #3. |
| **5** | ESLint 8 → 10 + plugins | Tooling | S | Config refactor; mostly automatic via `@angular-eslint`. |
| **6** | Jest 29 → 30 + preset 13 → 17 | Tooling | S-M | When/if test coverage matters. |
| **7** | Patch-only bumps (gsap 3.14→3.15, aws-amplify 6.17→6.18, rxjs 7.8.1→7.8.2, autoprefixer 10.4→10.5, postcss 8.5.8→8.5.16) | Hygiene | S | Single `npm update` of these specific entries; low risk. |
| **8** | Cypress 13 → 15 | Tooling | S | When E2E lands. |
| **9** | Prettier 2 → 3 | Hygiene | S | Defer until tooling rev. |
| **10** | Tailwind 3 → 4 | Styling | M | **Defer** — v4 is a new engine. Plan a dedicated migration sprint. |

---

## Process notes

- All updates should ship as separate P-numbered commits
  so each can be verified independently. Angular major
  bumps especially are touchpoint-heavy.
- Re-run this audit (`npm audit && npm outdated`) after each
  ship; expect the numbers to drop materially.
- Add `npm audit --audit-level=high` to a CI step (separate
  from P59 Lighthouse CI) to catch new high-severity
  vulns from transitives.

## Raw data location

JSON dumps captured during P60:

- `/tmp/cnt-dep-audit/audit.json` (4,078 lines)
- `/tmp/cnt-dep-audit/outdated.json` (422 lines)

Not committed (transient artifacts of this audit pass).
