import { Router, type Request, type Response } from "express";

const router = Router();

function isTokenOk(req: Request): boolean {
  const tok = process.env.TENMON_CONSOLE_TOKEN;
  if (!tok) return true; // token未設定なら開放（必要ならsystemdで設定）
  const q = req.query?.token;
  const v = Array.isArray(q) ? q[0] : q;
  return typeof v === "string" && v === tok;
}

router.get("/koshiki", (req: Request, res: Response) => {
  if (!isTokenOk(req)) {
    res.status(403).type("text/plain; charset=utf-8").send("Forbidden");
    return;
  }

  // 単一HTML（ビルド不要 / CORS不要 / VPSで確実に動く）
  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>TENMON-ARK | KOSHIKI Console</title>
  <style>
    :root{
      --bg:#0b0f14; --panel:#111824; --panel2:#0f1722; --line:#223044;
      --text:#e8eef7; --muted:#9fb0c7; --good:#47d18c; --warn:#f5c451; --bad:#ff6b6b;
      --btn:#1c2a3c; --btn2:#162132;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
      --sans: system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif;
    }
    *{box-sizing:border-box}
    body{margin:0;font-family:var(--sans); background:var(--bg); color:var(--text);}
    header{position:sticky;top:0;z-index:5;background:rgba(11,15,20,.92);backdrop-filter:blur(10px);
      border-bottom:1px solid var(--line); padding:12px 14px;}
    .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .title{font-weight:700;letter-spacing:.3px}
    .badge{font-family:var(--mono);font-size:12px;padding:3px 8px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}
    .badge.ok{color:var(--good);border-color:rgba(71,209,140,.35)}
    .badge.bad{color:var(--bad);border-color:rgba(255,107,107,.35)}
    .badge.warn{color:var(--warn);border-color:rgba(245,196,81,.35)}
    .spacer{flex:1}
    .ctrl{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    input, textarea{background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
    input{height:38px}
    textarea{width:100%;min-height:64px;resize:vertical;font-family:var(--sans)}
    button{cursor:pointer;background:var(--btn);color:var(--text);border:1px solid var(--line);
      border-radius:10px;padding:9px 11px}
    button:hover{background:var(--btn2)}
    button.on{outline:2px solid rgba(71,209,140,.35); border-color:rgba(71,209,140,.35)}
    main{display:grid;grid-template-columns: 1.3fr .9fr; gap:12px; padding:12px}
    @media (max-width:1100px){ main{grid-template-columns:1fr; } }
    .card{background:linear-gradient(180deg, rgba(17,24,36,.95), rgba(15,23,34,.95));
      border:1px solid var(--line); border-radius:14px; overflow:hidden}
    .card h2{margin:0;padding:10px 12px;border-bottom:1px solid var(--line);font-size:14px;color:var(--muted);font-weight:700}
    .chat{display:flex;flex-direction:column; height: calc(100vh - 170px);}
    .msgs{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
    .msg{max-width: 880px; padding:10px 12px; border-radius:14px; border:1px solid var(--line); background:rgba(0,0,0,.18)}
    .msg.user{align-self:flex-end;background:rgba(28,42,60,.55)}
    .msg.assistant{align-self:flex-start;background:rgba(17,24,36,.65)}
    .meta{font-family:var(--mono);font-size:11px;color:var(--muted);margin-bottom:6px}
    .text{white-space:pre-wrap;line-height:1.55}
    .composer{border-top:1px solid var(--line);padding:10px 12px;display:flex;flex-direction:column;gap:8px}
    .mini{font-family:var(--mono);font-size:11px;color:var(--muted)}
    .tabs{display:flex;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line);flex-wrap:wrap}
    .tabs button{padding:7px 10px;border-radius:999px}
    pre{margin:0;padding:12px;overflow:auto; font-family:var(--mono); font-size:12px; line-height:1.5; background:rgba(0,0,0,.18)}
    .list{padding:10px 12px;display:flex;flex-direction:column;gap:8px}
    .item{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:rgba(0,0,0,.12)}
    .item .k{font-family:var(--mono);font-size:11px;color:var(--muted)}
    .hintchips{display:flex;gap:8px;flex-wrap:wrap}
    .chip{font-size:12px;border:1px solid var(--line);background:rgba(0,0,0,.12);padding:6px 10px;border-radius:999px;cursor:pointer;color:var(--text)}
    .chip:hover{background:rgba(0,0,0,.2)}
  </style>
</head>
<body>
<header>
  <div class="row">
    <div class="title">TENMON-ARK <span style="opacity:.65">|</span> KOSHIKI Console</div>
    <span id="badgeStage" class="badge">stage: ?</span>
    <span id="badgeSha" class="badge">sha: ?</span>
    <span id="badgeMark" class="badge">mark: ?</span>
    <span id="badgeKoshiki" class="badge">koshikiKernel: ?</span>
    <div class="spacer"></div>
    <div class="ctrl">
      <input id="apiBase" style="width:240px" placeholder="API Base (空=同一オリジン)" />
      <button id="saveBase">保存</button>
      <input id="threadId" style="width:240px" placeholder="threadId" />
      <button id="newThread">新規</button>
      <button id="copyThread">コピー</button>
    </div>
  </div>
</header>

<main>
  <section class="card chat">
    <h2>Chat</h2>
    <div id="msgs" class="msgs"></div>
    <div class="composer">
      <div class="row">
        <button id="togDetails">#詳細</button>
        <button id="togGrounded">根拠モード</button>
        <button id="togCouncil">評議会</button>
        <button id="clearChat">表示クリア</button>
        <div class="spacer"></div>
        <span class="mini" id="netState">net: ?</span>
      </div>
      <textarea id="input" placeholder="ここに入力（Enter=送信 / Shift+Enter=改行）"></textarea>
      <div class="row">
        <button id="send">送信</button>
        <span class="mini">Tip: 「根拠モード」で evidenceIds が付きやすくなります。#詳細は内部状態（breath/koshiki）を可視化。</span>
      </div>
      <div class="hintchips" id="hints"></div>
    </div>
  </section>

  <section class="card">
    <h2>Panels</h2>
    <div class="tabs">
      <button class="on" data-tab="audit">audit</button>
      <button data-tab="evidence">evidence</button>
      <button data-tab="koshiki">koshiki</button>
      <button data-tab="ufk">ufk</button>
      <button data-tab="raw">raw</button>
    </div>
    <div id="panel"></div>
  </section>
</main>

<script>
(() => {
  const $ = (id) => document.getElementById(id);

  const store = {
    get(k, d){ try{ const v=localStorage.getItem(k); return v===null?d:v; }catch{ return d; } },
    set(k, v){ try{ localStorage.setItem(k, v); }catch{} },
    getJSON(k, d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch{ return d; } },
    setJSON(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} },
  };

  const state = {
    apiBase: store.get("TENMON_API_BASE", ""),
    threadId: store.get("TENMON_THREAD_ID", "koshiki-" + Date.now().toString(36)),
    messages: store.getJSON("TENMON_CONSOLE_MSGS", []),
    opts: store.getJSON("TENMON_CONSOLE_OPTS", {details:false, grounded:false, council:false}),
    last: { audit:null, chat:null },
    tab: "audit",
  };

  $("apiBase").value = state.apiBase;
  $("threadId").value = state.threadId;

  function apiUrl(path){
    const base = (state.apiBase || "").replace(/\\/$/, "");
    return base ? (base + path) : path;
  }

  function setBadge(el, text, cls){
    el.textContent = text;
    el.className = "badge" + (cls ? " " + cls : "");
  }

  function renderOpts(){
    $("togDetails").classList.toggle("on", !!state.opts.details);
    $("togGrounded").classList.toggle("on", !!state.opts.grounded);
    $("togCouncil").classList.toggle("on", !!state.opts.council);
  }

  function pushMsg(role, text, meta){
    state.messages.push({role, text, meta: meta || {}, at: new Date().toISOString()});
    store.setJSON("TENMON_CONSOLE_MSGS", state.messages);
    renderMsgs();
  }

  function renderMsgs(){
    const box = $("msgs");
    box.innerHTML = "";
    for(const m of state.messages){
      const div = document.createElement("div");
      div.className = "msg " + (m.role==="user" ? "user" : "assistant");
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = (m.role==="user" ? "YOU" : "ARK") + " • " + (m.at || "");
      const txt = document.createElement("div");
      txt.className = "text";
      txt.textContent = m.text || "";
      div.appendChild(meta);
      div.appendChild(txt);
      box.appendChild(div);
    }
    box.scrollTop = box.scrollHeight;
  }

  function setNet(ok, note){
    $("netState").textContent = "net: " + (ok ? "OK" : "NG") + (note ? (" ("+note+")") : "");
  }

  async function fetchJSON(url, opts){
    const r = await fetch(url, opts);
    const t = await r.text();
    let j = null;
    try{ j = JSON.parse(t); }catch{ j = { _raw: t }; }
    return { status:r.status, json:j, text:t };
  }

  function safeTextFromChat(resp){
    // 返却キーが揺れても拾う（UIは落ちない）
    if(!resp) return "";
    if(typeof resp === "string") return resp;
    if(resp.text && typeof resp.text === "string") return resp.text;
    if(resp.answer && typeof resp.answer === "string") return resp.answer;
    if(resp.message && typeof resp.message === "string") return resp.message;
    if(resp.output && typeof resp.output === "string") return resp.output;
    if(resp.content && typeof resp.content === "string") return resp.content;
    // decisionFrame系
    const df = resp.decisionFrame || resp.df;
    if(df && typeof df.text === "string") return df.text;
    return JSON.stringify(resp, null, 2);
  }

  function extractEvidence(resp){
    const dp = (resp && (resp.detailPlan || resp.dp)) || {};
    const ev = dp.evidenceIds || dp.evidence || [];
    return Array.isArray(ev) ? ev : [];
  }

  function extractKoshiki(resp){
    const dp = (resp && (resp.detailPlan || resp.dp)) || {};
    const dbg = dp.debug || {};
    return dbg.koshiki || null;
  }

  function extractUfk(resp){
    const dp = (resp && (resp.detailPlan || resp.dp)) || {};
    const dbg = dp.debug || {};
    return dbg.ufk || null;
  }

  function extractHints(resp){
    const dp = (resp && (resp.detailPlan || resp.dp)) || {};
    const df = (resp && (resp.decisionFrame || resp.df)) || {};
    const h = dp.freeChatHints || df.freeChatHints || [];
    return Array.isArray(h) ? h : [];
  }

  function renderHints(resp){
    const hints = extractHints(resp);
    const box = $("hints");
    box.innerHTML = "";
    for(const h of hints.slice(0, 10)){
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = h;
      chip.onclick = () => {
        $("input").value = h;
        $("input").focus();
      };
      box.appendChild(chip);
    }
  }

  function renderPanel(){
    const root = $("panel");
    root.innerHTML = "";

    const resp = state.last.chat;
    const aud  = state.last.audit;

    if(state.tab === "audit"){
      const pre = document.createElement("pre");
      pre.textContent = aud ? JSON.stringify(aud, null, 2) : "audit not loaded";
      root.appendChild(pre);
      return;
    }
    if(state.tab === "raw"){
      const pre = document.createElement("pre");
      pre.textContent = resp ? JSON.stringify(resp, null, 2) : "no response yet";
      root.appendChild(pre);
      return;
    }
    if(state.tab === "evidence"){
      const ev = extractEvidence(resp);
      const wrap = document.createElement("div");
      wrap.className = "list";
      if(ev.length === 0){
        const item = document.createElement("div");
        item.className = "item";
        item.innerHTML = "<div class='k'>evidenceIds</div><div>0 件（根拠モード or 質問を具体化すると付きやすい）</div>";
        wrap.appendChild(item);
      } else {
        for(const e of ev){
          const item = document.createElement("div");
          item.className = "item";
          const k = document.createElement("div");
          k.className = "k";
          k.textContent = "evidenceId";
          const v = document.createElement("div");
          v.textContent = typeof e === "string" ? e : JSON.stringify(e);
          item.appendChild(k); item.appendChild(v);
          wrap.appendChild(item);
        }
      }
      root.appendChild(wrap);
      return;
    }
    if(state.tab === "koshiki"){
      const k = extractKoshiki(resp);
      const pre = document.createElement("pre");
      pre.textContent = k ? JSON.stringify(k, null, 2) : "koshiki debug not present (try #詳細)";
      root.appendChild(pre);
      return;
    }
    if(state.tab === "ufk"){
      const u = extractUfk(resp);
      const pre = document.createElement("pre");
      pre.textContent = u ? JSON.stringify(u, null, 2) : "ufk debug not present (try #詳細 or classification-triggering prompt)";
      root.appendChild(pre);
      return;
    }
  }

  async function refreshAudit(){
    try{
      const r = await fetchJSON(apiUrl("/api/audit"), { method:"GET" });
      if(r.status !== 200) throw new Error("audit http " + r.status);
      state.last.audit = r.json;
      const b = (r.json.build || {});
      const f = (b.features || {});
      setBadge($("badgeStage"), "stage: " + (((r.json.readiness||{}).stage)||"?"), "ok");
      setBadge($("badgeSha"), "sha: " + (r.json.gitSha || "?"), "");
      setBadge($("badgeMark"), "mark: " + (b.mark || "?"), "");
      setBadge($("badgeKoshiki"), "koshikiKernel: " + (f.koshikiKernel === true ? "true" : String(f.koshikiKernel||"false")), f.koshikiKernel ? "ok" : "warn");
      setNet(true, "audit");
      if(state.tab === "audit") renderPanel();
    }catch(e){
      setNet(false, "audit");
      setBadge($("badgeStage"), "stage: ?", "bad");
    }
  }

  async function send(){
    const input = $("input");
    const raw = (input.value || "").trim();
    if(!raw) return;

    input.value = "";
    pushMsg("user", raw, {});

    let msg = raw;
    if(state.opts.grounded) msg = "根拠を示して。必要なら引用（doc+pdfPage）を付けて: " + msg;
    if(state.opts.details)  msg = "#詳細 " + msg;

    try{
      let resp;
      if(state.opts.council){
        const r = await fetchJSON(apiUrl("/api/council/run"), {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ threadId: state.threadId, question: msg })
        });
        resp = r.json;
      } else {
        const r = await fetchJSON(apiUrl("/api/chat"), {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ threadId: state.threadId, message: msg })
        });
        resp = r.json;
      }

      state.last.chat = resp;
      renderHints(resp);
      renderPanel();

      const out = safeTextFromChat(resp);
      pushMsg("assistant", out, {});
      setNet(true, state.opts.council ? "council" : "chat");
    }catch(e){
      pushMsg("assistant", "ERROR: " + (e && e.message ? e.message : String(e)), {});
      setNet(false, "chat");
    }
  }

  // UI wiring
  $("saveBase").onclick = () => {
    state.apiBase = ($("apiBase").value || "").trim();
    store.set("TENMON_API_BASE", state.apiBase);
    refreshAudit();
  };

  $("newThread").onclick = () => {
    state.threadId = "koshiki-" + Date.now().toString(36);
    $("threadId").value = state.threadId;
    store.set("TENMON_THREAD_ID", state.threadId);
    pushMsg("assistant", "threadId を更新しました: " + state.threadId, {});
  };

  $("copyThread").onclick = async () => {
    try{
      await navigator.clipboard.writeText(state.threadId);
      pushMsg("assistant", "threadId をコピーしました。", {});
    }catch{
      pushMsg("assistant", "コピーできませんでした（ブラウザ制限）。threadId: " + state.threadId, {});
    }
  };

  $("threadId").onchange = () => {
    state.threadId = ($("threadId").value || "").trim() || state.threadId;
    $("threadId").value = state.threadId;
    store.set("TENMON_THREAD_ID", state.threadId);
  };

  $("togDetails").onclick = () => { state.opts.details = !state.opts.details; store.setJSON("TENMON_CONSOLE_OPTS", state.opts); renderOpts(); };
  $("togGrounded").onclick = () => { state.opts.grounded = !state.opts.grounded; store.setJSON("TENMON_CONSOLE_OPTS", state.opts); renderOpts(); };
  $("togCouncil").onclick = () => { state.opts.council = !state.opts.council; store.setJSON("TENMON_CONSOLE_OPTS", state.opts); renderOpts(); };

  $("clearChat").onclick = () => {
    state.messages = [];
    store.setJSON("TENMON_CONSOLE_MSGS", state.messages);
    renderMsgs();
  };

  $("send").onclick = send;
  $("input").addEventListener("keydown", (ev) => {
    if(ev.key === "Enter" && !ev.shiftKey){
      ev.preventDefault();
      send();
    }
  });

  document.querySelectorAll(".tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("on"));
      btn.classList.add("on");
      state.tab = btn.getAttribute("data-tab");
      renderPanel();
    });
  });

  // boot
  renderOpts();
  renderMsgs();
  renderPanel();
  refreshAudit();
  setInterval(refreshAudit, 5000);
})();
</script>
</body>
</html>`;

  res.status(200).type("text/html; charset=utf-8").send(html);
});

export default router;
