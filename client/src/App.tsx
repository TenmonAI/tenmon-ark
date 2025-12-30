import { useEffect, useMemo, useRef, useState } from "react";

type ThinkRes = {
  response?: string;
  timestamp?: string;
};

type Judgment = {
  type?: string;
  phase?: string;
  reading?: string;
  structure?: string[];
  action?: string;
};

type ChatRes = {
  thought?: string;
  judgment?: Judgment | null;
  response?: string;
  timestamp?: string;
};

type Msg = {
  id: string;
  role: "user" | "assistant";
  kind: "think" | "judge";
  text: string;
  ts?: string;
  judgment?: Judgment | null;
};

const ui = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(900px 500px at 20% -10%, rgba(245,158,11,0.12), transparent 60%), radial-gradient(900px 500px at 90% 0%, rgba(59,130,246,0.14), transparent 55%), #0b0b0f",
    color: "#eaeaea",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',
    padding: 24,
  } as const,
  shell: {
    maxWidth: 980,
    margin: "0 auto",
  } as const,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    marginBottom: 18,
  } as const,
  title: {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: 0.3,
    margin: 0,
  } as const,
  subtitle: {
    marginTop: 6,
    color: "#a7a7a7",
    fontSize: 13,
    lineHeight: 1.6,
  } as const,
  chipRow: { display: "flex", gap: 8, flexWrap: "wrap" as const } as const,
  chip: (ok: boolean) =>
    ({
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      border: "1px solid " + (ok ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"),
      background: ok ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)",
      color: ok ? "#86efac" : "#fecaca",
      userSelect: "none" as const,
    }) as const,
  card: {
    background: "rgba(17,17,23,0.82)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    padding: 16,
  } as const,
  textarea: {
    width: "100%",
    boxSizing: "border-box" as const,
    background: "rgba(10,10,14,0.95)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 14,
    resize: "vertical" as const,
    outline: "none",
    lineHeight: 1.75,
    fontSize: 14,
  } as const,
  btnRow: { display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" as const } as const,
  btn: (variant: "primary" | "secondary" | "ghost", disabled?: boolean) =>
    ({
      padding: "10px 14px",
      borderRadius: 10,
      border:
        variant === "ghost"
          ? "1px solid rgba(255,255,255,0.15)"
          : variant === "secondary"
          ? "1px solid rgba(255,255,255,0.16)"
          : "1px solid rgba(255,255,255,0.12)",
      cursor: disabled ? "not-allowed" : "pointer",
      fontWeight: 800,
      background:
        variant === "primary"
          ? "linear-gradient(180deg, rgba(255,255,255,1), rgba(224,224,224,1))"
          : variant === "secondary"
          ? "rgba(42,42,48,0.90)"
          : "transparent",
      color: variant === "primary" ? "#0b0b0f" : "#ffffff",
      opacity: disabled ? 0.6 : 1,
      userSelect: "none" as const,
    }) as const,
  hint: {
    marginTop: 10,
    color: "#9aa0a6",
    fontSize: 12,
    lineHeight: 1.7,
  } as const,
  logWrap: {
    marginTop: 14,
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  } as const,
  bubble: (role: "user" | "assistant") =>
    ({
      alignSelf: role === "user" ? "flex-end" : "flex-start",
      maxWidth: "92%",
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background:
        role === "user"
          ? "rgba(59,130,246,0.14)"
          : "rgba(255,255,255,0.05)",
      whiteSpace: "pre-wrap" as const,
      lineHeight: 1.8,
      fontSize: 14,
    }) as const,
  metaRow: {
    marginTop: 6,
    display: "flex",
    gap: 8,
    alignItems: "center",
    color: "#a7a7a7",
    fontSize: 11,
  } as const,
  miniTag: (label: string) =>
    ({
      padding: "2px 8px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(255,255,255,0.06)",
      color: "#d7d7d7",
    }) as const,
  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(127,29,29,0.55)",
    border: "1px solid rgba(239,68,68,0.35)",
    whiteSpace: "pre-wrap" as const,
  } as const,
  judgeBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    background: "#f5f5f5",
    color: "#111",
  } as const,
  judgePre: {
    background: "#111",
    color: "#0f0",
    padding: 10,
    borderRadius: 10,
    whiteSpace: "pre-wrap" as const,
    overflowX: "auto" as const,
  } as const,
};

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const [input, setInput] = useState("");
  const [log, setLog] = useState<Msg[]>([]);
  const [openJudgeId, setOpenJudgeId] = useState<string | null>(null);

  const [sendingThink, setSendingThink] = useState(false);
  const [sendingJudge, setSendingJudge] = useState(false);
  const [err, setErr] = useState<string>("");

  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  // health check
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/health");
        if (!r.ok) throw new Error("health not ok");
        const j = await r.json();
        if (!cancelled) setApiOk(j?.status === "ok");
      } catch {
        if (!cancelled) setApiOk(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log.length, sendingThink, sendingJudge]);

  async function sendThink() {
    const text = input.trim();
    if (!text) return;

    setErr("");
    setSendingThink(true);
    setOpenJudgeId(null);

    const userMsg: Msg = { id: makeId(), role: "user", kind: "think", text, ts: new Date().toISOString() };
    setLog((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/think", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
      }

      const data: ThinkRes = await res.json();
      const assistantMsg: Msg = {
        id: makeId(),
        role: "assistant",
        kind: "think",
        text: data.response ?? "",
        ts: data.timestamp,
      };
      setLog((prev) => [...prev, assistantMsg]);
      setInput("");
    } catch (e: any) {
      setErr(e?.message ?? "❌ APIエラー");
    } finally {
      setSendingThink(false);
    }
  }

  async function sendJudge() {
    const text = input.trim();
    if (!text) return;

    setErr("");
    setSendingJudge(true);

    const userMsg: Msg = { id: makeId(), role: "user", kind: "judge", text, ts: new Date().toISOString() };
    setLog((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
      }

      const data: ChatRes = await res.json();
      const assistantMsg: Msg = {
        id: makeId(),
        role: "assistant",
        kind: "judge",
        text: data.thought ?? data.response ?? "",
        ts: data.timestamp,
        judgment: data.judgment ?? null,
      };

      setLog((prev) => [...prev, assistantMsg]);
      setInput("");

      // judgment があれば自動で折りたたみ対象に
      if (assistantMsg.judgment) {
        setOpenJudgeId(assistantMsg.id);
      } else {
        setOpenJudgeId(null);
      }
    } catch (e: any) {
      setErr(e?.message ?? "❌ APIエラー");
    } finally {
      setSendingJudge(false);
    }
  }

  function clearAll() {
    setInput("");
    setLog([]);
    setErr("");
    setOpenJudgeId(null);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl + Enter で THINK
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!sendingThink && !sendingJudge && canSend) void sendThink();
    }
    // Shift+Enter は改行（そのまま）
  }

  return (
    <div style={ui.page}>
      <div style={ui.shell}>
        <div style={ui.header}>
          <div>
            <h1 style={ui.title}>TENMON-ARK</h1>
            <div style={ui.subtitle}>
              通常は <b>THINK（会話）</b>：<code>/api/think</code> ／ 必要時のみ{" "}
              <b>JUDGE（判断）</b>：<code>/api/chat</code>
              <br />
              操作：<b>Cmd/Ctrl + Enter</b> で THINK 送信
            </div>
          </div>

          <div style={ui.chipRow}>
            {apiOk === null ? (
              <span style={ui.chip(true)}>● API: checking…</span>
            ) : apiOk ? (
              <span style={ui.chip(true)}>● API: ok</span>
            ) : (
              <span style={ui.chip(false)}>● API: down</span>
            )}
          </div>
        </div>

        <div style={ui.card}>
          <textarea
            rows={4}
            style={ui.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="ここに入力してください。会話は Send（THINK）。判断が必要なら Judge（JUDGE）。"
          />

          <div style={ui.btnRow}>
            <button
              onClick={() => void sendThink()}
              disabled={!canSend || sendingThink || sendingJudge}
              style={ui.btn("primary", !canSend || sendingThink || sendingJudge)}
            >
              {sendingThink ? "送信中…" : "Send（THINK）"}
            </button>

            <button
              onClick={() => void sendJudge()}
              disabled={!canSend || sendingThink || sendingJudge}
              style={ui.btn("secondary", !canSend || sendingThink || sendingJudge)}
            >
              {sendingJudge ? "判断中…" : "Judge（JUDGE）"}
            </button>

            <button onClick={clearAll} style={ui.btn("ghost")}>
              Clear
            </button>
          </div>

          <div style={ui.hint}>
            THINK は自然会話（丁寧語）です。JUDGE は必要時のみ、判断（構造）を同時に返します。
          </div>

          {err && <pre style={ui.errorBox}>{err}</pre>}

          <div style={ui.logWrap}>
            {log.map((m) => (
              <div key={m.id} style={{ width: "100%" }}>
                <div style={ui.bubble(m.role)}>
                  {m.text}

                  <div style={ui.metaRow}>
                    <span style={ui.miniTag(m.role === "user" ? "USER" : "TENMON")}>
                      {m.role === "user" ? "USER" : m.kind === "judge" ? "JUDGE" : "THINK"}
                    </span>
                    {m.ts ? <span>{m.ts}</span> : null}
                  </div>

                  {m.role === "assistant" && m.kind === "judge" && m.judgment ? (
                    <div style={{ marginTop: 10 }}>
                      <button
                        onClick={() =>
                          setOpenJudgeId((prev) => (prev === m.id ? null : m.id))
                        }
                        style={ui.btn("secondary")}
                      >
                        {openJudgeId === m.id ? "判断を閉じる" : "判断を見る"}
                      </button>

                      {openJudgeId === m.id ? (
                        <div style={ui.judgeBox}>
                          <div>
                            <b>type</b>: {m.judgment.type ?? "-"}
                          </div>
                          <div>
                            <b>phase</b>: {m.judgment.phase ?? "-"}
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <b>reading</b>: {m.judgment.reading ?? "-"}
                          </div>

                          <div style={{ marginTop: 10 }}>
                            <b>structure</b>:
                            <ul>
                              {(m.judgment.structure ?? []).map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>

                          <div style={{ marginTop: 10 }}>
                            <b>action</b>:
                            <pre style={ui.judgePre}>{m.judgment.action ?? ""}</pre>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
