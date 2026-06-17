# Gradex — Technical Specification

**A Global Grading System (GGS) Platform**
*Inspired by the Willis Towers Watson Global Grading System methodology*

---

## 0. How to read this document (instructions for Claude Code)

This document is the single source of truth for building **Gradex**, a web platform for job leveling and grading. You (Claude Code) will build the entire application from this spec. The spec is intentionally verbose: every section explains **what** to build and **why** it exists, so you understand the business intent behind each technical decision and can make sensible choices where the spec is silent.

**Working rules for this build:**

1. Build the project incrementally. Follow the milestone order in Section 19. Do not try to generate everything in one pass.
2. The tech stack is fixed (Section 3). Do not substitute frameworks. If a library is missing, install it; do not swap the architecture.
3. The database is **Firebase** (Firestore + Firebase Auth). The data model in Section 10 is authoritative.
4. The deployment target is **Vercel**. Every choice (Next.js App Router, environment variables, serverless functions) must be Vercel-compatible.
5. Design quality is a hard requirement, not a nice-to-have. Read Section 4 carefully. A functional-but-ugly result is a failed build.
6. When you finish a milestone, write a short note in `PROGRESS.md` describing what was done and what remains.
7. The repository is empty. You are creating everything from scratch, including config files, `.gitignore`, `README.md`, and `.env.example`.

**A note on the domain:** Gradex is an HR / compensation tool. Its users are HR professionals, compensation analysts, and reward managers at mid-to-large companies. They are not engineers. The interface must speak their language (jobs, grades, bands, factors, families), hide complexity, and make a genuinely analytical process feel approachable. Every time this spec says "the user," assume a busy HR analyst who values clarity over cleverness.

---

## 1. What Gradex is (product summary)

Gradex is a cloud platform that lets an organization **level its jobs** — that is, determine the relative internal value of every distinct job — and produce a consistent, defensible grade for each one. Job leveling is the foundation for compensation structures, pay ranges, career paths, internal equity, and market benchmarking.

The methodology Gradex implements is modeled on the **Willis Towers Watson Global Grading System (GGS)**. GGS is a 30+ year-old, market-leading job leveling approach. The core idea: instead of grading jobs by gut feel, you grade them against a fixed set of universal **factors** that are proven to capture real differences in "job size" (scope, complexity, skills, effort, responsibility). The output is a **global grade** on a scale of **1 to 25**, where higher numbers mean larger jobs.

The GGS process has three sequential steps, and Gradex implements all three:

1. **Scoping** — Size the *organization* first. A small startup and a global conglomerate cannot use the same number of grades. Based on company revenue, headcount, geographic breadth, and business complexity, Gradex calculates how many of the 25 grades the organization should actually use, and what grade the top job (the CEO) sits at. This anchors the whole structure.
2. **Banding** — Place each job into a **band**. Bands are broad career tiers (e.g. clerical, professional, management, executive) that reflect *how* a job contributes to the business and which **career path** it belongs to (Individual Contributor vs. Management). Banding narrows down the plausible grade range before detailed grading.
3. **Grading** — Evaluate each job against **seven standard factors** via a guided questionnaire. Each answer maps to a score; the combined score resolves to a single global grade within the band's range.

Gradex turns this consulting-heavy methodology into self-service software: an HR team sets up their organization once (scoping), then grades hundreds of jobs through a clean wizard, and gets dashboards, a grade structure visualization, exports, and an audit trail.

---

## 2. Goals, non-goals, and success criteria

### 2.1 Goals
- Let an organization complete **scoping** and get a recommended grade range (e.g. "your org uses grades 6–23, CEO at grade 23").
- Let users create **job families / functions** to organize jobs.
- Let users add jobs and run them through the **banding + grading wizard**, producing a global grade 1–25.
- Provide a **grade structure view**: all jobs laid out across grades and bands, like the classic GGS grid.
- Provide **dashboards**: distribution of jobs by grade, by band, by family; flagged anomalies.
- Support **multiple users per organization** with roles (admin, analyst, viewer).
- Maintain an **audit trail** of grading decisions (who graded what, when, with what answers).
- Be genuinely beautiful and pleasant to use.

### 2.2 Non-goals (explicitly out of scope for v1)
- Real WTW proprietary factor charts and scoring tables. We implement an **original, GGS-inspired** scoring model (Section 9). We are not copying WTW's confidential IP; we are building a comparable, openly-defined model.
- Integration with external compensation survey/market data providers.
- Payroll, performance management, or full HRIS functionality.
- Native mobile apps (the web app must be responsive, but no React Native).
- AI-automated leveling (the real GGS has an AI module; we may stub a "suggest grade" helper later, but it is not required for v1).

### 2.3 Success criteria
A build is successful when: a new user can sign up, create an organization, complete scoping, add a job family, grade at least one job end-to-end through the wizard, see that job appear correctly positioned in the grade structure grid and dashboards, and the data persists in Firestore and survives a page refresh. And it all looks polished.

---

## 3. Technology stack (fixed)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** + **React 18** + **TypeScript** | Vercel-native, SSR/SSG, file routing, server actions. TypeScript because the data model is complex and type safety prevents grading-logic bugs. |
| Styling | **Tailwind CSS** + **shadcn/ui** (Radix primitives) | Rapid, consistent, accessible components; design tokens centralize the visual system. |
| Animation | **Framer Motion** | Micro-interactions and wizard transitions (Section 4). |
| Icons | **lucide-react** | Clean, consistent icon set. |
| Charts | **Recharts** | Dashboards: distributions, grade spreads. |
| Database | **Firebase Firestore** | Document DB; required by the client. |
| Auth | **Firebase Authentication** (Email/Password + Google) | Required by the client. |
| File storage | **Firebase Storage** | Org logos, CSV imports. |
| State (client) | **Zustand** (light global state) + React Query / TanStack Query for server cache | Keep grading-wizard state predictable; cache Firestore reads. |
| Forms & validation | **React Hook Form** + **Zod** | The grading wizard is form-heavy; Zod schemas double as runtime validation and TS types. |
| Deployment | **Vercel** | Required by the client. |
| Repo | GitHub (empty repo provided by client) | — |

**Important Vercel/Firebase note:** Use the Firebase **Web SDK (v9 modular)** on the client for auth and most reads/writes, secured by Firestore Security Rules (Section 11). For privileged server operations (e.g. inviting users, server-side aggregation), use the **Firebase Admin SDK** inside Next.js Route Handlers / Server Actions, with the service-account credentials supplied via Vercel environment variables. Never ship the Admin SDK or service-account key to the client bundle.

---

## 4. Design system & visual direction (this is a hard requirement)

Gradex must look like a premium, modern SaaS product — think Linear, Vercel, Stripe Dashboard, Attio. Restrained, confident, data-dense but never cluttered. The HR-tech space is full of ugly enterprise software; Gradex's edge is that it feels like a consumer-grade product.

### 4.1 Brand & tone
- **Name:** Gradex. **Wordmark:** "Gradex" set in a clean geometric sans (Inter, or Geist). Optional mark: a stylized ascending bar/grade glyph.
- **Personality:** precise, calm, trustworthy, quietly sophisticated. This is a tool people make consequential pay decisions with — it should feel rigorous, not playful.

### 4.2 Color
Define everything as CSS variables / Tailwind theme tokens so light & dark mode both work.
- **Primary / accent:** a deep, confident indigo-violet (e.g. `#5B5BD6` → `#6E56CF` range). Use sparingly for primary actions, active states, key data.
- **Neutrals:** a true neutral gray scale for text, borders, surfaces (not pure black on pure white — use `#0A0A0B`/`#FAFAFA` poles with graded steps).
- **Semantic:** green (success / on-target grade), amber (warning / anomaly), red (error / conflict), blue (info).
- **Grade scale color ramp:** the 25 grades should map to a perceptually-smooth color ramp (low grades cool/muted → high grades warm/saturated) used consistently in the grid and charts so a grade is recognizable by color anywhere in the app.
- **Dark mode is required** and must be first-class, not an afterthought.

### 4.3 Typography
- **UI font:** Inter or Geist Sans. **Numeric/data:** tabular figures (`font-variant-numeric: tabular-nums`) wherever grades, scores, counts, or money align in columns.
- Clear type scale: display, h1–h4, body, small, caption. Generous line-height for reading; tight for dense tables.

### 4.4 Layout & spacing
- **8px spacing grid.** Consistent radii (e.g. 8px cards, 6px inputs, 12px modals). Subtle borders (`1px` neutral) over heavy shadows; use soft shadows only for elevated surfaces (popovers, modals, dropdowns).
- **App shell:** left sidebar navigation (collapsible), top bar with org switcher + search + user menu, main content area with a consistent page header pattern (title, description, primary action button top-right).
- Max content width on wide screens; never let tables sprawl edge-to-edge uncomfortably.

### 4.5 Motion (Framer Motion)
- Wizard step transitions: gentle horizontal slide + fade (150–250ms, ease-out).
- List items / cards: subtle stagger on mount.
- Number changes (e.g. a computed grade updating): animated count-up.
- Hover states on interactive elements; focus-visible rings for accessibility. **Motion must be tasteful and fast** — never blocking, never bouncy-childish.

### 4.6 Components to standardize (build once, reuse)
Buttons (primary/secondary/ghost/destructive), inputs, selects, comboboxes, multi-step wizard shell with progress indicator, data table (sortable, filterable, paginated), stat cards, badges (used heavily for grades/bands), tooltips, modals/dialogs, toasts, empty states (with helpful illustrations/CTAs), skeleton loaders, the grade-grid visualization, charts.

### 4.7 Empty & loading states
Every list/table/dashboard needs a **designed empty state** ("No jobs graded yet — add your first job") with a clear CTA, and **skeleton loaders** while Firestore reads resolve. No raw "Loading…" text, no blank flashes.

### 4.8 Accessibility
WCAG AA contrast, full keyboard navigation, proper ARIA via Radix/shadcn, focus management in the wizard and modals, respects `prefers-reduced-motion`.

---

## 5. Core domain concepts (glossary — read before coding)

Claude Code must internalize these terms; they appear throughout the data model and UI.

- **Organization (Org):** A tenant. Each customer company is one org. All jobs, families, grades, and members belong to an org. Gradex is **multi-tenant**: a user can belong to multiple orgs and switch between them.
- **Scoping:** The first GGS step. Determines, from org size/complexity/geography, (a) the **number of grades** the org uses and (b) the **top grade** (where the CEO sits). Output is a contiguous slice of the 1–25 scale, e.g. grades 6–23.
- **Global Grade:** An integer 1–25. Higher = bigger job. The universal output of grading.
- **Band:** A broad career tier grouping several adjacent grades. Bands reflect *how* a job contributes and which career path it's on. Gradex uses the band set in Section 7. Each band maps to a default grade range.
- **Career Path:** Either **Individual Contributor (IC)** or **Management (M)**. The "dual career path" principle: an organization values senior individual experts and senior managers in parallel, not forcing everyone into management to advance.
- **Factor:** One of **seven** standard dimensions a job is graded against (Section 8). Each factor has ordered **levels**; selecting a level yields a score.
- **Job:** A distinct role in the org (e.g. "Senior Financial Analyst"). A job has a family, a band, a career path, factor selections, a computed grade, and metadata. Jobs — not individual employees — are what get graded.
- **Job Family / Function:** A grouping of related jobs (e.g. Finance, Engineering, HR, Sales). Used for organization, filtering, and comparison.
- **Grading Session / Evaluation:** A single run of the wizard producing a grade for a job, stored with all answers for audit/repeatability. A job can be re-graded; history is kept.
- **Grade Structure:** The full grid of grades × bands, populated with the org's jobs — the signature GGS visualization.

---

## 6. Scoping model (GGS step 1) — detailed logic

**Purpose / why:** Grade numbers are only meaningful relative to organization size. A grade-20 job at a $100B global firm is a different beast than a grade-20 at a 40-person startup — in fact the startup may top out around grade 14. Scoping calibrates the scale so that grades are comparable across companies of similar size and the org doesn't over- or under-grade its top jobs.

**Inputs (the user answers these once, editable later):**

1. **Annual revenue** (single currency, user-selected; store value + currency). Bucketed into size tiers.
2. **Total headcount / number of employees.** Bucketed.
3. **Geographic breadth** — one of: Single location → City/Region → National → Multi-national (few countries) → Global (many countries/continents).
4. **Business complexity** — one of: Single product/service & simple ops → Few product lines → Multiple diverse business units → Highly diversified conglomerate.
5. **Industry** (informational/segmentation; does not change the math in v1).

**Scoping algorithm (implement as a pure, well-tested TypeScript function `computeScoping(inputs): ScopingResult`):**

Assign points to each dimension, then map total to a **top grade** and a **bottom grade**, producing the used grade range.

- Revenue tier → points (e.g. 6 tiers, 0–5 pts): <\$10M=0, \$10M–\$100M=1, \$100M–\$1B=2, \$1B–\$10B=3, \$10B–\$50B=4, >\$50B=5.
- Headcount tier → points (0–5): <50=0, 50–250=1, 250–1k=2, 1k–10k=3, 10k–50k=4, >50k=5.
- Geographic breadth → points (0–4) as listed above.
- Business complexity → points (0–4) as listed above.

Sum = `S` (range 0–18). Map `S` to **top grade** via a calibrated table so that:
- Smallest orgs (S≈0–2) → top grade ≈ 12–14.
- Mid orgs (S≈7–10) → top grade ≈ 18–20.
- Largest/most complex (S≈16–18) → top grade ≈ 24–25.

(Implement the mapping as a documented lookup/interpolation. Provide the full table in code with comments; the numbers above are the calibration targets.)

- **Bottom grade:** typically `topGrade − N`, where `N` (the number of grade steps the org spans) also grows with size — a small org might span ~8 grades, a giant ~19. Compute bottom = `max(1, topGrade − spanFromSize(S))`.
- **Result:** `{ topGrade, bottomGrade, usedGrades: [bottomGrade..topGrade], ceoGrade: topGrade, scoringBreakdown }`.

**Output UI:** A scoping wizard that, on completion, shows a clear summary card: "Based on your inputs, Gradex recommends a **{n}-grade structure**, grades **{bottom}–{top}**, with the CEO at grade **{top}**." Plus a small visual of where the org sits on the 1–25 scale. Recompute live as inputs change. Store the result on the org; all later grade validation uses this range.

---

## 7. Banding model (GGS step 2) — detailed

**Purpose / why:** Before fine grading, banding establishes the *kind* of job and its broad altitude. It also enforces the **dual career path**. Banding massively narrows the grade search space and prevents nonsensical results (e.g. a clerical job never lands in an executive grade).

**Career paths:** `IC` (Individual Contributor) and `M` (Management).

**Bands (use exactly these; each maps to a default grade range that is then intersected with the org's scoped range):**

| Band key | Display name | Path | Typical grade range (of 1–25) | Description (show in UI) |
|---|---|---|---|---|
| `manual` | Manual / Operational | IC | 1–6 | Routine physical or operational tasks; defined procedures. |
| `clerical` | Clerical / Administrative | IC | 3–8 | Administrative & support tasks; established methods. |
| `para_professional` | Para-professional / Technical Support | IC | 5–10 | Applied technical skills; some judgment within guidelines. |
| `professional` | Professional | IC | 8–15 | Theoretical/conceptual knowledge of a discipline; solves problems analytically. |
| `expert` | Expert / Specialist (SME) | IC | 13–20 | Deep authority in a field; advances the discipline; no management duties. |
| `supervisory` | Supervisory / Team Lead | M | 9–13 | Coordinates a team's day-to-day work; first level of people responsibility. |
| `manager` | Manager | M | 12–17 | Manages a function or team; accountable for results through others. |
| `senior_manager` | Senior / Middle Management | M | 15–20 | Manages managers or a sizeable function; sets operational direction. |
| `director` | Director / Function Head | M | 18–22 | Leads a major function or business unit; shapes strategy. |
| `executive` | Executive | M | 21–24 | Top leadership team; enterprise-level accountability. |
| `ceo` | CEO / Top Job | M | 25 (or org top grade) | The single top job; anchored by scoping. |

**Banding logic:** The wizard asks a short set of qualifying questions (career path; does the job manage people / how many layers; primary nature of contribution — doing tasks vs. applying expertise vs. leading) and proposes a band. The user can override. The selected band's range, **intersected with the org's scoped used-grade range**, becomes the **candidate grade window** that grading must land within. If grading produces a score outside the band window, flag it as an anomaly for review (don't silently clamp — surface it; the band or the answers may be wrong).

---

## 8. The seven grading factors (GGS step 3) — detailed

**Purpose / why:** These seven factors are the analytical heart of GGS. Each captures a distinct, independent dimension of job size. Grading every job against the *same* factors is what makes grades comparable across functions and geographies and defensible in pay-equity contexts. The factor names below mirror the GGS factor set; the **level definitions and scoring in Section 9 are Gradex's own openly-defined model**, not WTW's proprietary charts.

For each factor, the wizard presents an ordered list of **levels** (lowest to highest). The user picks the one that best fits the job. Each level has: a short label, a one-to-two sentence description (so the analyst can choose confidently), and a numeric score contribution.

The seven factors:

1. **Functional Knowledge** — Depth and breadth of the technical/functional know-how the job requires, ranging from simple tasks → established procedures → broad concepts of a discipline → full theory & practice across multiple disciplines. *Why:* knowledge depth is the strongest single driver of job size.

2. **Business Expertise** — Understanding of *the business* (not technical skill): from knowledge of one's own work unit → the function → multiple functions → the whole industry/market. *Why:* bigger jobs require seeing how the business makes money, not just how to do a task.

3. **Leadership** — Nature and breadth of guidance provided to others: none → informal/peer guidance → supervising a small team → managing a function → leading multiple functions → enterprise leadership. *Why:* responsibility for others' work materially increases job size, and this is the axis that separates the management path.

4. **Problem Solving** — Mental/analytical complexity: following clear rules → choosing among known solutions → adapting/analyzing → solving novel problems → creating new frameworks/strategy. *Why:* the harder and more ambiguous the thinking, the bigger the job.

5. **Nature of Impact** — *How* the job affects business results: indirect/supporting → contributory → significant/shared → primary/determining → defining enterprise outcomes. (Works in tandem with Area of Impact.) *Why:* a job that directly determines results is larger than one that merely supports.

6. **Area of Impact** — *Where/how broadly* the impact is felt: own role/task → team → department/function → business unit → whole organization → external/market. *Why:* breadth of impact scales job size with organizational reach.

7. **Interpersonal Skills** — Communication/influence required: basic exchange of information → explaining/advising → persuading/negotiating → influencing senior stakeholders → shaping external/strategic relationships. *Why:* the higher the stakes of the relationships a job must manage, the bigger it is.

Each factor must be modeled in code as data (id, name, why-it-matters text, ordered levels with label/description/score), **not hard-coded into components**, so factors and levels are editable and the scoring model can be tuned in one place (Section 9).

---

## 9. Scoring engine — how factor answers become a grade

This section defines Gradex's **original** scoring model. Implement it as a pure, unit-tested module (`/lib/grading/`), fully decoupled from UI and Firestore, so it can be tested in isolation and tuned without touching the app.

### 9.1 Level scores
Give each factor a set of ordered levels. Recommended level counts and per-level points:

- **Functional Knowledge:** 6 levels, scores 0,3,6,10,14,18.
- **Business Expertise:** 5 levels, scores 0,2,5,8,11.
- **Leadership:** 6 levels, scores 0,2,5,9,13,17.
- **Problem Solving:** 5 levels, scores 0,3,6,10,14.
- **Nature of Impact:** 5 levels, scores 0,2,5,8,11.
- **Area of Impact:** 6 levels, scores 0,2,4,7,10,13.
- **Interpersonal Skills:** 5 levels, scores 0,2,4,6,8.

(These exact numbers are a starting calibration. Put them in a single config object with comments; expose them so they can be tuned.)

### 9.2 Weighting
Sum the seven level scores into a **raw score** `R`. Optionally apply factor weights (default all 1.0; allow per-org weight overrides later). Theoretical raw range: 0 → ~89.

### 9.3 Mapping raw score to a global grade
Map `R` onto the **1–25 grade scale** using a monotonic function calibrated so the full raw range spans the full grade range:

```
grade = round( 1 + (R / R_max) * 24 )
```
where `R_max` is the maximum achievable raw score with current scores/weights (compute it dynamically, don't hard-code).

Then **constrain & reconcile**:
- Clamp into the org's scoped used-grade range (Section 6).
- Compare against the band candidate window (Section 7). If the computed grade falls inside the band window → confident result. If outside → produce the grade **but flag an anomaly** ("Computed grade {g} is above/below the {band} band's expected range {lo}–{hi}; review the band selection or factor answers.").
- Surface a **confidence indicator** (high/medium/low) based on how centered the grade is within the band window and whether any factor answers look inconsistent (e.g. high Leadership but IC career path → nudge).

### 9.4 Explainability (important)
The result screen must **show the work**: a per-factor breakdown (chosen level + points), the raw score, the mapping, the band window, the final grade, and any flags. HR users must be able to explain *why* a job got its grade. Store this breakdown with the evaluation for audit.

### 9.5 Consistency checks (GGS "sanity" rules)
Implement light cross-checks and warn (don't block):
- A manager job should generally not have a *lower* Leadership level than a job reporting to it (when reporting relationships are known).
- Functional Knowledge and Problem Solving should be broadly coherent (huge gaps → warn).
- IC-path jobs with top-level Leadership selected → warn (likely mis-pathed).

---

## 10. Data model (Firestore) — authoritative

Firestore is a document database. Model multi-tenancy by **scoping all org data under the org document** via subcollections, and keep a top-level `users` collection plus a membership mapping for fast "which orgs am I in" lookups.

> Notation: `collection/{docId}`. Subcollections are nested. Field types in parentheses.

### 10.1 Top-level collections

**`users/{userId}`** (mirrors Firebase Auth uid)
- `email` (string)
- `displayName` (string)
- `photoURL` (string|null)
- `createdAt` (timestamp)
- `lastActiveOrgId` (string|null) — for restoring the org switcher
- `memberships` (map: `{ [orgId]: role }`) — denormalized for quick access (role ∈ `admin|analyst|viewer`)

**`orgs/{orgId}`**
- `name` (string)
- `slug` (string, unique-ish)
- `logoURL` (string|null)
- `industry` (string)
- `currency` (string, ISO e.g. "USD")
- `createdBy` (userId)
- `createdAt` / `updatedAt` (timestamp)
- `scoping` (map):
  - `inputs` (map: revenue, currency, headcount, geoBreadth, complexity, industry)
  - `result` (map: `topGrade`, `bottomGrade`, `ceoGrade`, `usedGrades` [array], `breakdown`)
  - `completed` (bool), `completedAt` (timestamp)
- `settings` (map): factor weights overrides, custom band ranges (optional), theme prefs.

**Subcollections under each org:**

**`orgs/{orgId}/members/{userId}`**
- `userId`, `email`, `displayName`, `role` (`admin|analyst|viewer`), `invitedBy`, `joinedAt`, `status` (`active|invited`).

**`orgs/{orgId}/families/{familyId}`** (job families / functions)
- `name` (string), `key` (string), `description` (string), `color` (string, optional override), `jobCount` (number, denormalized), `createdAt`, `updatedAt`.

**`orgs/{orgId}/jobs/{jobId}`**
- `title` (string), `code` (string, optional client job code), `familyId` (string), `careerPath` (`IC|M`), `band` (band key, Section 7), `description` (string), `reportsToJobId` (string|null — for consistency checks/org structure)
- `currentGrade` (number 1–25|null), `currentEvaluationId` (string|null)
- `confidence` (`high|medium|low`|null), `flags` (array of strings)
- `status` (`draft|graded|needs_review`)
- `createdBy`, `createdAt`, `updatedBy`, `updatedAt`.

**`orgs/{orgId}/jobs/{jobId}/evaluations/{evaluationId}`** (one per grading run — full history)
- `factorSelections` (map: `{ functionalKnowledge: levelIndex, businessExpertise: levelIndex, ... }` for all 7)
- `factorScores` (map: per-factor points)
- `rawScore` (number), `rMax` (number), `computedGrade` (number), `finalGrade` (number after reconcile)
- `bandWindow` (map: `{lo, hi}`), `anomaly` (bool), `flags` (array), `confidence` (string)
- `breakdown` (map: full explainability payload from Section 9.4)
- `gradedBy` (userId), `gradedAt` (timestamp), `note` (string, optional rationale).

**`orgs/{orgId}/invites/{inviteId}`** (pending invitations)
- `email`, `role`, `invitedBy`, `createdAt`, `token`, `status` (`pending|accepted|revoked`).

**`orgs/{orgId}/activity/{activityId}`** (audit log)
- `type` (`scoping_completed|job_created|job_graded|job_regraded|member_added|family_created|...`)
- `actorId`, `actorName`, `targetType`, `targetId`, `summary` (string), `metadata` (map), `createdAt`.

### 10.2 Denormalization notes
- Keep `jobCount` on families and update it transactionally when jobs are added/removed.
- Keep `memberships` on the user doc in sync with `members` subcollection.
- The grade-structure grid reads all jobs for an org; index by `band` and `currentGrade`. Cache with React Query.

---

## 11. Firebase Security Rules (must implement)

Write `firestore.rules` enforcing:
- A user can read/write `users/{uid}` only where `uid == request.auth.uid`.
- For any `orgs/{orgId}/**` document, the user must have a membership: check `get(/orgs/{orgId}/members/{request.auth.uid})` exists and is `active`.
- **Role enforcement:**
  - `viewer` → read-only on org data.
  - `analyst` → create/edit families, jobs, evaluations; cannot manage members, billing, or delete the org.
  - `admin` → full control: manage members, edit scoping/settings, delete jobs/families, delete org.
- Validate critical fields on write (grade is integer 1–25; role is one of the enum; careerPath is `IC|M`; band is in the allowed set).
- Deny everything not explicitly allowed.

Provide `storage.rules` similarly (only org admins/analysts may upload org logos / imports; only members may read).

Server-side privileged actions (invites that send email, bulk imports, cross-doc aggregations) go through Next.js Route Handlers using the **Admin SDK**, which bypasses rules and so must do its own auth/role checks.

---

## 12. Authentication & onboarding flow

1. **Landing page** (public, marketing-quality): hero explaining Gradex ("Level every job. Pay with confidence."), the 3-step methodology (Scope → Band → Grade) shown as an elegant diagram, feature highlights, CTA to sign up. This page sells the product — make it beautiful (Section 4).
2. **Sign up / Sign in:** Firebase Auth, Email/Password + Google. Clean split-screen or centered card. Friendly validation.
3. **First-run onboarding:** if the user has no org → "Create your organization" (name, industry, currency, optional logo). On creation: create org doc, add creator as `admin` member, write activity log, set `lastActiveOrgId`.
4. **Prompt to scope:** new orgs land on a dashboard with a prominent "Complete scoping to get started" card → launches the scoping wizard (Section 6). Grading is gated until scoping is complete (with a clear explanation of why).
5. **Org switcher** in the top bar for multi-org users; switching changes context everywhere.
6. **Invites:** admins invite teammates by email with a role; invited users accept and join the org.

---

## 13. Application structure (routes & screens)

Use the Next.js App Router. Authenticated app under a route group (e.g. `app/(app)/...`), public marketing/auth under `app/(marketing)/...` and `app/(auth)/...`.

**Public**
- `/` — Landing page.
- `/login`, `/signup` — Auth.
- `/invite/[token]` — Accept invite.

**App (require auth + active org)**
- `/dashboard` — Org overview: stat cards (jobs graded, families, avg grade, jobs needing review), distribution charts, recent activity, quick actions. Scoping CTA if incomplete.
- `/scoping` — Scoping wizard + result. Editable later.
- `/families` — List/manage job families; create/edit; each shows job count and grade spread.
- `/families/[familyId]` — Family detail: its jobs, grade distribution within the family.
- `/jobs` — All jobs: powerful data table (search, filter by family/band/path/grade/status, sort, paginate). Bulk actions (admin/analyst). "Add job" CTA.
- `/jobs/new` — Create job (title, family, description) → leads into the grading wizard.
- `/jobs/[jobId]` — Job detail: current grade (big, color-coded badge), confidence, flags, factor breakdown, evaluation history timeline, "Re-grade" action, reports-to relationship.
- `/jobs/[jobId]/grade` — **The grading wizard** (Section 14) — the centerpiece.
- `/structure` — **Grade structure grid** (Section 15) — the signature visualization.
- `/settings/organization` — Org profile, scoping summary/edit, factor weights, danger zone (admin).
- `/settings/members` — Members & invites (admin).
- `/settings/profile` — User profile, theme.

**Layout:** persistent sidebar (Dashboard, Structure, Jobs, Families, Settings), top bar (org switcher, global search, theme toggle, user menu).

---

## 14. The grading wizard (centerpiece) — detailed spec

This is the most important screen. It must feel guided, fast, and confidence-inspiring. Build it as a multi-step wizard with a persistent progress indicator and a live preview.

**Step 0 — Job basics** (if entered via `/jobs/new`): title, family, description, reports-to (optional). Skipped when re-grading.

**Step 1 — Career path & banding:**
- Choose career path: IC vs Management (two large, clearly described cards).
- A few qualifying questions (manages people? how many layers? primary contribution type?) → Gradex **proposes a band** with reasoning shown. User confirms or overrides via a band picker that shows each band's description and grade range.
- Display the resulting **candidate grade window** (band range ∩ org scoped range) so the user sees where this is heading.

**Steps 2–8 — The seven factors (one factor per step, or a smart grouped layout):**
- For each factor: show the factor name, the **"why this matters"** explanation, and the ordered list of levels as selectable cards (radio-group). Each level card shows its label + description. Selecting highlights it.
- A **live side panel** updates as the user answers: a running estimate of the grade (animated), the per-factor contributions so far, and the band window. This makes the process feel responsive and teaches the user how factors drive the grade.
- Allow "I'm not sure" → leave for later; can't finish until all 7 answered. Back/Next navigation; answers persist if the user leaves and returns (autosave to a draft evaluation).

**Step 9 — Review & confirm:**
- Full explainability view (Section 9.4): each factor's chosen level + points, raw score, mapping, band window, **final grade** in a large color-coded badge, confidence indicator, and any anomaly/consistency flags with plain-language explanations and suggestions.
- Optional **rationale note** field (free text — good practice for audit).
- "Save grade" → writes a new `evaluation`, updates the job's `currentGrade`/`currentEvaluationId`/`confidence`/`flags`/`status`, logs activity, toasts success, routes to the job detail page.

**UX requirements:** keyboard-navigable (arrow keys + enter to pick levels), reduced-motion friendly, autosave drafts, no data loss on refresh, clear progress ("Factor 4 of 7"), and the live grade preview must never feel laggy.

---

## 15. Grade structure grid (signature visualization) — detailed

**Purpose / why:** This is the iconic GGS deliverable — the whole organization's job architecture seen at a glance, jobs arranged by grade and band. It's what executives want to see and what makes the abstract concrete.

**Layout:**
- **Y-axis (rows):** the org's used global grades, **high at top, low at bottom** (e.g. 23 down to 6). Each row labeled with the grade number and its color-ramp swatch.
- **X-axis (columns):** career paths and/or bands. At minimum two macro-columns: **Individual Contributor** and **Management**, optionally sub-divided into bands. The classic GGS picture has IC bands on the left, Management bands on the right, sharing the grade rows.
- **Cells:** each job appears as a compact chip/badge in the row matching its grade and the column matching its band/path, color-coded by grade. Chips show the job title (truncated) and family color accent. Multiple jobs in a cell stack/wrap.
- **Interaction:** hover a chip → tooltip (title, family, band, grade, confidence). Click → job detail. Filter controls (by family, status, confidence; "show only flagged"). Empty grades still render their row so gaps are visible. Toggle between "by band" and "by path" granularity.
- **Quality bar:** this must look like a polished product diagram, not an HTML table dump — careful alignment, the grade color ramp, smooth, responsive, horizontally scrollable on small screens, with a clean legend.

---

## 16. Dashboards & analytics

On `/dashboard` and family/job views, provide (Recharts):
- **Stat cards:** total jobs, % graded, families count, average grade, count needing review/flagged.
- **Grade distribution** — bar/histogram of job counts per grade (color-ramped bars).
- **Band distribution** — jobs per band.
- **Path split** — IC vs Management proportion (donut).
- **Family comparison** — average grade / grade spread per family.
- **Recent activity feed** — from the activity log.
- **Anomaly panel** — list of flagged jobs with one-click jump to review.

All charts: tasteful, theme-aware (light/dark), with empty/loading states.

---

## 17. Import / export

- **CSV import** of jobs (title, family, code, description, reports-to). Map columns, validate, preview, then bulk-create as `draft` jobs ready to grade. Handle errors row-by-row with clear feedback. (Use a Route Handler + Admin SDK for the bulk write; validate roles.)
- **Export**: jobs + grades to CSV/XLSX; the grade structure as CSV; (optional, nice-to-have) a PDF/print-friendly grade structure. v1 must at least do CSV export.

---

## 18. Cross-cutting requirements

- **TypeScript everywhere**, strict mode. Zod schemas for all Firestore docs and wizard inputs; derive TS types from Zod.
- **Error handling:** every async Firestore/Auth call wrapped; user-facing errors via toasts; never leave the UI in a broken/blank state.
- **Loading/empty states** everywhere (Section 4.7).
- **Optimistic UI** where safe (e.g. creating a family), with rollback on failure.
- **Responsive** down to tablet; mobile-usable for viewing (wizard can be desktop-optimized but must not break on mobile).
- **Performance:** code-split the wizard and charts; memoize the grid; paginate large job tables; cache reads with React Query.
- **Env vars** (`.env.example` provided): Firebase web config (`NEXT_PUBLIC_FIREBASE_*`) and Admin SDK service-account vars (server-only). Document each in the README.
- **No secrets in the client bundle.** Admin SDK key only in server env on Vercel.
- **Code organization:** `/app` (routes), `/components` (ui + feature components), `/lib` (`firebase/`, `grading/` engine, `scoping/`, `utils`), `/hooks`, `/stores` (Zustand), `/types`. Keep the grading & scoping engines framework-agnostic and unit-tested.
- **Testing:** unit tests for `scoping` and `grading` engines (these encode the business logic and must be correct). At least smoke tests for key flows.
- **Seed data:** provide a script to seed a demo org (one org, ~4 families, ~25 sample jobs across bands/grades, fully graded) so the structure grid and dashboards look alive immediately in development and demos.

---

## 19. Build milestones (do them in this order)

1. **Project setup** — Next.js + TS + Tailwind + shadcn/ui; design tokens (colors, type, dark mode); app shell (sidebar, top bar); `.gitignore`, `README`, `.env.example`. Verify it deploys to Vercel as a blank shell.
2. **Firebase** — init Web SDK + Admin SDK; Auth (email/Google); `firestore.rules` + `storage.rules`; auth context/provider; protected routes.
3. **Orgs & onboarding** — create org, membership, org switcher, landing + auth pages.
4. **Scoping engine + wizard** — pure `computeScoping`, unit tests, wizard UI, result card, persist to org, gate grading until complete.
5. **Families & jobs CRUD** — families pages, jobs table with filters, create job.
6. **Grading engine** — pure scoring module (Sections 8–9) with full unit tests (this is the riskiest logic; get it right and tested before wiring UI).
7. **Grading wizard** — the centerpiece (Section 14), draft autosave, evaluations, review screen, activity logging.
8. **Grade structure grid** (Section 15).
9. **Dashboards & analytics** (Section 16).
10. **Members & invites, roles enforcement** end-to-end.
11. **Import/export** (Section 17).
12. **Polish pass** — empty states, skeletons, motion, dark mode audit, accessibility, responsive, seed script, performance.
13. **Deploy** — Vercel production deploy; document env vars; final smoke test.

After each milestone, update `PROGRESS.md`.

---

## 20. Definition of done

- All milestones complete; the success criteria (Section 2.3) pass end-to-end against real Firebase.
- Scoping and grading engines have passing unit tests and produce sensible, explainable results.
- Security rules enforce tenancy and roles (test as viewer/analyst/admin).
- The app is visually polished in both light and dark mode, with no broken/blank/ugly states.
- Deployed and reachable on Vercel; README documents setup, env vars, Firebase config, and deployment.
- `PROGRESS.md` reflects the final state.

---

## Appendix A — Legal / IP note for Claude Code
Gradex is **inspired by** the publicly described structure of the Willis Towers Watson Global Grading System (the three-step scoping/banding/grading process, the seven factor *names*, the 1–25 grade scale, the dual career path, and the grade-structure visualization), all of which are described in public materials. Gradex must **not** reproduce WTW's confidential/proprietary factor definition charts, scoring tables, or copyrighted content. All level definitions, point values, scoping math, and band ranges in this spec are **Gradex's own original model** (Sections 6, 7, 9) and should be implemented as written here. Do not present Gradex as a WTW product; it is an independent platform.
