/**
 * Security test suite — DfE Digital Standards 2030 Self-Assessment Tool
 *
 * Run with: node security-test.js
 * Requires: npm install jsdom
 */

const fs = require('fs');
const { JSDOM } = require('jsdom');

let html = fs.readFileSync('index.html', 'utf8');

// Expose internal functions for testing
html = html.replace('</body>', `<script>
window.__T = {
  escapeHtml,
  sanitiseSharePayload,
  shareResults: typeof shareResults !== 'undefined' ? shareResults : null,
};
</script></body>`);

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost/',
});

const { window } = dom;
const doc = window.document;
window.scrollTo = () => {};
window.alert = (msg) => { window._lastAlert = msg; };
window.confirm = () => true;
window.navigator.clipboard = { writeText: () => Promise.resolve() };

setTimeout(() => {
  const T = window.__T;
  const issues = [];

  // ── 1. escapeHtml ────────────────────────────────────────────────────────────
  const escapeTests = [
    ['<script>alert(1)</script>', '&lt;', '<'],
    ['" onerror="alert(1)',        '&quot;', '"'],
    ["' onerror='alert(1)",        '&#39;',  "'"],
    ['`backtick`',                 '&#x60;', '`'],
    ['x=y',                        '&#x3D;', '='],
    ['a/b',                        '&#x2F;', '/'],
  ];
  for(const [input, expectedEscape, badChar] of escapeTests){
    const out = T.escapeHtml(input);
    if(out.includes(badChar)) issues.push(`escapeHtml left raw "${badChar}" in output: ${out}`);
    if(!out.includes(expectedEscape)) issues.push(`escapeHtml missing "${expectedEscape}" for "${badChar}"`);
  }
  if(T.escapeHtml(null)      !== '')  issues.push('escapeHtml(null) should return ""');
  if(T.escapeHtml(undefined) !== '')  issues.push('escapeHtml(undefined) should return ""');
  if(T.escapeHtml(0)         !== '0') issues.push('escapeHtml(0) should return "0"');

  // ── 2. sanitiseSharePayload — valid payload passes through ───────────────────
  const validPayload = {
    v: 1,
    ans: [[0,1,2,3],[0,1,2,3,3],[0,1,2],[0,1,2,3,3],[0,1,2,3,3],[0,1,2,3]],
    d: '2026-04-23T12:00:00.000Z',
    s: 'Test School',
    ph: 'Secondary',
    la: 'Hampshire',
    a: 'Chris Maddocks',
    j: 'IT Manager',
    l: 1
  };
  const cleaned = T.sanitiseSharePayload(validPayload);
  if(!cleaned) issues.push('sanitiseSharePayload rejected a valid payload');
  if(cleaned && cleaned.s !== 'Test School') issues.push('sanitiseSharePayload lost legitimate field');

  // ── 3. sanitiseSharePayload — prototype pollution blocked ────────────────────
  const polluted = JSON.parse('{"v":1,"ans":[[0,1,2,3]],"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted2":true}},"s":"ok"}');
  T.sanitiseSharePayload(polluted);
  if(({}).polluted)  issues.push('Prototype pollution via __proto__ succeeded!');
  if(({}).polluted2) issues.push('Prototype pollution via constructor.prototype succeeded!');

  // ── 4. sanitiseSharePayload — rejects bad types ──────────────────────────────
  const badTypes = [null, undefined, 'string', 42, true, [1,2,3]];
  for(const bad of badTypes){
    if(T.sanitiseSharePayload(bad) !== null) issues.push(`sanitiseSharePayload should reject ${JSON.stringify(bad)}`);
  }

  // ── 5. sanitiseSharePayload — rejects wrong version ──────────────────────────
  const wrongVersion = { ...validPayload, v: 99 };
  if(T.sanitiseSharePayload(wrongVersion) !== null) issues.push('sanitiseSharePayload accepted wrong version');

  // ── 6. sanitiseSharePayload — rejects out-of-range answer values ─────────────
  const badAnswers = { ...validPayload, ans: [[0, 1, 99, 3]] };
  if(T.sanitiseSharePayload(badAnswers) !== null) issues.push('sanitiseSharePayload accepted out-of-range answer value 99');

  const negativeAnswers = { ...validPayload, ans: [[-1, 1, 2, 3]] };
  if(T.sanitiseSharePayload(negativeAnswers) !== null) issues.push('sanitiseSharePayload accepted negative answer value');

  // ── 7. sanitiseSharePayload — caps string lengths ────────────────────────────
  const longString = 'x'.repeat(500);
  const longPayload = { ...validPayload, s: longString, a: longString };
  const capped = T.sanitiseSharePayload(longPayload);
  if(capped && capped.s.length > 200) issues.push(`String field not capped: ${capped.s.length} chars`);

  // ── 8. sanitiseSharePayload — rejects oversized arrays ───────────────────────
  const bigAns = { ...validPayload, ans: Array(25).fill([0,1,2,3]) };
  if(T.sanitiseSharePayload(bigAns) !== null) issues.push('sanitiseSharePayload accepted >20 standards');

  // ── 9. CSP meta tag present and correctly scoped ─────────────────────────────
  const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if(!csp) {
    issues.push('No CSP meta tag found');
  } else {
    const c = csp.getAttribute('content');
    if(!c.includes("default-src 'none'"))   issues.push('CSP missing default-src \'none\'');
    if(!c.includes("frame-ancestors 'none'")) issues.push('CSP missing frame-ancestors \'none\'');
    if(!c.includes("base-uri 'none'"))       issues.push('CSP missing base-uri \'none\'');
    if(!c.includes('cdnjs.cloudflare.com'))  issues.push('CSP missing cdnjs.cloudflare.com for Chart.js');
    if(!c.includes('gc.zgo.at'))             issues.push('CSP missing gc.zgo.at for GoatCounter');
    if(!c.includes('www.gov.uk'))            issues.push('CSP missing www.gov.uk for freshness check');
  }

  // ── 10. All target=_blank links have noopener noreferrer ─────────────────────
  const blankLinks = doc.querySelectorAll('a[target="_blank"]');
  let badLinks = 0;
  blankLinks.forEach(a => {
    const rel = a.getAttribute('rel') || '';
    if(!rel.includes('noopener') || !rel.includes('noreferrer')) badLinks++;
  });
  if(blankLinks.length === 0) issues.push('Sanity check: no target=_blank links found');
  if(badLinks > 0) issues.push(`${badLinks} target=_blank links missing noopener/noreferrer`);

  // ── 11. Security meta tags present ───────────────────────────────────────────
  if(!doc.querySelector('meta[http-equiv="X-Content-Type-Options"]')) issues.push('No X-Content-Type-Options meta tag');
  if(!doc.querySelector('meta[http-equiv="Permissions-Policy"]'))     issues.push('No Permissions-Policy meta tag');
  if(!doc.querySelector('meta[name="referrer"]'))                      issues.push('No referrer policy meta tag');

  // ── Results ───────────────────────────────────────────────────────────────────
  if(issues.length === 0){
    console.log('✅ All 11 security test groups passed');
  } else {
    console.log('❌ Security issues found:');
    issues.forEach(i => console.log('  -', i));
    process.exit(1);
  }

}, 600);
