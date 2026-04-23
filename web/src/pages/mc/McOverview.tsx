/**
 * McOverview.tsx — Mission Control AI-HUB Overview (CARD-MC-09)
 * Canonical /mc/ entry. Consumes /api/mc/vnext/overview as the single source.
 */
import React, { useEffect, useState } from "react";
import McLayout, { C } from "./McLayout";

type NavBlock = {
  thread_latest?: string;
  thread_latest_link?: string;
  quality?: string;
  alerts?: string;
  acceptance?: string;
  sources?: string;
  history?: string;
  classic?: string;
};

interface OverviewPayload {
  ok?: boolean;
  generated_at?: string;
  top?: {
    head_sha_short?: string;
    branch?: string;
    commit_message?: string;
    systemd_active?: boolean | null;
    main_pid?: number | null;
    uptime_sec?: number | null;
  };
  runtime_summary?: {
    head_sha_short?: string;
    branch?: string;
    head_subject?: string;
    hostname?: string | null;
    service_active?: boolean | null;
    uptime_sec?: number | null;
    note?: string;
  };
  quality_summary?: {
    sample_count?: number;
    truncation_suspect_rate?: number | null;
    natural_end_rate?: number | null;
    avg_length?: number | null;
    verdict_short?: string;
  };
  continuation_summary?: {
    follow_up_turns_24h?: number;
    non_empty_follow_up_24h?: number;
    follow_up_success_rate?: number | null;
    memory_hit_rate?: number | null;
    memory_hit_live?: number | null;
    memory_hit_all_time?: number | null;
    conversation_log_hit_live?: number | null;
    conversation_log_hit_all_time?: number | null;
    metrics_window_note?: string;
    verdict_short?: string;
  };
  route_summary?: {
    top_route_reason?: string;
    top_route_share?: number;
    verdict_short?: string;
  };
  latest_acceptance?: {
    status?: string;
    verdict?: string;
    reasons?: string[];
    passed?: string[];
    missingProof?: string[];
    checks?: Array<{ id: string; label: string; status: string; detail: string }>;
    nextRecommendedCard?: string;
    why_now?: string;
    live_problematic_thread_count?: number;
    archived_problematic_thread_count?: number;
    lastVerifiedAt?: string;
  };
  active_alerts_summary?: {
    crit?: number;
    high?: number;
    med?: number;
    low?: number;
    total?: number;
    top?: Array<{ severity: string; category: string; message: string; hint: string }>;
  };
  canonical_sources_summary?: {
    canonical_count?: number;
    mirror_count?: number;
    backup_count?: number;
    derived_count?: number;
    graph_edge_count?: number;
    canonical?: Array<{ id: string; source_name: string; source_uri: string; source_kind: string }>;
    verdict_short?: string;
  };
  problematic_threads?: Array<{
    thread_id: string;
    turn_index: number | null;
    request_id: string;
    reason: string;
    detail: string;
    last_ts: string;
    final_len: number | null;
    route_reason: string;
  }>;
  failing_threads_live?: Array<{
    thread_id: string;
    turn_index: number | null;
    request_id: string;
    reason: string;
    detail: string;
    last_ts: string;
    final_len: number | null;
    route_reason: string;
  }>;
  failing_threads_archived_count?: number;
  failing_threads_archived_preview?: Array<{
    thread_id: string;
    turn_index: number | null;
    request_id: string;
    reason: string;
    detail: string;
    last_ts: string;
    final_len: number | null;
    route_reason: string;
  }>;
  ledger_24h?: {
    route_rows?: number;
    llm_rows?: number;
    memory_rows?: number;
    quality_rows?: number;
    truncation_suspect?: number;
  };
  nav?: NavBlock;
  history_summary?: {
    latest_passed_card?: string | null;
    latest_passed_card_id?: string | null;
    current_open_gap_count?: number;
    last_verified_at?: string | null;
    ledger_row_count?: number;
  };
}

function fmtUptime(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtPct(x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(0)}%`;
}

function statusColor(verdict: string): string {
  const v = String(verdict || "").toUpperCase();
  if (v === "PASS") return C.green;
  if (v === "FAIL") return C.red;
  if (v === "WATCH") return C.orange;
  return C.textSub;
}

function reasonColor(reason: string): string {
  if (reason === "truncation_suspect") return C.orange;
  if (reason === "continuation_failure") return C.red;
  if (reason === "persist_failure") return C.red;
  if (reason === "memory_fallback_none") return C.orange;
  return C.textSub;
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case "truncation_suspect":
      return "切断疑い";
    case "continuation_failure":
      return "continuation 失敗";
    case "persist_failure":
      return "persist 失敗";
    case "memory_fallback_none":
      return "記憶未接続";
    default:
      return reason;
  }
}

function Card({
  title,
  verdict,
  verdictColor,
  children,
  href,
  hrefLabel,
}: {
  title: string;
  verdict?: string;
  verdictColor?: string;
  children: React.ReactNode;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>{title}</div>
        {verdict ? (
          <div style={{ fontSize: 11, color: verdictColor || C.textSub, fontWeight: 600 }}>{verdict}</div>
        ) : null}
      </div>
      <div style={{ fontSize: 13, color: C.text }}>{children}</div>
      {href ? (
        <a
          href={href}
          style={{
            fontSize: 11,
            color: C.accent,
            textDecoration: "none",
            alignSelf: "flex-start",
            marginTop: 4,
          }}
        >
          → {hrefLabel || "詳しく"}
        </a>
      ) : null}
    </div>
  );
}

export default function McOverview() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showArchivedThreads, setShowArchivedThreads] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const r = await fetch("/api/mc/vnext/overview", { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as OverviewPayload;
        if (dead) return;
        setData(j);
        setLoading(false);
      } catch (e: any) {
        if (dead) return;
        setError(String(e?.message || e));
        setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  const nav: NavBlock = data?.nav || {};
  const runtime = data?.runtime_summary || {};
  const quality = data?.quality_summary || {};
  const cont = data?.continuation_summary || {};
  const route = data?.route_summary || {};
  const acc = data?.latest_acceptance || {};
  const alerts = data?.active_alerts_summary || {};
  const sources = data?.canonical_sources_summary || {};
  const failingLive = data?.failing_threads_live?.length ? data.failing_threads_live : data?.problematic_threads || [];
  const archivedPreview = data?.failing_threads_archived_preview || [];
  const archivedCount = data?.failing_threads_archived_count ?? 0;
  const ledger = data?.ledger_24h || {};
  const hist = data?.history_summary || {};

  return (
    <McLayout activePage="overview">
      <div style={{ maxWidth: 1120 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: C.accent }}>AI-HUB Overview</h1>
            <p style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 0" }}>
              {data?.generated_at
                ? `updated ${new Date(data.generated_at).toLocaleString("ja-JP")}`
                : "loading…"}
              {" · canonical entry /mc/"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href={nav.thread_latest_link || "/mc/vnext/"}
              style={{
                background: C.accent,
                color: "#1a1a1a",
                fontWeight: 700,
                fontSize: 12,
                padding: "8px 14px",
                borderRadius: 6,
                textDecoration: "none",
              }}
            >
              最新 thread →
            </a>
            <a
              href="/mc/vnext/"
              style={{
                background: C.accentBg,
                border: `1px solid ${C.accent}33`,
                color: C.accent,
                fontSize: 12,
                padding: "8px 14px",
                borderRadius: 6,
                textDecoration: "none",
              }}
            >
              vNext 全面 →
            </a>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.textSub,
                padding: "8px 12px",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {loading && <div style={{ color: C.textSub, padding: 40, textAlign: "center" }}>Loading…</div>}
        {error && (
          <div style={{ color: C.red, padding: 16, background: "rgba(239,68,68,0.08)", borderRadius: 8, marginBottom: 16 }}>
            overview 取得失敗: {error}（founder 認証を確認してください）
          </div>
        )}

        {data && (
          <>
            {/* Acceptance verdict banner */}
            <div
              style={{
                padding: "14px 18px",
                borderRadius: 10,
                border: `1px solid ${statusColor(String(acc.verdict || acc.status || ""))}55`,
                background:
                  String(acc.verdict || acc.status) === "PASS"
                    ? "rgba(34,197,94,0.08)"
                    : String(acc.verdict || acc.status) === "FAIL"
                      ? "rgba(239,68,68,0.08)"
                      : "rgba(245,158,11,0.08)",
                marginBottom: 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
                  Acceptance
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: statusColor(String(acc.verdict || acc.status || "")) }}>
                  {acc.verdict || acc.status || "—"}
                </div>
                <div style={{ fontSize: 12, color: C.textSub, marginTop: 4, maxWidth: 720 }}>
                  {acc.why_now ||
                    (acc.reasons && acc.reasons[0]) ||
                    (acc.passed && acc.passed[0]) ||
                    "集計対象の signal なし"}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                  live {acc.live_problematic_thread_count ?? failingLive.length} · archived {acc.archived_problematic_thread_count ?? archivedCount}
                </div>
                {acc.nextRecommendedCard ? (
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
                    next: {acc.nextRecommendedCard}
                  </div>
                ) : null}
              </div>
              <a
                href={nav.acceptance || "/mc/vnext/acceptance"}
                style={{
                  fontSize: 12,
                  color: C.accent,
                  textDecoration: "none",
                  border: `1px solid ${C.accent}55`,
                  padding: "6px 12px",
                  borderRadius: 6,
                }}
              >
                acceptance 詳細 →
              </a>
            </div>

            {data?.history_summary ? (
              <div
                style={{
                  marginBottom: 18,
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: C.card,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.55 }}>
                  <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>System history</div>
                  <div>
                    <span style={{ color: C.textMuted }}>latest passed · </span>
                    <strong style={{ color: C.text }}>{String(hist.latest_passed_card_id || hist.latest_passed_card || "—")}</strong>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span style={{ color: C.textMuted }}>open gaps · </span>
                    <strong style={{ color: (hist.current_open_gap_count ?? 0) > 0 ? C.orange : C.green }}>{hist.current_open_gap_count ?? "—"}</strong>
                    <span style={{ color: C.textMuted }}> · last verified · </span>
                    {hist.last_verified_at ? (
                      <span style={{ color: C.text }}>{String(hist.last_verified_at).slice(0, 19)}</span>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                </div>
                <a
                  href={nav.history || "/mc/vnext/history"}
                  style={{
                    fontSize: 12,
                    color: C.accent,
                    textDecoration: "none",
                    border: `1px solid ${C.accent}55`,
                    padding: "6px 12px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  ledger タイムライン →
                </a>
              </div>
            ) : null}

            {/* Top-line cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <Card
                title="Runtime"
                verdict={runtime.service_active === false ? "inactive" : runtime.service_active ? "active" : "—"}
                verdictColor={runtime.service_active ? C.green : runtime.service_active === false ? C.red : C.textSub}
              >
                <div style={{ fontSize: 13 }}>
                  <strong style={{ color: C.text }}>{runtime.hostname || "—"}</strong>
                  <span style={{ color: C.textMuted, marginLeft: 8 }}>
                    uptime {fmtUptime(runtime.uptime_sec ?? null)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: C.textSub, marginTop: 4 }}>
                  {runtime.branch || "—"} · {runtime.head_sha_short || "—"}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{runtime.note || ""}</div>
              </Card>

              <Card
                title="Route of Truth"
                verdict={route.top_route_reason || "—"}
                verdictColor={C.accent}
              >
                <div>{route.verdict_short || "24h route データなし"}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                  ledger 24h: route={ledger.route_rows ?? 0} · llm={ledger.llm_rows ?? 0} · memory={ledger.memory_rows ?? 0} · quality={ledger.quality_rows ?? 0}
                </div>
              </Card>

              <Card
                title="Dialogue Quality"
                verdict={quality.sample_count ? `n=${quality.sample_count}` : "no sample"}
                verdictColor={C.textSub}
                href={nav.quality || "/mc/vnext/quality"}
                hrefLabel="quality 面"
              >
                <div>{quality.verdict_short || "—"}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                  natural_end {fmtPct(quality.natural_end_rate ?? null)} · truncation {fmtPct(quality.truncation_suspect_rate ?? null)} · avg_len {quality.avg_length != null ? Math.round(quality.avg_length) : "—"}
                </div>
              </Card>

              <Card
                title="Continuation Health"
                verdict={cont.follow_up_turns_24h ? `${cont.non_empty_follow_up_24h}/${cont.follow_up_turns_24h}` : "no data"}
                verdictColor={C.textSub}
                href={nav.thread_latest_link}
                hrefLabel="最新 thread を確認"
              >
                <div>{cont.verdict_short || "—"}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                  mem+conv live {fmtPct(cont.memory_hit_live ?? cont.memory_hit_rate ?? null)} · all_time{" "}
                  {fmtPct(cont.memory_hit_all_time ?? null)} · conv_log live {fmtPct(cont.conversation_log_hit_live ?? null)} · follow_up{" "}
                  {fmtPct(cont.follow_up_success_rate ?? null)}
                </div>
                {cont.metrics_window_note ? (
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4, lineHeight: 1.4 }}>{cont.metrics_window_note}</div>
                ) : null}
              </Card>
            </div>

            {/* Alerts + Sources row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Active Alerts
                  </div>
                  <div style={{ fontSize: 11 }}>
                    <span style={{ color: C.red, marginRight: 8 }}>CRIT {alerts.crit ?? 0}</span>
                    <span style={{ color: C.orange, marginRight: 8 }}>HIGH {alerts.high ?? 0}</span>
                    <span style={{ color: C.textSub, marginRight: 8 }}>MED {alerts.med ?? 0}</span>
                    <span style={{ color: C.textMuted }}>LOW {alerts.low ?? 0}</span>
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {(alerts.top || []).length === 0 ? (
                    <div style={{ fontSize: 12, color: C.green }}>アクティブなアラートはありません。</div>
                  ) : (
                    (alerts.top || []).map((a, i) => (
                      <div key={i} style={{ borderTop: i === 0 ? "none" : `1px dashed ${C.border}`, paddingTop: i === 0 ? 0 : 8 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color:
                              a.severity === "CRIT" ? C.red : a.severity === "HIGH" ? C.orange : C.textMuted,
                            marginRight: 6,
                          }}
                        >
                          {a.severity}
                        </span>
                        <span style={{ fontSize: 12, color: C.text }}>{a.message}</span>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>hint: {a.hint}</div>
                      </div>
                    ))
                  )}
                </div>
                <a
                  href={nav.alerts || "/mc/vnext/alerts"}
                  style={{ display: "inline-block", marginTop: 10, fontSize: 11, color: C.accent, textDecoration: "none" }}
                >
                  → alerts 全面
                </a>
              </div>

              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Canonical Sources
                  </div>
                  <div style={{ fontSize: 11, color: C.textSub }}>{sources.verdict_short || "—"}</div>
                </div>
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {(sources.canonical || []).slice(0, 6).map((s) => (
                    <div key={s.id} style={{ fontSize: 12, display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ color: C.text, flexShrink: 0 }}>{s.source_name}</span>
                      <span style={{ color: C.textMuted, fontSize: 11, textAlign: "right", wordBreak: "break-all" }}>
                        {s.source_uri || s.source_kind}
                      </span>
                    </div>
                  ))}
                </div>
                <a
                  href={nav.sources || "/mc/vnext/sources"}
                  style={{ display: "inline-block", marginTop: 10, fontSize: 11, color: C.accent, textDecoration: "none" }}
                >
                  → sources 全面
                </a>
              </div>
            </div>

            {/* Failing threads — live vs archived (CARD-MC-14) */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Failing Threads · live (top 3)
                </div>
                <div style={{ fontSize: 11, color: C.textSub }}>
                  {failingLive.length > 0 ? `${failingLive.length} 件（表示 3 件まで）` : "live 窓で再現中の失敗なし"}
                </div>
              </div>

              {failingLive.length > 0 ? (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {failingLive.slice(0, 3).map((p, i) => (
                    <a
                      key={`${p.thread_id}-${p.reason}-${i}`}
                      href={`/mc/vnext/thread/${encodeURIComponent(p.thread_id)}`}
                      style={{
                        display: "block",
                        textDecoration: "none",
                        color: C.text,
                        border: `1px solid ${C.border}`,
                        borderLeft: `3px solid ${reasonColor(p.reason)}`,
                        borderRadius: 8,
                        padding: "8px 12px",
                        background: "rgba(255,255,255,0.01)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                        <div style={{ fontSize: 12, fontFamily: "monospace", color: C.text }}>{p.thread_id}</div>
                        <div style={{ fontSize: 10, color: reasonColor(p.reason), fontWeight: 700 }}>
                          {reasonLabel(p.reason).toUpperCase()}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: C.textSub, marginTop: 4 }}>{p.detail}</div>
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
                        turn {p.turn_index ?? "—"} · final_len {p.final_len ?? "—"} · route {p.route_reason || "—"} · {String(p.last_ts).slice(0, 19)}
                      </div>
                    </a>
                  ))}
                </div>
              ) : null}

              {archivedCount > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setShowArchivedThreads((v) => !v)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${C.border}`,
                      color: C.textMuted,
                      fontSize: 11,
                      padding: "6px 10px",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    過去履歴（live 窓外）{archivedCount} 件 {showArchivedThreads ? "▲" : "▼"}
                  </button>
                  {showArchivedThreads && archivedPreview.length > 0 ? (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      {archivedPreview.map((p, i) => (
                        <a
                          key={`arch-${p.thread_id}-${i}`}
                          href={`/mc/vnext/thread/${encodeURIComponent(p.thread_id)}`}
                          style={{
                            display: "block",
                            textDecoration: "none",
                            color: C.textMuted,
                            border: `1px dashed ${C.border}`,
                            borderRadius: 8,
                            padding: "6px 10px",
                            fontSize: 11,
                          }}
                        >
                          <span style={{ fontFamily: "monospace" }}>{p.thread_id.slice(0, 28)}…</span> · {reasonLabel(p.reason)} ·{" "}
                          {String(p.last_ts).slice(0, 19)}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Canonical navigation footer */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 8,
                marginBottom: 24,
              }}
            >
              {[
                { label: "最新 thread", href: nav.thread_latest_link || "/mc/vnext/" },
                { label: "Quality", href: nav.quality || "/mc/vnext/quality" },
                { label: "Alerts", href: nav.alerts || "/mc/vnext/alerts" },
                { label: "Acceptance", href: nav.acceptance || "/mc/vnext/acceptance" },
                { label: "History", href: nav.history || "/mc/vnext/history" },
                { label: "Sources", href: nav.sources || "/mc/vnext/sources" },
                { label: "MC Classic", href: nav.classic || "/mc/classic/" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    color: C.accent,
                    background: C.accentBg,
                    border: `1px solid ${C.accent}33`,
                    padding: "10px 12px",
                    borderRadius: 8,
                    textDecoration: "none",
                  }}
                >
                  {item.label} →
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </McLayout>
  );
}
