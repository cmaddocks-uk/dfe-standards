// Mobile detection — show banner on mobile devices
if(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)){
  const mb = document.getElementById("mobileBanner");
  if(mb) mb.style.display = "block";
}

// ─── State ────────────────────────────────────────────────────────────────────
let school = "", schoolMeta = {urn:"",trust:"",la:"",phase:""};
let assessor = "", jobTitle = "", isLeader = false;
let answers = {}, step = 0;
let assessments = [], currentResult = null, radarChartInst = null;
let currentScreen = "home";

// ─── Persistence ──────────────────────────────────────────────────────────────
// ─── Security helpers ─────────────────────────────────────────────────────────
function escapeHtml(str) {
  if(str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\//g, "&#x2F;")
    .replace(/`/g, "&#x60;")
    .replace(/=/g, "&#x3D;");
}

function sanitiseSharePayload(payload) {
  // Validate structure and types — reject anything unexpected
  if(typeof payload !== 'object' || payload === null) return null;
  if(payload.v !== 1) return null;
  if(!Array.isArray(payload.ans)) return null;
  if(payload.ans.length > 20) return null; // max standards
  for(const row of payload.ans) {
    if(!Array.isArray(row)) return null;
    if(row.length > 10) return null; // max questions per standard
    for(const val of row) {
      if(typeof val !== 'number' || val < 0 || val > 3) return null;
    }
  }
  // Validate sc (per-standard 0–100 percentages). Used by the Trust view.
  let sc = null;
  if(Array.isArray(payload.sc) && payload.sc.length <= 20) {
    sc = [];
    for(const val of payload.sc) {
      if(typeof val !== 'number' || val < 0 || val > 100) return null;
      sc.push(Math.round(val));
    }
  }
  return {
    v: 1,
    ans: payload.ans,
    sc: sc,
    d: typeof payload.d === 'string' ? payload.d.slice(0, 30) : '',
    s: typeof payload.s === 'string' ? payload.s.slice(0, 200) : '',
    ph: typeof payload.ph === 'string' ? payload.ph.slice(0, 50) : '',
    la: typeof payload.la === 'string' ? payload.la.slice(0, 200) : '',
    a: typeof payload.a === 'string' ? payload.a.slice(0, 100) : '',
    j: typeof payload.j === 'string' ? payload.j.slice(0, 100) : '',
    l: payload.l === 1 ? 1 : 0
  };
}

function save() {
  try {
    localStorage.setItem("dfe_school",      school);
    localStorage.setItem("dfe_schoolmeta",  JSON.stringify(schoolMeta));
    localStorage.setItem("dfe_assessor",    assessor);
    localStorage.setItem("dfe_jobtitle",    jobTitle);
    localStorage.setItem("dfe_isleader",    isLeader ? "1" : "0");
    localStorage.setItem("dfe_assessments", JSON.stringify(assessments));
  } catch(e){}
}
function load() {
  try {
    school   = localStorage.getItem("dfe_school") || "";
    const sm = localStorage.getItem("dfe_schoolmeta");
    schoolMeta = sm ? JSON.parse(sm) : {urn:"",trust:"",la:"",phase:""};
    assessor = localStorage.getItem("dfe_assessor") || "";
    jobTitle = localStorage.getItem("dfe_jobtitle") || "";
    isLeader = localStorage.getItem("dfe_isleader") === "1";
    const a  = localStorage.getItem("dfe_assessments");
    assessments = a ? JSON.parse(a) : [];
  } catch(e){ assessments = []; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rag(p){ return p>=.75?"green":p>=.4?"amber":"red"; }
const RAG_COLOR = {green:"#15803d",amber:"#b45309",red:"#b91c1c"};
const RAG_LABEL = {green:"Meeting Standard",amber:"Developing",red:"Needs Attention"};
function fmtDate(iso){ return new Date(iso).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}); }
function tagHTML(r,text){ return `<span class="tag tag-${r}"><span class="dot dot-${r}"></span>${text||RAG_LABEL[r]}</span>`; }
function barHTML(p,c){ const col=c||RAG_COLOR[rag(p)]; return `<div class="bar-track"><div class="bar-fill" style="width:${Math.round(p*100)}%;background:${col}"></div></div>`; }

// ─── Navigation ───────────────────────────────────────────────────────────────
function showScreen(id){
  currentScreen = id;
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("screen-"+id).classList.add("active");
  renderNav(id);
  const nav = document.getElementById("mainNav");
  if(nav) nav.style.display = id==="home" ? "none" : "flex";
  const footer = document.getElementById("siteFooter");
  if(footer) footer.style.display = id==="home" ? "none" : "block";
  window.scrollTo(0,0);
}

function renderNav(screen){
  const btns = document.getElementById("navBtns");
  if(!btns) return; // header now handles navigation across all screens
  let html = "";
  if(screen==="assess"){
    html = `<button class="nav-btn" onclick="showScreen('home')">✕ Exit</button>`;
  } else if(screen==="details"){
    html = `<button class="nav-btn" onclick="showScreen('home')">✕ Cancel</button>`;
  } else if(screen==="governor"){
    html = `<button class="nav-btn" onclick="window.print()">🖨️ Print</button><button class="nav-btn" onclick="showScreen('results')">← Full Report</button>`;
  } else if(screen==="trust"){
    html=`<button class="nav-btn" onclick="showScreen('home')">⌂ Home</button>`;
  } else if(screen==="changelog"){
    html=`<button class="nav-btn" onclick="showScreen('home')">← Home</button>`;
  } else if(screen==="about"){
    html=`<button class="nav-btn" onclick="showScreen('home')">← Home</button>`;
  } else {
    if(assessments.length>0) html+=`<button class="nav-btn" onclick="showHistory()">📈 History</button>`;
    html+=`<button class="nav-btn" onclick="initTrustView()">🏫 Trust View</button>`;
    if(screen!=="home") html+=`<button class="nav-btn" onclick="showScreen('home')">⌂ Home</button>`;
  }
  btns.innerHTML = html;
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function renderHome(){
  const hp = document.getElementById("homePills2");
  if(hp) {
    const coreStds = STANDARDS;
    hp.innerHTML = coreStds.map(s=>
      `<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#f8fafc;border-radius:10px;border:1px solid var(--border)">
        <span style="font-size:18px">${s.icon}</span>
        <span style="font-size:13px;font-weight:500;color:var(--navy)">${s.short}</span>
      </div>`
    ).join("");
  }
  const sp = document.getElementById("standardPills");
  if(sp) sp.innerHTML = STANDARDS.map(s=>
    `<div style="display:flex;align-items:center;gap:5px;padding:5px 8px;background:#f8fafc;border-radius:7px;border:1px solid var(--border)">
      <span style="font-size:13px">${s.icon}</span>
      <span style="font-size:11px;font-weight:500;color:var(--navy)">${s.short}</span>
    </div>`
  ).join("");
  const sc = document.getElementById("standardCards");
  if(sc) sc.innerHTML = STANDARDS.map(s=>
    `<div class="card-sm">
      <div style="font-size:22px;margin-bottom:8px">${s.icon}</div>
      <div style="font-weight:600;font-size:13px;color:var(--navy);margin-bottom:3px">${s.name}</div>
      <div style="font-size:12px;color:var(--muted);line-height:1.4">${s.desc}</div>
      <div style="width:28px;height:3px;background:${s.color};border-radius:2px;margin-top:10px"></div>
    </div>`
  ).join("");

  if(school){
    document.getElementById("schoolSetup").style.display = "none";
    document.getElementById("homeMain").classList.remove("hidden");
    document.getElementById("homeSchoolName").textContent = school;
    const mb = document.getElementById("schoolMetaBadges");
    if(mb){
      let badges="";
      if(schoolMeta.la)    badges+=`<span style="font-size:12px;padding:2px 8px;background:#f8fafc;color:var(--muted);border-radius:10px">${schoolMeta.la}</span>`;
      if(schoolMeta.trust) badges+=`<span style="font-size:12px;padding:2px 8px;background:#f0f9ff;color:#0369a1;border-radius:10px;font-weight:500">${schoolMeta.trust}</span>`;
      if(schoolMeta.phase) badges+=`<span style="font-size:12px;padding:2px 8px;background:#f8fafc;color:var(--muted);border-radius:10px">${schoolMeta.phase}</span>`;
      if(schoolMeta.urn)   badges+=`<span style="font-size:12px;color:#94a3b8">URN ${schoolMeta.urn}</span>`;
      mb.innerHTML = badges;
    }
    // Show history button if assessments exist
    const hBtn = document.getElementById("historyBtnHome");
    if(hBtn) hBtn.style.display = assessments.length>0 ? "inline-flex" : "none";
  } else {
    document.getElementById("schoolSetup").style.display = "block";
    document.getElementById("homeMain").classList.add("hidden");
  }

  const latest = assessments.length>0 ? assessments[assessments.length-1] : null;
  const grid = document.getElementById("homeGrid");
  const latestCard = document.getElementById("latestCard");
  if(latest){
    grid.style.gridTemplateColumns="1fr 1fr";
    latestCard.classList.remove("hidden");
    latestCard.style.borderTopColor = RAG_COLOR[latest.rag];
    document.getElementById("latestMeta").textContent = fmtDate(latest.date)+(latest.assessor?` · ${latest.assessor}`:"");
    document.getElementById("latestTag").className=`tag tag-${latest.rag}`;
    document.getElementById("latestTag").innerHTML=`<span class="dot dot-${latest.rag}"></span>${RAG_LABEL[latest.rag]}`;
    document.getElementById("latestPct").textContent=Math.round(latest.pct*100)+"%";
    document.getElementById("latestPct").style.color=RAG_COLOR[latest.rag];
    document.getElementById("latestPoints").textContent=`${latest.total}/${TOTAL_MAX_DFE} pts DfE`;
    document.getElementById("latestBars").innerHTML=latest.scores.map(sc=>
      `<div class="score-row">
        <span class="score-label">${sc.name}</span>
        <div style="flex:1">${barHTML(sc.pct)}</div>
        <span class="score-pct" style="color:${RAG_COLOR[sc.rag]}">${Math.round(sc.pct*100)}%</span>
      </div>`
    ).join("");
  } else {
    grid.style.gridTemplateColumns="1fr";
    latestCard.classList.add("hidden");
  }
}

const FAKE_SCHOOLS = [
  "Maplewood Academy","Riverside Community School","Hillcrest Primary",
  "Oakfield Secondary School","Birchwood Academy","Ferndown College",
  "Ashgrove Community School","Lakeside Academy","Pinewood Secondary",
  "Meadowview Primary","Cedarbank School","Thornhill Academy",
  "Brookside Community College","Elmwood High School","Hazelwood Academy"
];
const FAKE_LAS = [
  "West Yorkshire","South Gloucestershire","Cambridgeshire","Staffordshire",
  "North Yorkshire","Derbyshire","Suffolk","Warwickshire","Oxfordshire",
  "Nottinghamshire","Somerset","Shropshire","Wiltshire","Leicestershire","Cumbria"
];

function randomisePlaceholders(){
  const si = document.getElementById("schoolInput");
  const la = document.getElementById("schoolLA");
  if(si && !si.value) si.placeholder = "e.g. " + FAKE_SCHOOLS[Math.floor(Math.random()*FAKE_SCHOOLS.length)];
  if(la && !la.value) la.placeholder = "e.g. " + FAKE_LAS[Math.floor(Math.random()*FAKE_LAS.length)];
}

function goToSchoolDetails(){
  randomisePlaceholders();
  const si=document.getElementById("schoolInput");
  const la=document.getElementById("schoolLA");
  const ph=document.getElementById("schoolPhase");
  const ur=document.getElementById("schoolURN");
  const an=document.getElementById("assessorName");
  const at=document.getElementById("assessorTitle");
  if(si) si.value=school;
  if(la) la.value=schoolMeta.la||"";
  if(ph) ph.value=schoolMeta.phase||"";
  if(ur) ur.value=schoolMeta.urn||"";
  if(an) an.value=assessor;
  if(at) at.value=jobTitle;
  setLeader(isLeader);
  showScreen("details");
}

function saveSchool(){
  const val=(document.getElementById("schoolInput")||{}).value||"";
  if(!val.trim()){ document.getElementById("schoolInput").focus(); return; }
  school = val.trim();
  schoolMeta = {
    urn:   (document.getElementById("schoolURN")  ||{}).value||"",
    la:    (document.getElementById("schoolLA")   ||{}).value||"",
    phase: (document.getElementById("schoolPhase")||{}).value||"",
    trust: ""
  };
  assessor = (document.getElementById("assessorName") ||{}).value||"";
  jobTitle = (document.getElementById("assessorTitle")||{}).value||"";
  isLeader = (document.getElementById("leaderCheck")  ||{}).checked||false;
  save();
  answers={}; step=0; renderStep(); showScreen("assess");
}

function editSchool(){ goToSchoolDetails(); }

function setLeader(val){
  isLeader = val;
  const yes=document.getElementById("leaderCheck");
  const no=document.getElementById("leaderCheckNo");
  const yL=document.getElementById("leaderYes");
  const nL=document.getElementById("leaderNo");
  if(yes) yes.checked=val;
  if(no)  no.checked=!val;
  if(yL){ yL.style.borderColor=val?"var(--teal)":"var(--border)"; yL.style.background=val?"var(--teal-light)":"#fff"; }
  if(nL){ nL.style.borderColor=!val?"var(--teal)":"var(--border)"; nL.style.background=!val?"var(--teal-light)":"#fff"; }
}

function viewLatest(){
  const latest=assessments[assessments.length-1];
  if(latest){ currentResult=latest; renderResults(); showScreen("results"); }
}

// ─── Assessment ───────────────────────────────────────────────────────────────
function startAssessment(){ answers={}; step=0; renderStep(); showScreen("assess"); }

function renderStep(){
  const std=STANDARDS[step], total=STANDARDS.length;
  const coreTotal = CORE_STANDARDS.length;
  document.getElementById("stepLabel").textContent=`Standard ${step+1} of ${coreTotal}`;
  document.getElementById("stepPct").textContent=`${Math.round((step/coreTotal)*100)}% complete`;
  document.getElementById("stepBar").style.width=`${(step/coreTotal)*100}%`;
  document.getElementById("stepPills").innerHTML=STANDARDS.map((s,i)=>{
    const done=s.questions.every(q=>answers[q.id]!==undefined);
    const bg=done?"var(--teal)":i===step?s.color:"#e2e8f0";
    return `<div class="step-pill" style="background:${bg};cursor:${i<step?"pointer":"default"}" title="${s.short}" onclick="jumpStep(${i})"></div>`;
  }).join("");
  document.getElementById("backBtn").textContent=step>0?"← Back":"← Home";
  const done=std.questions.every(q=>answers[q.id]!==undefined);
  document.getElementById("answerHint").style.display=done?"none":"inline";
  document.getElementById("nextBtn").style.opacity=done?"1":"0.4";
  document.getElementById("nextBtn").disabled=!done;
  document.getElementById("nextBtn").textContent=step<STANDARDS.length-1?"Next →":"✓ Complete Assessment";
  const srcUrl = SRC[std.id] || "";
  let html = `<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:24px">
    <span style="font-size:44px;line-height:1;margin-top:2px">${std.icon}</span>
    <div style="flex:1">
      <h2 style="margin-bottom:6px;font-size:24px">${std.name}</h2>
      <p class="muted" style="font-size:14px">${std.desc}</p>
      ${std.ofsted?`<span style="display:inline-flex;align-items:center;gap:5px;margin-top:6px;padding:3px 10px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:20px;font-size:11px;font-weight:700">⚠ Ofsted scrutiny area — inspectors actively ask about this standard</span>`:""}
      ${std.id==="filtering"?`<span style="display:inline-flex;align-items:center;gap:5px;margin-top:6px;padding:3px 10px;background:#ede9fe;color:#6d28d9;border:1px solid #c4b5fd;border-radius:20px;font-size:11px;font-weight:700">⚠ Schools should already be meeting this standard — not a 2030 target</span>`:""}
    </div>
    <a href="${srcUrl}" target="_blank" rel="noopener noreferrer"
      style="flex-shrink:0;font-size:11px;color:var(--teal);text-decoration:none;white-space:nowrap;padding:4px 10px;border:1px solid var(--teal);border-radius:20px;display:inline-flex;align-items:center;gap:4px;margin-top:4px">
      📖 DfE Source
    </a>
  </div><hr>`;
  std.questions.forEach((q,qi)=>{
    const typeBadge = q.type==="practice"
      ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:#fffbeb;color:#b45309;border:1px solid #fde68a;border-radius:20px;font-size:10px;font-weight:700;margin-left:8px;vertical-align:middle">💡 Recommended Practice</span>`
      : `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:#f0fdf4;color:#15803d;border:1px solid #86efac;border-radius:20px;font-size:10px;font-weight:700;margin-left:8px;vertical-align:middle">✓ DfE Requirement</span>`;
    html+=`<div style="margin-bottom:32px">
      <p style="font-weight:600;font-size:16px;margin-bottom:6px;line-height:1.5;color:var(--text)">
        <span style="color:${std.color};font-weight:700;margin-right:6px">${qi+1}.</span>${q.text}${typeBadge}
      </p>
      ${q.example?`<p style="font-size:12px;color:var(--muted);margin-bottom:10px;padding:6px 10px;background:#f8fafc;border-radius:6px;border-left:3px solid var(--border);line-height:1.5"><span style="font-weight:600;color:var(--navy)">Examples: </span>${q.example}</p>`:""}
      `;
    q.opts.forEach((opt,oi)=>{
      const sel=answers[q.id]===oi;
      const score=oi===0?"–":oi===3?"✓ Best":`${oi}/3`;
      const tip=(q.tips&&q.tips[oi])||"";
      const tipHTML=tip?`<span class="opt-info"><button class="opt-info-btn" tabindex="-1">i</button><span class="opt-tooltip">${tip}<a href="${srcUrl}" target="_blank" rel="noopener noreferrer">📖 View DfE standard →</a></span></span>`:"";
      const LABELS=["Not in place","Developing","Mostly in place","Fully meeting standard"];
      const LABEL_COLOURS=["var(--red)","var(--amber)","#c2410c","var(--green)"];
      const LABEL_BG=["var(--red-bg)","var(--amber-bg)","#fff7ed","var(--green-bg)"];
      const LABEL_BORDER=["var(--red-border)","var(--amber-border)","#fed7aa","var(--green-border)"];
      html+=`<label class="opt-label${sel?" selected":""}" style="${sel?`border-color:${std.color};background:${std.color}0a`:""}" onclick="selectOpt('${q.id}',${oi},'${std.color}')">
        <input type="radio" name="${q.id}" ${sel?"checked":""} style="accent-color:${std.color}">
        <span class="opt-text">${opt}</span>
        <span style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
          <span style="display:inline-block;padding:5px 14px;border-radius:8px;font-size:13px;font-weight:700;color:${LABEL_COLOURS[oi]};background:${LABEL_BG[oi]};border:1px solid ${LABEL_BORDER[oi]};white-space:nowrap;min-width:120px;text-align:center">${LABELS[oi]}</span>
          ${tipHTML}
        </span>
      </label>`;
    });
    html+=`</div>`;
  });
  document.getElementById("questionCard").innerHTML=html;
  document.getElementById("questionCard").style.borderTop=`4px solid ${std.color}`;
}

function selectOpt(qid,val,color){
  answers[qid]=val;
  const std=STANDARDS[step];
  const done=std.questions.every(q=>answers[q.id]!==undefined);
  std.questions.forEach(q=>{
    q.opts.forEach((_,oi)=>{
      document.querySelectorAll(`label[onclick*="'${q.id}',${oi}"]`).forEach(l=>{
        const sel=answers[q.id]===oi;
        l.classList.toggle("selected",sel);
        l.style.borderColor=sel?color:"";
        l.style.background=sel?`${color}0a`:"";
        const inp=l.querySelector("input");
        if(inp) inp.checked=sel;
      });
    });
  });
  document.getElementById("answerHint").style.display=done?"none":"inline";
  document.getElementById("nextBtn").style.opacity=done?"1":"0.4";
  document.getElementById("nextBtn").disabled=!done;
}

function jumpStep(i){ if(i<step){ step=i; renderStep(); } }
function goBack(){ if(step>0){ step--; renderStep(); window.scrollTo({top:0,behavior:"smooth"}); } else showScreen("home"); }
function goNext(){
  const std=STANDARDS[step];
  if(!std.questions.every(q=>answers[q.id]!==undefined)) return;
  if(step<STANDARDS.length-1){ step++; renderStep(); }
  else finishAssessment();
  window.scrollTo({top:0,behavior:"smooth"});
}

function finishAssessment(){
  const scores=scoreAnswers(answers);
  const coreScores=scores;
  // Overall DfE score only
  const dfeTotalPts = coreScores.reduce((s,x)=>s+(x.dfePts||0),0);
  const dfePct = TOTAL_MAX_DFE > 0 ? dfeTotalPts/TOTAL_MAX_DFE : 0;
  const a={id:Date.now().toString(),date:new Date().toISOString(),school,assessor,jobTitle,isLeader,
    answers:{...answers},scores,
    total:dfeTotalPts, pct:dfePct, rag:rag(dfePct)};
  assessments.push(a);
  currentResult=a;
  save();

  // Track completed assessment in GoatCounter
  try {
    var _gc = window.goatcounter;
    if(_gc && _gc.count){
      _gc.count({ path: 'assessment-completed', title: 'Assessment Completed', event: true });
    } else {
      window.addEventListener('load', function(){
        if(window.goatcounter && window.goatcounter.count){
          window.goatcounter.count({ path: 'assessment-completed', title: 'Assessment Completed', event: true });
        }
      });
    }
  } catch(e){}

  renderResults();
  showScreen("results");
}


function renderBenchmarks(r){
  const grid=document.getElementById("benchmarkGrid");
  if(!grid) return;
  const ds={ok:{bg:"var(--green-bg)",border:"var(--green-border)",text:"var(--green)",icon:"✓"},warn:{bg:"var(--amber-bg)",border:"var(--amber-border)",text:"var(--amber)",icon:"⚠"},info:{bg:"#eff6ff",border:"#bfdbfe",text:"#1d4ed8",icon:"ℹ"}};
  grid.innerHTML=STANDARDS.map(s=>{
    const bm=BENCHMARKS[s.id];
    if(!bm) return "";
    const sc=r.scores.find(x=>x.id===s.id);
    const myPct=(sc.dfePct!=null&&!isNaN(sc.dfePct))?Math.round(sc.dfePct*100):Math.round(sc.pct*100);
    const statsHTML=bm.stats.map(st=>{
      const d=ds[st.direction]||ds.info;
      return `<div style="display:flex;gap:10px;padding:8px 10px;background:${d.bg};border-radius:8px;border:1px solid ${d.border};margin-bottom:6px">
        <span style="color:${d.text};font-size:13px;flex-shrink:0;font-weight:700;margin-top:1px">${d.icon}</span>
        <div>
          <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:600;color:var(--text)">${st.label}</span>
            <span style="font-size:15px;font-weight:800;color:${d.text}">${st.value}</span>
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px;line-height:1.4">${st.context}</div>
        </div>
      </div>`;
    }).join("");
    return `<details style="margin-bottom:8px;border-radius:8px;border:1px solid var(--border);overflow:hidden">
      <summary style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#f8fafc;cursor:pointer;list-style:none;user-select:none">
        <span style="font-size:15px">${s.icon}</span>
        <span style="font-weight:600;font-size:13px;color:var(--navy);flex:1">${s.name}</span>
        <span style="font-size:13px;font-weight:800;color:${RAG_COLOR[sc.rag]}">Your score: ${myPct}%</span>
        <span style="color:var(--muted);font-size:12px;margin-left:6px">▾</span>
      </summary>
      <div style="padding:10px 14px;background:#fff">${statsHTML}</div>
    </details>`;
  }).join("");
}

// ─── Results ──────────────────────────────────────────────────────────────────
function renderResults(){
  const r=currentResult; if(!r) return;

  // Re-score if this is an old assessment missing the new split fields
  if(r.scores && r.scores.length && (r.scores[0].dfePct===undefined || isNaN(r.scores[0].dfePct) || (r.pct===0 && r.answers && Object.values(r.answers).some(v=>v>0)))){
    r.scores = scoreAnswers(r.answers);
    const coreOnly = r.scores;
    r.total = coreOnly.reduce((s,x)=>s+(x.dfePts||0),0);
    r.pct   = TOTAL_MAX_DFE>0 ? r.total/TOTAL_MAX_DFE : 0;
    r.rag   = rag(r.pct);
    r.pracTotal = coreOnly.reduce((s,x)=>s+(x.pracPts||0),0);
    r.pracPct   = TOTAL_MAX_PRACTICE>0 ? r.pracTotal/TOTAL_MAX_PRACTICE : 0;
  }

  const overallPct=Math.round(r.pct*100);
  const coreScores=r.scores;
  const reds=coreScores.filter(s=>s.rag==="red").length;
  const ambers=coreScores.filter(s=>s.rag==="amber").length;
  const greens=coreScores.filter(s=>s.rag==="green").length;
  const leaderBadge=r.isLeader?`<span style="margin-left:8px;background:#ede9fe;color:#6d28d9;padding:1px 8px;border-radius:20px;font-size:11px;font-weight:700">SLT</span>`:``;


  // Next assessment date
  const nextDate = new Date(r.date);
  nextDate.setFullYear(nextDate.getFullYear()+1);
  const nextEl = document.getElementById("nextAssessmentDate");
  if(nextEl) nextEl.textContent = `Reassess by ${nextDate.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})} — approximately 12 months from this assessment.`;

  document.getElementById("printMeta").textContent=`${r.school} · ${fmtDate(r.date)}${r.assessor?` · ${r.assessor}`:""}${r.jobTitle?`, ${r.jobTitle}`:""}`;

  document.getElementById("summaryCard").style.borderTop=`4px solid ${RAG_COLOR[r.rag]}`;
  document.getElementById("summaryCard").style.height=`100%`;
  document.getElementById("summaryCard").style.boxSizing=`border-box`;
  document.getElementById("summaryCard").style.display=`flex`;
  document.getElementById("summaryCard").style.flexDirection=`column`;
  document.getElementById("summaryCard").style.justifyContent=`space-between`;
  document.getElementById("summaryCard").innerHTML=`
    <div style="margin-bottom:14px">
      <h1 style="margin-bottom:2px;font-size:20px">${r.school}</h1>
      ${r.schoolMeta&&r.schoolMeta.trust?`<div style="font-size:11px;padding:2px 8px;background:#f0f9ff;color:#0369a1;border-radius:10px;display:inline-block;margin-bottom:3px;font-weight:500">${r.schoolMeta.trust}</div>`:""}
      <p class="muted" style="font-size:12px">${fmtDate(r.date)}${r.assessor?` · ${r.assessor}`:""}${r.jobTitle?`, ${r.jobTitle}`:""}${leaderBadge}</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="text-align:center;padding:10px 12px;background:var(--bg);border-radius:10px;border:2px solid ${RAG_COLOR[r.rag]}">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.07em;font-weight:700;color:${RAG_COLOR[r.rag]};margin-bottom:3px">Overall Score</div>
        <div style="font-size:36px;font-weight:800;color:${RAG_COLOR[r.rag]};line-height:1">${overallPct}%</div>
        ${tagHTML(r.rag)}
        <div class="muted" style="margin-top:3px;font-size:10px">${r.total}/${TOTAL_MAX_DFE} pts</div>
      </div>
      
    </div>
    <div class="rag-boxes" style="gap:6px">
      <div class="rag-box" style="background:var(--red-bg);border:1px solid var(--red-border);padding:8px 4px"><div style="font-size:16px;margin-bottom:1px">🔴</div><div style="font-size:22px;font-weight:800;color:var(--red)">${reds}</div><div style="font-size:10px;color:var(--red);font-weight:600">Needs Attention</div></div>
      <div class="rag-box" style="background:var(--amber-bg);border:1px solid var(--amber-border);padding:8px 4px"><div style="font-size:16px;margin-bottom:1px">🟡</div><div style="font-size:22px;font-weight:800;color:var(--amber)">${ambers}</div><div style="font-size:10px;color:var(--amber);font-weight:600">Developing</div></div>
      <div class="rag-box" style="background:var(--green-bg);border:1px solid var(--green-border);padding:8px 4px"><div style="font-size:16px;margin-bottom:1px">🟢</div><div style="font-size:22px;font-weight:800;color:var(--green)">${greens}</div><div style="font-size:10px;color:var(--green);font-weight:600">Meeting Standard</div></div>
    </div>
    <p style="font-size:10px;color:var(--muted);margin-top:10px;padding-top:8px;border-top:1px solid var(--border)">Score based on all 28 questions reflecting explicit DfE requirements across the 6 core standards.</p>`;

  const coreCards = r.scores.map(sc=>{
    const s=STANDARDS.find(x=>x.id===sc.id);
    const dfeBar = (sc.dfePct!=null && !isNaN(sc.dfePct)) ? `<div style="margin-top:8px">
      
      ${barHTML(sc.dfePct)}
    </div>` : "";
    const pracBar = (sc.pracPct!=null && !isNaN(sc.pracPct)) ? `<div style="margin-top:6px">
      <div style="font-size:10px;color:#b45309;margin-bottom:3px;font-weight:600">💡 Practice: ${Math.round(sc.pracPct*100)}%  &nbsp;·&nbsp; ${sc.pracPts}/${sc.pracMax} pts</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(sc.pracPct*100)}%;background:#f59e0b"></div></div>
    </div>` : "";
    return `<div class="result-card" style="border-left-color:${RAG_COLOR[sc.rag]}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="font-size:18px">${s.icon}</span><span style="font-weight:600;font-size:13px;color:var(--navy);flex:1">${s.name}</span>
      ${s.ofsted?`<span style="padding:2px 7px;background:#fef3c7;color:#92400e;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap">⚠ Ofsted</span>`:""}
      ${s.id==="filtering"?`<span style="padding:2px 7px;background:#ede9fe;color:#6d28d9;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap">Already required</span>`:""}
      </div>
      <div style="font-size:28px;font-weight:800;color:${RAG_COLOR[sc.rag]};margin-bottom:4px">${(sc.dfePct!=null&&!isNaN(sc.dfePct))?Math.round(sc.dfePct*100):Math.round(sc.pct*100)}%</div>
      ${dfeBar}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">${tagHTML(sc.rag)}</div>
    </div>`;
  }).join("");

  document.getElementById("scoreGrid").innerHTML = coreCards;

  // Reassessment comparison
  const prevAssessment = assessments.length >= 2 ? assessments[assessments.length - 2] : null;
  renderComparison(r, prevAssessment);

  renderBenchmarks(r);

  if(radarChartInst){ radarChartInst.destroy(); radarChartInst=null; }
  const ctx=document.getElementById("radarChart").getContext("2d");
  radarChartInst=new Chart(ctx,{
    type:"radar",
    data:{
      labels:r.scores.map(sc=>sc.name),
      datasets:[{label:"Score (%)",data:r.scores.map(sc=>Math.round(sc.pct*100)),backgroundColor:"rgba(13,148,136,.15)",borderColor:"#0d9488",borderWidth:2,pointBackgroundColor:"#0d9488",pointRadius:4}]
    },
    options:{responsive:true,maintainAspectRatio:false,scales:{r:{min:0,max:100,ticks:{stepSize:25,callback:v=>`${v}%`,font:{size:10}},pointLabels:{font:{size:12}}}},plugins:{legend:{display:false}}}
  });

  document.getElementById("detailBreakdown").innerHTML=r.scores.map(sc=>{
    const s=STANDARDS.find(x=>x.id===sc.id);
    const dfeRag = (sc.dfePct!=null&&!isNaN(sc.dfePct)) ? rag(sc.dfePct) : sc.rag;
    const rows=s.questions.map(q=>{
      const val=r.answers[q.id]??0;
      const [bg,tc]=val===0?["var(--red-bg)","var(--red)"]:val===1?["var(--amber-bg)","var(--amber)"]:val===2?["#fff7ed","#c2410c"]:["var(--green-bg)","var(--green)"];
      const typePill = q.type==="practice"
        ? `<span style="padding:1px 6px;background:#fffbeb;color:#b45309;border:1px solid #fde68a;border-radius:20px;font-size:9px;font-weight:700;white-space:nowrap">💡 Practice</span>`
        : `<span style="padding:1px 6px;background:#f0fdf4;color:#15803d;border:1px solid #86efac;border-radius:20px;font-size:9px;font-weight:700;white-space:nowrap">✓ DfE</span>`;
      return `<div class="q-detail" style="background:${val<2?"#fef9f0":"#f8fafb"}">
        <div class="q-score-badge" style="background:${bg};color:${tc}">${val}</div>
        <div style="flex:1;min-width:0"><div style="font-size:12px;color:var(--muted);margin-bottom:1px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">${q.text} ${typePill}</div><div style="font-size:12px;font-weight:500;color:var(--text)">${q.opts[val]}</div></div>
      </div>`;
    }).join("");
    const score = (sc.dfePct!=null&&!isNaN(sc.dfePct)) ? Math.round(sc.dfePct*100) : Math.round(sc.pct*100);
    return `<details style="margin-bottom:8px;border-radius:10px;border:1px solid var(--border);overflow:hidden" ${score<75?"open":""}>
      <summary style="display:flex;align-items:center;gap:8px;padding:12px 16px;background:#fff;cursor:pointer;list-style:none;user-select:none">
        <span style="font-size:15px">${s.icon}</span>
        <span style="font-weight:700;font-size:13px;color:var(--navy);flex:1">${s.name}</span>
        ${tagHTML(dfeRag,score+"%")}
        <span style="color:var(--muted);font-size:12px;margin-left:4px">▾</span>
      </summary>
      <div style="padding:0 12px 12px;background:#fff">${rows}</div>
    </details>`;
  }).join("");

  const sorted=[...r.scores].sort((a,b)=>a.pct-b.pct);
  let apHTML="";
  sorted.forEach((sc,i)=>{
    const s=STANDARDS.find(x=>x.id===sc.id);
    const gaps=s.questions.filter(q=>(r.answers[q.id]??0)<=1).map(q=>({...q,val:r.answers[q.id]??0}));
    if(!gaps.length) return;
    const srcUrl=SRC[sc.id]||"https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges";
    apHTML+=`<div class="action-card" style="border-left-color:${RAG_COLOR[sc.rag]}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="background:var(--navy);color:#fff;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${i+1}</span>
          <span style="font-weight:700;font-size:15px">${s.icon} ${s.name}</span>${tagHTML(sc.rag)}
          <a href="${srcUrl}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:var(--teal);text-decoration:none;padding:2px 8px;border:1px solid var(--teal);border-radius:20px;white-space:nowrap">📖 DfE guidance ↗</a>
        </div>
        <span style="font-size:22px;font-weight:800;color:${RAG_COLOR[sc.rag]}">${Math.round(sc.pct*100)}%</span>
      </div>
      ${gaps.map(g=>{
      const suggestedAction = g.actions&&g.actions[Math.min(g.val,1)] ? g.actions[Math.min(g.val,1)] : null;
      return `<div class="gap-item"><span class="gap-arrow">→</span><div style="width:100%">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">${g.text}</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:2px"><span style="color:var(--red);font-weight:600">Current: </span>${g.opts[g.val]}</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:${suggestedAction?"8px":"0"}"><span style="color:var(--green);font-weight:600">Target: </span>${g.opts[3]}</div>
        ${suggestedAction?`<div style="background:#f0fdfa;border-radius:6px;padding:8px 10px;border:1px solid #99f6e4">
          <span style="font-size:10px;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:.05em">Suggested next action</span>
          <p style="font-size:12px;color:#134e4a;margin-top:3px;line-height:1.5">${suggestedAction}</p>
        </div>`:""}
      </div></div>`;
    }).join("")}
    </div>`;
  });
  if(!apHTML) apHTML=`<div class="card" style="background:var(--green-bg);border:1px solid var(--green-border);text-align:center;padding:32px"><div style="font-size:36px;margin-bottom:8px">🎉</div><h3 style="color:var(--green);margin-bottom:6px">All standards meeting the threshold</h3><p style="color:#166534;font-size:13px">Your school is meeting or exceeding all 6 core DfE Digital &amp; Technology Standards.</p></div>`;
  document.getElementById("actionPlan").innerHTML=apHTML;
}



function showGovernorReport() {
  renderGovernorReport();
  showScreen("governor");
}

function renderGovernorReport() {
  const r = currentResult;
  if (!r) return;

  const coreScores = r.scores;
  const overallPct = Math.round(r.pct * 100);
  const meeting    = coreScores.filter(s => s.rag === "green").length;
  const developing = coreScores.filter(s => s.rag === "amber").length;
  const attention  = coreScores.filter(s => s.rag === "red").length;

  // Plain English overall verdict
  let verdict, verdictColor;
  if (meeting >= 5)      { verdict = "Your school is performing well against the DfE Digital & Technology Standards and is on track to meet all 6 core standards by 2030."; verdictColor = RAG_COLOR.green; }
  else if (attention >= 3) { verdict = "Your school has significant work to do to meet the DfE Digital & Technology Standards by 2030. Governors should ensure a plan is in place and resourced."; verdictColor = RAG_COLOR.red; }
  else                   { verdict = "Your school is making progress towards the DfE Digital & Technology Standards, but further investment and action is needed in some areas before 2030."; verdictColor = RAG_COLOR.amber; }

  const priorities = [...coreScores].sort((a,b)=>a.pct-b.pct).slice(0,3);

  // Redesigned standard rows — horizontal with score bar, DfE score only
  const standardRows = coreScores.map(sc => {
    const s   = STANDARDS.find(x => x.id === sc.id);
    const gp  = GOV_PLAIN[sc.id];
    const dfeRag = sc.dfePct !== null ? rag(sc.dfePct) : sc.rag;
    const desc = gp[dfeRag] || gp["amber"] || "";
    const barW = sc.dfePct !== null ? Math.round(sc.dfePct * 100) : Math.round(sc.pct * 100);
    const rc  = RAG_COLOR[dfeRag];
    const rb  = dfeRag==="green"?"var(--green-bg)":dfeRag==="amber"?"var(--amber-bg)":"var(--red-bg)";
    const rbo = dfeRag==="green"?"var(--green-border)":dfeRag==="amber"?"var(--amber-border)":"var(--red-border)";
    return `<div class="gov-std-row" style="display:flex;align-items:stretch;border:1px solid #e2e8f0;border-left:5px solid ${rc};border-radius:0 8px 8px 0;margin-bottom:8px;background:#fff;overflow:hidden">
      <div style="padding:12px 14px;flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          <span style="font-size:17px">${s.icon}</span>
          <span style="font-weight:700;font-size:13px;color:#0c1a2e">${s.name}</span>
          ${s.ofsted?`<span style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:1px 7px;border-radius:20px;font-size:10px;font-weight:700">Ofsted</span>`:""}
        </div>
        <p style="font-size:12px;color:#4b5563;line-height:1.5;margin:0 0 6px 0">${desc}</p>
      </div>
      <div style="padding:12px 16px;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:6px;min-width:140px;border-left:1px solid #f1f5f9">
        <div style="font-size:22px;font-weight:800;color:${rc};line-height:1">${barW}%</div>
        <div style="width:100%;height:6px;background:#e2e8f0;border-radius:4px;overflow:hidden">
          <div style="width:${barW}%;height:100%;background:${rc};border-radius:4px"></div>
        </div>
        <span style="background:${rb};color:${rc};border:1px solid ${rbo};padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap">${RAG_LABEL[dfeRag]}</span>
      </div>
    </div>`;
  }).join("");

  // Redesigned priority items
  const priorityItems = priorities.length === 0
    ? `<p style="color:var(--green);font-weight:600;font-size:13px;padding:12px 0">✓ No standards currently rated as Needs Attention or Developing.</p>`
    : priorities.map((sc, i) => {
        const s  = STANDARDS.find(x => x.id === sc.id);
        const gp = GOV_PLAIN[sc.id];
        const rc = RAG_COLOR[sc.rag];
        const rb = sc.rag==="red"?"var(--red-bg)":"var(--amber-bg)";
        const rbo = sc.rag==="red"?"var(--red-border)":"var(--amber-border)";
        return `<div class="gov-priority-item" style="display:flex;gap:14px;padding:14px 16px;background:${rb};border:1px solid ${rbo};border-radius:8px;margin-bottom:10px">
          <div style="background:${rc};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;margin-top:1px">${i+1}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">
              <span style="font-size:16px">${s.icon}</span>
              <span style="font-weight:700;font-size:13px;color:#0c1a2e">${s.name}</span>
              <span style="font-size:13px;font-weight:800;color:${rc}">${sc.dfePct!==null?Math.round(sc.dfePct*100):Math.round(sc.pct*100)}% <span style="font-size:10px;font-weight:600;opacity:.7">(DfE)</span></span>
            </div>
            <p style="font-size:12px;color:#374151;line-height:1.5;margin:0 0 6px 0">${gp.risk}</p>
            <p style="font-size:12px;font-weight:600;color:${rc};font-style:italic;margin:0">Governor question: ${gp.govQ}</p>
          </div>
        </div>`;
      }).join("");

  document.getElementById("govReportContent").innerHTML = `

    <!-- ═══ HEADER BAND ═══ -->
    <div class="gov-header" style="background:#0c1a2e;color:#fff;padding:24px 28px;margin:0 -20px 24px -20px;border-radius:0 0 0 0">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">
        <div style="flex:1;min-width:200px">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.45);margin-bottom:10px">Prepared for School Governors &amp; Trustees</div>
          <div style="font-size:11px;font-weight:700;color:#0d9488;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">DfE Digital &amp; Technology Standards 2030</div>
          <h1 style="font-size:22px;font-weight:800;color:#fff;margin-bottom:10px;line-height:1.2;letter-spacing:-.02em">Governor Summary Report</h1>
          <p style="font-size:14px;font-weight:600;color:rgba(255,255,255,.9);margin-bottom:3px">${r.school}</p>
          <p style="font-size:12px;color:rgba(255,255,255,.55)">${fmtDate(r.date)}${r.assessor?` &nbsp;·&nbsp; Completed by ${r.assessor}`:""}${r.jobTitle?`, ${r.jobTitle}`:""}</p>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.45);margin-bottom:4px">Overall Score</div>
          <div style="font-size:58px;font-weight:800;color:${verdictColor};line-height:1">${overallPct}%</div>
          <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.8);margin-top:5px">${RAG_LABEL[r.rag]}</div>
          <div style="display:inline-block;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:3px 12px;font-size:11px;color:rgba(255,255,255,.7);margin-top:8px">${meeting} of 6 core standards met</div>
          ${r.pracPct!==undefined?`<div style="margin-top:8px;background:#fffbeb;border-radius:10px;padding:6px 12px;display:inline-block">
            <div style="font-size:9px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:.06em">💡 Best Practice Score</div>
            <div style="font-size:22px;font-weight:800;color:#b45309;line-height:1.2">${Math.round(r.pracPct*100)}%</div>
          </div>`:""}
        </div>
      </div>
    </div>

    <!-- ═══ METRIC BOXES ═══ -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px">
      <div style="background:var(--green-bg);border:1px solid var(--green-border);border-radius:10px;padding:14px 16px;text-align:center">
        <div style="font-size:38px;font-weight:800;color:var(--green);line-height:1">${meeting}</div>
        <div style="font-size:12px;font-weight:700;color:var(--green);margin-top:5px">Meeting Standard</div>
        <div style="font-size:11px;color:#6b7280;margin-top:3px;line-height:1.4">Fully meets the DfE requirement</div>
      </div>
      <div style="background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:10px;padding:14px 16px;text-align:center">
        <div style="font-size:38px;font-weight:800;color:var(--amber);line-height:1">${developing}</div>
        <div style="font-size:12px;font-weight:700;color:var(--amber);margin-top:5px">Developing</div>
        <div style="font-size:11px;color:#6b7280;margin-top:3px;line-height:1.4">Progress made — further action needed</div>
      </div>
      <div style="background:var(--red-bg);border:1px solid var(--red-border);border-radius:10px;padding:14px 16px;text-align:center">
        <div style="font-size:38px;font-weight:800;color:var(--red);line-height:1">${attention}</div>
        <div style="font-size:12px;font-weight:700;color:var(--red);margin-top:5px">Needs Attention</div>
        <div style="font-size:11px;color:#6b7280;margin-top:3px;line-height:1.4">Significant improvement required</div>
      </div>
    </div>

    <!-- ═══ OVERALL VERDICT ═══ -->
    <div style="border-left:5px solid ${verdictColor};background:var(--bg);border-radius:0 10px 10px 0;padding:14px 18px;margin-bottom:20px">
      <h2 style="font-size:13px;font-weight:700;color:#0c1a2e;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Overall Position</h2>
      <p style="font-size:13px;color:#374151;line-height:1.7;margin:0">${verdict}</p>
    </div>

    <!-- ═══ CONTEXT ═══ -->
    <div style="background:#f8fafc;border-radius:10px;padding:12px 16px;margin-bottom:24px;border:1px solid #e2e8f0">
      <h2 style="font-size:12px;font-weight:700;color:#0c1a2e;margin-bottom:5px;text-transform:uppercase;letter-spacing:.04em">About the DfE Digital &amp; Technology Standards</h2>
      <p style="font-size:12px;color:#6b7280;line-height:1.6;margin:0">The Department for Education requires all schools and trusts to work towards meeting <strong style="color:#0c1a2e">6 core digital standards by 2030</strong>: broadband, cyber security, digital leadership &amp; governance, filtering &amp; monitoring, network switching, and wireless networks. The Academy Trust Handbook 2025 formally requires trusts to be working towards all six, with mandatory progress reporting from 2026. Cyber Security and Filtering &amp; Monitoring are actively scrutinised during Ofsted inspections.</p>
    </div>

    <!-- ═══ STANDARDS AT A GLANCE ═══ -->
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #0c1a2e">
        <h2 style="font-size:15px;font-weight:800;color:#0c1a2e;margin:0;flex:1">Standards at a Glance</h2>
        <span style="font-size:11px;color:#6b7280">Score out of 100%</span>
      </div>
      ${standardRows}
    </div>

    <!-- ═══ PRIORITY AREAS ═══ -->
    ${priorities.length > 0 ? `<div class="gov-priorities" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #0c1a2e">
        <h2 style="font-size:15px;font-weight:800;color:#0c1a2e;margin:0;flex:1">Priority Areas for Governor Oversight</h2>
        <span style="font-size:11px;color:#6b7280">Lowest scoring first</span>
      </div>
      <p style="font-size:12px;color:#6b7280;margin-bottom:12px;line-height:1.5">The following areas need the most attention. Governors should seek written assurance from SLT that plans are in place, resourced and have clear timescales.</p>
      ${priorityItems}
    </div>` : ""}

    <!-- ═══ GOVERNOR QUESTIONS ═══ -->
    <div class="gov-question-box" style="background:#f8fafc;border-radius:10px;padding:16px 20px;border:1px solid #e2e8f0;margin-bottom:24px">
      <h2 style="font-size:13px;font-weight:700;color:#0c1a2e;margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">Questions Governors Should Ask at the Next Meeting</h2>
      <ol style="padding-left:18px;margin:0;display:flex;flex-direction:column;gap:8px">
        ${coreScores.filter(s=>s.rag!=="green").map(sc=>{
          const gp=GOV_PLAIN[sc.id];
          const s=STANDARDS.find(x=>x.id===sc.id);
          return `<li style="font-size:12px;color:#374151;line-height:1.6"><strong style="color:#0c1a2e">${s.icon} ${s.name}:</strong> ${gp.govQ}</li>`;
        }).join("")}
        ${meeting===6?`<li style="font-size:12px;color:var(--green);font-weight:600">All 6 core standards are currently being met. Governors should seek assurance that plans are in place to maintain this position through to 2030.</li>`:""}
      </ol>
    </div>

    <!-- ═══ NEXT STEPS ═══ -->
    <div style="background:#0c1a2e;border-radius:10px;padding:16px 20px;margin-bottom:20px">
      <h2 style="font-size:13px;font-weight:700;color:#fff;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">Recommended Next Steps</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:rgba(255,255,255,.08);border-radius:8px;padding:10px 12px">
          <div style="font-size:11px;font-weight:700;color:#0d9488;margin-bottom:4px">For SLT</div>
          <p style="font-size:11px;color:rgba(255,255,255,.75);line-height:1.5;margin:0">Review the full technical report and action plan. Present a response to governors at the next available meeting with planned actions and timescales for each standard not currently meeting the threshold.</p>
        </div>
        <div style="background:rgba(255,255,255,.08);border-radius:8px;padding:10px 12px">
          <div style="font-size:11px;font-weight:700;color:#0d9488;margin-bottom:4px">For Governors</div>
          <p style="font-size:11px;color:rgba(255,255,255,.75);line-height:1.5;margin:0">Ensure this report is minuted. Request a written action plan from the SLT digital lead for any standard rated Developing or Needs Attention, including investment implications and target dates.</p>
        </div>
      </div>
    </div>

    <!-- ═══ FOOTER ═══ -->
    <div class="gov-footer" style="margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:8px">
      <div>
        <p style="font-size:10px;font-weight:700;color:#0c1a2e;margin-bottom:2px">ANME · DfE Digital Standards 2030 — Self-Assessment Tool</p>
        <p style="font-size:10px;color:#9ca3af;margin:0">Built for the use of schools in the UK · anme.co.uk</p>
      </div>
      <div style="text-align:right">
        <p style="font-size:10px;color:#9ca3af;margin-bottom:2px">Standards verified ${latestVerifiedDisplay()}</p>
        <p style="font-size:10px;color:#9ca3af;margin:0">gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges</p>
      </div>
    </div>`;
}

// ─── Reassessment Comparison ─────────────────────────────────────────────────
function renderComparison(current, previous) {
  const comp = document.getElementById("comparisonSection");
  if (!comp || !previous) { if(comp) comp.style.display="none"; return; }

  const overallDiff = Math.round((current.pct - previous.pct) * 100);
  const diffColor   = overallDiff > 0 ? RAG_COLOR.green : overallDiff < 0 ? RAG_COLOR.red : RAG_COLOR.amber;
  const diffLabel   = overallDiff > 0 ? `▲ ${overallDiff}%` : overallDiff < 0 ? `▼ ${Math.abs(overallDiff)}%` : "→ No change";

  const rows = current.scores.map(sc => {
    const prev = previous.scores.find(x => x.id === sc.id);
    if (!prev) return "";
    const diff = Math.round((sc.pct - prev.pct) * 100);
    const s    = STANDARDS.find(x => x.id === sc.id);
    const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "→";
    const ac    = diff > 0 ? RAG_COLOR.green : diff < 0 ? RAG_COLOR.red : "#94a3b8";
    const ragChanged = sc.rag !== prev.rag;
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:15px;flex-shrink:0">${s.icon}</span>
      <span style="font-size:13px;color:var(--text);flex:1;font-weight:500">${s.name}</span>
      <span style="font-size:12px;color:var(--muted);width:32px;text-align:right">${Math.round(prev.pct*100)}%</span>
      <span style="font-size:11px;color:#94a3b8;width:16px;text-align:center">→</span>
      <span style="font-size:12px;font-weight:700;color:${RAG_COLOR[sc.rag]};width:32px;text-align:left">${Math.round(sc.pct*100)}%</span>
      <span style="font-size:12px;font-weight:700;color:${ac};width:44px;text-align:right">${arrow} ${Math.abs(diff)}%</span>
      ${ragChanged ? `<span style="font-size:10px;padding:1px 7px;background:${ac}22;color:${ac};border-radius:20px;font-weight:600;border:1px solid ${ac}44;white-space:nowrap">${sc.rag==="green"?"Now meeting":sc.rag==="amber"?"Now developing":"Dropped"}</span>` : '<span style="width:80px"></span>'}
    </div>`;
  }).join("");

  comp.style.display = "block";
  comp.innerHTML = `<div class="card" style="border-top:4px solid ${diffColor}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div>
        <h3 style="margin-bottom:3px">Compared to previous assessment</h3>
        <p class="muted">${fmtDate(previous.date)}${previous.assessor?` · ${previous.assessor}`:""}</p>
      </div>
      <div style="text-align:right">
        <div style="font-size:32px;font-weight:800;color:${diffColor};line-height:1">${diffLabel}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">${Math.round(previous.pct*100)}% → ${Math.round(current.pct*100)}% overall</div>
      </div>
    </div>
    ${rows}
  </div>`;
}


// ─── CSV Export ──────────────────────────────────────────────────────────────
function exportCSV(){
  const r = currentResult; if(!r) return;
  const cName = r.school?.name || r.school || "";
  const dateStr = fmtDate(r.date);

  function csvCell(val){
    const s = String(val ?? "").replace(/"/g, '""');
    return (s.indexOf(",") !== -1 || s.indexOf('"') !== -1 || s.indexOf("\n") !== -1) ? '"' + s + '"' : s;
  }
  function csvRow(arr){ return arr.map(csvCell).join(","); }

  const lines = [];
  lines.push(csvRow(["Digital Standards 2030 — Action Plan Export"]));
  lines.push(csvRow(["School", cName, "Date", dateStr, "Overall Score", Math.round(r.pct*100)+"%", "RAG", RAG_LABEL[r.rag]]));
  lines.push("");
  lines.push(csvRow(["Standard","Question","Current Answer","Score (0-3)","Target Answer","Suggested Next Action","DfE Source","Status","Owner","Target Date","Notes"]));

  STANDARDS.forEach(function(std){
    var sc = r.scores.find(function(s){ return s.id === std.id; });
    std.questions.forEach(function(q){
      var val = r.answers[q.id] !== undefined ? r.answers[q.id] : 0;
      var action = q.actions ? (q.actions[Math.min(val,1)] || "") : "";
      var src = SRC[std.id] || "";
      var status = val === 3 ? "Met" : val === 2 ? "Mostly met" : val === 1 ? "In progress" : "Not started";
      lines.push(csvRow([std.name, q.text, q.opts[val], val, q.opts[3], action, src, status, "", "", ""]));
    });
    lines.push("");
  });

  const csv = lines.join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = cName.replace(/[^a-zA-Z0-9]/g, "_") + "_DfE_Action_Plan_" + new Date(r.date).toISOString().slice(0,10) + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── URL sharing ──────────────────────────────────────────────────────────────
function shareResults(){
  const r = currentResult; if(!r) return;
  // Compact encode: school name, date, assessor, scores only
  const payload = {
    v: 1,
    s: r.school?.name||r.school||"",
    ph: r.school?.phase||"",
    la: r.school?.la||"",
    d: r.date,
    a: r.assessor||"",
    j: r.jobTitle||"",
    l: r.isLeader?1:0,
    sc: r.scores.map(sc=>Math.round(sc.pct*100)),
    ans: STANDARDS.map(std=>std.questions.map(q=>r.answers[q.id]??0))
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = 'https://cmaddocks-uk.github.io/dfe-standards/#share=' + encoded;

  navigator.clipboard.writeText(url).then(()=>{
    const btn = document.getElementById("shareBtn");
    if(btn){ btn.textContent="✓ Link copied!"; btn.style.color="var(--green)"; setTimeout(()=>{ btn.textContent="🔗 Share Results"; btn.style.color=""; },3000); }
  }).catch(()=>{
    prompt("Copy this link to share your results:", url);
  });
}

function loadSharedResult(){
  const hash = window.location.hash;
  if(!hash.startsWith('#share=')) return false;
  try {
    const encoded = hash.slice(7);
    if(encoded.length > 4096) return false; // reject oversized payloads
    const raw = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    const payload = sanitiseSharePayload(raw);
    if(!payload) return false;

    // Reconstruct answers
    const answers = {};
    STANDARDS.forEach((std, si)=>{
      std.questions.forEach((q, qi)=>{
        answers[q.id] = payload.ans[si][qi];
      });
    });
    const scores = scoreAnswers(answers);
    const total  = scores.reduce((s,x)=>s+x.total,0);
    const p      = total/TOTAL_MAX_DFE;

    currentResult = {
      id: 'shared',
      date: payload.d,
      school: { name:payload.s, phase:payload.ph, la:payload.la, trust:"" },
      assessor: payload.a,
      jobTitle: payload.j,
      isLeader: payload.l===1,
      answers, scores, total, pct:p, rag:rag(p),
      shared: true
    };
    renderResults();
    showScreen('results');

    // Show shared banner
    setTimeout(()=>{
      const banner = document.createElement('div');
      banner.style.cssText='position:fixed;top:64px;left:50%;transform:translateX(-50%);background:var(--navy);color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:500;box-shadow:0 4px 16px rgba(0,0,0,.3)';
      banner.textContent='👁 Viewing shared results — this is read-only';
      document.body.appendChild(banner);
      setTimeout(()=>banner.remove(), 4000);
    }, 500);
    return true;
  } catch(e) { console.error('Failed to load shared result', e); return false; }
}

// ─── Trust / Multi-school tree view ──────────────────────────────────────────
// trustData = [{trustName, schools:[{name, phase, scores:[pct0..5]}]}]
let trustData = [];
let activeTrustIdx = null;

function initTrustView(){
  buildScoreInputs();
  renderTrustTree();
  renderTrustDashboard();
  showScreen("trust");
}

function buildScoreInputs(){
  const inp = document.getElementById("trustScoreInputs");
  if(inp) inp.innerHTML = STANDARDS.map(s=>
    `<div><label class="label">${s.icon} ${s.short}</label>
    <input type="number" id="tinp_${s.id}" min="0" max="100" placeholder="0–100%"
      style="width:100%;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:14px;outline:none;font-family:inherit"></div>`
  ).join("");
}

function startAssessmentForTrustSchool(schoolName){
  // Pre-fill the school name and go straight to assessment
  school = schoolName;
  schoolMeta = {urn:"",trust:"",la:"",phase:""};
  save();
  answers={}; step=0; renderStep(); showScreen("assess");
}

function addTrust(){
  const name = (document.getElementById("newTrustName")||{}).value?.trim();
  if(!name) return;
  trustData.push({ trustName: name, schools: [] });
  document.getElementById("newTrustName").value = "";
  renderTrustTree();
  renderTrustDashboard();
  openAddSchoolPanel(trustData.length - 1);
}

function openAddSchoolPanel(ti){
  activeTrustIdx = ti;
  const panel = document.getElementById("trustAddPanel");
  const title = document.getElementById("trustAddPanelTitle");
  if(panel) panel.style.display = "block";
  if(title) title.textContent = `Add a School to "${trustData[ti].trustName}"`;
  ["trustSchoolName","trustSchoolPhase","trustShareUrl"].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=""; });
  const err = document.getElementById("trustAddError"); if(err) err.style.display="none";
  STANDARDS.forEach(s=>{ const el=document.getElementById("tinp_"+s.id); if(el) el.value=""; });
  panel.scrollIntoView({behavior:"smooth", block:"nearest"});
  renderTrustTree();
}

function addTrustSchool(){
  if(activeTrustIdx===null){ alert("Please select a trust first."); return; }
  const name=(document.getElementById("trustSchoolName")||{}).value?.trim();
  const phase=(document.getElementById("trustSchoolPhase")||{}).value?.trim()||"";
  const errEl=document.getElementById("trustAddError");
  if(!name){ if(errEl){errEl.textContent="School name is required.";errEl.style.display="block";} return; }
  if(errEl) errEl.style.display="none";
  const scores=STANDARDS.map(s=>{ const v=parseInt((document.getElementById("tinp_"+s.id)||{}).value||""); return isNaN(v)?null:Math.min(100,Math.max(0,v)); });
  trustData[activeTrustIdx].schools.push({name,phase,scores});
  ["trustSchoolName","trustSchoolPhase"].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=""; });
  STANDARDS.forEach(s=>{ const el=document.getElementById("tinp_"+s.id); if(el) el.value=""; });
  renderTrustTree();
  renderTrustDashboard();
}

function loadTrustFromUrl(){
  if(activeTrustIdx===null){ alert("Please select a trust first."); return; }
  const urlVal=(document.getElementById("trustShareUrl")||{}).value?.trim();
  const errEl=document.getElementById("trustAddError");
  if(!urlVal){ if(errEl){errEl.textContent="Please paste a shared URL first.";errEl.style.display="block";} return; }
  try{
    const hash=urlVal.includes('#share=')?urlVal.split('#share=')[1]:urlVal;
    if(hash.length > 4096) throw new Error('Payload too large');
    const raw=JSON.parse(decodeURIComponent(escape(atob(hash))));
    const payload=sanitiseSharePayload(raw);
    if(!payload) throw new Error('Invalid share payload');
    if(payload.v!==1) throw new Error("invalid");
    if(!payload.sc) throw new Error('Share is missing per-standard scores');
    trustData[activeTrustIdx].schools.push({name:payload.s,phase:payload.ph||"",scores:payload.sc});
    document.getElementById("trustShareUrl").value="";
    if(errEl) errEl.style.display="none";
    renderTrustTree();
    renderTrustDashboard();
  }catch(e){ if(errEl){errEl.textContent="Could not read that URL — make sure it's a valid shared results link.";errEl.style.display="block";} }
}

function removeSchoolFromTrust(ti,si){ trustData[ti].schools.splice(si,1); renderTrustTree(); renderTrustDashboard(); }

function removeTrust(ti){
  if(!confirm(`Remove "${trustData[ti].trustName}" and all its schools?`)) return;
  trustData.splice(ti,1);
  if(activeTrustIdx===ti){ activeTrustIdx=null; document.getElementById("trustAddPanel").style.display="none"; }
  renderTrustTree(); renderTrustDashboard();
}

function clearTrust(){
  if(!confirm("Remove all trusts and schools?")) return;
  trustData=[]; activeTrustIdx=null;
  document.getElementById("trustAddPanel").style.display="none";
  renderTrustTree(); renderTrustDashboard();
}

function renderTrustTree(){
  const tree=document.getElementById("trustTree");
  const empty=document.getElementById("trustTreeEmpty");
  const nodes=document.getElementById("trustTreeNodes");
  if(!tree||!nodes) return;
  if(trustData.length===0){ tree.style.display="none"; if(empty) empty.style.display="block"; return; }
  tree.style.display="block";
  if(empty) empty.style.display="none";

  nodes.innerHTML=trustData.map((t,ti)=>{
    const isActive=activeTrustIdx===ti;
    const schoolNodes=t.schools.map((s,si)=>{
      const valid=s.scores.filter(v=>v!==null&&v!==undefined);
      const overall=valid.length?Math.round(valid.reduce((a,b)=>a+b,0)/valid.length):null;
      return `<div style="display:flex;align-items:center;gap:8px;padding:7px 12px 7px 28px;border-bottom:1px solid var(--border)">
        <span style="color:#94a3b8;font-size:11px;flex-shrink:0">└─</span>
        <span style="font-size:13px;color:var(--text);flex:1">${s.name}${s.phase?` <span style="color:var(--muted);font-size:11px">${s.phase}</span>`:""}</span>
        ${overall!==null?`<span style="font-size:12px;font-weight:700;color:${RAG_COLOR[rag(overall/100)]}">${overall}%</span>`:`<button onclick="startAssessmentForTrustSchool('${s.name}')" style="background:var(--teal);color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:600;cursor:pointer">▶ Start Assessment</button>`}
        <button onclick="removeSchoolFromTrust(${ti},${si})" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:12px;padding:2px 4px" title="Remove">✕</button>
      </div>`;
    }).join("");

    return `<div style="border:1.5px solid ${isActive?"var(--teal)":"var(--border)"};border-radius:10px;overflow:hidden;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:10px;padding:11px 14px;background:${isActive?"var(--teal-light)":"#f8fafc"}">
        <span style="font-size:16px">🏫</span>
        <span style="font-weight:700;font-size:14px;color:var(--navy);flex:1">${t.trustName}</span>
        <span style="font-size:11px;color:var(--muted)">${t.schools.length} school${t.schools.length!==1?"s":""}</span>
        <button onclick="openAddSchoolPanel(${ti})" style="background:var(--teal);color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer">+ Add School</button>
        <button onclick="removeTrust(${ti})" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:14px;padding:2px 4px" title="Remove trust">✕</button>
      </div>
      ${t.schools.length===0
        ?`<div style="padding:10px 14px 10px 28px;font-size:12px;color:#94a3b8;border-top:1px solid var(--border)">No schools added yet — click "+ Add School" above.</div>`
        :schoolNodes}
    </div>`;
  }).join("");
}

function renderTrustDashboard(){
  const dash=document.getElementById("trustDashboard");
  const meta=document.getElementById("trustMeta");
  if(!dash) return;
  const allSchools=trustData.flatMap(t=>t.schools.map(s=>({...s,trustName:t.trustName})));
  if(allSchools.length===0){ dash.classList.add("hidden"); return; }
  dash.classList.remove("hidden");
  const activeTrusts=trustData.filter(t=>t.schools.length>0).length;
  if(meta) meta.textContent=`${activeTrusts} trust${activeTrusts!==1?"s":""} · ${allSchools.length} school${allSchools.length!==1?"s":""} · All 6 core standards`;

  // Global averages
  const globalAvg=STANDARDS.map((_,si)=>{
    const vals=allSchools.map(s=>s.scores[si]).filter(v=>v!==null&&v!==undefined);
    return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
  });

  // Grouped table rows
  const tableRows=trustData.flatMap(t=>{
    if(!t.schools.length) return [];
    const tAvg=STANDARDS.map((_,si)=>{
      const vals=t.schools.map(s=>s.scores[si]).filter(v=>v!==null&&v!==undefined);
      return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
    });
    return [
      `<tr style="background:var(--navy)"><td colspan="${STANDARDS.length+2}" style="padding:7px 14px;font-size:12px;font-weight:700;color:#fff">🏫 ${t.trustName} <span style="font-weight:400;opacity:.6;font-size:11px">${t.schools.length} school${t.schools.length!==1?"s":""}</span></td></tr>`,
      ...t.schools.map(s=>{
        const valid=s.scores.filter(v=>v!==null&&v!==undefined);
        const overall=valid.length?Math.round(valid.reduce((a,b)=>a+b,0)/valid.length):null;
        return `<tr style="border-bottom:1px solid var(--border)">
          <td style="padding:8px 10px 8px 24px;font-size:13px;color:var(--text)">${s.name}${s.phase?` <span style="color:var(--muted);font-size:11px">${s.phase}</span>`:""}</td>
          ${STANDARDS.map((_,si)=>{
            const v=s.scores[si];
            if(v===null||v===undefined) return `<td style="text-align:center;color:#cbd5e1;font-size:11px;padding:8px 6px">—</td>`;
            return `<td style="text-align:center;padding:8px 6px"><span style="font-size:13px;font-weight:800;color:${RAG_COLOR[rag(v/100)]}">${v}%</span></td>`;
          }).join("")}
          <td style="text-align:center;padding:8px 6px">${overall!==null?`<span style="font-size:13px;font-weight:800;color:${RAG_COLOR[rag(overall/100)]}">${overall}%</span>`:`<span style="color:#cbd5e1">—</span>`}</td>
        </tr>`;
      }),
      `<tr style="background:#f0fdfa"><td style="padding:7px 10px 7px 24px;font-size:11px;color:#0f766e;font-weight:600">↳ Trust average</td>${tAvg.map(avg=>avg===null?`<td style="text-align:center;padding:7px 6px;color:#cbd5e1;font-size:11px">—</td>`:`<td style="text-align:center;padding:7px 6px"><span style="font-size:12px;font-weight:700;color:${RAG_COLOR[rag(avg/100)]}">${avg}%</span></td>`).join("")}<td></td></tr>`
    ];
  });

  // Heatmap rows
  const heatRows=trustData.flatMap(t=>{
    if(!t.schools.length) return [];
    return [
      `<div style="grid-column:1/-1;background:var(--navy);border-radius:6px;padding:4px 10px;margin-top:4px"><span style="font-size:11px;font-weight:700;color:#fff">🏫 ${t.trustName}</span></div>`,
      ...t.schools.flatMap(s=>[
        `<div style="font-size:12px;font-weight:500;color:var(--navy);padding:2px 0 2px 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${s.name}">${s.name}</div>`,
        ...STANDARDS.map((_,si)=>{
          const v=s.scores[si];
          if(v===null||v===undefined) return `<div style="background:#f1f5f9;border-radius:5px;height:32px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#cbd5e1">—</div>`;
          const r2=rag(v/100);
          const bg={green:"var(--green-bg)",amber:"var(--amber-bg)",red:"var(--red-bg)"}[r2];
          const tc={green:"var(--green)",amber:"var(--amber)",red:"var(--red)"}[r2];
          return `<div style="background:${bg};border-radius:5px;height:32px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:${tc}">${v}%</div>`;
        })
      ])
    ];
  });

  document.getElementById("trustGrid").innerHTML=`
    <div class="card" style="margin-bottom:16px;border-top:4px solid var(--navy)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
        <h3>All Schools — Standards Comparison</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${globalAvg.map((avg,si)=>avg===null?"":
            `<div style="text-align:center"><div style="font-size:10px;color:var(--muted)">${STANDARDS[si].icon} ${STANDARDS[si].short}</div>
            <div style="font-size:15px;font-weight:800;color:${RAG_COLOR[rag(avg/100)]}">${avg}%</div>
            <div style="font-size:9px;color:${RAG_COLOR[rag(avg/100)]};font-weight:600">avg</div></div>`
          ).join("")}
        </div>
      </div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="border-bottom:2px solid var(--border)">
          <th style="text-align:left;padding:8px 10px;color:var(--muted);font-weight:600">School</th>
          ${STANDARDS.map(s=>`<th style="text-align:center;padding:8px 6px;color:var(--muted);font-weight:600;min-width:72px">${s.icon} ${s.short}</th>`).join("")}
          <th style="text-align:center;padding:8px 6px;color:var(--muted);font-weight:600">Overall</th>
        </tr></thead>
        <tbody>${tableRows.join("")}</tbody>
      </table></div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:4px">Standards Heatmap</h3>
      <p class="muted" style="margin-bottom:12px">Grouped by trust — red cells show where attention is needed across the estate.</p>
      <div style="display:grid;grid-template-columns:minmax(120px,170px) repeat(${STANDARDS.length},1fr);gap:3px;align-items:center">
        <div></div>${STANDARDS.map(s=>`<div style="text-align:center;font-size:10px;color:var(--muted);font-weight:600;padding:2px">${s.icon}<br>${s.short}</div>`).join("")}
        ${heatRows.join("")}
      </div>
    </div>`;
}
// ─── Copy governor report as plain text ──────────────────────────────────────
function copyGovernorEmail(){
  const r = currentResult; if(!r) return;
  const cName = r.school?.name||r.school||"";
  const overallPct = Math.round(r.pct*100);

  const overallMsg = r.pct>=.75
    ? `${cName} is performing well overall, meeting or approaching the majority of the 6 core DfE Digital & Technology Standards.`
    : r.pct>=.4
    ? `${cName} is making progress towards the 6 core DfE Digital & Technology Standards, but has areas requiring attention before the 2030 deadline.`
    : `${cName} has significant work to do to meet the 6 core DfE Digital & Technology Standards by 2030. Prompt action is recommended.`;

  const coreScoresEmail = r.scores;

  const stdLines = coreScoresEmail.map(sc=>{
    const s = STANDARDS.find(x=>x.id===sc.id);
    return `  ${s.icon} ${s.name}: ${Math.round(sc.pct*100)}% — ${RAG_LABEL[sc.rag]}`;
  }).join("\n");

  const priorities = [...coreScoresEmail]
    .filter(sc=>sc.rag!=="green")
    .sort((a,b)=>a.pct-b.pct)
    .slice(0,3)
    .map(sc=>{
      const s = STANDARDS.find(x=>x.id===sc.id);
      const gaps = s.questions
        .filter(q=>(r.answers[q.id]??0)<=1)
        .slice(0,2)
        .map(q=>{
          const act = q.actions&&q.actions[Math.min(r.answers[q.id]??0,1)];
          return `    • ${q.text}\n      Current: ${q.opts[r.answers[q.id]??0]}${act?"\n      Suggested action: "+act:""}`;
        }).join("\n");
      return `${s.icon} ${s.name} (${Math.round(sc.pct*100)}% — ${RAG_LABEL[sc.rag]})\n${gaps}`;
    }).join("\n\n");

  const govQuestions = [
    "Is there a named SLT member responsible for digital technology with a documented remit?",
    "What is the plan and timeline for meeting any standards currently rated as Needs Attention or Developing?",
    "Has the school completed a cyber risk assessment in the last 12 months with a tested incident response plan?",
    "Are filtering and monitoring systems meeting KCSIE requirements and reviewed annually with DSL involvement?",
    "Is there a costed multi-year technology investment plan aligned to the DfE 2030 standards?"
  ].map((q,i)=>`  ${i+1}. ${q}`).join("\n");

  const text = `DfE DIGITAL STANDARDS 2030 — GOVERNOR SUMMARY REPORT
${"=".repeat(55)}

School: ${cName}
Date: ${fmtDate(r.date)}${r.assessor?`\nCompleted by: ${r.assessor}${r.jobTitle?", "+r.jobTitle:""}\n`:"\n"}
Overall score: ${overallPct}% — ${RAG_LABEL[r.rag]}

${overallMsg}

STANDARDS AT A GLANCE
${"─".repeat(40)}
${stdLines}

${priorities?"PRIORITY AREAS FOR GOVERNORS\n"+"─".repeat(40)+"\n"+priorities+"\n\n":""}QUESTIONS GOVERNORS SHOULD ASK
${"─".repeat(40)}
${govQuestions}

NEXT STEPS
${"─".repeat(40)}
The SLT digital lead should present a response to governors at the next available meeting,
with planned actions and timescales for each standard not currently meeting the threshold.
Next assessment recommended: ${new Date(new Date(r.date).setFullYear(new Date(r.date).getFullYear()+1)).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}

DfE standards guidance: gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges
Generated by DfE Digital Standards 2030 — Self-Assessment Tool`;

  navigator.clipboard.writeText(text).then(()=>{
    const btn = document.getElementById("copyGovBtn");
    if(btn){ btn.textContent="✓ Copied!"; btn.style.color="var(--green)"; setTimeout(()=>{ btn.textContent="📋 Copy for Email"; btn.style.color=""; }, 2500); }
  }).catch(()=>{
    // Fallback for older browsers
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position="fixed"; ta.style.opacity="0";
    document.body.appendChild(ta); ta.select(); document.execCommand("copy");
    document.body.removeChild(ta);
    const btn = document.getElementById("copyGovBtn");
    if(btn){ btn.textContent="✓ Copied!"; setTimeout(()=>{ btn.textContent="📋 Copy for Email"; }, 2500); }
  });
}

// ─── History ──────────────────────────────────────────────────────────────────
function showHistory(){
  const schoolName=assessments[0]?.school||school||"";
  document.getElementById("histMeta").textContent=`${schoolName} · ${assessments.length} assessment${assessments.length!==1?"s":""} completed`;

  // Show compare picker if 2+ assessments
  const picker = document.getElementById("comparePickerSection");
  if(picker){
    if(assessments.length>=2){
      picker.classList.remove("hidden");
      const opts = [...assessments].reverse().map(a=>
        `<option value="${a.id}">${fmtDate(a.date)}${a.assessor?` · ${a.assessor}`:""} (${Math.round(a.pct*100)}%)</option>`
      ).join("");
      const selA = document.getElementById("compareSelectA");
      const selB = document.getElementById("compareSelectB");
      if(selA) selA.innerHTML=opts;
      if(selB){ selB.innerHTML=opts; if(selB.options.length>1) selB.selectedIndex=1; }
    } else {
      picker.classList.add("hidden");
    }
  }

  document.getElementById("histList").innerHTML=[...assessments].reverse().map(a=>{
    const bars=a.scores.map(sc=>`<div class="hist-std-col"><div class="hist-bar" style="background:${RAG_COLOR[sc.rag]}"></div><div style="font-size:10px;color:var(--muted);margin-top:2px">${sc.name}</div><div style="font-size:11px;font-weight:700;color:${RAG_COLOR[sc.rag]}">${Math.round(sc.pct*100)}%</div></div>`).join("");
    const lb=a.isLeader?`<span style="margin-left:6px;background:#ede9fe;color:#6d28d9;padding:1px 7px;border-radius:20px;font-size:10px;font-weight:700">SLT</span>`:"";
    return `<div class="card" style="margin-bottom:14px;cursor:pointer" onclick="viewAssessment('${a.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;flex-wrap:wrap;gap:8px">
        <div><div style="font-weight:700;font-size:16px;color:var(--navy)">${fmtDate(a.date)}</div>${a.assessor?`<div class="muted">${a.assessor}${a.jobTitle?`, ${a.jobTitle}`:""}${lb}</div>`:""}</div>
        <div style="text-align:right"><div style="font-size:28px;font-weight:800;color:${RAG_COLOR[a.rag]}">${Math.round(a.pct*100)}%</div>${tagHTML(a.rag)}</div>
      </div>
      <div class="hist-std-grid">${bars}</div>
      <p class="muted" style="margin-top:10px;font-size:12px">Click to view full results →</p>
    </div>`;
  }).join("");
  showScreen("history");
}

function viewAssessment(id){
  const a=assessments.find(x=>x.id===id);
  if(a){ currentResult=a; renderResults(); showScreen("results"); }
}



// Run on load — non-blocking
checkFreshness().catch(() => {
  const badge = document.getElementById("freshnessBadge");
  if (badge) { badge.textContent = `📋 Verified: ${latestVerifiedDisplay()}`; badge.title = "Offline — using last verified date"; }
});


load();
const aboutVerified = document.getElementById("aboutVerifiedDate");
if(aboutVerified) aboutVerified.textContent = latestVerifiedDisplay();
// Check for shared result in URL hash
if(!loadSharedResult()){
  renderHome();
  showScreen("home");
}

window.addEventListener("beforeunload", e => {
  // Warn if mid-assessment or results not yet printed
  if(currentScreen === "assess" || (currentScreen === "results" && currentResult)) {
    e.preventDefault();
    e.returnValue = "Your assessment data will be cleared when you leave — have you saved your PDF report?";
  }
  try{["dfe_school","dfe_schoolmeta","dfe_assessor","dfe_jobtitle","dfe_isleader","dfe_assessments"].forEach(k=>localStorage.removeItem(k));}catch(e){}
});