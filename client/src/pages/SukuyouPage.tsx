/**
 * ============================================================
 *  SUKUYOU PAGE — 宿曜鑑定専用ページ (web/ 版)
 *  UX v2: 初期表示簡素化 + 折りたたみ + 鑑定直下チャット
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
  "仕事への活かし方を教えて",
  "人間関係の注意点を詳しく",
  "お金の流れを読み解いて",
  "反転軸を明日からどう使う？",
  "言霊の意味をやさしく教えて",
  "今の一手だけ教えて",
];

/* ── 用語ツールチップ定義 ── */
const GLOSSARY: Record<string, string> = {
  "反転軸": "今の自分の偏りを反対方向へ切り替えるための軸のこと。外へ出しすぎている力を内へ向けることなどを指します",
  "躰用": "今の自分のエネルギーが、守りの時期（躰）か攻めの時期（用）かを示す指標",
  "水火属性": "水（受容・内向）と火（発動・外向）の性質のバランスを表す概念",
  "潜象": "目には見えないエネルギーの世界のこと。カタカムナでは現象の背後にある力の源として語られます",
};

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
  const [showChapters, setShowChapters] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());

  // Inline chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatThreadId = useRef<string>(`sukuyou-${Date.now()}`);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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
          const seedRes = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              message: rawSeed,
              sessionId: chatThreadId.current,
              threadId: chatThreadId.current,
            }),
          });
          // seedの応答は表示しない（文脈確立のみ）
          await seedRes.json().catch(() => {});
        } catch {
          // seed送信失敗は無視
        }
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
      const textarea = document.createElement("textarea");
      textarea.value = result.report.fullText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
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
    if (onSendToChat) {
      onSendToChat(displayText, rawSeed, deepPrompt);
    }
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
      const assistantMsg: ChatMessage = {
        role: "assistant",
        text: data.response || "応答を取得できませんでした",
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", text: "通信エラーが発生しました。もう一度お試しください。" }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, result]);

  const toggleChapter = (num: number) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  /* ── 御神託テキスト取得 ── */
  const getOracleShort = () => {
    if (!result?.oracle) return "";
    if (typeof result.oracle === "string") return result.oracle;
    return result.oracle.shortOracle || "";
  };
  const getOneAction = () => {
    if (!result?.oracle || typeof result.oracle === "string") return "";
    return result.oracle.oneActionNow || "";
  };

  /* ── スタイル定数 ── */
  const cardStyle: React.CSSProperties = {
    background: "var(--gpt-hover-bg, rgba(255,255,255,0.04))",
    border: "1px solid rgba(212, 175, 55, 0.2)",
    borderRadius: 12,
    padding: "1.25rem",
    marginBottom: "1rem",
  };
  const goldText: React.CSSProperties = { color: "#d4af37" };
  const subText: React.CSSProperties = { color: "var(--text-sub, #888)" };
  const chipStyle: React.CSSProperties = {
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 12,
    background: "rgba(212, 175, 55, 0.08)",
    border: "1px solid rgba(212, 175, 55, 0.25)",
    color: "#d4af37",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div className="sukuyou-page" style={{ height: "100%", overflowY: "auto", color: "var(--text)", padding: "0 0 2rem" }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "var(--bg)", borderBottom: "1px solid rgba(212, 175, 55, 0.2)",
        padding: "0.75rem 1rem",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: "none", border: "none", color: "#d4af37", cursor: "pointer",
              fontSize: 18, padding: "4px 8px", borderRadius: 4,
            }}
            aria-label="戻る"
          >
            ← 戻る
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, ...goldText, margin: 0 }}>
              宿曜鑑定
            </h1>
            <p style={{ fontSize: 11, ...subText, margin: 0 }}>
              天聞アーク御神託パイプライン
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1rem" }}>
        {/* ── 入力フォーム ── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 15, fontWeight: 600, ...goldText, marginBottom: 16 }}>
            基本情報
          </h2>

          {/* Birth Date */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, ...subText, display: "block", marginBottom: 6 }}>
              生年月日（必須）
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="number" placeholder="1990" value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                min={1900} max={2025}
                style={{
                  width: 80, padding: "8px 10px", borderRadius: 6,
                  background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                  border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                  color: "var(--text)", fontSize: 14,
                }}
              />
              <span style={subText}>年</span>
              <input
                type="number" placeholder="1" value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                min={1} max={12}
                style={{
                  width: 56, padding: "8px 10px", borderRadius: 6,
                  background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                  border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                  color: "var(--text)", fontSize: 14,
                }}
              />
              <span style={subText}>月</span>
              <input
                type="number" placeholder="1" value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                min={1} max={31}
                style={{
                  width: 56, padding: "8px 10px", borderRadius: 6,
                  background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                  border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                  color: "var(--text)", fontSize: 14,
                }}
              />
              <span style={subText}>日</span>
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, ...subText, display: "block", marginBottom: 6 }}>
              名前（任意）
            </label>
            <input
              type="text" placeholder="お名前（任意）" value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 6,
                background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                color: "var(--text)", fontSize: 14, boxSizing: "border-box",
              }}
            />
          </div>

          {/* Concern */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, ...subText, display: "block", marginBottom: 6 }}>
              現在の悩み・相談内容（任意）
            </label>
            <textarea
              placeholder="最近、仕事の方向性に迷いがあります…"
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              rows={3}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 6,
                background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                color: "var(--text)", fontSize: 14, resize: "vertical",
                boxSizing: "border-box", fontFamily: "inherit",
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="button" onClick={handleSubmit} disabled={loading}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 8,
              background: loading ? "#7a6a20" : "#d4af37",
              color: "#1a1a1a", fontWeight: 700, fontSize: 15,
              border: "none", cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "鑑定中…" : "鑑定する"}
          </button>

          {error && (
            <div style={{
              marginTop: 12, padding: 12, borderRadius: 8,
              background: "rgba(220, 38, 38, 0.1)",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              color: "#f87171", fontSize: 13,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
            鑑定結果 — UX v2: 初期表示は要約カードのみ
           ════════════════════════════════════════════════════════ */}
        {result && (
          <div>
            {/* ── 第一層: 要約カード ── */}
            <div style={{
              ...cardStyle,
              border: "1px solid rgba(212, 175, 55, 0.4)",
              background: "linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.02) 100%)",
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, ...goldText, marginBottom: 16, textAlign: "center" }}>
                鑑定結果
              </h2>

              {/* 本命宿 大きく表示 */}
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 28, fontWeight: 800, ...goldText }}>{result.honmeiShuku}</div>
                <div style={{ fontSize: 12, ...subText, marginTop: 4 }}>本命宿</div>
              </div>

              {/* 災い分類 + 反転軸 */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16,
              }}>
                <div style={{
                  padding: "10px 12px", borderRadius: 8,
                  background: "rgba(212, 175, 55, 0.06)",
                  border: "1px solid rgba(212, 175, 55, 0.15)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 11, ...subText, marginBottom: 4 }}>災い分類</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{result.disasterType}</div>
                </div>
                <div style={{
                  padding: "10px 12px", borderRadius: 8,
                  background: "rgba(212, 175, 55, 0.06)",
                  border: "1px solid rgba(212, 175, 55, 0.15)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 11, ...subText, marginBottom: 4 }}>反転軸</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{result.reversalAxis}</div>
                </div>
              </div>

              {/* 御神託 */}
              {getOracleShort() && (
                <div style={{
                  padding: "14px 16px", borderRadius: 10,
                  background: "rgba(212, 175, 55, 0.08)",
                  border: "1px solid rgba(212, 175, 55, 0.2)",
                  marginBottom: 12, textAlign: "center",
                }}>
                  <div style={{ fontSize: 11, ...goldText, fontWeight: 600, marginBottom: 6 }}>御神託</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7 }}>{getOracleShort()}</div>
                </div>
              )}

              {/* 今すぐの一手 */}
              {getOneAction() && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10,
                  background: "rgba(212, 175, 55, 0.04)",
                  border: "1px dashed rgba(212, 175, 55, 0.25)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 11, ...goldText, fontWeight: 600, marginBottom: 4 }}>今すぐの一手</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>{getOneAction()}</div>
                </div>
              )}
            </div>

            {/* ── 詳しく読む（折りたたみ） ── */}
            <div style={cardStyle}>
              <button
                type="button"
                onClick={() => setShowChapters(!showChapters)}
                style={{
                  width: "100%", padding: "10px 0",
                  background: "transparent", border: "none",
                  color: "#d4af37", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", display: "flex", justifyContent: "center",
                  alignItems: "center", gap: 8,
                }}
              >
                {showChapters ? "詳細レポートを閉じる ▲" : "詳しく読む ▼"}
              </button>

              {showChapters && (
                <div style={{ marginTop: 16 }}>
                  {/* コピー・チャットへ送るボタン */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 16, justifyContent: "flex-end" }}>
                    <button
                      type="button" onClick={handleCopy}
                      style={{
                        padding: "6px 12px", borderRadius: 6, fontSize: 12,
                        background: "transparent",
                        border: "1px solid rgba(212, 175, 55, 0.3)",
                        ...goldText, cursor: "pointer",
                      }}
                    >
                      {copyMsg || "コピー"}
                    </button>
                    {onSendToChat && (
                      <button
                        type="button" onClick={handleSendToChat}
                        style={{
                          padding: "6px 12px", borderRadius: 6, fontSize: 12,
                          background: "transparent",
                          border: "1px solid rgba(212, 175, 55, 0.3)",
                          ...goldText, cursor: "pointer",
                        }}
                      >
                        チャットへ送る
                      </button>
                    )}
                  </div>

                  {/* 章別表示（アコーディオン） */}
                  {result.report.chapters.map((ch) => (
                    <div key={ch.number} style={{
                      borderBottom: "1px solid var(--gpt-border, rgba(255,255,255,0.08))",
                      marginBottom: 8,
                    }}>
                      <button
                        type="button"
                        onClick={() => toggleChapter(ch.number)}
                        style={{
                          width: "100%", padding: "10px 0",
                          background: "transparent", border: "none",
                          color: "var(--text)", fontSize: 13, fontWeight: 600,
                          cursor: "pointer", display: "flex",
                          justifyContent: "space-between", alignItems: "center",
                          textAlign: "left",
                        }}
                      >
                        <span>
                          <span style={goldText}>第{ch.number}章</span>
                          <span style={{ marginLeft: 8 }}>{ch.title}</span>
                        </span>
                        <span style={{ ...subText, fontSize: 12 }}>
                          {expandedChapters.has(ch.number) ? "▲" : "▼"}
                        </span>
                      </button>
                      {expandedChapters.has(ch.number) && (
                        <div style={{ padding: "0 0 12px", fontSize: 13, lineHeight: 1.7 }}>
                          {ch.source && (
                            <span style={{
                              fontSize: 10, padding: "1px 6px", borderRadius: 4,
                              background: "rgba(212, 175, 55, 0.12)",
                              border: "1px solid rgba(212, 175, 55, 0.25)",
                              ...goldText, display: "inline-block", marginBottom: 8,
                            }}>
                              {ch.source}
                            </span>
                          )}
                          <div style={{ whiteSpace: "pre-wrap" }}>{ch.content}</div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 文字数 */}
                  <div style={{ fontSize: 11, ...subText, textAlign: "right", marginTop: 8 }}>
                    {result.report.charCount.toLocaleString()} 文字
                  </div>
                </div>
              )}
            </div>

            {/* ── 鑑定直下チャット ── */}
            <div style={{
              ...cardStyle,
              border: "1px solid rgba(212, 175, 55, 0.3)",
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, ...goldText, marginBottom: 12 }}>
                この鑑定についてもっと聞く
              </h3>

              {/* 質問チップ */}
              {chatMessages.length === 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {QUESTION_CHIPS.map((chip) => (
                    <button
                      key={chip} type="button"
                      onClick={() => sendChatMessage(chip)}
                      disabled={chatLoading}
                      style={{
                        ...chipStyle,
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
                  maxHeight: 400, overflowY: "auto",
                  marginBottom: 12, padding: "8px 0",
                }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{
                      display: "flex",
                      justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                      marginBottom: 8,
                    }}>
                      <div style={{
                        maxWidth: "85%", padding: "10px 14px", borderRadius: 12,
                        fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap",
                        background: msg.role === "user"
                          ? "rgba(212, 175, 55, 0.15)"
                          : "var(--gpt-hover-bg, rgba(255,255,255,0.06))",
                        border: msg.role === "user"
                          ? "1px solid rgba(212, 175, 55, 0.3)"
                          : "1px solid var(--gpt-border, rgba(255,255,255,0.1))",
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
                      <div style={{
                        padding: "10px 14px", borderRadius: 12, fontSize: 13,
                        background: "var(--gpt-hover-bg, rgba(255,255,255,0.06))",
                        border: "1px solid var(--gpt-border, rgba(255,255,255,0.1))",
                        ...subText,
                      }}>
                        考え中…
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* チャット入力欄 */}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
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
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 8,
                    background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                    border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                    color: "var(--text)", fontSize: 13, boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => sendChatMessage(chatInput)}
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    padding: "10px 16px", borderRadius: 8,
                    background: chatInput.trim() ? "#d4af37" : "rgba(212, 175, 55, 0.3)",
                    color: "#1a1a1a", fontWeight: 600, fontSize: 13,
                    border: "none", cursor: chatInput.trim() ? "pointer" : "default",
                  }}
                >
                  送信
                </button>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div style={{ fontSize: 11, ...subText }}>
                {result.warnings.map((w, i) => (
                  <p key={i} style={{ margin: "2px 0" }}>{w}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
