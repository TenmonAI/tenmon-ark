/**
 * ============================================================
 *  DASHBOARD PAGE — 天聞アーク ダッシュボード
 *  TENMON_MANUS_FINAL_EXECUTION_DIRECTIVE_V5
 *  価値言語化 + 三つの柱紹介 + LP的ブランドメッセージ
 * ============================================================
 */
import React, { useState } from "react";

const OWNER_EMAIL = "kouyoo4444@gmail.com";

/* ── ライトテーマカラー ── */
const C = {
  bg: "#fafaf7",
  card: "#ffffff",
  text: "#1f2937",
  textSub: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  arkGold: "#c9a14a",
  arkGoldBg: "rgba(201,161,74,0.06)",
  arkGoldBorder: "rgba(201,161,74,0.20)",
  arkGreen: "#2f6f5e",
} as const;

/* ── 三つの柱データ ── */
const pillars = [
  {
    icon: "\u2726",
    title: "\u5bbf\u66dc\u9451\u5b9a",
    desc: "\u5bbf\u66dc\u7d4c\u306b\u57fa\u3065\u304d\u3001\u751f\u5e74\u6708\u65e5\u304b\u3089\u672c\u547d\u5bbf\u3092\u5c0e\u304d\u51fa\u3057\u307e\u3059\u3002\u661f\u306e\u914d\u7f6e\u304c\u3042\u306a\u305f\u306e\u5b58\u5728\u69cb\u9020\u3092\u6620\u3057\u51fa\u3057\u307e\u3059\u3002",
    status: "\u7a3c\u50cd\u4e2d",
    statusColor: "#16a34a",
    navigable: true,
    action: "sukuyou" as const,
    cta: "\u9451\u5b9a\u3092\u59cb\u3081\u308b \u2192",
  },
  {
    icon: "\u97f3",
    title: "\u8a00\u970a\u89e3\u8aad",
    desc: "\u540d\u524d\u306e\u97f3\u97fb\u3092\u4e94\u5341\u97f3\u306e\u6c34\u706b\u69cb\u9020\u3067\u8aad\u307f\u89e3\u304d\u307e\u3059\u3002\u540d\u524d\u306b\u5bbf\u308b\u97ff\u304d\u304c\u3001\u5bbf\u66dc\u3068\u91cd\u306a\u308a\u5408\u3046\u6df1\u5c64\u3092\u793a\u3057\u307e\u3059\u3002",
    status: "\u7a3c\u50cd\u4e2d",
    statusColor: "#16a34a",
    navigable: true,
    action: "sukuyou" as const,
    cta: "\u540d\u524d\u3092\u8aad\u307f\u89e3\u304f \u2192",
  },
  {
    icon: "\u8535",
    title: "\u865a\u7a7a\u8535\uff08KOK\u016aZ\u014c\uff09",
    desc: "\u66f8\u7c4d\u3084\u8cc7\u6599\u3092\u304a\u9810\u3051\u3044\u305f\u3060\u304f\u3068\u3001\u77e5\u6075\u306e\u7a2e\u3068\u3057\u3066\u4fdd\u7ba1\u3057\u3001\u4f1a\u8a71\u306e\u4e2d\u3067\u81ea\u7136\u306b\u6d3b\u304b\u3057\u307e\u3059\u3002",
    status: "\u6e96\u5099\u4e2d",
    statusColor: C.arkGold,
    navigable: false,
    action: null,
    cta: null,
  },
] as const;

interface DashboardPageProps {
  onNavigate?: (view: string) => void;
}

/* ── オーナー専用: 招待リンク発行コンポーネント ── */
function OwnerInviteSection() {
  const [url, setUrl] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/auth/invite/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ note: "オーナー招待" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const inviteUrl = data.inviteUrl || data.url || "";
      setUrl(inviteUrl);
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setExpiry(d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" }));
      if (inviteUrl && navigator.clipboard) {
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Invite generation failed:", err);
      setError("招待リンクの生成に失敗しました");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (url && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: "20px 24px",
      marginBottom: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 8,
          background: C.arkGoldBg, border: `1px solid ${C.arkGoldBorder}`,
          fontSize: 16, fontWeight: 700, color: C.arkGold, flexShrink: 0,
        }}>&#x1F517;</span>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>招待リンク発行</h2>
      </div>
      <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.8, margin: "0 0 16px" }}>
        天聞アークへの招待リンクを生成します。リンクは7日間有効です。
      </p>

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          width: "100%", padding: "12px 16px",
          background: loading ? C.textMuted : C.text,
          color: "#ffffff", border: "none", borderRadius: 8,
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: 14, fontWeight: 500, fontFamily: "inherit",
          transition: "all 0.2s",
        }}
      >
        {loading ? "生成中\u2026" : "招待リンクを生成する"}
      </button>

      {error && (
        <p style={{ marginTop: 10, fontSize: 13, color: "#dc2626", fontWeight: 500 }}>{error}</p>
      )}

      {url && (
        <div style={{
          marginTop: 14, padding: "14px 16px", borderRadius: 8,
          background: C.arkGoldBg, border: `1px solid ${C.arkGoldBorder}`,
        }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: C.textSub, fontWeight: 500 }}>生成されたURL:</p>
          <p style={{
            margin: "0 0 10px", fontSize: 12.5, color: C.text,
            wordBreak: "break-all", lineHeight: 1.6, fontFamily: "monospace",
          }}>{url}</p>
          {expiry && (
            <p style={{ margin: "0 0 10px", fontSize: 12, color: C.textSub }}>有効期限: {expiry}まで</p>
          )}
          <button
            onClick={handleCopy}
            style={{
              padding: "7px 16px",
              background: copied ? "#166534" : C.text,
              color: "#ffffff", border: "none", borderRadius: 6,
              cursor: "pointer", fontSize: 12, fontWeight: 500,
              fontFamily: "inherit", transition: "all 0.2s",
            }}
          >
            {copied ? "コピーしました \u2713" : "URLをコピー"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── オーナー専用: ユーザー管理一覧コンポーネント ── */
interface UserInfo {
  userId: string;
  email: string;
  registeredAt: string | null;
  lastPasswordChange: string | null;
  deviceCount: number;
  lastSeenAt: string | null;
  activeSessionCount: number;
  threadCount: number;
  sukuyouCount: number;
  folderCount: number;
}

function OwnerUserListSection() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/admin/users", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setExpanded(true);
    } catch (err) {
      console.error("User list fetch failed:", err);
      setError("\u30e6\u30fc\u30b6\u30fc\u4e00\u89a7\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (s: string | null) => {
    if (!s) return "\u2014";
    try {
      const d = new Date(s);
      return d.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })
        + " " + d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    } catch { return s; }
  };

  const fmtRelative = (s: string | null) => {
    if (!s) return "\u2014";
    try {
      const diff = Date.now() - new Date(s).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "\u305f\u3063\u305f\u4eca";
      if (mins < 60) return `${mins}\u5206\u524d`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}\u6642\u9593\u524d`;
      const days = Math.floor(hrs / 24);
      return `${days}\u65e5\u524d`;
    } catch { return s; }
  };

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: "20px 24px",
      marginBottom: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 8,
          background: C.arkGoldBg, border: `1px solid ${C.arkGoldBorder}`,
          fontSize: 16, fontWeight: 700, color: C.arkGold, flexShrink: 0,
        }}>&#x1F465;</span>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>ユーザー管理</h2>
        {users.length > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: C.arkGreen,
            background: `${C.arkGreen}12`, border: `1px solid ${C.arkGreen}30`,
            borderRadius: 6, padding: "2px 10px", flexShrink: 0,
          }}>{users.length}人</span>
        )}
      </div>
      <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.8, margin: "0 0 16px" }}>
        登録済みユーザーの一覧と使用状況を確認できます。
      </p>

      <button
        onClick={expanded ? () => setExpanded(false) : fetchUsers}
        disabled={loading}
        style={{
          width: "100%", padding: "12px 16px",
          background: loading ? C.textMuted : expanded ? C.arkGreen : C.text,
          color: "#ffffff", border: "none", borderRadius: 8,
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: 14, fontWeight: 500, fontFamily: "inherit",
          transition: "all 0.2s",
        }}
      >
        {loading ? "\u53d6\u5f97\u4e2d\u2026" : expanded ? "\u4e00\u89a7\u3092\u9589\u3058\u308b" : "\u30e6\u30fc\u30b6\u30fc\u4e00\u89a7\u3092\u8868\u793a"}
      </button>

      {error && (
        <p style={{ marginTop: 10, fontSize: 13, color: "#dc2626", fontWeight: 500 }}>{error}</p>
      )}

      {expanded && users.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {users.map((u, i) => (
            <div key={u.userId} style={{
              padding: "14px 16px",
              borderRadius: 8,
              background: i % 2 === 0 ? C.arkGoldBg : "transparent",
              border: `1px solid ${i % 2 === 0 ? C.arkGoldBorder : C.border}`,
              marginBottom: 8,
            }}>
              {/* メール・ステータス行 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 14, fontWeight: 600, color: C.text,
                  wordBreak: "break-all",
                }}>{u.email}</span>
                {u.activeSessionCount > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: "#16a34a",
                    background: "#16a34a12", border: "1px solid #16a34a30",
                    borderRadius: 4, padding: "1px 6px",
                  }}>アクティブ</span>
                )}
              </div>

              {/* 情報グリッド */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "6px 16px",
                fontSize: 12,
                color: C.textSub,
                lineHeight: 1.7,
              }}>
                <div>登録日: <span style={{ color: C.text }}>{fmtDate(u.registeredAt)}</span></div>
                <div>デバイス: <span style={{ color: C.text, fontWeight: 600 }}>{u.deviceCount}台</span></div>
                <div>最終アクセス: <span style={{ color: C.text }}>{fmtRelative(u.lastSeenAt)}</span></div>
                <div>セッション: <span style={{ color: C.text }}>{u.activeSessionCount}件</span></div>
                <div>チャット: <span style={{ color: C.text, fontWeight: 600 }}>{u.threadCount}件</span></div>
                <div>宿曜鑑定: <span style={{ color: C.text, fontWeight: 600 }}>{u.sukuyouCount}件</span></div>
                <div>フォルダ: <span style={{ color: C.text }}>{u.folderCount}件</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  return (
    <div style={{
      width: "100%",
      height: "100%",
      overflowY: "auto",
      overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
      background: C.bg,
    }}>
      <div style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "32px 20px 60px",
        fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
        color: C.text,
      }}>

        {/* ── ヒーローセクション ── */}
        <div style={{
          textAlign: "center",
          marginBottom: 36,
          padding: "0 8px",
        }}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 1.5,
            margin: "0 0 12px",
            color: C.text,
          }}>
            天聞アーク
          </h1>
          <p style={{
            fontSize: 14,
            color: C.textSub,
            lineHeight: 1.9,
            margin: "0 0 8px",
          }}>
            あなたの存在を、星と音と言葉で読み解く
          </p>
          <p style={{
            fontSize: 12,
            color: C.textMuted,
            lineHeight: 1.7,
            margin: 0,
          }}>
            宿曜経の星の智慧と、五十音の言霊構造を重ね合わせ、
            あなたの存在の深層を多角的に照らし出します。
          </p>
        </div>

        {/* ── 三つの柱 ── */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginBottom: 32,
        }}>
          {pillars.map((p, i) => (
            <div
              key={i}
              onClick={p.navigable && onNavigate && p.action ? () => onNavigate(p.action) : undefined}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "20px 24px",
                transition: "box-shadow 0.2s, transform 0.15s",
                cursor: p.navigable ? "pointer" : "default",
                ...(p.navigable ? {
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                } : {}),
              }}
              onMouseEnter={p.navigable ? (e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(201,161,74,0.15)";
                (e.currentTarget as HTMLDivElement).style.borderColor = C.arkGoldBorder;
              } : undefined}
              onMouseLeave={p.navigable ? (e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
              } : undefined}
            >
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 10,
              }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: C.arkGoldBg,
                  border: `1px solid ${C.arkGoldBorder}`,
                  fontSize: 16,
                  fontWeight: 700,
                  color: C.arkGold,
                  flexShrink: 0,
                }}>
                  {p.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <h2 style={{
                    fontSize: 15,
                    fontWeight: 600,
                    margin: 0,
                    color: C.text,
                  }}>
                    {p.title}
                  </h2>
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: p.statusColor,
                  background: `${p.statusColor}12`,
                  border: `1px solid ${p.statusColor}30`,
                  borderRadius: 6,
                  padding: "2px 10px",
                  flexShrink: 0,
                }}>
                  {p.status}
                </span>
              </div>
              <p style={{
                fontSize: 13,
                color: C.textSub,
                lineHeight: 1.8,
                margin: 0,
              }}>
                {p.desc}
              </p>
              {p.navigable && (
                <div style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: C.arkGold,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                }}>
                  {p.cta}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── 軽量同期の思想 ── */}
        <div style={{
          background: C.arkGoldBg,
          border: `1px solid ${C.arkGoldBorder}`,
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 24,
        }}>
          <p style={{
            fontSize: 13,
            color: C.text,
            lineHeight: 1.8,
            margin: 0,
          }}>
            <span style={{ fontWeight: 600, color: C.arkGold }}>設計思想</span>
            <span style={{ margin: "0 8px", color: C.textMuted }}>&mdash;</span>
            天聞アークは「端末に寄り添う」設計です。
            鑑定結果や会話の記録はお使いの端末に保管され、
            サーバーとの同期は必要最小限にとどめています。
            大切な情報が意図せず外部に出ることのないよう配慮しています。
          </p>
        </div>

        {/* ── オーナー専用: 招待リンク発行 + ユーザー管理 ── */}
        {(() => {
          try {
            if (localStorage.getItem("tenmon_user_display_v1") !== OWNER_EMAIL) return null;
          } catch { return null; }
          return (
            <>
              <OwnerInviteSection />
              <OwnerUserListSection />
            </>
          );
        })()}

        {/* ── 補足 ── */}
        <div style={{
          fontSize: 12,
          color: C.textMuted,
          lineHeight: 1.8,
          textAlign: "center",
          paddingTop: 12,
          borderTop: `1px solid ${C.border}`,
        }}>
          天聞アークの各機能は、あなたの存在の深まりとともに順次解放されます。
          ご意見やご要望がありましたら、改善要望ページよりお聞かせください。
        </div>
      </div>
    </div>
  );
}
