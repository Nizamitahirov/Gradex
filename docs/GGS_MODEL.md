# GGS Model — implementation reference (WTW Global Grading System 4.2)

This file is the authoritative parameter reference for Gradex. It encodes the
methodology from the WTW GGS 4.2 User Guide that the client supplied and
authorized us to apply. The full proprietary guide text is kept locally at
`docs/ggs-user-guide.txt` (gitignored — not published).

Everything we build must conform to this model.

## Grade scale
- Global grades run **1–25**.
- **Company Grade = CEO grade = 16–25**. It is the ceiling for the business unit.

## Step 1 — Business Analysis → Company Grade

Company Grade = **average of three Scope Grades**, rounded:
1. Revenue Scope Grade
2. FTE Employees Scope Grade
3. Diversity/Complexity × Geographic Breadth Scope Grade

### Revenue (millions USD) → Scope Grade
| Grade | From | To |
|--|--|--|
| 16 | 0 | 75 |
| 17 | 75 | 150 |
| 18 | 150 | 500 |
| 19 | 500 | 1,000 |
| 20 | 1,000 | 2,000 |
| 21 | 2,000 | 5,000 |
| 22 | 5,000 | 10,000 |
| 23 | 10,000 | 50,000 |
| 24 | 50,000 | 100,000 |
| 25 | 100,000 | + |

### FTE Employees → Scope Grade
| Grade | From | To |
|--|--|--|
| 16 | 0 | 90 |
| 17 | 90 | 240 |
| 18 | 240 | 620 |
| 19 | 620 | 1,600 |
| 20 | 1,600 | 4,100 |
| 21 | 4,100 | 10,600 |
| 22 | 10,600 | 27,500 |
| 23 | 27,500 | 75,000 |
| 24 | 75,000 | 200,000 |
| 25 | 200,000 | + |

### Diversity/Complexity × Geographic Breadth → Scope Grade
Geographic Breadth: Domestic | International | Global
| Diversity/Complexity | Domestic | International | Global |
|--|--|--|--|
| Low | 16 | 19 | 20 |
| Medium | 18 | 21 | 22 |
| High | 20 | 23 | 24 |

- **Geographic Breadth:** Domestic (home country / small region) · International
  (multi-function across a region or several countries on different continents) ·
  Global (key functions on 3+ continents).
- **Diversity/Complexity** Low/Medium/High derived from industry diversity
  (single vs multiple industries) and entity complexity (parent complex vs
  non-complex; subsidiary integrated vs independent).

BU size classification: **Small** 16–18 · **Medium** 19–22 · **Large** 23–25.

## Step 2 — Banding (decision tree)

```
Managing people a focus?
├─ No → Specific job functional knowledge?
│        ├─ No → BAND 1 (Manual / Junior Admin)
│        └─ Yes → Independence in applying professional expertise?
│                 ├─ No → BAND 2 (Clerical / Administrative)
│                 └─ Yes → Subject matter expert?
│                          ├─ No → BAND 3IC (Professional)
│                          └─ Yes → BAND 4IC (Subject Matter Expert)
└─ Yes → Manage professionals and/or managers?
         ├─ No → BAND 3M (Junior Management / Supervisor)
         └─ Yes → Set/influence organizational FUNCTIONAL strategy?
                  ├─ No → BAND 4M (Middle Management)
                  └─ Yes → Set/influence BUSINESS strategy?
                           ├─ No → BAND 5FS (Senior Management / Functional Strategy)
                           └─ Yes → CEO / Business Unit Manager?
                                    ├─ Yes → CEO (Band 6)
                                    └─ No → BAND 5BS (Top Management / Business Strategy)
```

Bands (low→high): `1, 2, 3IC, 3M, 4IC, 4M, 5FS, 5BS, ceo`.
- IC path: 1, 2, 3IC, 4IC, 5BS(exec)
- M path: 3M, 4M, 5FS, 5BS, ceo
- Band 5FS is **not offered** for small businesses (CEO 16–18).
- Bands 1, 2, 3M, 3IC are **unaffected** by BU size. Grade shift applies to 4IC, 4M, 5FS, 5BS.

### Band roles / "contributes through"
| Band | Name | Path | Contributes through |
|--|--|--|--|
| 1 | Manual / Junior Admin | IC | Tasks |
| 2 | Clerical / Administrative | IC | Skills |
| 3IC | Professional | IC | Expertise |
| 4IC | Subject Matter Expert | IC | Expertise (deep) |
| 3M | Junior Management / Supervisor | M | Leadership |
| 4M | Middle Management | M | Leadership |
| 5FS | Senior Management | M | Functional strategy |
| 5BS | Top Management | M/IC-exec | Business strategy |
| ceo | CEO / BU Manager | M | Business strategy (P&L) |

### Grade map (band → grade range, relative to Company Grade C)
Anchored to the **Company-Grade-20 grade map** (guide p.18). CEO sits at C; bands
occupy contiguous grades below C. Lower bands (1, 2, 3IC, 3M) are size-independent;
upper bands (4IC, 4M, 5FS, 5BS, CEO) shift with C ("grade shift"). Implemented as a
single reference table + shift in `lib/grading/bands.ts` (`bandGradeWindow`,
`BASE_WINDOWS`). The Company-20 values must be verified against page 18.

## Step 3 — Grading (7 factors)

The seven factors (each with band-specific ordered level definitions):
1. **Job Functional Knowledge** — tasks → procedures → principles → theory & practice of a discipline.
2. **Business Expertise** — knowledge of the business: team → function → business unit → industry/commercial environment.
3. **Leadership** — nature & breadth of guidance/authority provided to others (incl. informal role-modelling).
4. **Problem Solving** — mental skills: analysis, judgement, decision-making; amount of defined structure to rely on.
5. **Nature of Impact** — how the job affects the business (support → accuracy → quality/shared → primary operational/strategic).
6. **Area of Impact** — where impact is felt (own job → team → area/sub-function → function → business unit → enterprise/external).
7. **Interpersonal Skills** — people skills required (common courtesy → exchange → influence/advise → negotiate → shape strategic relationships).

Factor level definitions are **band-specific** and are implemented as such: each
band evaluates the seven factors against its own level set (typically 1–4 levels
per factor, §4.2–4.9), extracted into `lib/grading/band-factors.ts`. A job is
graded only against the levels defined for its band. WTW's exact per-grade scoring
weights are proprietary (delivered via WTW software) and not published in the
guide; Gradex uses a transparent, documented in-band placement: the normalized
average of the chosen band-specific factor levels maps across the band's grade
window, then is reconciled to the org's scoped range. Single-level factors carry
no positional information and are excluded from placement. The CEO band has no
factor levels — it is anchored directly to the Company Grade.

Principles enforced: grade the **job not the person**; assume a fully competent
incumbent; avoid grading on impact-of-error; document rationale.
