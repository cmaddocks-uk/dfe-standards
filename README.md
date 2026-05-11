# Cyber Incident Response Planner — Wales / Cymru

[![Security Policy](https://img.shields.io/badge/security-policy-green)](SECURITY.md)
[![Version](https://img.shields.io/badge/version-0.1.0-orange)](https://cmaddocks-uk.github.io/cyber-response-cymru/#changelog)

**Current version:** 0.1.0 — Welsh-context fork (Phase 1). See [in-app changelog](https://cmaddocks-uk.github.io/cyber-response-cymru/#changelog).

A free, single-file, browser-based planning tool for **Welsh schools**. Assesses cyber response readiness and generates a tailored **Cyber Incident Response Plan** mapped to NCSC, the Welsh Government [*Cyber Resilient Wales* strategy](https://www.gov.wales/cyber-resilient-wales-strategy), local authority cyber cover arrangements, [Estyn](https://www.estyn.gov.wales/) inspection arrangements (where cyber response intersects with safeguarding and leadership), and the [NCSC Cyber Assessment Framework (CAF)](https://www.ncsc.gov.uk/collection/cyber-assessment-framework) which Welsh Government is piloting across local authorities. Signposts the relevant ROCU Cyber PROTECT team — [TARIAN](https://www.tarianrccu.org.uk/) for South Wales, Gwent and Dyfed-Powys; [NWROCU](https://www.nwrocu.police.uk/) for North Wales.

Wales has no DfE-Cyber-Security-Hub equivalent — sector-specific cyber response planning support for Welsh schools is a real gap. This tool exists to fill it.

🌐 **Live tool:** [cmaddocks-uk.github.io/cyber-response-cymru](https://cmaddocks-uk.github.io/cyber-response-cymru)

🇬🇧 **Sister tool (England):** [cmaddocks-uk.github.io/cyber-response](https://cmaddocks-uk.github.io/cyber-response) — the original English-context version (DfE Digital Standards 2030, RPA, Ofsted, DfE Cyber Security Hub).

---

## Two-phase delivery

- **Phase 1 (this version, v0.1.x).** Framework swap only — UI remains in English, but every framework reference, signposted contact and assurance question is Welsh-context. A useful interim product in itself: Welsh-medium English-language schools (the majority of mainstream schools in Wales) can use it directly.
- **Phase 2 (planned, v1.0.0).** Full Welsh-language translation by a fluent Welsh translator with sector knowledge. See [TRANSLATION.md](TRANSLATION.md) for the brief.

The framework swap rationale and mapping is documented in [FRAMEWORK_SWAP.md](FRAMEWORK_SWAP.md).

## What it does

1. **Readiness check** — 12 RAG-scored questions on the current state of your incident response capability, mapped to NCSC and Welsh-context expectations.
2. **Plan builder** — 11 structured sections covering school details, response team, external contacts (incl. local authority cyber lead and ROCU Cyber PROTECT), severity grading, escalation authority, playbooks, communications, **critical systems & business impact (asset register + BIA, including Hwb-hosted services)**, recovery & backups, post-incident review, and plan maintenance (with annual cyber security calendar).
3. **Plan output** — generates a printable, governor-ready Cyber Incident Response Plan. Section 9 includes a structured asset register — particularly important for SaaS-hosted systems (Arbor, SIMS, Bromcom, ParentPay, CPOMS, M365, Google Workspace, Hwb-hosted services) where the school remains the data controller under UK GDPR.
4. **Seven playbooks** — ransomware, personal data breach, account compromise, phishing, denial of service, insider threat, and **SaaS supplier incident** (with Wales-specific notification routes: LA cyber lead, TARIAN / NWROCU, Welsh Gov contact).
5. **Tabletop exercises** — five anonymised scenarios that walk your plan through realistic incidents step-by-step, surfacing gaps where your plan is silent.
6. **Governor / Trustee Report** — one-page summary using Estyn-compatible principles-based assurance language.
7. **First 30 Minutes card** — printable, laminate-and-pin rapid-response card.
8. **Prioritised Action Plan** — auto-generated from the readiness check.
9. **Word / LibreOffice export** — every output exports as a `.doc` file that opens cleanly in Word / LibreOffice / Google Docs as an editable document.
10. **JSON save & restore** — save your working data to a local JSON file at any time and re-import later.

## Frameworks referenced

- [NCSC Incident Management collection](https://www.ncsc.gov.uk/collection/incident-management)
- [NCSC Cyber Assessment Framework (CAF)](https://www.ncsc.gov.uk/collection/cyber-assessment-framework) — Welsh Government is piloting CAF across local authorities; the plan structure aligns with CAF Objectives A (asset register), C (detection) and D (minimising impact).
- [Welsh Government — Cyber Resilient Wales strategy](https://www.gov.wales/cyber-resilient-wales-strategy)
- [Cyber Action Plan for Wales](https://www.gov.wales/cyber-action-plan-wales-html)
- [TARIAN ROCU](https://www.tarianrccu.org.uk/) (South Wales, Gwent, Dyfed-Powys) and [NWROCU](https://www.nwrocu.police.uk/) (North Wales) — Cyber PROTECT teams.
- [Estyn — Inspection guidance & resources](https://www.estyn.gov.wales/inspection-guidance-resources)
- [HWB](https://hwb.gov.wales/) — Welsh Government's digital learning platform.
- Local authority cyber cover / insurance arrangements (varies by LA — record yours in External Contacts).
- [Cyber Essentials](https://www.ncsc.gov.uk/cyberessentials/overview) — UK-wide NCSC scheme delivered by IASME.

## Privacy

- Runs entirely in your browser. Plan data never leaves your device.
- Data is held in the browser session only — closing the tab wipes it.
- Save progress to a local JSON file (and re-import later) when you want to persist.
- Anonymous page-view counts via [GoatCounter](https://www.goatcounter.com/help/gdpr) — privacy-friendly, GDPR-compliant, no cookies, no fingerprinting, no advertising trackers.

## Security

- Strict Content Security Policy (`default-src 'none'`) — only the GoatCounter analytics endpoint is permitted.
- JSON imports validated against a strict schema.
- All user input HTML-escaped before rendering.
- External links use `rel="noopener noreferrer"`.
- `frame-ancestors 'none'` and `form-action 'none'` block clickjacking and form-action hijack.
- `robots.txt` disallows indexing of common abuse paths (`/powerautomate/`, `/api/`, `/webhook/`).
- Custom 404 page explicitly disclaims Power Automate, webhook, payment and OAuth endpoints.

See [SECURITY.md](SECURITY.md) for the full threat model.

## Disclaimer

This tool is provided as-is, without warranty. It is not legal, regulatory or insurance advice. Always validate your plan with your IT support, DPO, SLT, local authority and insurer before relying on it. Not affiliated with the Welsh Government, NCSC, Estyn, TARIAN, NWROCU, HWB, ANME or any government body or insurer.

## Licence

MIT — see [LICENSE](LICENSE).

## Author

Christopher Maddocks (former ANME Ambassador). Built as a contribution to the Welsh and wider UK education community. The Welsh fork is released without prior TARIAN / Welsh Government review — feedback from Welsh sector partners is welcomed and will shape v1.0.0.
