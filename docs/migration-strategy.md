# Migration Strategy — nx + Angular + Material

Companion to `docs/dependency-audit-2026-06.md`. The audit
identifies the bumps needed; this doc captures **how** to
do them on this specific workspace. Written after three
P61 attempts that each hit a different peer-coupling
surprise, so the next attempt can skip the discovery cost.

---

## The peer-coupling reality

This is an **nx workspace** (no `angular.json`, only
`nx.json`). The runtime constraint that drives every
migration choice:

| Package | Pinned by | Effective constraint |
|---|---|---|
| `@nx/*` (nx ecosystem) | nx version | Standalone — moves on its own. |
| `@angular-devkit/*` | `@nx/angular@N` peer range | nx 18 accepts devkit 15-17; nx 19 accepts 16-18; nx 20 accepts 17-18; nx 23 requires 19-21. |
| `@angular/core` + framework | `@angular-devkit/build-angular` peer pin | Strict — framework matches devkit major. |
| `@angular/cdk` + `@angular/material` | `@angular/core` peer pin | Strict lockstep. |
| `@angular-eslint/*` | `@angular/core` peer pin | Strict lockstep. |

**The implication:** Picking nx version N constrains the
allowable Angular DevKit range, which in turn constrains
the framework. There is no clean way to "bump only nx" past
a certain point — once nx drops support for older devkit,
the framework has to come along.

### Concrete peer-range snapshot (researched 2026-06)

```
@nx/angular@18.x  →  @angular-devkit/* >= 15 < 18  (Angular 15-17 OK)
@nx/angular@19.x  →  @angular-devkit/* >= 16 < 19  (Angular 16-18 OK)
@nx/angular@20.x  →  @angular-devkit/* >= 16 < 19  (Angular 16-18 OK)
@nx/angular@21.x  →  @angular-devkit/* >= 17 < 20  (Angular 17-19 OK)
@nx/angular@22.x  →  @angular-devkit/* >= 18 < 21  (Angular 18-20 OK)
@nx/angular@23.x  →  @angular-devkit/* >= 19 < 22  (Angular 19-21 OK)
```

Re-confirm before any future attempt — npm publishes
patches and these ranges sometimes shift.

---

## Why prior P61 attempts failed

### v1 — `npx @angular/cli@18 update`

**Result:** Fails immediately with "This command is not
available when running the Angular CLI outside a workspace."

**Reason:** `ng update` requires `angular.json`. We're an
nx workspace; nx orchestrates the build instead.

**Takeaway:** Skip `ng update` entirely. Use `nx migrate`.

### v2 — `nx migrate @nx/angular@18.0.0`

**Result:** Bumped `@nx/angular` to 18.0.0; **everything
else stayed at 17.x**. Generated a migrations.json with
one tiny migration (module-federation env var).

**Reason:** `nx migrate <package>@<version>` updates only
the named package and packages that depend on it via
strict peer pins. Since `@nx/angular@18` peer-accepts
devkit 15-17, it didn't force a framework bump.

**Takeaway:** Single-package migrate doesn't cascade.

### v3 — `nx migrate latest`

**Result:** Bumped all `@nx/*` to 23.0.1; **Angular
framework stayed at 17.x**. npm install then failed
because `@nx/angular@23` requires devkit 19+ which
doesn't exist in Angular 17.

**Reason:** Same as v2 — the framework isn't peer-pinned
by `@nx/angular`, only the devkit is. `nx migrate latest`
optimizes for the nx ecosystem and leaves the framework
to the developer.

**Takeaway:** `nx migrate latest` will leave you with a
broken workspace if your framework is too old for the new
nx's devkit requirements.

---

## Three viable paths forward

### Path A — Safe nx bump (recommended for incremental)

Go to the highest nx major that **still peer-accepts our
current Angular DevKit** (17.x). That's `@nx/angular@20`.

```bash
npx nx@latest migrate @nx/angular@20.0.0
npm install
npx nx migrate --run-migrations=migrations.json
```

**Closes:** nx-side CVEs (esbuild, vite, webpack-dev-server
flagged in the P60 audit).
**Doesn't close:** Any Angular runtime CVEs.
**Time estimate:** 30-60 min.
**Risk:** Low — nx schematics touch nx.json / project.json,
not component code.

### Path B — Coupled Angular + nx (the real fix)

Use `nx migrate latest` with **explicit framework version
overrides** so the cascade actually fires:

```bash
npx nx@latest migrate latest \
  --to=@angular/core=21.0.0,@angular/cdk=21.0.0,@angular/material=21.0.0,@angular-devkit/build-angular=21.0.0,@angular-eslint/schematics=21.0.0
npm install
npx nx migrate --run-migrations=migrations.json
```

**Closes:** All Angular CVEs (XSS, cache, XSRF, DoS) +
nx-side CVEs + most P60 audit findings.
**Doesn't close:** Capacitor, Ionic, Tailwind (independent
ships).
**Time estimate:** 2-4 hours. The Material MDC token
migration alone is ~30-60 min of `styles.scss` work.
**Risk:** Medium-high. Schematics touch component code;
expect breakage in:
- Material datepicker styles (MDC token renames)
- Standalone bootstrap providers
- Possibly `@if`/`@for` if any legacy `*ngIf` slipped in
- TypeScript strict-mode flags

### Path C — Defer entirely

Marketplace is pre-launch. CVEs are theoretical until
real production traffic. Accept the risk; queue the
migration for a dedicated pre-launch hardening session.

**Trade-off:** Every additional day on Angular 17 widens
the migration delta and the cost of doing it later.

---

## Next-attempt checklist

Before re-attempting the framework migration (Path B),
do these read-only steps first:

1. Re-confirm peer ranges with `npm view @nx/angular@<v>
   peerDependencies` for the target nx major.
2. Read Angular's migration guides for each major in the
   chain (17→18, 18→19, 19→20, 20→21). Note any breaking
   changes that affect this codebase's patterns.
3. Skim the Angular Material MDC migration guide for
   v17→v21 token renames. Check `src/styles.scss` and any
   component `.scss` files for overrides of `mat-form-field-*`,
   `mat-button-*`, `mat-icon-*`.
4. Snapshot `npx nx build cnt-workspace --configuration=
   production` bundle sizes for before/after compare.
5. Branch off `main` into `migrate/angular-21` before
   running anything. Don't migrate on main.
6. Plan a smoke-test pass through all six public routes
   (/, /search, /listing, /host, /trip-planner/edit,
   /article/<id>/<slug>) plus the Material datepicker
   specifically.
7. Have a rollback ready: tag `pre-migration` before
   starting.

---

## Process notes

- Path A is the "stop the bleeding" move if the team
  wants progress without committing to the full Angular
  migration. nx 17 → 20 closes a meaningful chunk of CVEs.
- Path B is the right end-state. Schedule a focused 4-hour
  block; don't try to weave it between polish ships.
- Path C is acceptable while pre-launch but should NOT
  remain the answer post-launch when real users + handler
  data are in the system.

The audit doc (`docs/dependency-audit-2026-06.md`)
contains the per-package detail. This doc focuses on the
**execution strategy** for the headline migration.
