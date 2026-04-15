/**
 * ============================================================
 *  FEEDBACK PAGE — Founder会員フィードバック循環システム
 *  TENMON_ARK_POST_DEPLOY_UX_AND_RECOVERY_FIX_V1
 *  FIX-B: ライトテーマ可読性改善
 * ============================================================
 */
import React, { useState, useCallback, useEffect, useRef } from "react";

/* ── ライトテーマ対応カラーパレット ── */
const C = {
  textPrimary: "var(--text, #111827)",
  textSecondary: "var(--muted, rgba(17,24,39,0.65))",
  textMuted: "rgba(17,24,39,0.45)",
  accent: "var(--ark-gold, #c9a14a)",
  accentBg: "rgba(201,161,74,0.08)",
  accentBorder: "rgba(201,161,74,0.35)",
  bg: "var(--bg, #fafaf7)",
  inputBg: "var(--input-bg, #ffffff)",
  inputBorder: "var(--input-border, rgba(0,0,0,0.12))",
  border: "var(--border, rgba(0,0,0,0.08))",
  hoverBg: "var(--hover, rgba(0,0,0,0.04))",
  successGreen: "#16a34a",
  successBg: "rgba(22,163,74,0.08)",
  successBorder: "rgba(22,163,74,0.3)",
  warningOrange: "#d97706",
  warningBg: "rgba(217,119,6,0.08)",
  warningBorder: "rgba(217,119,6,0.3)",
  dangerRed: "#dc2626",
  dangerBg: "rgba(220,38,38,0.08)",
  dangerBorder: "rgba(220,38,38,0.3)",
} as const;

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

  /* ── 共通入力スタイル ── */
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: C.inputBg,
    border: `1px solid ${C.inputBorder}`,
    borderRadius: 8,
    padding: "12px 14px",
    color: C.textPrimary,
    fontSize: 15,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8,
    color: C.textPrimary,
  };

  return (
    <div
      ref={scrollRef}
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "28px 20px 60px",
          fontFamily: "'Noto Serif JP', 'Hiragino Mincho ProN', serif",
          color: C.textPrimary,
        }}
      >
        {/* ── ヘッダー ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          {onBack && (
            <button
              className="gpt-btn"
              style={{ fontSize: 13, fontFamily: "inherit" }}
              onClick={onBack}
            >
              ← 戻る
            </button>
          )}
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2, color: C.textPrimary }}>
            改善のご要望
          </span>
        </div>

        <p style={{
          fontSize: 14,
          color: C.textSecondary,
          marginBottom: 28,
          lineHeight: 1.8,
        }}>
          使いづらかったところ、こうなったらもっと良いということ、不具合や欲しい機能などを自由にお寄せください。
          お寄せいただいた声は、開発チームが一つひとつ確認し、天聞アークの改善に反映してまいります。
        </p>

        {/* ── 送信結果表示（3段階） ── */}
        {sendState === "success" && receipt && (
          <div style={{
            background: C.successBg,
            border: `1px solid ${C.successBorder}`,
            borderRadius: 12,
            padding: "24px 20px",
            textAlign: "center",
            marginBottom: 28,
          }}>
            <div style={{ fontSize: 15, color: C.successGreen, marginBottom: 6, fontWeight: 600 }}>
              ありがとうございます。改善要望を受け付けました。
            </div>
            <div style={{
              fontSize: 20,
              fontWeight: 700,
              color: C.successGreen,
              letterSpacing: 2,
              margin: "12px 0",
              fontFamily: "monospace",
            }}>
              {receipt}
            </div>
            <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 8, lineHeight: 1.6 }}>
              改善要望として保存されました。
              <br />
              この受付番号は、対応状況の確認にお使いいただけます。
            </div>
            <button
              className="gpt-btn"
              style={{ marginTop: 16, fontSize: 13, fontFamily: "inherit" }}
              onClick={handleReset}
            >
              新しい要望を送る
            </button>
          </div>
        )}

        {sendState === "fallback" && receipt && (
          <div style={{
            background: C.warningBg,
            border: `1px solid ${C.warningBorder}`,
            borderRadius: 12,
            padding: "24px 20px",
            textAlign: "center",
            marginBottom: 28,
          }}>
            <div style={{ fontSize: 15, color: C.warningOrange, marginBottom: 6, fontWeight: 600 }}>
              改善要望は受け取りました。
            </div>
            <div style={{
              fontSize: 20,
              fontWeight: 700,
              color: C.warningOrange,
              letterSpacing: 2,
              margin: "12px 0",
              fontFamily: "monospace",
            }}>
              {receipt}
            </div>
            <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 8, lineHeight: 1.6 }}>
              現在保存処理を再試行しています。内容は失われていません。
              <br />
              後ほど自動的に同期されますので、ご安心ください。
            </div>
            <button
              className="gpt-btn"
              style={{ marginTop: 16, fontSize: 13, fontFamily: "inherit" }}
              onClick={handleReset}
            >
              新しい要望を送る
            </button>
          </div>
        )}

        {/* ── エラー表示 ── */}
        {errorMsg && (
          <div style={{
            background: C.dangerBg,
            border: `1px solid ${C.dangerBorder}`,
            borderRadius: 10,
            padding: "12px 16px",
            color: C.dangerRed,
            fontSize: 14,
            marginBottom: 20,
            lineHeight: 1.6,
          }}>
            {errorMsg}
          </div>
        )}

        {/* ── 送信中オーバーレイ ── */}
        {sendState === "sending" && (
          <div style={{
            background: C.accentBg,
            border: `1px solid ${C.accentBorder}`,
            borderRadius: 12,
            padding: "24px 20px",
            textAlign: "center",
            marginBottom: 28,
          }}>
            <div style={{
              display: "inline-block",
              width: 24,
              height: 24,
              border: `3px solid ${C.border}`,
              borderTopColor: C.accent,
              borderRadius: "50%",
              animation: "feedback-spin 0.8s linear infinite",
            }} />
            <div style={{ fontSize: 14, color: C.textPrimary, marginTop: 12 }}>
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
              <label style={{ ...labelStyle, marginBottom: 10 }}>
                カテゴリ
                <span style={{ color: C.dangerRed, marginLeft: 6, fontSize: 12, fontWeight: 600 }}>必須</span>
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
                        background: selected ? C.accentBg : C.inputBg,
                        border: selected ? `2px solid ${C.accent}` : `1px solid ${C.inputBorder}`,
                        borderRadius: 10,
                        padding: "12px 8px",
                        cursor: "pointer",
                        color: selected ? C.textPrimary : C.textSecondary,
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
                <span style={{ color: C.dangerRed, marginLeft: 6, fontSize: 12, fontWeight: 600 }}>必須</span>
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
                <span style={{ color: C.dangerRed, marginLeft: 6, fontSize: 12, fontWeight: 600 }}>必須</span>
              </label>
              <textarea
                style={{
                  ...inputStyle,
                  resize: "vertical",
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
              <label style={{ ...labelStyle, marginBottom: 10 }}>
                優先度
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {PRIORITIES.map((p) => {
                  const selected = priority === p.value;
                  return (
                    <button
                      key={p.value}
                      style={{
                        background: selected ? `${p.color}14` : C.inputBg,
                        border: selected ? `2px solid ${p.color}` : `1px solid ${C.inputBorder}`,
                        borderRadius: 8,
                        padding: "10px 18px",
                        cursor: "pointer",
                        color: selected ? p.color : C.textSecondary,
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
                <span style={{ color: C.textMuted, marginLeft: 6, fontSize: 12, fontWeight: 400 }}>任意</span>
              </label>
              <textarea
                style={{
                  ...inputStyle,
                  resize: "vertical",
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
                <span style={{ color: C.textMuted, marginLeft: 6, fontSize: 12, fontWeight: 400 }}>任意</span>
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
              className={canSubmit ? "gpt-btn gpt-btn-primary" : "gpt-btn"}
              style={{
                width: "100%",
                padding: "16px 0",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: 3,
                fontFamily: "inherit",
                cursor: canSubmit ? "pointer" : "not-allowed",
                opacity: canSubmit ? 1 : 0.4,
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
            color: C.textSecondary,
            cursor: "pointer",
            fontSize: 14,
            padding: "8px 0",
            fontFamily: "inherit",
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
                  background: C.inputBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 10,
                  fontSize: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, color: C.textPrimary }}>{item.title}</span>
                  <span style={{
                    fontFamily: "monospace",
                    color: C.textMuted,
                    fontSize: 12,
                  }}>
                    {item.receiptNumber}
                  </span>
                </div>
                <div style={{ marginTop: 6, color: C.textSecondary, fontSize: 13 }}>
                  {item.category} / 優先度: {item.priority} / {new Date(item.createdAt).toLocaleDateString("ja-JP")}
                  {item.notionSaved
                    ? <span style={{ color: C.successGreen, marginLeft: 8 }}>保存済み</span>
                    : <span style={{ color: C.warningOrange, marginLeft: 8 }}>ローカル保存</span>
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
