# Gradex — Build Progress

Tracks the milestone order from SPEC.md §19.

## ✅ Done

### Milestone 1 — Project setup
- Next.js (App Router) + React + TypeScript (strict) + Tailwind v4.
- Full design-token system in `globals.css`: indigo-violet primary, true-neutral
  grays, semantic colors, **first-class dark mode**, 8px-grid radii.
- The 1–25 **grade color ramp** (`lib/grade-colors.ts`) used consistently in
  badges, the grid, and charts.
- shadcn-style component library (`components/ui/*`): button, card, input,
  textarea, label, badge, dialog, select, dropdown-menu, tabs, tooltip,
  radio-group, avatar, switch, separator, skeleton, sonner toaster.
- App shell: collapsible sidebar, top bar (org switcher, ⌘K global search,
  theme toggle, user menu).
- `.gitignore`, `README.md`, `.env.example`. Production build passes.

### Milestone 2 — Firebase (scaffolded)
- Web SDK init (`lib/firebase/client.ts`) — env-driven, degrades to demo mode.
- Admin SDK init (`lib/firebase/admin.ts`, `server-only`).
- `firestore.rules` + `storage.rules`: multi-tenant membership checks, role
  enforcement (admin/analyst/viewer), field validation, deny-by-default.

### Milestone 3 — Orgs & onboarding
- Landing page (marketing quality, 3-step methodology, grade-ramp hero).
- Login / signup pages (`(auth)`), Google button, demo-mode pass-through.
- Org switcher; data store seeded with a demo org on first load.

### Milestone 4 — Scoping engine + wizard
- Pure `computeScoping` (`lib/scoping`) with documented point tables &
  calibration. **Unit-tested** (small/mid/large targets, monotonicity, range).
- Scoping wizard with live recompute, animated preview, scale visual, result
  card; persists to the org; **gates grading until complete**.

### Milestone 5 — Families & jobs CRUD
- Families list (create dialog, color, stats) + family detail.
- Jobs data table: search, filter (family/path/status), sortable, row → detail.
- Create-job flow → leads into the grading wizard.

### Milestone 6 — Grading engine
- Pure scoring module (`lib/grading`): seven factors & bands as **data**, raw
  score, dynamic `R_max`, raw→grade mapping, band-window reconcile, anomaly
  flags, confidence, consistency checks. Banding suggestion. **Unit-tested**
  (23 tests passing across both engines).

### Milestone 7 — Grading wizard (centerpiece)
- Banding step (IC/M path cards, qualifying questions → suggested band, band
  picker, candidate window).
- 7 factor steps with "why it matters" + level cards (keyboard-navigable radio
  group) and a **live side panel** (animated grade estimate, progress, raw
  score, contributions).
- Review step: full explainability (`grade-explainer`), rationale note, save →
  writes an evaluation, updates the job, logs activity. **Autosaves a draft**
  to localStorage (no data loss on refresh).

### Milestone 8 — Grade structure grid
- Signature grid: grades high→low rows, IC/Management columns, toggle
  **by path / by band**, color-ramped job chips, hover tooltips, click → detail,
  family + flagged filters, legend, horizontally scrollable.

### Milestone 9 — Dashboards & analytics
- Stat cards, grade distribution (color-ramped bars), band distribution,
  IC/M donut, recent activity feed, anomaly panel. Theme-aware (Recharts).

### Milestone 10 — Members & roles
- Members list, invite dialog with role picker, role descriptions. Rules
  enforce roles server-side.

### Milestone 12 — Polish (substantial)
- Empty states + skeletons primitives, Framer Motion wizard transitions,
  animated numbers, dark mode throughout, responsive layouts, ⌘K search.
- **Seed data** built with the real engines (demo org always looks alive);
  Firestore seed script (`scripts/seed.ts`).

## 🚧 Remaining / future

- **Live Firestore data layer**: the store mirrors the Firestore model (§10) and
  the Web/Admin SDKs are wired; swapping the Zustand actions to read/write
  Firestore (behind the same interface) is the remaining production step.
- **Real Firebase Auth** session wiring (currently demo pass-through; client is
  initialized when env vars are present).
- **Milestone 11 — Import/export**: CSV export and bulk CSV import via an Admin
  SDK route handler are not yet implemented.
- Invite acceptance route (`/invite/[token]`).
- Broader smoke/e2e tests beyond the engine unit tests.

## Notes
- Engines are pure and unit-tested first (the riskiest logic), per the spec's
  guidance. Run `npm run test`.
- The app is fully usable today in demo mode and builds clean for Vercel.
