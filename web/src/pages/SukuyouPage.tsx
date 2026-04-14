/**
 * ============================================================
 *  SUKUYOU PAGE — 宿曜鑑定専用ページ (web/ 版)
 * ============================================================
 *
 * 入力フォーム → guidance API → レポート表示 → コピー → チャットへ送る
 *
 * web/ は shadcn/sonner/lucide を持たないため、
 * 純粋な React + Tailwind CSS のみで構築。
 * ============================================================
 */
import React, { useState, useCallback } from "react";

interface GuidanceResult {
  success: boolean;
  honmeiShuku: string;
  disasterType: string;
  reversalAxis: string;
  oracle: string;
  report: {
    chapters: Array<{ title: string; body: string }>;
    fullText: string;
    charCount: number;
  };
  premise: {
    birthDate: string;
    name: string | null;
    nakshatra: string;
    nakshatraJp: string;
    confidence: number;
  };
  warnings: string[];
}

interface SukuyouPageProps {
  onBack: () => void;
  onSendToChat?: (seed: string) => void;
}

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
    const seed = `[SUKUYOU_SEED] ${result.premise?.birthDate || ""} / ${result.honmeiShuku || ""} / ${result.disasterType || ""}`;
    if (onSendToChat) {
      onSendToChat(seed);
    }
  }, [result, onSendToChat]);

  return (
    <div className="sukuyou-page" style={{ minHeight: "100%", color: "var(--text)", padding: "0 0 2rem" }}>
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
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#d4af37", margin: 0 }}>
              ✦ 宿曜鑑定
            </h1>
            <p style={{ fontSize: 11, color: "var(--text-sub, #888)", margin: 0 }}>
              天聞アーク御神託パイプライン
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1rem" }}>
        {/* Input Form */}
        <div style={{
          background: "var(--gpt-hover-bg, rgba(255,255,255,0.04))",
          border: "1px solid rgba(212, 175, 55, 0.2)",
          borderRadius: 12, padding: "1.25rem", marginBottom: "1.5rem",
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#d4af37", marginBottom: 16 }}>
            基本情報
          </h2>

          {/* Birth Date */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "var(--text-sub, #aaa)", display: "block", marginBottom: 6 }}>
              生年月日（必須）
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="number"
                placeholder="1979"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                min={1900} max={2025}
                style={{
                  width: 80, padding: "8px 10px", borderRadius: 6,
                  background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                  border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                  color: "var(--text)", fontSize: 14,
                }}
              />
              <span style={{ color: "var(--text-sub, #888)" }}>年</span>
              <input
                type="number"
                placeholder="9"
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                min={1} max={12}
                style={{
                  width: 56, padding: "8px 10px", borderRadius: 6,
                  background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                  border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                  color: "var(--text)", fontSize: 14,
                }}
              />
              <span style={{ color: "var(--text-sub, #888)" }}>月</span>
              <input
                type="number"
                placeholder="20"
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                min={1} max={31}
                style={{
                  width: 56, padding: "8px 10px", borderRadius: 6,
                  background: "var(--gpt-input-bg, rgba(255,255,255,0.06))",
                  border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                  color: "var(--text)", fontSize: 14,
                }}
              />
              <span style={{ color: "var(--text-sub, #888)" }}>日</span>
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "var(--text-sub, #aaa)", display: "block", marginBottom: 6 }}>
              名前（任意）
            </label>
            <input
              type="text"
              placeholder="横山航介"
              value={name}
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
            <label style={{ fontSize: 13, color: "var(--text-sub, #aaa)", display: "block", marginBottom: 6 }}>
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
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 8,
              background: loading ? "#7a6a20" : "#d4af37",
              color: "#1a1a1a", fontWeight: 700, fontSize: 15,
              border: "none", cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "鑑定中…" : "御神託を受ける"}
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

        {/* Result */}
        {result && (
          <div>
            {/* Summary Card */}
            <div style={{
              background: "var(--gpt-hover-bg, rgba(255,255,255,0.04))",
              border: "1px solid rgba(212, 175, 55, 0.3)",
              borderRadius: 12, padding: "1.25rem", marginBottom: "1rem",
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "#d4af37", marginBottom: 12 }}>
                ✦ 鑑定結果
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                <div>
                  <span style={{ color: "var(--text-sub, #888)" }}>本命宿:</span>
                  <span style={{ marginLeft: 8, color: "#d4af37", fontWeight: 700 }}>{result.honmeiShuku}</span>
                </div>
                {result.premise?.name && (
                  <div>
                    <span style={{ color: "var(--text-sub, #888)" }}>名前:</span>
                    <span style={{ marginLeft: 8 }}>{result.premise.name}</span>
                  </div>
                )}
                <div>
                  <span style={{ color: "var(--text-sub, #888)" }}>災い分類:</span>
                  <span style={{ marginLeft: 8 }}>{result.disasterType}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-sub, #888)" }}>反転軸:</span>
                  <span style={{ marginLeft: 8 }}>{result.reversalAxis}</span>
                </div>
              </div>
              {result.oracle && (
                <div style={{
                  marginTop: 12, padding: 12, borderRadius: 8,
                  background: "rgba(212, 175, 55, 0.08)",
                  border: "1px solid rgba(212, 175, 55, 0.2)",
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#d4af37", margin: "0 0 4px" }}>御神託</p>
                  <p style={{ fontSize: 13, margin: 0 }}>{result.oracle}</p>
                </div>
              )}
            </div>

            {/* Full Report */}
            <div style={{
              background: "var(--gpt-hover-bg, rgba(255,255,255,0.04))",
              border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
              borderRadius: 12, padding: "1.25rem", marginBottom: "1rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "#d4af37", margin: 0 }}>
                  御神託レポート全文
                </h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{
                      padding: "6px 12px", borderRadius: 6, fontSize: 12,
                      background: "transparent",
                      border: "1px solid rgba(212, 175, 55, 0.3)",
                      color: "#d4af37", cursor: "pointer",
                    }}
                  >
                    {copyMsg || "📋 コピー"}
                  </button>
                  {onSendToChat && (
                    <button
                      type="button"
                      onClick={handleSendToChat}
                      style={{
                        padding: "6px 12px", borderRadius: 6, fontSize: 12,
                        background: "transparent",
                        border: "1px solid rgba(212, 175, 55, 0.3)",
                        color: "#d4af37", cursor: "pointer",
                      }}
                    >
                      💬 チャットへ送る
                    </button>
                  )}
                </div>
              </div>
              <pre style={{
                whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7,
                fontFamily: "inherit", margin: 0, padding: 0,
                background: "transparent", color: "var(--text)",
              }}>
                {result.report.fullText}
              </pre>
              <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-sub, #888)", textAlign: "right" }}>
                {result.report.charCount.toLocaleString()} 文字
              </div>
            </div>

            {/* Chapters */}
            {result.report.chapters && result.report.chapters.length > 0 && (
              <div style={{
                background: "var(--gpt-hover-bg, rgba(255,255,255,0.04))",
                border: "1px solid var(--gpt-border, rgba(255,255,255,0.12))",
                borderRadius: 12, padding: "1.25rem", marginBottom: "1rem",
              }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "#d4af37", marginBottom: 12 }}>
                  章別表示
                </h2>
                {result.report.chapters.map((ch, i) => (
                  <div key={i} style={{
                    borderBottom: i < result.report.chapters.length - 1 ? "1px solid var(--gpt-border, rgba(255,255,255,0.08))" : "none",
                    paddingBottom: 12, marginBottom: 12,
                  }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "#d4af37", marginBottom: 4 }}>{ch.title}</h3>
                    <p style={{ fontSize: 13, whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.6 }}>{ch.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div style={{ fontSize: 11, color: "var(--text-sub, #888)" }}>
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
