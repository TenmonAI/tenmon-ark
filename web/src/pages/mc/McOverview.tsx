/**
 * McOverview.tsx — Mission Control V2 Overview Page
 * §15 Frontend: Aggregated system overview
 */
import React, { useEffect, useState } from "react";
import McLayout, { C } from "./McLayout";

interface OverviewData {
  generated_at?: string;
  stale?: boolean;
  service_ok?: boolean;
  health_ok?: boolean;
  health_ms?: number;
  git_sha?: string;
  git_branch?: string;
  git_dirty?: boolean;
  uptime_sec?: number;
  memory_available_gb?: number;
  memory_total_gb?: number;
  disk_percent?: number;
  load_avg?: number[];
  soul_root_status?: string;
  soul_root_bind_count?: number;
  soul_root_total?: number;
  iroha_paragraphs?: number;
  recent_errors_count?: number;
  recent_warnings_count?: number;
  collector_files?: Record<string, { size_bytes: number; mtime: number }>;
  [key: string]: any;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: "16px 20px",
      minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || C.text, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textSub, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: ok ? C.green : C.red,
      marginRight: 6,
    }} />
  );
}

function formatUptime(sec: number | undefined): string {
  if (!sec || sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function McOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mc/overview", { credentials: "include" })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  return (
    <McLayout activePage="overview">
      <div style={{ maxWidth: 1000 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.accent }}>System Overview</h1>
            <p style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 0" }}>
              {data?.generated_at ? `Last updated: ${new Date(data.generated_at).toLocaleString("ja-JP")}` : "Loading..."}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: C.accentBg,
              border: `1px solid ${C.accent}33`,
              color: C.accent,
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {loading && <div style={{ color: C.textSub, padding: 40, textAlign: "center" }}>Loading...</div>}
        {error && <div style={{ color: C.red, padding: 20, background: "rgba(239,68,68,0.1)", borderRadius: 8 }}>Error: {error}</div>}

        {data && (
          <>
            {/* Status bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "12px 20px",
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              marginBottom: 20,
              flexWrap: "wrap",
            }}>
              <div style={{ fontSize: 13 }}>
                <StatusDot ok={data.service_ok !== false} />
                Service: {data.service_ok !== false ? "Active" : "Down"}
              </div>
              <div style={{ fontSize: 13 }}>
                <StatusDot ok={data.health_ok !== false} />
                Health: {data.health_ok !== false ? `OK (${data.health_ms ?? "?"}ms)` : "Failed"}
              </div>
              <div style={{ fontSize: 13 }}>
                <StatusDot ok={data.soul_root_status === "fully_connected"} />
                Soul Root: {data.soul_root_status ?? "unknown"}
              </div>
              <div style={{ fontSize: 13, color: data.git_dirty ? C.orange : C.textSub }}>
                Git: {data.git_sha ?? "?"} {data.git_dirty ? "(dirty)" : ""}
              </div>
            </div>

            {/* Stat cards grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}>
              <StatCard label="Uptime" value={formatUptime(data.uptime_sec)} />
              <StatCard label="Git SHA" value={data.git_sha ?? "—"} sub={data.git_branch} />
              <StatCard
                label="Soul Root Bind"
                value={`${data.soul_root_bind_count ?? "?"}/${data.soul_root_total ?? "?"}`}
                color={data.soul_root_status === "fully_connected" ? C.green : C.orange}
              />
              <StatCard label="Iroha Paragraphs" value={data.iroha_paragraphs ?? 0} />
              <StatCard
                label="Memory"
                value={`${data.memory_available_gb ?? "?"}/${data.memory_total_gb ?? "?"}GB`}
              />
              <StatCard
                label="Disk"
                value={`${data.disk_percent ?? "?"}%`}
                color={(data.disk_percent ?? 0) > 90 ? C.red : undefined}
              />
              <StatCard
                label="Errors (1h)"
                value={data.recent_errors_count ?? 0}
                color={(data.recent_errors_count ?? 0) > 0 ? C.red : C.green}
              />
              <StatCard label="Load Avg" value={data.load_avg?.[0]?.toFixed(2) ?? "—"} />
            </div>

            {/* Collector files */}
            {data.collector_files && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 0, marginBottom: 12, color: C.textSub }}>Collector Files</h3>
                <div style={{ fontSize: 12 }}>
                  {Object.entries(data.collector_files).map(([name, info]) => (
                    <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}22` }}>
                      <span style={{ color: C.text }}>{name}</span>
                      <span style={{ color: C.textMuted }}>{((info as any).size_bytes / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </McLayout>
  );
}
