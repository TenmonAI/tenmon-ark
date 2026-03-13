import { useEffect, useMemo, useRef, useState } from "react";

type AnyObj = Record<string, any>;
function safeJsonParse(t: string): any { try { return JSON.parse(t); } catch { return { _raw: t }; } }
function pickText(resp: any): string {
  if (!resp) return "";
  if (typeof resp === "string") return resp;
  if (typeof resp.response === "string") return resp.response;
  if (typeof resp.text === "string") return resp.text;
  if (typeof resp.answer === "string") return resp.answer;
  if (typeof resp.message === "string") return resp.message;
  return JSON.stringify(resp, null, 2);
}
function getDP(resp: any): AnyObj { return (resp && (resp.detailPlan || resp.dp)) || {}; }

export default function KoshikiConsolePage() {
  const [apiBase, setApiBase] = useState<string>(() => localStorage.getItem("TENMON_API_BASE") || "");
  const [threadId, setThreadId] = useState<string>(() => localStorage.getItem("TENMON_THREAD_ID") || `pwa-koshiki-${Date.now().toString(36)}`);
  const [input, setInput] = useState("");
  const [details, setDetails] = useState<boolean>(() => (localStorage.getItem("TENMON_OPT_DETAILS") || "") === "1");
  const [grounded, setGrounded] = useState<boolean>(() => (localStorage.getItem("TENMON_OPT_GROUNDED") || "") === "1");
  const [council, setCouncil] = useState<boolean>(() => (localStorage.getItem("TENMON_OPT_COUNCIL") || "") === "1");
  const [tab, setTab] = useState<"audit"|"evidence"|"koshiki"|"ufk"|"raw">("koshiki");
  const [audit, setAudit] = useState<any>(null);
  const [last, setLast] = useState<any>(null);
  const [msgs, setMsgs] = useState<{role:"user"|"assistant", text:string, at:string}[]>(() => {
    const v = localStorage.getItem("TENMON_PWA_KOSHIKI_MSGS");
    return v ? (JSON.parse(v) as any) : [];
  });

  const boxRef = useRef<HTMLDivElement|null>(null);
  const base = useMemo(() => (apiBase || "").replace(/\/$/, ""), [apiBase]);
  const url = (path: string) => base ? `${base}${path}` : path;

  useEffect(() => { localStorage.setItem("TENMON_API_BASE", apiBase); }, [apiBase]);
  useEffect(() => { localStorage.setItem("TENMON_THREAD_ID", threadId); }, [threadId]);
  useEffect(() => {
    localStorage.setItem("TENMON_OPT_DETAILS", details ? "1" : "0");
    localStorage.setItem("TENMON_OPT_GROUNDED", grounded ? "1" : "0");
    localStorage.setItem("TENMON_OPT_COUNCIL", council ? "1" : "0");
  }, [details, grounded, council]);

  useEffect(() => {
    localStorage.setItem("TENMON_PWA_KOSHIKI_MSGS", JSON.stringify(msgs));
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [msgs]);

  async function refreshAudit() {
    try{
      const r = await fetch(url("/api/audit"));
      const t = await r.text();
      setAudit(safeJsonParse(t));
    }catch{
      setAudit(null);
    }
  }
  useEffect(() => {
    refreshAudit();
    const id = setInterval(refreshAudit, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  function push(role:"user"|"assistant", text:string) {
    setMsgs(m => [...m, {role, text, at: new Date().toISOString()}]);
  }

  async function send() {
    const raw = input.trim();
    if (!raw) return;
    setInput("");
    push("user", raw);

    let msg = raw;
    if (grounded) msg = `根拠を示して。必要なら引用（doc+pdfPage）を付けて: ${msg}`;
    if (details) msg = `#詳細 ${msg}`;

    try{
      let resp:any = null;
      if (council) {
        const r = await fetch(url("/api/council/run"), {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ threadId, question: msg })
        });
        resp = safeJsonParse(await r.text());
      } else {
        const r = await fetch(url("/api/chat"), {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ threadId, message: msg })
        });
        resp = safeJsonParse(await r.text());
      }
      setLast(resp);
      push("assistant", pickText(resp));
    } catch(e:any) {
      push("assistant", `ERROR: ${e?.message || String(e)}`);
    }
  }

  const dp = getDP(last);
  const dbg = (dp.debug || {}) as AnyObj;
  const koshiki = (dbg.koshiki || null) as AnyObj|null;
  const ufk = (dbg.ufk || null) as AnyObj|null;
  const evidenceIds = Array.isArray(dp.evidenceIds) ? dp.evidenceIds : [];

  return (
    <div style={{display:"grid", gridTemplateColumns:"1.2fr 0.8fr", gap:12, padding:12}}>
      <div style={{border:"1px solid #ddd", borderRadius:12, overflow:"hidden", display:"flex", flexDirection:"column", height:"calc(100vh - 90px)"}}>
        <div style={{padding:10, borderBottom:"1px solid #eee", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
          <b>KOSHIKI Console</b>
          <span style={{opacity:.7, fontFamily:"ui-monospace", fontSize:12}}>threadId:</span>
          <input value={threadId} onChange={e=>setThreadId(e.target.value)} style={{height:34, width:260}} />
          <button onClick={()=>setThreadId(`pwa-koshiki-${Date.now().toString(36)}`)}>新規</button>
          <span style={{flex:1}} />
          <button onClick={()=>setDetails(v=>!v)} style={{background: details ? "#e8f7ee" : ""}}>#詳細</button>
          <button onClick={()=>setGrounded(v=>!v)} style={{background: grounded ? "#fff6e1" : ""}}>根拠</button>
          <button onClick={()=>setCouncil(v=>!v)} style={{background: council ? "#eef2ff" : ""}}>評議会</button>
        </div>

        <div ref={boxRef} style={{flex:1, overflow:"auto", padding:12, background:"#fafafa"}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{ marginBottom:10, display:"flex", justifyContent: m.role==="user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth:820,
                padding:"10px 12px",
                borderRadius:14,
                border:"1px solid #e5e7eb",
                background: m.role==="user" ? "#eef2ff" : "#fff"
              }}>
                <div style={{fontSize:11, opacity:.6, fontFamily:"ui-monospace"}}>{m.role.toUpperCase()} • {m.at}</div>
                <div style={{whiteSpace:"pre-wrap", lineHeight:1.55}}>{m.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{padding:10, borderTop:"1px solid #eee", display:"flex", gap:8}}>
          <textarea
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); }}}
            placeholder="Enter=送信 / Shift+Enter=改行"
            style={{flex:1, minHeight:54}}
          />
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            <button onClick={send}>送信</button>
            <button onClick={()=>{ setMsgs([]); localStorage.removeItem("TENMON_PWA_KOSHIKI_MSGS"); }}>クリア</button>
          </div>
        </div>

        <div style={{padding:"8px 10px", borderTop:"1px solid #eee", fontSize:12, opacity:.7}}>
          API Base（空=同一ドメイン）:
          <input value={apiBase} onChange={e=>setApiBase(e.target.value)} style={{height:34, width:320, marginLeft:8}} />
        </div>
      </div>

      <div style={{border:"1px solid #ddd", borderRadius:12, overflow:"hidden", height:"calc(100vh - 90px)", display:"flex", flexDirection:"column"}}>
        <div style={{padding:10, borderBottom:"1px solid #eee", display:"flex", gap:8, flexWrap:"wrap"}}>
          {(["audit","evidence","koshiki","ufk","raw"] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{background: tab===t ? "#111827" : "", color: tab===t ? "#fff" : ""}}>
              {t}
            </button>
          ))}
        </div>
        <div style={{flex:1, overflow:"auto", padding:10, fontFamily:"ui-monospace", fontSize:12, background:"#0b0f14", color:"#e5e7eb"}}>
          {tab==="audit" && <pre style={{margin:0}}>{audit ? JSON.stringify(audit, null, 2) : "audit not loaded"}</pre>}
          {tab==="raw" && <pre style={{margin:0}}>{last ? JSON.stringify(last, null, 2) : "no response yet"}</pre>}
          {tab==="evidence" && <pre style={{margin:0}}>{evidenceIds.length ? JSON.stringify(evidenceIds, null, 2) : "evidenceIds: 0"}</pre>}
          {tab==="koshiki" && <pre style={{margin:0}}>{koshiki ? JSON.stringify(koshiki, null, 2) : "koshiki debug missing (try #詳細)"}</pre>}
          {tab==="ufk" && <pre style={{margin:0}}>{ufk ? JSON.stringify(ufk, null, 2) : "ufk debug missing (try #詳細 / 分類系の入力)"}</pre>}
        </div>
      </div>
    </div>
  );
}
