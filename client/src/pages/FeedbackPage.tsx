/**
 * ============================================================
 *  FEEDBACK PAGE — Founder会員フィードバック循環システム
 *  TENMON_ARK_FOUNDER_FEEDBACK_LOOP_V2 Phase A
 *  フォーム送信 + 受付番号表示 + 送信履歴
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
  { value: "高", label: "高（すぐに対応してほしい）", color: "#e74c3c" },
  { value: "中", label: "中（次の更新で対応してほしい）", color: "#f39c12" },
  { value: "低", label: "低（余裕があるときに）", color: "#27ae60" },
] as const;

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

  /* ── 送信状態 ── */
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── 履歴 ── */
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  /* ── デバイス情報 ── */
  const deviceRef = useRef(
    typeof navigator !== "undefined"
      ? `${navigator.userAgent.slice(0, 80)} | ${window.innerWidth}x${window.innerHeight}`
      : "unknown"
  );

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
    setError(null);
    if (!category) { setError("カテゴリを選択してください"); return; }
    if (!title.trim()) { setError("タイトルを入力してください"); return; }
    if (!detail.trim()) { setError("詳細内容を入力してください"); return; }

    setSending(true);
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
        setTitle("");
        setDetail("");
        setCategory("");
        setPriority("中");
        setReproSteps("");
        setPageUrl("");
        fetchHistory();
      } else {
        setError(data.error || "送信に失敗しました");
      }
    } catch (e: any) {
      setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setSending(false);
    }
  }, [category, title, detail, priority, reproSteps, pageUrl, fetchHistory]);

  /* ── スタイル定数 ── */
  const S = {
    page: {
      maxWidth: 640,
      margin: "0 auto",
      padding: "24px 16px",
      fontFamily: "'Noto Serif JP', 'Hiragino Mincho ProN', serif",
      color: "#e8dcc8",
      minHeight: "100vh",
    } as React.CSSProperties,
    header: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 24,
    } as React.CSSProperties,
    backBtn: {
      background: "none",
      border: "1px solid rgba(232,220,200,0.3)",
      color: "#e8dcc8",
      borderRadius: 8,
      padding: "6px 14px",
      cursor: "pointer",
      fontSize: 13,
    } as React.CSSProperties,
    title: {
      fontSize: 20,
      fontWeight: 600,
      letterSpacing: 2,
    } as React.CSSProperties,
    subtitle: {
      fontSize: 13,
      color: "rgba(232,220,200,0.6)",
      marginBottom: 24,
      lineHeight: 1.7,
    } as React.CSSProperties,
    section: {
      marginBottom: 20,
    } as React.CSSProperties,
    label: {
      display: "block",
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 8,
      color: "rgba(232,220,200,0.85)",
    } as React.CSSProperties,
    required: {
      color: "#e74c3c",
      marginLeft: 4,
      fontSize: 11,
    } as React.CSSProperties,
    catGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
      gap: 8,
    } as React.CSSProperties,
    catBtn: (selected: boolean) => ({
      background: selected ? "rgba(180,160,120,0.25)" : "rgba(255,255,255,0.04)",
      border: selected ? "1px solid rgba(180,160,120,0.6)" : "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8,
      padding: "10px 8px",
      cursor: "pointer",
      color: selected ? "#e8dcc8" : "rgba(232,220,200,0.6)",
      fontSize: 12,
      textAlign: "center" as const,
      transition: "all 0.2s",
    }),
    input: {
      width: "100%",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 8,
      padding: "10px 12px",
      color: "#e8dcc8",
      fontSize: 14,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box" as const,
    } as React.CSSProperties,
    textarea: {
      width: "100%",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 8,
      padding: "10px 12px",
      color: "#e8dcc8",
      fontSize: 14,
      fontFamily: "inherit",
      outline: "none",
      resize: "vertical" as const,
      minHeight: 100,
      lineHeight: 1.7,
      boxSizing: "border-box" as const,
    } as React.CSSProperties,
    prioRow: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap" as const,
    } as React.CSSProperties,
    prioBtn: (selected: boolean, color: string) => ({
      background: selected ? `${color}22` : "rgba(255,255,255,0.04)",
      border: selected ? `1px solid ${color}88` : "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8,
      padding: "8px 16px",
      cursor: "pointer",
      color: selected ? color : "rgba(232,220,200,0.6)",
      fontSize: 13,
      transition: "all 0.2s",
    }),
    submitBtn: {
      width: "100%",
      background: "linear-gradient(135deg, rgba(180,160,120,0.4), rgba(140,120,80,0.3))",
      border: "1px solid rgba(180,160,120,0.5)",
      borderRadius: 10,
      padding: "14px 0",
      color: "#e8dcc8",
      fontSize: 15,
      fontWeight: 600,
      cursor: "pointer",
      letterSpacing: 2,
      transition: "all 0.2s",
      marginTop: 8,
    } as React.CSSProperties,
    submitDisabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    } as React.CSSProperties,
    errorBox: {
      background: "rgba(231,76,60,0.15)",
      border: "1px solid rgba(231,76,60,0.4)",
      borderRadius: 8,
      padding: "10px 14px",
      color: "#e74c3c",
      fontSize: 13,
      marginBottom: 16,
    } as React.CSSProperties,
    receiptBox: {
      background: "rgba(39,174,96,0.12)",
      border: "1px solid rgba(39,174,96,0.4)",
      borderRadius: 10,
      padding: "20px",
      textAlign: "center" as const,
      marginBottom: 24,
    } as React.CSSProperties,
    receiptNumber: {
      fontSize: 18,
      fontWeight: 700,
      color: "#27ae60",
      letterSpacing: 2,
      marginTop: 8,
    } as React.CSSProperties,
    historyToggle: {
      background: "none",
      border: "none",
      color: "rgba(232,220,200,0.5)",
      cursor: "pointer",
      fontSize: 13,
      padding: "8px 0",
      textDecoration: "underline" as const,
    } as React.CSSProperties,
    historyItem: {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 8,
      fontSize: 13,
    } as React.CSSProperties,
    historyReceipt: {
      fontFamily: "monospace",
      color: "rgba(180,160,120,0.8)",
      fontSize: 11,
    } as React.CSSProperties,
    divider: {
      border: "none",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      margin: "24px 0",
    } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      {/* ── ヘッダー ── */}
      <div style={S.header}>
        {onBack && (
          <button style={S.backBtn} onClick={onBack}>
            ← 戻る
          </button>
        )}
        <span style={S.title}>改善のご要望</span>
      </div>

      <p style={S.subtitle}>
        天聞アークをより良くするために、お気づきの点やご要望をお聞かせください。
        お寄せいただいた声は、開発チームが一つひとつ確認し、改善に反映してまいります。
      </p>

      {/* ── 受付完了メッセージ ── */}
      {receipt && (
        <div style={S.receiptBox}>
          <div style={{ fontSize: 14, color: "#e8dcc8", marginBottom: 4 }}>
            ご要望を承りました
          </div>
          <div style={S.receiptNumber}>{receipt}</div>
          <div style={{ fontSize: 12, color: "rgba(232,220,200,0.5)", marginTop: 8 }}>
            この受付番号は、対応状況の確認にお使いいただけます
          </div>
          <button
            style={{ ...S.backBtn, marginTop: 12 }}
            onClick={() => setReceipt(null)}
          >
            新しい要望を送る
          </button>
        </div>
      )}

      {/* ── エラー表示 ── */}
      {error && <div style={S.errorBox}>{error}</div>}

      {/* ── フォーム（受付完了時は非表示） ── */}
      {!receipt && (
        <>
          {/* カテゴリ */}
          <div style={S.section}>
            <label style={S.label}>
              カテゴリ<span style={S.required}>必須</span>
            </label>
            <div style={S.catGrid}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  style={S.catBtn(category === c.value)}
                  onClick={() => setCategory(c.value)}
                >
                  <span style={{ fontSize: 16, display: "block", marginBottom: 2 }}>
                    {c.icon}
                  </span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* タイトル */}
          <div style={S.section}>
            <label style={S.label}>
              タイトル<span style={S.required}>必須</span>
            </label>
            <input
              style={S.input}
              type="text"
              placeholder="例: 宿曜鑑定の結果が途中で切れる"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* 詳細内容 */}
          <div style={S.section}>
            <label style={S.label}>
              詳細内容<span style={S.required}>必須</span>
            </label>
            <textarea
              style={S.textarea}
              placeholder="どのような状況で、何が起きたか（または何がほしいか）をできるだけ具体的にお書きください"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={2000}
            />
            <div style={{ fontSize: 11, color: "rgba(232,220,200,0.4)", textAlign: "right", marginTop: 4 }}>
              {detail.length} / 2000
            </div>
          </div>

          {/* 優先度 */}
          <div style={S.section}>
            <label style={S.label}>優先度</label>
            <div style={S.prioRow}>
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  style={S.prioBtn(priority === p.value, p.color)}
                  onClick={() => setPriority(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 再現手順（任意） */}
          <div style={S.section}>
            <label style={S.label}>再現手順（任意）</label>
            <textarea
              style={{ ...S.textarea, minHeight: 60 }}
              placeholder="不具合の場合、再現する手順を教えてください"
              value={reproSteps}
              onChange={(e) => setReproSteps(e.target.value)}
              maxLength={2000}
            />
          </div>

          {/* ページURL（任意） */}
          <div style={S.section}>
            <label style={S.label}>該当ページURL（任意）</label>
            <input
              style={S.input}
              type="url"
              placeholder="https://..."
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
            />
          </div>

          {/* 送信ボタン */}
          <button
            style={{
              ...S.submitBtn,
              ...(sending || !category || !title.trim() || !detail.trim()
                ? S.submitDisabled
                : {}),
            }}
            onClick={handleSubmit}
            disabled={sending || !category || !title.trim() || !detail.trim()}
          >
            {sending ? "送信中..." : "要望を送信する"}
          </button>
        </>
      )}

      {/* ── 送信履歴 ── */}
      <hr style={S.divider} />
      <button style={S.historyToggle} onClick={() => setShowHistory(!showHistory)}>
        {showHistory ? "送信履歴を閉じる" : `送信履歴を見る（${history.length}件）`}
      </button>

      {showHistory && history.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {history.map((item, i) => (
            <div key={i} style={S.historyItem}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>{item.title}</span>
                <span style={S.historyReceipt}>{item.receiptNumber}</span>
              </div>
              <div style={{ marginTop: 4, color: "rgba(232,220,200,0.5)" }}>
                {item.category} / 優先度: {item.priority} / {new Date(item.createdAt).toLocaleDateString("ja-JP")}
                {item.notionSaved ? " ✓" : " (ローカル保存)"}
              </div>
            </div>
          ))}
        </div>
      )}

      {showHistory && history.length === 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: "rgba(232,220,200,0.4)" }}>
          まだ送信履歴はありません
        </div>
      )}
    </div>
  );
}
