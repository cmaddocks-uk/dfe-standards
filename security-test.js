const fs = require('fs');
const { JSDOM } = require('jsdom');

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('</body>', `<script>
window.__T = {
  state: () => state,
  setState: (s) => { state = s; },
  initState, deepMergeSchema, escapeHtml, generatePlan, importSession
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

setTimeout(() => {
  const T = window.__T;
  const issues = [];

  // ---- 1. escapeHtml strength ----
  const tests = [
    ['<script>alert(1)</script>', '<', '&lt;'],
    ['" onerror="alert(1)', '"', '&quot;'],
    ["' onerror='alert(1)", "'", '&#39;'],
    ['javascript:alert(1)', '/', null],   // / is not in path but may appear
    ['`backtick`', '`', '&#x60;'],
    ['x=y', '=', '&#x3D;'],
    ['a/b', '/', '&#x2F;'],
  ];
  for(const [input, badChar, expectedEscape] of tests){
    const out = T.escapeHtml(input);
    if(out.includes(badChar)) issues.push(`escapeHtml left raw "${badChar}" in: ${out}`);
    if(expectedEscape && !out.includes(expectedEscape)) issues.push(`escapeHtml missing expected "${expectedEscape}" for "${badChar}"`);
  }

  // null and undefined safety
  if(T.escapeHtml(null) !== "") issues.push("escapeHtml(null) should return empty string");
  if(T.escapeHtml(undefined) !== "") issues.push("escapeHtml(undefined) should return empty string");
  if(T.escapeHtml(0) !== "0") issues.push("escapeHtml(0) should preserve '0' (not coerce to empty)");

  // ---- 2. Prototype pollution resistance ----
  const malicious = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted2":true}},"plan":{"meta":{"schoolName":"OK"}}}');
  const fresh = T.initState();
  const merged = T.deepMergeSchema(fresh, malicious);
  if(({}).polluted) issues.push("Prototype pollution succeeded via __proto__!");
  if(({}).polluted2) issues.push("Prototype pollution succeeded via constructor.prototype!");
  if(merged.__proto__.polluted) issues.push("Object prototype was modified");
  if(merged.plan.meta.schoolName !== "OK") issues.push("Legitimate field was lost during sanitisation");

  // ---- 3. Schema validation drops unknown keys ----
  const sneakyImport = {
    plan: {
      meta: {
        schoolName: "Real Name",
        evilExtraField: "should be dropped",
        anotherEvil: { nested: "stuff" }
      }
    },
    rogue_top_level: "should not appear"
  };
  const filtered = T.deepMergeSchema(T.initState(), sneakyImport);
  if(filtered.plan.meta.schoolName !== "Real Name") issues.push("Schema merge lost legitimate field");
  if(filtered.plan.meta.evilExtraField !== undefined) issues.push("Schema merge kept unknown key 'evilExtraField'");
  if(filtered.rogue_top_level !== undefined) issues.push("Schema merge kept unknown top-level key");

  // ---- 4. Type confusion is rejected ----
  const wrongTypes = {
    plan: {
      meta: {
        schoolName: ["array","instead","of","string"],
        urn: { nested: "obj instead of string" },
        planVersion: 42  // number instead of string
      }
    }
  };
  const typed = T.deepMergeSchema(T.initState(), wrongTypes);
  if(Array.isArray(typed.plan.meta.schoolName)) issues.push("Array passed in for string field — should have been rejected");
  if(typeof typed.plan.meta.urn === "object") issues.push("Object passed in for string field — should have been rejected");
  if(typeof typed.plan.meta.planVersion === "number") issues.push("Number passed in for string field — should have been rejected");

  // ---- 5. String length cap ----
  const longString = "x".repeat(100000);
  const longImport = { plan: { meta: { schoolName: longString } } };
  const capped = T.deepMergeSchema(T.initState(), longImport);
  if(capped.plan.meta.schoolName.length > 50000) issues.push(`String not capped: ${capped.plan.meta.schoolName.length} chars`);

  // ---- 6. Array length cap ----
  const bigArray = Array(500).fill({name:"x",role:"x",phone:"x",email:"x"});
  const arrayImport = { plan: { team: { members: bigArray } } };
  const arrCapped = T.deepMergeSchema(T.initState(), arrayImport);
  if(arrCapped.plan.team.members.length > 200) issues.push(`Array not capped: ${arrCapped.plan.team.members.length} items`);

  // ---- 7. Plan output renders attempted XSS payload as text ----
  const xssState = T.initState();
  xssState.plan.meta.schoolName = '<script>window.xssTriggered=true</script><img src=x onerror="window.xssTriggered=true">';
  xssState.plan.meta.approvedBy = '"><svg/onload=alert(1)>';
  T.setState(xssState);
  T.generatePlan();
  if(window.xssTriggered) issues.push("XSS payload executed during plan generation!");
  const planOut = doc.getElementById('planOutput').innerHTML;
  if(planOut.includes('<script>') && !planOut.includes('&lt;script')) issues.push("Raw <script> tag found in plan output — escape is not working");
  if(planOut.includes('onerror=') && !planOut.includes('onerror=&#x3D;') && !planOut.includes('onerror&#x3D;')) {
    // Check if it appears as raw HTML attribute or as escaped text
    // We accept either &quot; before or any escape of =
    if(/<\w+[^>]*onerror=/i.test(planOut)) issues.push("onerror attribute present as raw HTML in plan output");
  }
  if(planOut.includes('<svg') && !planOut.includes('&lt;svg')) issues.push("Raw <svg> tag found in plan output");

  // ---- 8. CSP meta tag is present and correctly scoped ----
  const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if(!csp) issues.push("No CSP meta tag");
  else {
    const content = csp.getAttribute('content');
    if(!content.includes("default-src 'none'")) issues.push("CSP missing default-src 'none'");
    if(!content.includes("frame-ancestors 'none'")) issues.push("CSP missing frame-ancestors 'none'");
    if(!content.includes("base-uri 'none'")) issues.push("CSP missing base-uri 'none'");

    // connect-src should be locked to just GoatCounter — nothing else.
    // If anyone adds another remote endpoint without thinking about it,
    // this test will catch it.
    const connectMatch = content.match(/connect-src ([^;]+);/);
    if(!connectMatch) issues.push("CSP has no connect-src directive");
    else {
      const connectSrc = connectMatch[1].trim();
      const allowed = connectSrc.split(/\s+/);
      const expected = ["https://cyber-response-cymru.goatcounter.com"];
      const unexpected = allowed.filter(s => s !== "'none'" && s !== "'self'" && !expected.includes(s));
      if(unexpected.length > 0) issues.push(`CSP connect-src has unexpected entries: ${unexpected.join(", ")}`);
    }

    // script-src should similarly only include 'self', 'unsafe-inline' and gc.zgo.at
    const scriptMatch = content.match(/script-src ([^;]+);/);
    if(!scriptMatch) issues.push("CSP has no script-src directive");
    else {
      const scriptSrc = scriptMatch[1].trim();
      const allowed = scriptSrc.split(/\s+/);
      const expected = ["'self'", "'unsafe-inline'", "https://gc.zgo.at"];
      const unexpected = allowed.filter(s => !expected.includes(s));
      if(unexpected.length > 0) issues.push(`CSP script-src has unexpected entries: ${unexpected.join(", ")}`);
    }

    // style-src should only include 'self', 'unsafe-inline' and Google Fonts CSS
    const styleMatch = content.match(/style-src ([^;]+);/);
    if(!styleMatch) issues.push("CSP has no style-src directive");
    else {
      const styleSrc = styleMatch[1].trim();
      const allowed = styleSrc.split(/\s+/);
      const expected = ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"];
      const unexpected = allowed.filter(s => !expected.includes(s));
      if(unexpected.length > 0) issues.push(`CSP style-src has unexpected entries: ${unexpected.join(", ")}`);
    }

    // font-src should only include 'self' and Google Fonts binaries
    const fontMatch = content.match(/font-src ([^;]+);/);
    if(!fontMatch) issues.push("CSP has no font-src directive");
    else {
      const fontSrc = fontMatch[1].trim();
      const allowed = fontSrc.split(/\s+/);
      const expected = ["'self'", "https://fonts.gstatic.com"];
      const unexpected = allowed.filter(s => !expected.includes(s));
      if(unexpected.length > 0) issues.push(`CSP font-src has unexpected entries: ${unexpected.join(", ")}`);
    }
  }

  // ---- 9. All target=_blank links have noopener noreferrer ----
  const blankLinks = doc.querySelectorAll('a[target="_blank"]');
  let badLinks = 0;
  blankLinks.forEach(a => {
    const rel = a.getAttribute('rel') || '';
    if(!rel.includes('noopener') || !rel.includes('noreferrer')) badLinks++;
  });
  if(badLinks > 0) issues.push(`${badLinks} target=_blank links missing noopener/noreferrer`);
  if(blankLinks.length === 0) issues.push("Test sanity check: no target=_blank links found?");

  // ---- 10. X-Content-Type-Options and Permissions-Policy present ----
  if(!doc.querySelector('meta[http-equiv="X-Content-Type-Options"]')) issues.push("No X-Content-Type-Options meta tag");
  if(!doc.querySelector('meta[http-equiv="Permissions-Policy"]')) issues.push("No Permissions-Policy meta tag");
  if(!doc.querySelector('meta[name="referrer"]')) issues.push("No referrer policy meta tag");

  // ---- 11. Import rejects oversized file ----
  // Mock a large file
  const fakeInput = { value: "", files: [{ size: 5 * 1024 * 1024, /* 5MB */ name: "huge.json" }], target: null };
  fakeInput.target = fakeInput;
  window._lastAlert = null;
  T.importSession(fakeInput);
  if(!window._lastAlert || !window._lastAlert.includes("too large")) issues.push("Oversized file not rejected");

  // ---- 12. Import rejects non-object JSON ----
  // We'll simulate by directly testing deepMergeSchema with bad inputs
  const badInputs = [null, undefined, "just a string", 42, true, [1,2,3]];
  for(const bad of badInputs){
    const result = T.deepMergeSchema(T.initState(), bad);
    // Should fall back to schema (not throw, not pollute)
    if(typeof result !== "object" || result === null || !result.plan) {
      issues.push(`Bad input ${JSON.stringify(bad)} broke deepMergeSchema`);
    }
  }

  if(issues.length === 0){
    console.log('✅ All 12 security test groups passed');
  } else {
    console.log('❌ Security issues found:');
    issues.forEach(i => console.log('  -', i));
    process.exit(1);
  }
}, 600);
