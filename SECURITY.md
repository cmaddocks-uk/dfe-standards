# Security Policy

## Threat model

The DfE Digital Standards 2030 — Self-Assessment Tool is a single-file static HTML application served by GitHub Pages. It has no backend, no authentication, and no shared state between users. The only remote endpoints contacted by the tool are:

- **GOV.UK Content API** — called on page load to check whether any DfE standard pages have been updated since the tool was last verified. No user data is sent.
- **GoatCounter** — privacy-friendly anonymous analytics. No cookies, no fingerprinting, GDPR-compliant. Only an anonymous page-view ping is sent.

Each user's assessment data lives in their own browser's `localStorage` and is cleared when they exit the tool. No user-entered data is ever transmitted to any server.

The realistic security concerns for this kind of tool are:

1. **Share link injection** — the Share Results feature encodes assessment answers into a base64 URL hash. A maliciously crafted share link could attempt to inject unexpected data types, oversized payloads, or prototype pollution via the decoded JSON.
2. **Self-XSS via rendered content** — school name, assessor name and other user-entered strings are rendered back into the DOM. If rendered via `innerHTML` without escaping, a user could inject markup that corrupts their own output.
3. **Tabnabbing / referrer leakage** — external links to GOV.UK, ANME, NCSC etc. could leak referrer information if the destination is compromised.
4. **Clickjacking / framing** — the tool could be embedded in a hostile iframe.
5. **Future remote injection** — if the tool ever changed to fetch or load remote content beyond the GOV.UK API, that vector should be locked down by policy now.

## Defences in place

| Concern | Mitigation |
|---|---|
| Share link — oversized payload | 4KB size cap on decoded share hash |
| Share link — prototype pollution | `sanitiseSharePayload` validates structure, types and value ranges — only schema-defined keys accepted |
| Share link — type confusion | Each field type-checked; answer values must be integers 0–3 |
| Share link — array overflow | Max 20 standards, max 10 questions per standard enforced |
| Share link — string overflow | All string fields capped at 200 characters |
| Self-XSS via field rendering | `escapeHtml` escapes `& < > " ' / \` =` on all user-provided strings before DOM insertion |
| Remote script / data injection | CSP `default-src 'none'` — only `cdnjs.cloudflare.com` (Chart.js), `gc.zgo.at` (GoatCounter) and `www.gov.uk` (freshness check) permitted |
| Tabnabbing | All `target="_blank"` links use `rel="noopener noreferrer"` |
| Referrer leakage | `<meta name="referrer" content="strict-origin-when-cross-origin">` |
| Clickjacking | CSP `frame-ancestors 'none'` |
| Base tag injection | CSP `base-uri 'none'` |
| MIME-sniffing | `<meta http-equiv="X-Content-Type-Options" content="nosniff">` |
| Browser API abuse | `Permissions-Policy` disables camera, microphone, geolocation, USB, payment |

## What is not in scope

- **Confidentiality of localStorage data.** Assessment data stored in `localStorage` is accessible to any script running on the same origin. The tool clears this data on exit.
- **Print output redaction.** Governor reports and action plans contain everything entered. Treat printed copies as potentially sensitive documents.
- **Browser compromise.** If the user's browser is compromised, the tool cannot defend against that.
- **Phishing of the URL.** Always verify you are on `cmaddocks-uk.github.io/dfe-standards`. There is no other authoritative URL.

## Reporting a vulnerability

If you find a security issue, please open a [GitHub Issue](https://github.com/cmaddocks-uk/dfe-standards/issues) marked clearly as a security concern. For sensitive issues that should not be public, contact via the email on the GitHub profile and the issue can be coordinated privately.

## Verifying the deployed file

This is a single-file application. The version number is shown in the changelog screen within the tool. Anyone can review the source by viewing the page source in a browser, or by checking the [GitHub repository](https://github.com/cmaddocks-uk/dfe-standards).

There are no minifiers or build steps — what is in the repo is what is served.
