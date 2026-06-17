# Gradex

**Level every job. Pay with confidence.**

Gradex is a web platform for job leveling and grading, inspired by the publicly
described structure of the Willis Towers Watson **Global Grading System (GGS)**.
It turns a consulting-heavy methodology into self-service software: scope your
organization, band your roles, and grade jobs on a defensible **1–25** scale —
with dashboards, a signature grade-structure grid, and a full audit trail.

> Gradex is an independent platform. It implements an **original, openly-defined**
> scoring model (not WTW's proprietary charts) and is not affiliated with WTW.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + React + TypeScript (strict) |
| Styling | Tailwind CSS v4 + custom shadcn-style component library |
| Animation | Framer Motion |
| Icons | lucide-react |
| Charts | Recharts |
| Database | Firebase Firestore (Web SDK + Admin SDK) |
| Auth | Firebase Authentication (Email/Password + Google) |
| State | Zustand (persisted) + TanStack Query |
| Forms/validation | React Hook Form + Zod |
| Deployment | Vercel |

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

The app runs **out of the box in demo mode** — no Firebase project required. A
fully-seeded demo organization ("Acme Corporation": 5 families, ~25 graded jobs)
is stored in the browser via a persisted Zustand store, so the structure grid
and dashboards look alive immediately and data survives refresh.

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run test` | Run unit tests (scoping & grading engines) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run seed` | Seed a real Firestore project (requires Admin SDK env) |

## Connecting Firebase (optional)

Demo mode requires no setup. To connect a real project:

1. Create a Firebase project; enable **Authentication** (Email/Password + Google),
   **Firestore**, and **Storage**.
2. Copy `.env.example` to `.env.local` and fill in the values:
   - `NEXT_PUBLIC_FIREBASE_*` — the Web SDK config (safe for the client).
   - `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` —
     a service-account key for the Admin SDK (**server-only**, never shipped to
     the client bundle).
3. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules,storage
   ```
   (`firestore.rules` and `storage.rules` are in the repo root.)
4. Optionally seed: `npm run seed`.

When the `NEXT_PUBLIC_FIREBASE_*` vars are present, `src/lib/firebase/client.ts`
initializes the Web SDK; otherwise the app stays in demo mode.

## Deployment (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Add every variable from `.env.example` to the Vercel project's Environment
   Variables. For `FIREBASE_PRIVATE_KEY`, paste the key with literal `\n`
   newlines (it is un-escaped at runtime).
3. Deploy. Everything is Vercel-compatible (App Router, server actions, no
   custom server).

## Architecture

```
src/
  app/
    (app)/            Authenticated app (sidebar shell): dashboard, scoping,
                      families, jobs, grading wizard, structure, settings
    (auth)/           Login & signup
    page.tsx          Public landing page
  components/
    ui/               Component library (button, card, dialog, select, …)
    app-shell/        Sidebar, top bar, global search
    charts/           Recharts distribution charts
    …                 grade-badge, grade-explainer, wizard, etc.
  lib/
    scoping/          Pure, unit-tested scoping engine (§6)
    grading/          Pure, unit-tested grading engine + factor/band data (§7–9)
    firebase/         Web SDK + Admin SDK init
    demo/             Demo seed data (built with the real engines)
    grade-colors.ts   The 1–25 perceptual color ramp
  stores/             Zustand data store (mirrors the Firestore model)
  types/              Zod schemas → TS types for all domain docs
firestore.rules       Multi-tenant + role-based security rules
storage.rules         Storage rules
```

### The engines are the heart of the product

`src/lib/scoping` and `src/lib/grading` are pure, framework-agnostic, and fully
unit-tested. They encode all the business logic (the size-scoring table, the
seven factors and their level scores, the raw→grade mapping, band windows,
anomaly detection, consistency checks) and can be tuned in one place without
touching the UI. See `*.test.ts` next to each module.

## License / IP

Gradex is **inspired by** the publicly described GGS process (three steps, seven
factor names, the 1–25 scale, dual career paths, the structure grid). All level
definitions, point values, scoping math, and band ranges are Gradex's own
original model. Do not present Gradex as a WTW product.
