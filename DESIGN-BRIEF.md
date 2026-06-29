# Claude Design brief — DfE Digital Standards 2030 Self-Assessment Tool

**Goal:** re-skin this tool's UI so it matches its sibling, the **Cyber Incident
Response Planner** (`cyber-response`). A school that uses both should feel they
came from the same maker. This is a **visual re-skin only** — every existing
function stays (RAG self-assessment, action plan, governor report, history, trust
management, GOV.UK freshness check, print). No backend, no framework change.

> Paste this whole file into Claude Design as the brief. Sections 1–7 are the
> design system (taken verbatim from the `cyber-response` codebase, the source of
> truth); section 8 is the screen-by-screen comp list; sections 9–11 are the hard
> constraints.

---

## 1. What this tool is
A free, no-login, client-side self-assessment for **schools in England** working
towards the **6 core DfE Digital & Technology Standards by 2030**:

1. Broadband Internet
2. Wireless Network
3. Network Switching & Cabling
4. Cyber Security
5. Filtering & Monitoring
6. Digital Leadership & Governance

Audience: school business managers, IT leads, SLT, governors — **mostly
non-technical**. Tone: calm, plain-English, reassuring, authoritative. Never
alarmist.

## 2. Colour tokens (cyber-response design language + this tool's own teal accent)
The structural tokens come from `cyber-response/tailwind.config.mjs`, but the
**accent stays this tool's existing teal-green** (`#0d9488`) rather than the
planner's blue — sibling tools, distinct per-tool accent.
| Token | Hex | Use |
|---|---|---|
| Navy | `#0b2545` (alt `#13315c`) | Primary text, dark nav bar, headings |
| **Accent** | `#0d9488` (teal-green) | THE action colour — buttons, fills, borders, focus rings, active tab, the brand mark, the score ring. |
| Accent text on white | `#0f766e` | Links / eyebrow accents / "→" labels — the AA-legible darker teal (matches the existing pills). |
| Accent soft tint | `#f0fdfa` | Pill / inset backgrounds; focus ring `rgba(13,148,136,.2)` |
| Ink | `#0f172a` | Strong body text |
| Muted | `#5b6a82` | Captions, eyebrows, labels |
| Line | `#e3e8ef` | Card & divider borders |
| Surface | `#ffffff` bg; `#f8fafc` insets | Backgrounds |
| RAG green | `#15803d` (tint `#f0fdf4`, border `#86efac`) | "On track" / strong |
| RAG amber | `#b45309` | "Developing" |
| RAG red | `#b91c1c` | "Needs attention" |

**Rule:** `#0d9488` = "click me" (use `#0f766e` for accent text on white). Keep
the accent for actions/the mark/the ring only — **no blue anywhere**. The RAG set
is the tool's existing one and maps straight onto the assessment scoring; it's
distinct from the teal accent so they don't clash.

## 3. Typography (matches `cyber-response`, v2.18 "Hanken Grotesk site-wide")
- **Hanken Grotesk** (400–800) — display + all headings. Tight tracking on big
  headings (`-0.02em` to `-0.03em`), `line-height ≈ 1.1–1.2`.
- **IBM Plex Sans** (400–700) — body text (Inter as fallback).
- Replaces the current `Segoe UI` system stack.
- These are loaded from Google Fonts in `cyber-response`. This tool's CSP blocks
  that today (`font-src 'self'`) — see §10 for the two ways to resolve it.

## 4. Brand mark & header (the **ring-disc** mark from `cyber-response`)
SVG ring-disc, `currentColor`. Geometry (from `BrandMark.astro`):
- `viewBox 0 0 36 36`
- **Ring:** `cx/cy 18`, `r 15.5`, `stroke-width 3`, `stroke-dasharray "20.4 4"`
  → four segments + four gaps.
- **Central disc:** `cx/cy 18`, `r 11.5`, filled. May carry a short Hanken
  Grotesk 800 glyph centred in the disc.
- Colours: dark variant = mark in `#0d9488` (teal) on white; light variant =
  white mark on `#0d9488`.

Header lockup: navy sticky nav bar, ring-disc mark + wordmark **"DfE Digital
Standards"** (sub-label "2030 Self-Assessment" if room). Mirror the planner's
cross-link pattern with a small **`Cyber Incident Response Planner ↗`** link in
the header/footer so the two tools point at each other.

## 5. Score motif — the readiness gauge
Reuse `cyber-response`'s homepage **readiness gauge** for the overall result (and
the governor-report cover): an animated count-up ring showing a 0–100 score,
**accent `#0d9488`** (teal) progress stroke on a light track (`#F1F5F9`), large numeral
in the centre (Hanken Grotesk). Count-up ~800ms–1.1s cubic ease-out; **respect
`prefers-reduced-motion`** (snap to final value). The centre number is the
overall % across the 6 standards.

## 6. Component conventions (from `cyber-response`)
- **Cards:** white, `border-radius 10px`, `1px` border `#e3e8ef`, shadow
  `0 1px 2px rgba(15,23,42,.04), 0 4px 12px rgba(15,23,42,.06)`, generous padding.
- **Nav bar:** navy, sticky, ~56px; ring-disc mark + wordmark; tabs are ghost
  buttons, active tab = filled pill. Must `flex-wrap`, never horizontal-scroll
  (don't clip labels) and never push page width.
- **Buttons:** primary = solid accent `#0d9488`, white text; secondary = white +
  border; ghost = transparent. Visible teal focus ring.
- **RAG tiles / pills:** the colour + soft-tint pairs from §2 — one per standard
  on the home grid and the results breakdown.
- **Eyebrow labels:** `11px`, uppercase, `letter-spacing .05em`, muted.
- **Inputs:** white, `1px` border, ~`8px` radius, accent focus ring.
- Keep the existing "Buy me a coffee"-style support link treatment if present in
  the family footer (plain `<a>`, no third-party widget — CSP).

## 7. Print / governor report
A4 portrait. `print-color-adjust: exact` on navy/accent/RAG elements so colour
survives print. Hanken headings, navy ribbon, accent score gauge on the cover.
Make the governor-report cover read as a sibling of the planner's governor report.
Keep the existing copy-to-clipboard governor summary.

## 8. Screens to comp (this tool's actual flow)
On-brand comps for each, desktop (1280) + a note on mobile (≤640) collapse:

1. **Home / landing** — hero (replace the 📋 emoji with the ring-disc mark),
   title, plain-English intro, the four trust pills ("Free", "No account", "Data
   cleared on exit", "Print for governors"), GOV.UK freshness badge, **the
   6-standard grid** (each a card showing its RAG status once assessed),
   school-name input, history list, "next assessment due" banner, leader-check
   Yes/No, laptop-recommended banner.
2. **Assessment question** — single question card, its standard as an eyebrow,
   RAG answer options, hint text, back/next, progress indicator.
3. **Results** — the **accent score gauge** with overall %, per-standard RAG bar
   breakdown, benchmark/comparison grid, detail breakdown, links to action plan +
   governor report, and the "you vs last time" re-assessment comparison.
4. **Action plan** — prioritised red/amber items, owner + timescale, print-ready.
5. **Governor report** — print layout (Hanken), assessor name/title, score gauge
   on cover, RAG summary table, copy-to-clipboard.
6. **About** + **Changelog** — simple on-brand content screens.

## 9. Consistency with the planner (must-haves)
- Same colour tokens, same Hanken/IBM Plex split, same card radius (10px) +
  shadow.
- Same **ring-disc** brand mark and the same **readiness/score gauge** style.
- Same **RAG colour + soft-tint** pairs.
- Same dark navy nav with the mark + a cross-link to the planner.
- Governor report cover that looks like a sibling of the planner's.

## 10. Hard constraints (do not break)
- **Static, no build.** Plain HTML + CSS + vanilla JS. No framework, no bundler.
  (The planner is Astro; do NOT port its build — only its *look*.)
- **Strict CSP** (see `index.html`): `default-src 'none'`; styles `'self'
  'unsafe-inline'`; `font-src 'self'`; `img-src 'self' data:`. To use Hanken
  Grotesk + IBM Plex, pick ONE and state it in the comp:
  - **(a) Self-host** the woff2 files in the repo + `@font-face` (keeps CSP
    locked down — preferred), or
  - **(b) Widen the CSP** to add `style-src ... https://fonts.googleapis.com` and
    `font-src 'self' https://fonts.gstatic.com` and use a Google Fonts `<link>`
    (matches the planner exactly). Do this deliberately, not silently.
- **Keep all functionality:** RAG scoring, history, trust management, GOV.UK
  freshness check, governor copy, print, "data cleared on exit" (no storage).
- **Accessibility:** AA contrast, visible focus rings, `prefers-reduced-motion`
  honoured by the gauge.
- **Mobile:** keep the "best on laptop" banner; grids collapse to one column
  ≤640px.

## 11. Compliance guardrail (do not skip)
Never display unearned certification logos (SOC 2 / ISO / Cyber Essentials marks).
Use audience trust signals ("Built for schools in England") and framework
**alignment as text** (DfE Digital & Technology Standards, NCSC). This tool
*prepares and informs* — it does not *certify*. Keep all framework claims true and
current (that's what the GOV.UK freshness check is for).

---

### Reference: source of truth
Everything above is taken from the `cyber-response` repo as it ships today:
`tailwind.config.mjs` (colour tokens, fonts, card shadow/radius),
`src/components/BrandMark.astro` (ring-disc geometry), and the homepage readiness
gauge. If the planner's design changes, re-derive this brief from those files so
the two tools stay in step.

---

## 12. Content & copy (use this wording, not placeholders)
Pulled from the live tool (`index.html`, `standards-data.js`).

- **Tool name / wordmark:** "DfE Digital Standards 2030 — Self-Assessment Tool"
- **Hero tagline:** "A free self-assessment tool for schools working towards the 6
  core DfE Digital & Technology Standards by 2030."
- **Trust pills (4):** "Free to use" · "No account needed" · "Data cleared on exit"
  · "Print reports for governors"
- **Positioning callout:** "A self-assessment and discussion tool for schools —
  designed to complement the DfE's own 'Plan Technology for Your School' service,
  not replace it. Produces RAG scores, an action plan and a governor report. No
  data stored — cleared on exit."
- **GOV.UK source link (header badge):** gov.uk/guidance/meeting-digital-and-
  technology-standards-in-schools-and-colleges

**The 6 standards** — short label on the home grid / eyebrows, full name as card
title, description as card body:

| # | Full name | Short | Description |
|---|---|---|---|
| 1 | Broadband Internet | Broadband | Full fibre broadband with resilience, appropriate speeds and safeguarding systems in place. |
| 2 | Wireless Network | Wireless | Reliable, centrally managed Wi-Fi coverage across all teaching and learning spaces. |
| 3 | Network Switching & Cabling | Network | Fast, reliable and secure network switches with central management, security features and resilient power. |
| 4 | Cyber Security | Cyber Security | Keep your school or college cyber secure and control and secure user accounts. |
| 5 | Filtering & Monitoring | Filtering | Provide a safe online environment with appropriate filtering and monitoring. Schools should already be meeting this standard now. |
| 6 | Digital Leadership & Governance | Leadership | Effective digital technology leadership, governance, roles, responsibilities and processes. |
