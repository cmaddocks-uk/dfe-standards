# DfE Digital Standards 2030 — Self-Assessment Tool

A free, browser-based self-assessment tool for schools and colleges in England working towards the **6 core DfE Digital & Technology Standards by 2030**.

🔗 **Live tool:** [cmaddocks-uk.github.io/dfe-standards](https://cmaddocks-uk.github.io/dfe-standards)
💬 **Feedback:** [cmaddocks-uk.github.io/dfe-standards/feedback.html](https://cmaddocks-uk.github.io/dfe-standards/feedback.html)

---

## What is it?

The DfE Digital Standards 2030 — Self-Assessment Tool helps school IT teams assess their current position against the 6 core DfE Digital & Technology Standards. It produces a RAG-rated results report, a prioritised action plan and a governor summary report in plain English — all without any account, server or data being stored.

It is designed as a **self-assessment and discussion aid** — not an authoritative compliance benchmark. Every question is based on an explicitly stated DfE requirement, and the tool is designed to complement the DfE's own [Plan Technology for Your School](https://www.gov.uk/guidance/plan-technology-for-your-school) service.

---

## Features

- ✅ **28 questions** across all 6 core DfE 2030 standards
- ✅ **RAG scoring** — Meeting Standard / Developing / Needs Attention
- ✅ **Prioritised action plan** with suggested next steps for each gap
- ✅ **Governor summary report** — plain English, print-ready PDF
- ✅ **Real-world examples** under every question (e.g. Aruba Central, Cisco Meraki, Smoothwall)
- ✅ **Standards Radar** — visual overview of all 6 standards
- ✅ **Assessment history** — compare progress over time
- ✅ **Trust / Multi-School View** — aggregate results across multiple schools
- ✅ **Share Results** — copy a link that loads your results in the hosted tool
- ✅ **GOV.UK freshness check** — automatically detects when DfE standards pages are updated
- ✅ **No account needed** — runs entirely in the browser, data cleared on exit

---

## The 6 Core Standards

| Standard | DfE Target |
|---|---|
| ⚡ Broadband Internet | 2030 |
| 🔐 Cyber Security | 2030 |
| 🏛️ Digital Leadership & Governance | 2030 |
| 🛡️ Filtering & Monitoring | Already required |
| 🔌 Network Switching & Cabling | 2030 |
| 📶 Wireless Network | 2030 |

---

## How to use it

1. Open [cmaddocks-uk.github.io/dfe-standards](https://cmaddocks-uk.github.io/dfe-standards) in any browser
2. Enter your school details
3. Complete the 28-question assessment (takes around 15–20 minutes)
4. View your RAG results, action plan and governor report
5. Print or save as PDF to share with SLT and governors

No download required. No account needed. No data stored.

---

## Automated Standards Monitoring

This repo includes a GitHub Action (`check-standards.yml`) that runs daily at 8am UTC. It calls the GOV.UK Content API to check whether any of the 6 DfE standard pages have been updated. If a change is detected, it automatically creates a GitHub Issue flagging which standard has changed and linking to the updated GOV.UK page for review.

---

## Built by

Christopher Maddocks, Ex ANME Ambassador — built for the use of schools in the UK.

Supported by feedback from [ANME](https://anme.co.uk) — the Association of Network Manager in Education.

---

## Feedback

Found something unclear or wrong? Have a suggestion?

👉 [Leave feedback here](https://cmaddocks-uk.github.io/dfe-standards/feedback.html)

Or raise a [GitHub Issue](https://github.com/cmaddocks-uk/dfe-standards/issues).

---

## DfE Standards Reference

[Meeting digital and technology standards in schools and colleges](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges)

Standards last verified: **March 2026**
