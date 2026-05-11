// GOV.UK Content API freshness check.
// Loaded after standards-data.js, before app.js.

// Checks each standard's GOV.UK guidance page for updates via the public
// GOV.UK Content API. Detects when a page was last changed — but CANNOT
// auto-update questions, scoring or actions. Those require manual community review.

// Per-standard last-verified dates. Bump only the standard you've actually
// re-reviewed against the current GOV.UK guidance page — don't blanket-bump.
const VERIFIED_DATES = {
  broadband:  "2026-04-23",
  cyber:      "2026-04-23",
  leadership: "2026-04-23",
  filtering:  "2026-04-23",
  switching:  "2026-04-23",
  wireless:   "2026-04-23"
};

function fmtVerifiedMonth(iso){
  return new Date(iso).toLocaleDateString("en-GB", {month:"short", year:"numeric"});
}
function latestVerifiedDisplay(){
  const latest = Object.values(VERIFIED_DATES).sort().slice(-1)[0];
  return fmtVerifiedMonth(latest);
}

const GOV_PATHS = {
  broadband:  "/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/broadband-internet-core-standard",
  cyber:      "/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/cyber-security-core-standard",
  leadership: "/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/digital-leadership-and-governance-core-standard",
  filtering:  "/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/filtering-and-monitoring-core-standard",
  switching:  "/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/network-switching-core-standard",
  wireless:   "/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/wireless-network-core-standard",
};

async function checkFreshness() {
  const badge = document.getElementById("freshnessBadge");
  const panel = document.getElementById("freshnessPanel");
  const stdList = document.getElementById("freshnessStdList");
  const panelTitle = document.getElementById("freshnessPanelTitle");
  const panelIcon = document.getElementById("freshnessPanelIcon");
  if (!badge) return;

  const results = [];

  await Promise.allSettled(
    STANDARDS.map(async s => {
      const path = GOV_PATHS[s.id];
      const verifiedISO = VERIFIED_DATES[s.id];
      if (!path || !verifiedISO) return;
      try {
        const resp = await fetch(`https://www.gov.uk/api/content${path}`, {
          headers: { "Accept": "application/json" },
          signal: AbortSignal.timeout(8000)
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const updated = new Date(data.public_updated_at);
        if (isNaN(updated.getTime())) throw new Error("missing or invalid public_updated_at");
        const isStale = updated > new Date(verifiedISO);
        results.push({ id: s.id, icon: s.icon, name: s.name, updated, verifiedISO, isStale, path });
      } catch(err) {
        results.push({ id: s.id, icon: s.icon, name: s.name, error: true });
      }
    })
  );

  const stale = results.filter(r => r.isStale);
  const errors = results.filter(r => r.error);

  // Update badge
  if (errors.length === results.length) {
    badge.textContent = `📋 Verified: ${latestVerifiedDisplay()}`;
    badge.title = "Could not reach GOV.UK to check for updates — using last verified date";
    return;
  }

  if (stale.length === 0) {
    if (errors.length > 0) {
      const checked = results.length - errors.length;
      badge.textContent = `✅ ${checked} of ${results.length} current`;
      badge.style.background = "var(--amber-bg)";
      badge.style.color = "var(--amber)";
      badge.style.borderColor = "var(--amber-border)";
      badge.title = `${errors.length} standard${errors.length > 1 ? "s" : ""} couldn't be checked against GOV.UK (network issue) — the ${checked} that were checked are current`;
    } else {
      badge.textContent = "✅ Standards current";
      badge.style.background = "var(--green-bg)";
      badge.style.color = "var(--green)";
      badge.style.borderColor = "var(--green-border)";
      badge.title = "All standards verified against GOV.UK — no updates detected";
    }
    return;
  }

  // Updates detected — show badge and panel
  badge.textContent = `⚠️ ${stale.length} standard${stale.length > 1 ? "s" : ""} updated on GOV.UK`;
  badge.style.background = "var(--amber-bg)";
  badge.style.color = "var(--amber)";
  badge.style.borderColor = "var(--amber-border)";
  badge.title = "GOV.UK has updated one or more standards since this tool was last verified";

  panelTitle.textContent = `${stale.length} standard${stale.length > 1 ? "s have" : " has"} been updated on GOV.UK since this tool was last verified`;
  panelIcon.textContent = "⚠️";

  stdList.innerHTML = stale.map(r => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 10px;background:#fffbeb;border:1px solid var(--amber-border);border-radius:8px">
      <span style="font-size:15px;flex-shrink:0">${r.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:700;color:var(--navy)">${r.name}</div>
        <div style="font-size:11px;color:var(--amber);margin-top:2px">
          GOV.UK updated: <strong>${r.updated.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</strong>
          — questions in this tool were last verified ${fmtVerifiedMonth(r.verifiedISO)}
        </div>
      </div>
      <a href="https://www.gov.uk${r.path}" target="_blank" rel="noopener noreferrer"
         style="font-size:11px;color:var(--teal);text-decoration:none;white-space:nowrap;flex-shrink:0;margin-top:2px">
        View on GOV.UK ↗
      </a>
    </div>
  `).join("") + (errors.length > 0 ? `
    <div style="font-size:11px;color:var(--muted);padding:4px 2px">
      ⚠️ ${errors.length} standard${errors.length > 1 ? "s" : ""} could not be checked (network issue).
    </div>` : "");

  panel.style.display = "block";
}