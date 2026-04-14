/**
 * ============================================================
 *  SUKUYOU PAGE — 宿曜鑑定専用ページ
 *  UX v3: モバイルファースト + 鑑定直下チャット + 全デバイス最適化
 *  DEVICE_UX_POLISH_V1 準拠
 * ============================================================
 */
import React, { useState, useCallback, useRef, useEffect } from "react";

interface GuidanceResult {
  success: boolean;
  honmeiShuku: string;
  disasterType: string;
  reversalAxis: string;
  oracle: { shortOracle: string; longOracle: string; oneActionNow?: string } | string;
  report: {
    chapters: Array<{ number: number; title: string; content: string; source?: string }>;
    fullText: string;
    charCount: number;
  };
  premise: {
    birthDate: string;
    name: string | null;
    confidence: number;
    mode?: string;
  };
  warnings: string[];
  sukuyouSeedV1?: {
    version: string;
    birthDate: string;
    name: string | null;
    honmeiShuku: string;
    disasterType: string;
    reversalAxis: string;
    userConcern: string | null;
    coreQuestion: string;
    deepChatPrompts: string[];
    lifeAlgo: {
      outerPersona: string;
      innerPersona: string;
      motivationRoot: string;
      fearRoot: string;
      repeatingFailurePattern: string;
    };
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface SukuyouPageProps {
  onBack: () => void;
  onSendToChat?: (displayText: string, rawSeed: string, deepChatPrompt?: string) => void;
}

/* ── 質問チップ定義 ── */
const QUESTION_CHIPS = [
  "この鑑定をやさしく説明して",
  "人間関係をもっと詳しく",
  "仕事への活かし方を知りたい",
  "金運について深掘りしたい",
  "この言霊の意味をやさしく教えて",
  "今すぐの一手だけ教えて",
];

export function SukuyouPage({ onBack, onSendToChat }: SukuyouPageProps) {
  // Form state
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [name, setName] = useState("");
  const [concern, setConcern] = useState("");

  // Result state
  const [result, setResult] = useState<GuidanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  // UI state
  const [showDetail, setShowDetail] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());

  // Inline chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const chatThreadId = useRef<string>(`sukuyou-${Date.now()}`);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ── auto-resize textarea ── */
  useEffect(() => {
    const el = chatInputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [chatInput]);

  const handleSubmit = useCallback(async () => {
    if (!birthYear || !birthMonth || !birthDay) {
      setError("生年月日を入力してください");
      return;
    }
    const y = parseInt(birthYear);
    const m = parseInt(birthMonth);
    const d = parseInt(birthDay);
    if (isNaN(y) || isNaN(m) || isNaN(d) || y < 1900 || y > 2025 || m < 1 || m > 12 || d < 1 || d > 31) {
      setError("生年月日の値が不正です");
      return;
    }
    const birthDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    setLoading(true);
    setError(null);
    setResult(null);
    setChatMessages([]);
    setShowDetail(false);
    setExpandedChapters(new Set());
    chatThreadId.current = `sukuyou-${Date.now()}`;

    try {
      const res = await fetch("/api/sukuyou/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          birthDate,
          name: name.trim() || null,
          currentConcern: concern.trim() || null,
          confidence: 0.85,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);

      // 鑑定完了時にseedをチャットAPIに送信して文脈を確立
      const sv = data.sukuyouSeedV1;
      if (sv) {
        const rawSeed = `[SUKUYOU_SEED] ${JSON.stringify(sv)}`;
        try {
          await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              message: rawSeed,
              sessionId: chatThreadId.current,
              threadId: chatThreadId.current,
            }),
          }).then(r => r.json()).catch(() => {});
        } catch { /* seed送信失敗は無視 */ }
      }
    } catch (err: any) {
      setError(err.message || "鑑定中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [birthYear, birthMonth, birthDay, name, concern]);

  const handleCopy = useCallback(async () => {
    if (!result?.report?.fullText) return;
    try {
      await navigator.clipboard.writeText(result.report.fullText);
      setCopyMsg("コピーしました");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = result.report.fullText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopyMsg("コピーしました");
    }
    setTimeout(() => setCopyMsg(null), 2000);
  }, [result]);

  const handleSendToChat = useCallback(() => {
    if (!result) return;
    const sv = result.sukuyouSeedV1;
    const rawSeed = sv
      ? `[SUKUYOU_SEED] ${JSON.stringify(sv)}`
      : `[SUKUYOU_SEED] ${result.premise?.birthDate || ""} / ${result.honmeiShuku || ""} / ${result.disasterType || ""}`;
    const displayText = `宿曜鑑定の結果を土台に、これから真相解析を深めます。本命宿は${result.honmeiShuku || "不明"}、災い分類は${result.disasterType || "不明"}、反転軸は${result.reversalAxis || "不明"}です。`;
    const deepPrompt = sv?.deepChatPrompts?.[0] || undefined;
    if (onSendToChat) onSendToChat(displayText, rawSeed, deepPrompt);
  }, [result, onSendToChat]);

  /* ── 鑑定直下チャット送信 ── */
  const sendChatMessage = useCallback(async (text: string) => {
    if (!text.trim() || chatLoading || !result) return;
    const userMsg: ChatMessage = { role: "user", text: text.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: text.trim(),
          sessionId: chatThreadId.current,
          threadId: chatThreadId.current,
        }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, {
        role: "assistant",
        text: data.response || "応答を取得できませんでした",
      }]);
    } catch {
      setChatMessages(prev => [...prev, {
        role: "assistant",
        text: "通信エラーが発生しました。もう一度お試しください。",
      }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, result]);

  const toggleChapter = (num: number) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num); else next.add(num);
      return next;
    });
  };

  const getOracleShort = () => {
    if (!result?.oracle) return "";
    if (typeof result.oracle === "string") return result.oracle;
    return result.oracle.shortOracle || "";
  };
  const getOneAction = () => {
    if (!result?.oracle || typeof result.oracle === "string") return "";
    return result.oracle.oneActionNow || "";
  };

  /* ═══════════════════════════════════════════
     CSS-in-JS: モバイルファースト設計
     ═══════════════════════════════════════════ */

  const pageStyle: React.CSSProperties = {
    height: "100%",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    color: "var(--text, #e0e0e0)",
    padding: "0 0 env(safe-area-inset-bottom, 0px)",
    background: "var(--bg, #1a1a1a)",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: 680,
    margin: "0 auto",
    padding: "1rem 0.875rem 2rem",
  };

  const headerStyle: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "var(--bg, #1a1a1a)",
    borderBottom: "1px solid rgba(212, 175, 55, 0.15)",
    padding: "0.625rem 0.875rem",
  };

  const cardBase: React.CSSProperties = {
    background: "var(--gpt-hover-bg, rgba(255,255,255,0.04))",
    border: "1px solid rgba(212, 175, 55, 0.18)",
    borderRadius: 14,
    padding: "1.125rem 1rem",
    marginBottom: "0.875rem",
  };

  const gold = "#d4af37";
  const goldStyle: React.CSSProperties = { color: gold };
  const subStyle: React.CSSProperties = { color: "var(--text-sub, #888)" };

  /* ── ボタン共通: 44px最低高さ ── */
  const btnBase: React.CSSProperties = {
    minHeight: 44,
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    transition: "opacity 0.15s, transform 0.1s",
  };

  /* ── 質問チップ: モバイルで押しやすく ── */
  const chipBase: React.CSSProperties = {
    ...btnBase,
    padding: "10px 16px",
    borderRadius: 22,
    fontSize: 13,
    fontWeight: 500,
    background: "rgba(212, 175, 55, 0.08)",
    border: "1px solid rgba(212, 175, 55, 0.25)",
    color: gold,
  };

  return (
    <div className="sukuyou-page" style={pageStyle}>
      {/* ═══ ヘッダー ═══ */}
      <div style={headerStyle}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button" onClick={onBack}
            style={{
              ...btnBase,
              background: "none",
              color: gold,
              fontSize: 15,
              padding: "6px 10px",
              minHeight: 36,
            }}
            aria-label="戻る"
          >
            ← 戻る
          </button>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, ...goldStyle, margin: 0 }}>宿曜鑑定</h1>
            <p style={{ fontSize: 10, ...subStyle, margin: 0, letterSpacing: "0.02em" }}>
              天聞アーク御神託パイプライン
            </p>
          </div>
        </div>
      </div>

      <div style={containerStyle}>
        {/* ═══ 入力フォーム ═══ */}
        <div style={cardBase}>
          <h2 style={{ fontSize: 14, fontWeight: 600, ...goldStyle, marginBottom: 14 }}>基本情報</h2>

          {/* 生年月日 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, ...subStyle, display: "block", marginBottom: 6 }}>生年月日</label>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <input
                type="number" inputMode="numeric" placeholder="1990" value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                min={1900} max={2025}
                style={{
                  width: 76, padding: "10px 10px", borderRadius: 8,
                  background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                  border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                  color: "var(--text)", fontSize: 15, minHeight: 44, boxSizing: "border-box",
                }}
              />
              <span style={subStyle}>年</span>
              <input
                type="number" inputMode="numeric" placeholder="1" value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                min={1} max={12}
                style={{
                  width: 54, padding: "10px 10px", borderRadius: 8,
                  background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                  border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                  color: "var(--text)", fontSize: 15, minHeight: 44, boxSizing: "border-box",
                }}
              />
              <span style={subStyle}>月</span>
              <input
                type="number" inputMode="numeric" placeholder="1" value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                min={1} max={31}
                style={{
                  width: 54, padding: "10px 10px", borderRadius: 8,
                  background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                  border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                  color: "var(--text)", fontSize: 15, minHeight: 44, boxSizing: "border-box",
                }}
              />
              <span style={subStyle}>日</span>
            </div>
          </div>

          {/* 名前 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, ...subStyle, display: "block", marginBottom: 6 }}>名前（任意）</label>
            <input
              type="text" placeholder="お名前" value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                color: "var(--text)", fontSize: 14, minHeight: 44, boxSizing: "border-box",
              }}
            />
          </div>

          {/* 悩み */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, ...subStyle, display: "block", marginBottom: 6 }}>
              現在の悩み・相談内容（任意）
            </label>
            <textarea
              placeholder="最近、仕事の方向性に迷いがあります…"
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              rows={3}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                color: "var(--text)", fontSize: 14, resize: "vertical",
                boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6,
              }}
            />
          </div>

          {/* 鑑定ボタン */}
          <button
            type="button" onClick={handleSubmit} disabled={loading}
            style={{
              ...btnBase,
              width: "100%",
              padding: "14px 0",
              background: loading ? "#7a6a20" : gold,
              color: "#1a1a1a",
              fontSize: 15,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "鑑定中…" : "鑑定する"}
          </button>

          {error && (
            <div style={{
              marginTop: 12, padding: "12px 14px", borderRadius: 10,
              background: "rgba(220, 38, 38, 0.08)",
              border: "1px solid rgba(220, 38, 38, 0.25)",
              color: "#f87171", fontSize: 13, lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            鑑定結果 — UX v3
           ═══════════════════════════════════════════════════════ */}
        {result && (
          <div>
            {/* ── 第一層: 要約カード ── */}
            <div style={{
              ...cardBase,
              border: "1px solid rgba(212, 175, 55, 0.35)",
              background: "linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.015) 100%)",
              padding: "1.25rem 1rem",
            }}>
              <h2 style={{
                fontSize: 15, fontWeight: 700, ...goldStyle,
                marginBottom: 16, textAlign: "center", letterSpacing: "0.05em",
              }}>
                鑑定結果
              </h2>

              {/* 本命宿 */}
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                <div style={{
                  fontSize: 32, fontWeight: 800, ...goldStyle,
                  letterSpacing: "0.08em",
                }}>
                  {result.honmeiShuku}
                </div>
                <div style={{ fontSize: 11, ...subStyle, marginTop: 4 }}>本命宿</div>
              </div>

              {/* 災い分類 + 反転軸: 2カラム */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16,
              }}>
                <div style={{
                  padding: "12px", borderRadius: 10,
                  background: "rgba(212, 175, 55, 0.05)",
                  border: "1px solid rgba(212, 175, 55, 0.12)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 10, ...subStyle, marginBottom: 5, letterSpacing: "0.03em" }}>災い分類</div>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{result.disasterType}</div>
                </div>
                <div style={{
                  padding: "12px", borderRadius: 10,
                  background: "rgba(212, 175, 55, 0.05)",
                  border: "1px solid rgba(212, 175, 55, 0.12)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 10, ...subStyle, marginBottom: 5, letterSpacing: "0.03em" }}>反転軸</div>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{result.reversalAxis}</div>
                </div>
              </div>

              {/* 御神託 */}
              {getOracleShort() && (
                <div style={{
                  padding: "14px 16px", borderRadius: 12,
                  background: "rgba(212, 175, 55, 0.07)",
                  border: "1px solid rgba(212, 175, 55, 0.18)",
                  marginBottom: 14, textAlign: "center",
                }}>
                  <div style={{
                    fontSize: 10, ...goldStyle, fontWeight: 600,
                    marginBottom: 8, letterSpacing: "0.08em",
                  }}>
                    御神託
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.8 }}>{getOracleShort()}</div>
                </div>
              )}

              {/* 今すぐの一手 */}
              {getOneAction() && (
                <div style={{
                  padding: "12px 16px", borderRadius: 12,
                  background: "rgba(212, 175, 55, 0.03)",
                  border: "1px dashed rgba(212, 175, 55, 0.22)",
                  textAlign: "center",
                }}>
                  <div style={{
                    fontSize: 10, ...goldStyle, fontWeight: 600,
                    marginBottom: 6, letterSpacing: "0.08em",
                  }}>
                    今すぐの一手
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.7 }}>{getOneAction()}</div>
                </div>
              )}
            </div>

            {/* ═══ 鑑定直下チャット ═══ */}
            <div style={{
              ...cardBase,
              border: "1px solid rgba(212, 175, 55, 0.3)",
              padding: "1.125rem 1rem",
            }}>
              <h3 style={{
                fontSize: 14, fontWeight: 600, ...goldStyle,
                marginBottom: 4,
              }}>
                この鑑定について続けて聞く
              </h3>
              <p style={{ fontSize: 11, ...subStyle, marginBottom: 14, lineHeight: 1.5 }}>
                鑑定結果を踏まえて、気になることを自由に質問できます
              </p>

              {/* 質問チップ: 会話開始前のみ表示 */}
              {chatMessages.length === 0 && (
                <div style={{
                  display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16,
                }}>
                  {QUESTION_CHIPS.map((chip) => (
                    <button
                      key={chip} type="button"
                      onClick={() => sendChatMessage(chip)}
                      disabled={chatLoading}
                      style={{
                        ...chipBase,
                        opacity: chatLoading ? 0.5 : 1,
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* チャット履歴 */}
              {chatMessages.length > 0 && (
                <div style={{
                  maxHeight: 420, overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                  marginBottom: 12, padding: "4px 0",
                }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{
                      display: "flex",
                      justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                      marginBottom: 10,
                    }}>
                      <div style={{
                        maxWidth: "88%",
                        padding: "11px 15px",
                        borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        fontSize: 13.5, lineHeight: 1.75, whiteSpace: "pre-wrap",
                        background: msg.role === "user"
                          ? "rgba(212, 175, 55, 0.12)"
                          : "var(--gpt-hover-bg, rgba(255,255,255,0.05))",
                        border: msg.role === "user"
                          ? "1px solid rgba(212, 175, 55, 0.25)"
                          : "1px solid var(--gpt-border, rgba(255,255,255,0.08))",
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                      <div style={{
                        padding: "11px 15px", borderRadius: "14px 14px 14px 4px",
                        fontSize: 13.5,
                        background: "var(--gpt-hover-bg, rgba(255,255,255,0.05))",
                        border: "1px solid var(--gpt-border, rgba(255,255,255,0.08))",
                        ...subStyle,
                      }}>
                        <span className="thinking-dots">考え中</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* チャット入力欄: textarea + 送信ボタン */}
              <div style={{
                display: "flex", gap: 8, alignItems: "flex-end",
              }}>
                <textarea
                  ref={chatInputRef}
                  placeholder="自由に質問する…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendChatMessage(chatInput);
                    }
                  }}
                  disabled={chatLoading}
                  rows={1}
                  style={{
                    flex: 1, padding: "11px 14px", borderRadius: 10,
                    background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                    border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                    color: "var(--text)", fontSize: 14, boxSizing: "border-box",
                    fontFamily: "inherit", lineHeight: 1.5,
                    resize: "none", overflow: "hidden",
                    minHeight: 44, maxHeight: 120,
                  }}
                />
                <button
                  type="button"
                  onClick={() => sendChatMessage(chatInput)}
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    ...btnBase,
                    padding: "0 18px",
                    minHeight: 44,
                    background: chatInput.trim() ? gold : "rgba(212, 175, 55, 0.25)",
                    color: "#1a1a1a",
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  送信
                </button>
              </div>
            </div>

            {/* ═══ 詳細レポート（折りたたみ） ═══ */}
            <div style={cardBase}>
              <button
                type="button"
                onClick={() => setShowDetail(!showDetail)}
                style={{
                  ...btnBase,
                  width: "100%",
                  padding: "12px 0",
                  background: "transparent",
                  color: gold,
                  fontSize: 14,
                  display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
                  border: "none",
                }}
              >
                {showDetail ? "詳細レポートを閉じる ▲" : "詳細レポートを読む ▼"}
              </button>

              {showDetail && (
                <div style={{ marginTop: 14 }}>
                  {/* コピー・チャットへ送る */}
                  <div style={{
                    display: "flex", gap: 8, marginBottom: 14,
                    justifyContent: "flex-end", flexWrap: "wrap",
                  }}>
                    <button
                      type="button" onClick={handleCopy}
                      style={{
                        ...btnBase, minHeight: 36,
                        padding: "8px 14px", fontSize: 12,
                        background: "transparent",
                        border: "1px solid rgba(212, 175, 55, 0.25)",
                        color: gold,
                      }}
                    >
                      {copyMsg || "レポートをコピー"}
                    </button>
                    {onSendToChat && (
                      <button
                        type="button" onClick={handleSendToChat}
                        style={{
                          ...btnBase, minHeight: 36,
                          padding: "8px 14px", fontSize: 12,
                          background: "transparent",
                          border: "1px solid rgba(212, 175, 55, 0.25)",
                          color: gold,
                        }}
                      >
                        チャットへ送る
                      </button>
                    )}
                  </div>

                  {/* 章別アコーディオン */}
                  {result.report.chapters.map((ch) => (
                    <div key={ch.number} style={{
                      borderBottom: "1px solid var(--gpt-border, rgba(255,255,255,0.06))",
                      marginBottom: 4,
                    }}>
                      <button
                        type="button"
                        onClick={() => toggleChapter(ch.number)}
                        style={{
                          ...btnBase,
                          width: "100%",
                          padding: "12px 4px",
                          background: "transparent",
                          color: "var(--text)",
                          fontSize: 13,
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          textAlign: "left",
                          border: "none",
                        }}
                      >
                        <span>
                          <span style={goldStyle}>第{ch.number}章</span>
                          <span style={{ marginLeft: 8 }}>{ch.title}</span>
                        </span>
                        <span style={{ ...subStyle, fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                          {expandedChapters.has(ch.number) ? "▲" : "▼"}
                        </span>
                      </button>
                      {expandedChapters.has(ch.number) && (
                        <div style={{
                          padding: "0 4px 14px",
                          fontSize: 13.5, lineHeight: 1.8,
                        }}>
                          {ch.source && (
                            <span style={{
                              fontSize: 10, padding: "2px 8px", borderRadius: 4,
                              background: "rgba(212, 175, 55, 0.1)",
                              border: "1px solid rgba(212, 175, 55, 0.2)",
                              ...goldStyle, display: "inline-block", marginBottom: 10,
                            }}>
                              {ch.source}
                            </span>
                          )}
                          <div style={{ whiteSpace: "pre-wrap" }}>{ch.content}</div>
                          {/* 章末の質問導線 */}
                          <button
                            type="button"
                            onClick={() => {
                              sendChatMessage(`第${ch.number}章「${ch.title}」について詳しく教えてください`);
                              // スクロールをチャット欄へ
                              setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
                            }}
                            disabled={chatLoading}
                            style={{
                              ...chipBase,
                              marginTop: 12,
                              fontSize: 12,
                              opacity: chatLoading ? 0.5 : 1,
                            }}
                          >
                            この章について聞く
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 文字数 */}
                  <div style={{ fontSize: 10, ...subStyle, textAlign: "right", marginTop: 8 }}>
                    {result.report.charCount.toLocaleString()} 文字
                  </div>
                </div>
              )}
            </div>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div style={{ fontSize: 11, ...subStyle, padding: "0 4px" }}>
                {result.warnings.map((w, i) => (
                  <p key={i} style={{ margin: "3px 0", lineHeight: 1.5 }}>{w}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
