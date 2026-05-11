# Security Policy

**Tool:** Cyber Incident Response Planner — Wales / Cymru
**Live site:** [cmaddocks-uk.github.io/cyber-response-cymru](https://cmaddocks-uk.github.io/cyber-response-cymru)
**Version covered:** v0.1.0 and later (Welsh fork)

---

## Reporting a security issue

If you find a security issue with this tool, please report it via:

- GitHub issue (if non-sensitive): [github.com/cmaddocks-uk/cyber-response-cymru/issues](https://github.com/cmaddocks-uk/cyber-response-cymru/issues)
- Direct email (if sensitive): the contact listed on the [author's GitHub profile](https://github.com/cmaddocks-uk)

Please **do not post exploit details publicly** before the issue is fixed. Realistic response time for a single-maintainer project is a few days, not a few hours.

---

## Threat model

This is the Welsh-context fork of the [English Cyber Incident Response Planner](https://cmaddocks-uk.github.io/cyber-response). It shares the English tool's security posture: **a single static HTML file** hosted on GitHub Pages, with no server, no database, no user accounts, and no remote API beyond a single privacy-friendly analytics beacon. Plan data is held in the user's browser session only and never leaves their device unless they explicitly export it as a JSON file.

### In scope — actively mitigated

| Threat | Mitigation |
|---|---|
| **Cross-site scripting (XSS)** via plan content | All user input HTML-escaped before rendering. Strict Content Security Policy: `default-src 'none'; script-src 'self' 'unsafe-inline' https://gc.zgo.at; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://cyber-response-cymru.goatcounter.com; connect-src https://cyber-response-cymru.goatcounter.com; form-action 'none'; frame-ancestors 'none'; base-uri 'none';` |
| **Prototype pollution / type confusion via JSON import** | All imported JSON files validated against a strict schema (`deepMergeSchema`). Unknown keys are dropped; type mismatches reject the import. Object prototypes never modified during merge. |
| **Open redirects via external links** | Every `target="_blank"` link uses `rel="noopener noreferrer"`. |
| **Iframe / clickjacking** | CSP `frame-ancestors 'none'` prevents the tool being embedded in an iframe on any other site. |
| **Form-action hijacking** | CSP `form-action 'none'` blocks any form from submitting to a remote endpoint. |
| **`<base>` tag injection** | CSP `base-uri 'none'` prevents an attacker from rebasing relative URLs. |
| **MIME sniffing** | `X-Content-Type-Options: nosniff` (via meta tag). |
| **Referer leakage** | `Referrer-Policy: strict-origin-when-cross-origin` (via meta tag). |
| **Browser feature abuse** | `Permissions-Policy` denies geolocation, camera, microphone, accelerometer, gyroscope, magnetometer, payment, USB. |
| **Domain abuse / fake URLs** (e.g. `cmaddocks-uk.github.io/cyber-response-cymru/powerautomate/...`) | See the dedicated section below. |

### Out of scope — what this tool does NOT defend against

- **Compromise of the user's own browser or device.** If the user's machine is infected, all bets are off.
- **Loss / theft of the user's exported plan JSON file.** Plans are saved as plain JSON to the user's filesystem. Treat saved plans as you would any sensitive school document — they may contain staff phone numbers and supplier contacts.
- **Phishing emails referring to the tool.** A phishing email could plausibly link to the real tool — that's not something this site can prevent. The tool itself only loads from `cmaddocks-uk.github.io/cyber-response-cymru`; verify the URL.
- **Malicious browser extensions.** A malicious extension can read or modify plan data in the browser. The tool cannot defend against this.

---

## Domain abuse — fake URLs using `cmaddocks-uk.github.io`

GitHub Pages serves any path under the site's base URL, falling through to the configured 404 page if no file matches. This means a third party could spread a fake URL like:

```
cmaddocks-uk.github.io/cyber-response-cymru/powerautomate/your-flow-here
cmaddocks-uk.github.io/cyber-response-cymru/api/auth/microsoft
cmaddocks-uk.github.io/cyber-response-cymru/webhook/triggers/...
```

…and anyone clicking it would arrive at this domain. The site never hosts these endpoints. The tool is not a webhook, API server, OAuth provider, or integration target. It is a **static HTML file** for cyber response planning.

### What this site does to mitigate domain abuse

1. **Custom 404 page** ([`404.html`](404.html)) explicitly disclaims Power Automate / webhook / payment / OAuth endpoints by name. Anyone arriving at a fake URL sees a clear "this site does not host that" message.
2. **`robots.txt`** disallows search-engine indexing of common abuse path patterns (`/powerautomate/`, `/api/`, `/webhook/`, `/auth/`, `/payment/`, etc.) so those URLs don't get indexed and amplified by search results.
3. **No client-side routing.** The tool is a single `index.html`. Unknown paths are served the 404, not silently rewritten to the SPA.
4. **`frame-ancestors 'none'`** prevents the tool being framed inside another site to lend credibility to a fake URL.

### What to do if you receive a suspicious URL using this domain

1. **Do not click it.** The real tool is at `cmaddocks-uk.github.io/cyber-response-cymru` with **no further path components**.
2. Forward the email to [Report Suspicious Email](https://www.ncsc.gov.uk/collection/phishing-scams/report-suspicious-emails) (`report@phishing.gov.uk`) so NCSC can act on it.
3. Report to [Report Fraud](https://www.reportfraud.police.uk/) (`0300 123 2040`) if money or data has been lost.
4. Welsh schools can also notify their regional ROCU Cyber PROTECT team — TARIAN (South Wales / Gwent / Dyfed-Powys) or NWROCU (North Wales).
5. Notify the author via the issue route above so the 404 page and robots.txt can be hardened against the specific path being abused.

---

## Privacy

- No cookies. No fingerprinting. No advertising trackers.
- One external connection: anonymous page-view counts via [GoatCounter](https://www.goatcounter.com/help/gdpr) (privacy-friendly, GDPR-compliant). Whitelisted in CSP.
- Plan data lives in browser sessionStorage only — never sent to any server.
- JSON exports go directly to the user's filesystem via the browser's download mechanism.

---

## Last reviewed

This document is reviewed at each minor version bump. Last reviewed: **v0.1.0 (10 May 2026).**
