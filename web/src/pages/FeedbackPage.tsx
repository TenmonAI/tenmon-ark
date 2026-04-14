/**
 * ============================================================
 *  FEEDBACK PAGE — Founder会員フィードバック循環システム
 *  TENMON_ARK_FEEDBACK_PAGE_UX_FIX_V1
 *  FIX-A: 文字色・視認性改善
 *  FIX-B: スクロール対応
 *  FIX-C: Notion連携の可視化（送信状態3段階表示）
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
  { value: "高", label: "高（すぐに対応してほしい）", color: "#ef5350" },
  { value: "中", label: "中（次の更新で対応してほしい）", color: "#ffa726" },
  { value: "低", label: "低（余裕があるときに）", color: "#66bb6a" },
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
        // 成功後にスクロールトップへ
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
          color: "#f0e6d4",
        }}
      >
        {/* ── ヘッダー ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          {onBack && (
            <button
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#f0e6d4",
                borderRadius: 8,
                padding: "7px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
              }}
              onClick={onBack}
            >
              ← 戻る
            </button>
          )}
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2, color: "#fff" }}>
            改善のご要望
          </span>
        </div>

        <p style={{
          fontSize: 14,
          color: "#d4c8b4",
          marginBottom: 28,
          lineHeight: 1.8,
        }}>
          使いづらかったところ、こうなったらもっと良いということ、不具合や欲しい機能などを自由にお寄せください。
          お寄せいただいた声は、開発チームが一つひとつ確認し、天聞アークの改善に反映してまいります。
        </p>

        {/* ── 送信結果表示（FIX-C: 3段階） ── */}
        {sendState === "success" && receipt && (
          <div style={{
            background: "rgba(102,187,106,0.15)",
            border: "1px solid rgba(102,187,106,0.5)",
            borderRadius: 12,
            padding: "24px 20px",
            textAlign: "center",
            marginBottom: 28,
          }}>
            <div style={{ fontSize: 15, color: "#e8f5e9", marginBottom: 6, fontWeight: 600 }}>
              ありがとうございます。改善要望を受け付けました。
            </div>
            <div style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#66bb6a",
              letterSpacing: 2,
              margin: "12px 0",
              fontFamily: "monospace",
            }}>
              {receipt}
            </div>
            <div style={{ fontSize: 13, color: "#c8e6c9", marginTop: 8, lineHeight: 1.6 }}>
              改善要望として保存されました。
              <br />
              この受付番号は、対応状況の確認にお使いいただけます。
            </div>
            <button
              style={{
                marginTop: 16,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#f0e6d4",
                borderRadius: 8,
                padding: "8px 20px",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
              }}
              onClick={handleReset}
            >
              新しい要望を送る
            </button>
          </div>
        )}

        {sendState === "fallback" && receipt && (
          <div style={{
            background: "rgba(255,167,38,0.12)",
            border: "1px solid rgba(255,167,38,0.45)",
            borderRadius: 12,
            padding: "24px 20px",
            textAlign: "center",
            marginBottom: 28,
          }}>
            <div style={{ fontSize: 15, color: "#fff3e0", marginBottom: 6, fontWeight: 600 }}>
              改善要望は受け取りました。
            </div>
            <div style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#ffa726",
              letterSpacing: 2,
              margin: "12px 0",
              fontFamily: "monospace",
            }}>
              {receipt}
            </div>
            <div style={{ fontSize: 13, color: "#ffe0b2", marginTop: 8, lineHeight: 1.6 }}>
              現在保存処理を再試行しています。内容は失われていません。
              <br />
              後ほど自動的に同期されますので、ご安心ください。
            </div>
            <button
              style={{
                marginTop: 16,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#f0e6d4",
                borderRadius: 8,
                padding: "8px 20px",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
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
            background: "rgba(239,83,80,0.12)",
            border: "1px solid rgba(239,83,80,0.45)",
            borderRadius: 10,
            padding: "12px 16px",
            color: "#ef9a9a",
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
            background: "rgba(180,160,120,0.1)",
            border: "1px solid rgba(180,160,120,0.3)",
            borderRadius: 12,
            padding: "24px 20px",
            textAlign: "center",
            marginBottom: 28,
          }}>
            <div style={{
              display: "inline-block",
              width: 24,
              height: 24,
              border: "3px solid rgba(240,230,212,0.2)",
              borderTopColor: "#f0e6d4",
              borderRadius: "50%",
              animation: "feedback-spin 0.8s linear infinite",
            }} />
            <div style={{ fontSize: 14, color: "#f0e6d4", marginTop: 12 }}>
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
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 10,
                color: "#f0e6d4",
              }}>
                カテゴリ
                <span style={{ color: "#ef5350", marginLeft: 6, fontSize: 12, fontWeight: 600 }}>必須</span>
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
                        background: selected ? "rgba(180,160,120,0.3)" : "rgba(255,255,255,0.06)",
                        border: selected ? "2px solid rgba(200,180,140,0.7)" : "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 10,
                        padding: "12px 8px",
                        cursor: "pointer",
                        color: selected ? "#fff" : "#d4c8b4",
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
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 8,
                color: "#f0e6d4",
              }}>
                タイトル
                <span style={{ color: "#ef5350", marginLeft: 6, fontSize: 12, fontWeight: 600 }}>必須</span>
              </label>
              <input
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  color: "#f0e6d4",
                  fontSize: 15,
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                type="text"
                placeholder="例: 宿曜鑑定の結果が途中で切れる"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* 詳細内容 */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 8,
                color: "#f0e6d4",
              }}>
                詳細内容
                <span style={{ color: "#ef5350", marginLeft: 6, fontSize: 12, fontWeight: 600 }}>必須</span>
              </label>
              <textarea
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  color: "#f0e6d4",
                  fontSize: 15,
                  fontFamily: "inherit",
                  outline: "none",
                  resize: "vertical",
                  minHeight: 120,
                  lineHeight: 1.7,
                  boxSizing: "border-box",
                }}
                placeholder="どのような状況で、何が起きたか（または何がほしいか）をできるだけ具体的にお書きください"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                maxLength={2000}
              />
              <div style={{ fontSize: 12, color: "#a09080", textAlign: "right", marginTop: 4 }}>
                {detail.length} / 2000
              </div>
            </div>

            {/* 優先度 */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 10,
                color: "#f0e6d4",
              }}>
                優先度
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {PRIORITIES.map((p) => {
                  const selected = priority === p.value;
                  return (
                    <button
                      key={p.value}
                      style={{
                        background: selected ? `${p.color}30` : "rgba(255,255,255,0.06)",
                        border: selected ? `2px solid ${p.color}` : "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 8,
                        padding: "10px 18px",
                        cursor: "pointer",
                        color: selected ? p.color : "#d4c8b4",
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
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 8,
                color: "#f0e6d4",
              }}>
                再現手順
                <span style={{ color: "#a09080", marginLeft: 6, fontSize: 12, fontWeight: 400 }}>任意</span>
              </label>
              <textarea
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  color: "#f0e6d4",
                  fontSize: 15,
                  fontFamily: "inherit",
                  outline: "none",
                  resize: "vertical",
                  minHeight: 70,
                  lineHeight: 1.7,
                  boxSizing: "border-box",
                }}
                placeholder="不具合の場合、再現する手順を教えてください"
                value={reproSteps}
                onChange={(e) => setReproSteps(e.target.value)}
                maxLength={2000}
              />
            </div>

            {/* ページURL（任意） */}
            <div style={{ marginBottom: 28 }}>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 8,
                color: "#f0e6d4",
              }}>
                該当ページURL
                <span style={{ color: "#a09080", marginLeft: 6, fontSize: 12, fontWeight: 400 }}>任意</span>
              </label>
              <input
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  color: "#f0e6d4",
                  fontSize: 15,
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
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
                  ? "linear-gradient(135deg, rgba(200,180,140,0.5), rgba(160,140,100,0.4))"
                  : "rgba(255,255,255,0.05)",
                border: canSubmit
                  ? "1px solid rgba(200,180,140,0.6)"
                  : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "16px 0",
                color: canSubmit ? "#fff" : "rgba(240,230,212,0.35)",
                fontSize: 16,
                fontWeight: 700,
                cursor: canSubmit ? "pointer" : "not-allowed",
                letterSpacing: 3,
                transition: "all 0.2s",
                fontFamily: "inherit",
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
          borderTop: "1px solid rgba(255,255,255,0.1)",
          margin: "32px 0 16px",
        }} />

        <button
          style={{
            background: "none",
            border: "none",
            color: "#b0a090",
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
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 10,
                  fontSize: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, color: "#f0e6d4" }}>{item.title}</span>
                  <span style={{
                    fontFamily: "monospace",
                    color: "#b4a488",
                    fontSize: 12,
                  }}>
                    {item.receiptNumber}
                  </span>
                </div>
                <div style={{ marginTop: 6, color: "#a09080", fontSize: 13 }}>
                  {item.category} / 優先度: {item.priority} / {new Date(item.createdAt).toLocaleDateString("ja-JP")}
                  {item.notionSaved
                    ? <span style={{ color: "#66bb6a", marginLeft: 8 }}>保存済み</span>
                    : <span style={{ color: "#ffa726", marginLeft: 8 }}>ローカル保存</span>
                  }
                </div>
              </div>
            ))}
          </div>
        )}

        {showHistory && history.length === 0 && (
          <div style={{ marginTop: 12, fontSize: 14, color: "#a09080" }}>
            まだ送信履歴はありません
          </div>
        )}
      </div>
    </div>
  );
}
