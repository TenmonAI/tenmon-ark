/**
 * ============================================================
 *  FEEDBACK PAGE — Founder会員フィードバック循環システム
 *  TENMON_ARK_FEEDBACK_PAGE_UX_FIX_V1
 *  + TENMON_MANUS_FINAL_ADJUSTMENT_DIRECTIVE_V4 磨き込み
 *  ライトテーマ対応 + 送信完了感 + 導線最適化
 * ============================================================
 */
import React, { useState, useCallback, useEffect, useRef } from "react";

/* ── カテゴリ定義 ── */
const CATEGORIES = [
  { value: "宿曜鑑定", label: "宿曜鑑定", icon: "☽" },
  { value: "チャット機能", label: "チャット機能", icon: "💬" },
  { value: "ダッシュボード", label: "ダッシュボード", icon: "📊" },
  { value: "UI/デザイン", label: "UI / デザイン", icon: "🎨" },
  { value: "表示・動作の不具合", label: "表示・動作の不具合", icon: "⚠" },
  { value: "新機能の要望", label: "新機能の要望", icon: "✦" },
  { value: "文章・口調", label: "文章・口調", icon: "筆" },
  { value: "スマホ使用感", label: "スマホ使用感", icon: "📱" },
  { value: "保存・共有", label: "保存・共有", icon: "🔗" },
  { value: "その他", label: "その他", icon: "…" },
] as const;

const PRIORITIES = [
  { value: "高", label: "高（すぐに対応してほしい）", color: "#dc2626" },
  { value: "中", label: "中（次の更新で対応してほしい）", color: "#d97706" },
  { value: "低", label: "低（余裕があるときに）", color: "#16a34a" },
] as const;

type SendState = "idle" | "sending" | "success" | "fallback" | "error";

interface HistoryItem {
  receiptNumber: string;
  title: string;
  category: string;
  priority: string;
  createdAt: string;
  notionSaved: boolean;
}

interface FeedbackPageProps {
  onBack?: () => void;
}

/* ── ライトテーマカラー ── */
const C = {
  bg: "#fafaf7",
  card: "#ffffff",
  text: "#1f2937",
  textSub: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  arkGold: "#c9a14a",
  arkGoldBg: "rgba(201,161,74,0.08)",
  arkGoldBorder: "rgba(201,161,74,0.3)",
  inputBg: "#ffffff",
  inputBorder: "#d1d5db",
  inputFocus: "#c9a14a",
  successBg: "#f0fdf4",
  successBorder: "#86efac",
  successText: "#166534",
  warningBg: "#fffbeb",
  warningBorder: "#fcd34d",
  warningText: "#92400e",
  errorBg: "#fef2f2",
  errorBorder: "#fca5a5",
  errorText: "#991b1b",
} as const;

export default function FeedbackPage({ onBack }: FeedbackPageProps) {
  /* ── フォーム状態 ── */
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [priority, setPriority] = useState("中");
  const [reproSteps, setReproSteps] = useState("");
  const [pageUrl, setPageUrl] = useState("");

  /* ── 送信状態（3段階表示対応） ── */
  const [sendState, setSendState] = useState<SendState>("idle");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [notionSaved, setNotionSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ── 履歴 ── */
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  /* ── デバイス情報 ── */
  const deviceRef = useRef(
    typeof navigator !== "undefined"
      ? `${navigator.userAgent.slice(0, 80)} | ${window.innerWidth}x${window.innerHeight}`
      : "unknown"
  );

  /* ── スクロールコンテナ参照 ── */
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ── 履歴取得 ── */
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/feedback/history");
      const data = await res.json();
      if (data.ok) setHistory(data.items || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  /* ── 送信 ── */
  const handleSubmit = useCallback(async () => {
    setErrorMsg(null);
    if (!category) { setErrorMsg("カテゴリを選択してください"); return; }
    if (!title.trim()) { setErrorMsg("タイトルを入力してください"); return; }
    if (!detail.trim()) { setErrorMsg("詳細内容を入力してください"); return; }

    setSendState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          detail: detail.trim(),
          priority,
          reproSteps: reproSteps.trim() || undefined,
          pageUrl: pageUrl.trim() || undefined,
          device: deviceRef.current,
          isFounder: true,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setReceipt(data.receiptNumber);
        setNotionSaved(!!data.notionSaved);
        setSendState(data.notionSaved ? "success" : "fallback");
        setTitle("");
        setDetail("");
        setCategory("");
        setPriority("中");
        setReproSteps("");
        setPageUrl("");
        fetchHistory();
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErrorMsg(data.error || "送信に失敗しました。もう一度お試しください。");
        setSendState("error");
      }
    } catch (e: any) {
      setErrorMsg("通信エラーが発生しました。接続をご確認のうえ、もう一度お試しください。");
      setSendState("error");
    }
  }, [category, title, detail, priority, reproSteps, pageUrl, fetchHistory]);

  /* ── 新しい要望を送る（フォームリセット） ── */
  const handleReset = () => {
    setSendState("idle");
    setReceipt(null);
    setNotionSaved(false);
    setErrorMsg(null);
  };

  const canSubmit = !!category && !!title.trim() && !!detail.trim() && sendState !== "sending";

  /* ── 共通スタイル ── */
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 8,
    color: C.text,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: C.inputBg,
    border: `1px solid ${C.inputBorder}`,
    borderRadius: 8,
    padding: "12px 14px",
    color: C.text,
    fontSize: 15,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const requiredBadge = (
    <span style={{
      color: C.arkGold,
      marginLeft: 6,
      fontSize: 11,
      fontWeight: 500,
      background: C.arkGoldBg,
      padding: "2px 8px",
      borderRadius: 4,
    }}>
      必須
    </span>
  );

  const optionalBadge = (
    <span style={{
      color: C.textMuted,
      marginLeft: 6,
      fontSize: 11,
      fontWeight: 400,
    }}>
      任意
    </span>
  );

  return (
    <div
      ref={scrollRef}
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        background: C.bg,
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "28px 20px 60px",
          fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
          color: C.text,
        }}
      >
        {/* ── ヘッダー ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          {onBack && (
            <button
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                color: C.textSub,
                borderRadius: 8,
                padding: "7px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
              onClick={onBack}
            >
              ← 戻る
            </button>
          )}
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 1,
            color: C.text,
            margin: 0,
          }}>
            改善のご要望
          </h1>
        </div>

        <p style={{
          fontSize: 14,
          color: C.textSub,
          marginBottom: 28,
          lineHeight: 1.8,
        }}>
          使いづらかったところ、こうなったらもっと良いということ、不具合や欲しい機能などを自由にお寄せください。
          お寄せいただいた声は、開発チームが一つひとつ確認し、TENMON-ARKの改善に反映してまいります。
        </p>

        {/* ── 送信完了: 成功 ── */}
        {sendState === "success" && receipt && (
          <div style={{
            background: C.successBg,
            border: `1px solid ${C.successBorder}`,
            borderRadius: 12,
            padding: "32px 24px",
            textAlign: "center",
            marginBottom: 28,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "#dcfce7", display: "inline-flex",
              alignItems: "center", justifyContent: "center",
              marginBottom: 12, fontSize: 24,
            }}>
              ✓
            </div>
            <div style={{ fontSize: 16, color: C.successText, marginBottom: 6, fontWeight: 600 }}>
              ありがとうございます。改善要望を受け付けました。
            </div>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#15803d",
              letterSpacing: 2,
              margin: "12px 0",
              fontFamily: "monospace",
            }}>
              {receipt}
            </div>
            <div style={{ fontSize: 13, color: "#4ade80", marginTop: 8, lineHeight: 1.6 }}>
              改善要望として保存されました。
              <br />
              この受付番号は、対応状況の確認にお使いいただけます。
            </div>
            <button
              style={{
                marginTop: 20,
                background: C.card,
                border: `1px solid ${C.border}`,
                color: C.text,
                borderRadius: 8,
                padding: "10px 24px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
              onClick={handleReset}
            >
              新しい要望を送る
            </button>
          </div>
        )}

        {/* ── 送信完了: フォールバック ── */}
        {sendState === "fallback" && receipt && (
          <div style={{
            background: C.warningBg,
            border: `1px solid ${C.warningBorder}`,
            borderRadius: 12,
            padding: "32px 24px",
            textAlign: "center",
            marginBottom: 28,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "#fef3c7", display: "inline-flex",
              alignItems: "center", justifyContent: "center",
              marginBottom: 12, fontSize: 24,
            }}>
              ✓
            </div>
            <div style={{ fontSize: 16, color: C.warningText, marginBottom: 6, fontWeight: 600 }}>
              改善要望は受け取りました。
            </div>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#b45309",
              letterSpacing: 2,
              margin: "12px 0",
              fontFamily: "monospace",
            }}>
              {receipt}
            </div>
            <div style={{ fontSize: 13, color: "#92400e", marginTop: 8, lineHeight: 1.6 }}>
              現在保存処理を再試行しています。内容は失われていません。
              <br />
              後ほど自動的に同期されますので、ご安心ください。
            </div>
            <button
              style={{
                marginTop: 20,
                background: C.card,
                border: `1px solid ${C.border}`,
                color: C.text,
                borderRadius: 8,
                padding: "10px 24px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
              onClick={handleReset}
            >
              新しい要望を送る
            </button>
          </div>
        )}

        {/* ── エラー表示 ── */}
        {errorMsg && (
          <div style={{
            background: C.errorBg,
            border: `1px solid ${C.errorBorder}`,
            borderRadius: 10,
            padding: "12px 16px",
            color: C.errorText,
            fontSize: 14,
            marginBottom: 20,
            lineHeight: 1.6,
          }}>
            {errorMsg}
          </div>
        )}

        {/* ── 送信中 ── */}
        {sendState === "sending" && (
          <div style={{
            background: C.arkGoldBg,
            border: `1px solid ${C.arkGoldBorder}`,
            borderRadius: 12,
            padding: "32px 20px",
            textAlign: "center",
            marginBottom: 28,
          }}>
            <div style={{
              display: "inline-block",
              width: 28,
              height: 28,
              border: `3px solid ${C.border}`,
              borderTopColor: C.arkGold,
              borderRadius: "50%",
              animation: "feedback-spin 0.8s linear infinite",
            }} />
            <div style={{ fontSize: 14, color: C.text, marginTop: 12 }}>
              送信しています...
            </div>
            <style>{`@keyframes feedback-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── フォーム（送信完了時は非表示） ── */}
        {sendState !== "success" && sendState !== "fallback" && (
          <>
            {/* カテゴリ */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>
                カテゴリ
                {requiredBadge}
              </label>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
              }}>
                {CATEGORIES.map((c) => {
                  const selected = category === c.value;
                  return (
                    <button
                      key={c.value}
                      style={{
                        background: selected ? C.arkGoldBg : C.card,
                        border: selected
                          ? `2px solid ${C.arkGold}`
                          : `1px solid ${C.border}`,
                        borderRadius: 10,
                        padding: "12px 8px",
                        cursor: "pointer",
                        color: selected ? C.arkGold : C.textSub,
                        fontSize: 13,
                        fontWeight: selected ? 600 : 400,
                        textAlign: "center",
                        transition: "all 0.2s",
                        fontFamily: "inherit",
                      }}
                      onClick={() => setCategory(c.value)}
                    >
                      <span style={{ fontSize: 18, display: "block", marginBottom: 4 }}>
                        {c.icon}
                      </span>
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* タイトル */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>
                タイトル
                {requiredBadge}
              </label>
              <input
                style={inputStyle}
                type="text"
                placeholder="例: 宿曜鑑定の結果が途中で切れる"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* 詳細内容 */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>
                詳細内容
                {requiredBadge}
              </label>
              <textarea
                style={{
                  ...inputStyle,
                  resize: "vertical" as const,
                  minHeight: 120,
                  lineHeight: 1.7,
                }}
                placeholder="どのような状況で、何が起きたか（または何がほしいか）をできるだけ具体的にお書きください"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                maxLength={2000}
              />
              <div style={{ fontSize: 12, color: C.textMuted, textAlign: "right", marginTop: 4 }}>
                {detail.length} / 2000
              </div>
            </div>

            {/* 優先度 */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>
                優先度
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {PRIORITIES.map((p) => {
                  const selected = priority === p.value;
                  return (
                    <button
                      key={p.value}
                      style={{
                        background: selected ? `${p.color}12` : C.card,
                        border: selected
                          ? `2px solid ${p.color}`
                          : `1px solid ${C.border}`,
                        borderRadius: 8,
                        padding: "10px 18px",
                        cursor: "pointer",
                        color: selected ? p.color : C.textSub,
                        fontSize: 13,
                        fontWeight: selected ? 600 : 400,
                        transition: "all 0.2s",
                        fontFamily: "inherit",
                      }}
                      onClick={() => setPriority(p.value)}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 再現手順（任意） */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>
                再現手順
                {optionalBadge}
              </label>
              <textarea
                style={{
                  ...inputStyle,
                  resize: "vertical" as const,
                  minHeight: 70,
                  lineHeight: 1.7,
                }}
                placeholder="不具合の場合、再現する手順を教えてください"
                value={reproSteps}
                onChange={(e) => setReproSteps(e.target.value)}
                maxLength={2000}
              />
            </div>

            {/* ページURL（任意） */}
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>
                該当ページURL
                {optionalBadge}
              </label>
              <input
                style={inputStyle}
                type="url"
                placeholder="https://..."
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
              />
            </div>

            {/* 送信ボタン */}
            <button
              style={{
                width: "100%",
                background: canSubmit
                  ? `linear-gradient(135deg, ${C.arkGold}, #b8912f)`
                  : C.borderLight,
                border: "none",
                borderRadius: 12,
                padding: "16px 0",
                color: canSubmit ? "#ffffff" : C.textMuted,
                fontSize: 16,
                fontWeight: 700,
                cursor: canSubmit ? "pointer" : "not-allowed",
                letterSpacing: 3,
                transition: "all 0.2s",
                fontFamily: "inherit",
                boxShadow: canSubmit ? "0 2px 8px rgba(201,161,74,0.3)" : "none",
              }}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {sendState === "sending" ? "送信中..." : "要望を送信する"}
            </button>
          </>
        )}

        {/* ── 送信履歴 ── */}
        <hr style={{
          border: "none",
          borderTop: `1px solid ${C.border}`,
          margin: "32px 0 16px",
        }} />

        <button
          style={{
            background: "none",
            border: "none",
            color: C.textSub,
            cursor: "pointer",
            fontSize: 14,
            padding: "8px 0",
            fontFamily: "inherit",
            fontWeight: 500,
          }}
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? "▾ 送信履歴を閉じる" : `▸ 送信履歴を見る（${history.length}件）`}
        </button>

        {showHistory && history.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {history.map((item, i) => (
              <div
                key={i}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 10,
                  fontSize: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, color: C.text }}>{item.title}</span>
                  <span style={{
                    fontFamily: "monospace",
                    color: C.arkGold,
                    fontSize: 12,
                  }}>
                    {item.receiptNumber}
                  </span>
                </div>
                <div style={{ marginTop: 6, color: C.textSub, fontSize: 13 }}>
                  {item.category} / 優先度: {item.priority} / {new Date(item.createdAt).toLocaleDateString("ja-JP")}
                  {item.notionSaved
                    ? <span style={{ color: "#16a34a", marginLeft: 8 }}>保存済み</span>
                    : <span style={{ color: "#d97706", marginLeft: 8 }}>ローカル保存</span>
                  }
                </div>
              </div>
            ))}
          </div>
        )}

        {showHistory && history.length === 0 && (
          <div style={{ marginTop: 12, fontSize: 14, color: C.textMuted }}>
            まだ送信履歴はありません
          </div>
        )}
      </div>
    </div>
  );
}
