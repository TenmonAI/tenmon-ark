import { useEffect, useMemo, useRef, useState } from "react";
import ResearchConsole from "./ResearchConsole";

type Judgment = {
  type?: string;
  phase?: string;
  reading?: string;
  structure?: string[];
  action?: string;
};

type ThinkRes = {
  response?: string;
  timestamp?: string;
};

type ChatRes = {
  thought?: string;
  judgment?: Judgment | null;
  response?: string;
  timestamp?: string;
};

type Turn = {
  id: string;
  role: "user" | "assistant" | "system";
  channel: "THINK" | "JUDGE" | "SYSTEM";
  text: string;
  ts?: string;
  judgment?: Judgment | null;
};

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function prettyTs(ts?: string) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

async function safeJson(res: Response) {
  const raw = await res.text();
  try {
    return { ok: true, json: JSON.parse(raw), raw };
  } catch {
    return { ok: false, json: null, raw };
  }
}

export default function App() {
  const [view, setView] = useState<"chat" | "research">("chat");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([
    {
      id: uid(),
      role: "system",
      channel: "SYSTEM",
      text: "TENMON-ARK 起動。通常は THINK（会話）で進め、必要時のみ JUDGE（判断）を開いてください。",
    },
  ]);

  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [loadingThink, setLoadingThink] = useState(false);
  const [loadingJudge, setLoadingJudge] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [openJudge, setOpenJudge] = useState<Record<string, boolean>>({});

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  // --- Health check ---
  useEffect(() => {
    let alive = true;

    async function ping() {
      try {
        const res = await fetch("/api/health", { method: "GET" });
        if (!alive) return;
        if (!res.ok) return setApiOk(false);
        const parsed = await safeJson(res);
        const ok = parsed.ok && parsed.json?.status === "ok";
        setApiOk(ok);
      } catch {
        if (!alive) return;
        setApiOk(false);
      }
    }

    ping();
    const t = setInterval(ping, 10_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // --- auto scroll ---
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns.length]);

  function pushTurn(t: Turn) {
    setTurns((prev) => [...prev, t]);
  }

  function clearAll() {
    setInput("");
    setErrorText("");
    setOpenJudge({});
    setTurns([
      {
        id: uid(),
        role: "system",
        channel: "SYSTEM",
        text: "TENMON-ARK 起動。通常は THINK（会話）で進め、必要時のみ JUDGE（判断）を開いてください。",
      },
    ]);
    inputRef.current?.focus();
  }

  async function sendThink() {
    const msg = input.trim();
    if (!msg || loadingThink || loadingJudge) return;

    setErrorText("");
    setLoadingThink(true);

    pushTurn({ id: uid(), role: "user", channel: "THINK", text: msg, ts: new Date().toISOString() });

    try {
      const res = await fetch("/api/think", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
      }

      const parsed = await safeJson(res);
      const data = (parsed.ok ? (parsed.json as ThinkRes) : {}) as ThinkRes;

      pushTurn({
        id: uid(),
        role: "assistant",
        channel: "THINK",
        text: (data.response ?? "").toString() || "（応答が空でした）",
        ts: data.timestamp,
      });

      setInput("");
      inputRef.current?.focus();
    } catch (e: any) {
      setErrorText(e?.message ?? "❌ APIエラー");
    } finally {
      setLoadingThink(false);
    }
  }

  async function sendJudge() {
    const msg = input.trim();
    if (!msg || loadingThink || loadingJudge) return;

    setErrorText("");
    setLoadingJudge(true);

    pushTurn({ id: uid(), role: "user", channel: "JUDGE", text: msg, ts: new Date().toISOString() });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
      }

      const parsed = await safeJson(res);
      const data = (parsed.ok ? (parsed.json as ChatRes) : {}) as ChatRes;

      const assistantId = uid();
      pushTurn({
        id: assistantId,
        role: "assistant",
        channel: "JUDGE",
        text: (data.thought ?? data.response ?? "").toString() || "（応答が空でした）",
        ts: data.timestamp,
        judgment: data.judgment ?? null,
      });

      if (data.judgment) {
        setOpenJudge((prev) => ({ ...prev, [assistantId]: true }));
      }

      setInput("");
      inputRef.current?.focus();
    } catch (e: any) {
      setErrorText(e?.message ?? "❌ APIエラー");
    } finally {
      setLoadingJudge(false);
    }
  }

  function toggleJudge(id: string) {
    setOpenJudge((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // noop
    }
  }

  return (
    <div className="ta">
      <style>{css}</style>

      <header className="ta-header">
        <div className="ta-brand">
          <div className="ta-title">
            <span className="ta-mark">◉</span>
            TENMON-ARK
          </div>
          <div className="ta-sub">
            通常は <b>THINK（会話）</b>：<code>/api/think</code> ／ 必要時のみ <b>JUDGE（判断）</b>：
            <code>/api/chat</code>
            <span className="ta-sub2">（Cmd/Ctrl + Enter で THINK 送信）</span>
          </div>
        </div>

        <div className="ta-right">
          <span className={`ta-chip ${apiOk === null ? "wait" : apiOk ? "ok" : "down"}`}>
            <span className="dot" />
            API: {apiOk === null ? "確認中" : apiOk ? "稼働" : "停止"}
          </span>

          <button className="ta-btn ghost" onClick={() => setView("chat")}>
            会話
          </button>
          <button className="ta-btn ghost" onClick={() => setView("research")}>
            研究
          </button>

          <button className="ta-btn ghost" onClick={clearAll}>
            クリア
          </button>
        </div>
      </header>

      <main className="ta-main">
        {view === "research" ? (
          <div className="ta-thread" style={{ height: "auto" }}>
            <ResearchConsole />
          </div>
        ) : (
          <>
            {errorText && <div className="ta-error">{errorText}</div>}

            <div className="ta-thread" ref={listRef}>
          {turns.map((t) => {
            const isUser = t.role === "user";
            const hasJudgment = !!t.judgment;

            return (
              <div key={t.id} className={`ta-row ${isUser ? "user" : t.role === "assistant" ? "assistant" : "system"}`}>
                <div className={`ta-msg ${isUser ? "user" : t.role === "assistant" ? "assistant" : "system"}`}>
                  <div className="ta-msgHead">
                    <span className={`ta-badge ${t.channel.toLowerCase()}`}>{t.channel}</span>
                    <span className="ta-ts">{t.ts ? prettyTs(t.ts) : ""}</span>

                    {t.role === "assistant" && (
                      <button className="ta-mini" onClick={() => copyText(t.text)} title="本文をコピー">
                        Copy
                      </button>
                    )}
                  </div>

                  <div className="ta-text">{t.text}</div>

                  {t.role === "assistant" && hasJudgment && (
                    <div className="ta-judgeArea">
                      <button className="ta-btn sub" onClick={() => toggleJudge(t.id)}>
                        {openJudge[t.id] ? "判断を閉じる" : "判断を見る"}
                      </button>

                      {openJudge[t.id] && (
                        <div className="ta-judge">
                          <div className="ta-judgeGrid">
                            <div>
                              <b>type</b>: {t.judgment?.type ?? "-"}
                            </div>
                            <div>
                              <b>phase</b>: {t.judgment?.phase ?? "-"}
                            </div>
                          </div>

                          <div className="ta-judgeLine">
                            <b>reading</b>: {t.judgment?.reading ?? "-"}
                          </div>

                          <div className="ta-judgeLine">
                            <b>structure</b>:
                            <ul>
                              {(t.judgment?.structure ?? []).map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="ta-judgeLine">
                            <div className="ta-judgeActionHead">
                              <b>action</b>
                              <button className="ta-mini" onClick={() => copyText(t.judgment?.action ?? "")}>
                                Copy
                              </button>
                            </div>
                            <pre className="ta-code">{t.judgment?.action ?? ""}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
            </div>
          </>
        )}
      </main>

      {view === "chat" && (
      <footer className="ta-composer">
        <div className="ta-composeCard">
          <textarea
            ref={inputRef}
            className="ta-input"
            rows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ここに入力してください。会話は Send（THINK）。判断が必要なら Judge（JUDGE）。"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                sendThink();
              }
            }}
          />

          <div className="ta-actionsRow">
            <button className="ta-btn primary" onClick={sendThink} disabled={!canSend || loadingThink || loadingJudge}>
              {loadingThink ? "送信中…" : "Send（THINK）"}
            </button>

            <button className="ta-btn secondary" onClick={sendJudge} disabled={!canSend || loadingThink || loadingJudge}>
              {loadingJudge ? "判断中…" : "Judge（JUDGE）"}
            </button>
          </div>

          <div className="ta-hint">
            THINK は自然会話（丁寧語）です。JUDGE は必要時のみ、判断（構造）を同時に返します。
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}

const css = `
/* ===== Tenmon Ark – Light research theme (ChatGPT-like layout, original styling) ===== */
:root{
  --bg: #fbfbfd;
  --paper: #ffffff;
  --ink: #111827;
  --muted: #6b7280;
  --border: #e5e7eb;

  --accent: #1f3a8a;    /* 藍 */
  --accent2: #b0892f;   /* 金 */
  --teal: #0b7a75;      /* Tenmon teal */

  --shadow: 0 10px 30px rgba(17,24,39,0.08);
}

.ta{
  min-height: 100vh;
  background: radial-gradient(900px 500px at 10% -10%, rgba(31,58,138,0.08), transparent 60%),
              radial-gradient(900px 500px at 90% -10%, rgba(176,137,47,0.09), transparent 55%),
              var(--bg);
  color: var(--ink);
}

.ta-header{
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(251,251,253,0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
  padding: 16px 18px;
  display: flex;
  gap: 16px;
  align-items: flex-end;
  justify-content: space-between;
}

.ta-brand{display:flex;flex-direction:column;gap:6px}
.ta-title{
  font-size: 24px;
  font-weight: 900;
  letter-spacing: .4px;
  display:flex;
  align-items:center;
  gap:10px;
}
.ta-mark{
  display:inline-flex;
  width: 28px; height: 28px;
  align-items:center; justify-content:center;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(31,58,138,0.12), rgba(176,137,47,0.12));
  border: 1px solid rgba(31,58,138,0.18);
  color: var(--accent);
  font-size: 14px;
}

.ta-sub{
  font-size: 12px;
  color: var(--muted);
}
.ta-sub code{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  background: rgba(31,58,138,0.06);
  border: 1px solid rgba(31,58,138,0.10);
  padding: 1px 6px;
  border-radius: 8px;
  color: #1f2937;
}
.ta-sub2{ margin-left:10px; color:#8891a1; }

.ta-right{display:flex; align-items:center; gap:10px}

.ta-chip{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.9);
  box-shadow: 0 6px 16px rgba(17,24,39,0.06);
}
.ta-chip .dot{
  width: 8px; height: 8px; border-radius:999px;
  background: #9ca3af;
}
.ta-chip.ok{ border-color: rgba(11,122,117,0.25); }
.ta-chip.ok .dot{ background: var(--teal); }
.ta-chip.down{ border-color: rgba(239,68,68,0.25); }
.ta-chip.down .dot{ background: #ef4444; }
.ta-chip.wait .dot{ background:#9ca3af; }

.ta-btn{
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--paper);
  padding: 10px 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(17,24,39,0.06);
}
.ta-btn:hover{ filter: brightness(0.99); }
.ta-btn:disabled{ opacity: .55; cursor: not-allowed; }
.ta-btn.primary{
  background: linear-gradient(180deg, rgba(31,58,138,0.10), rgba(31,58,138,0.04));
  border-color: rgba(31,58,138,0.18);
}
.ta-btn.secondary{
  background: linear-gradient(180deg, rgba(11,122,117,0.10), rgba(11,122,117,0.04));
  border-color: rgba(11,122,117,0.22);
}
.ta-btn.ghost{
  background: rgba(255,255,255,0.75);
}
.ta-btn.sub{
  background: rgba(31,58,138,0.06);
  border-color: rgba(31,58,138,0.14);
  box-shadow: none;
  padding: 8px 12px;
  font-weight: 800;
}

.ta-mini{
  margin-left: auto;
  font-size: 11px;
  border-radius: 10px;
  border: 1px solid rgba(17,24,39,0.12);
  background: rgba(255,255,255,0.6);
  padding: 4px 8px;
  cursor: pointer;
}
.ta-mini:hover{ background: rgba(255,255,255,0.9); }

.ta-main{
  max-width: 980px;
  margin: 0 auto;
  padding: 16px 18px 120px;
}

.ta-error{
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.18);
  color: #7f1d1d;
  margin-bottom: 12px;
  white-space: pre-wrap;
}

.ta-thread{
  height: 58vh;
  overflow: auto;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.72);
  box-shadow: var(--shadow);
  padding: 14px;
}

.ta-row{display:flex; margin: 10px 0;}
.ta-row.user{ justify-content: flex-end; }
.ta-row.assistant, .ta-row.system{ justify-content: flex-start; }

.ta-msg{
  width: min(860px, 94%);
  border-radius: 16px;
  border: 1px solid rgba(17,24,39,0.08);
  box-shadow: 0 10px 26px rgba(17,24,39,0.06);
  padding: 12px 14px;
  background: var(--paper);
}

.ta-msg.user{
  background: linear-gradient(180deg, rgba(31,58,138,0.08), rgba(255,255,255,1));
  border-color: rgba(31,58,138,0.14);
}
.ta-msg.assistant{
  background: var(--paper);
}
.ta-msg.system{
  background: rgba(255,255,255,0.6);
  border-style: dashed;
}

.ta-msgHead{
  display:flex;
  align-items:center;
  gap:8px;
  margin-bottom: 6px;
}

.ta-badge{
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(17,24,39,0.12);
  background: rgba(17,24,39,0.03);
  color: #374151;
}
.ta-badge.think{
  border-color: rgba(11,122,117,0.22);
  background: rgba(11,122,117,0.06);
}
.ta-badge.judge{
  border-color: rgba(176,137,47,0.28);
  background: rgba(176,137,47,0.08);
}
.ta-badge.system{
  border-color: rgba(31,58,138,0.16);
  background: rgba(31,58,138,0.05);
}

.ta-ts{
  font-size: 11px;
  color: #8b93a3;
}

.ta-text{
  white-space: pre-wrap;
  line-height: 1.85;
  font-size: 14px;
  color: #111827;
}

.ta-judgeArea{ margin-top: 10px; }

.ta-judge{
  margin-top: 10px;
  border-radius: 14px;
  border: 1px solid rgba(176,137,47,0.20);
  background: rgba(255,255,255,0.92);
  padding: 12px;
}

.ta-judgeGrid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ta-judgeLine{
  margin-top: 10px;
}
.ta-judgeLine ul{
  margin: 6px 0 0 18px;
}
.ta-judgeActionHead{
  display:flex;
  align-items:center;
  gap: 8px;
}
.ta-code{
  margin-top: 8px;
  background: #0b1220;
  color: #a7f3d0;
  border-radius: 12px;
  padding: 10px;
  white-space: pre-wrap;
  overflow-x: auto;
  border: 1px solid rgba(31,58,138,0.18);
}

.ta-composer{
  position: fixed;
  left: 0; right: 0;
  bottom: 0;
  padding: 14px 18px;
  background: rgba(251,251,253,0.92);
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--border);
}

.ta-composeCard{
  max-width: 980px;
  margin: 0 auto;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.82);
  box-shadow: var(--shadow);
  padding: 12px;
}

.ta-input{
  width: 100%;
  box-sizing: border-box;
  border-radius: 14px;
  border: 1px solid rgba(17,24,39,0.14);
  padding: 12px 12px;
  font-size: 14px;
  line-height: 1.75;
  outline: none;
  background: rgba(255,255,255,0.96);
  color: #111827;
  resize: vertical;
}
.ta-input:focus{
  border-color: rgba(31,58,138,0.35);
  box-shadow: 0 0 0 4px rgba(31,58,138,0.10);
}

.ta-actionsRow{
  display:flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.ta-hint{
  margin-top: 10px;
  font-size: 12px;
  color: #6b7280;
}

/* responsive */
@media (max-width: 680px){
  .ta-header{ align-items: flex-start; flex-direction: column; }
  .ta-right{ width: 100%; justify-content: space-between; }
  .ta-thread{ height: 54vh; }
  .ta-judgeGrid{ grid-template-columns: 1fr; }
}
`;
