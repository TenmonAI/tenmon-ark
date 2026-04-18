/**
 * McGit.tsx — Mission Control V2 Git State Page
 * §15 Frontend: Git repository state viewer
 */
import React, { useEffect, useState } from "react";
import McLayout, { C } from "./McLayout";

export default function McGit() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mc/git-state", { credentials: "include" })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  return (
    <McLayout activePage="git">
      <div style={{ maxWidth: 900 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: C.accent }}>Git State</h1>
        <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 24px" }}>
          {data?.generated_at ? `Collected: ${new Date(data.generated_at).toLocaleString("ja-JP")}` : "Loading..."}
        </p>

        {loading && <div style={{ color: C.textSub, padding: 40, textAlign: "center" }}>Loading...</div>}
        {error && <div style={{ color: C.red, padding: 20, background: "rgba(239,68,68,0.1)", borderRadius: 8 }}>Error: {error}. Run the collector first.</div>}

        {data && (
          <>
            {/* HEAD info */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 0, marginBottom: 12, color: C.textSub }}>HEAD</h3>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: C.accent, fontFamily: "monospace", fontWeight: 600 }}>{data.head_sha_short}</span>
                <span style={{ color: C.textMuted, margin: "0 8px" }}>on</span>
                <span style={{ color: "#93c5fd", fontFamily: "monospace" }}>{data.branch}</span>
                {data.dirty && <span style={{ color: C.orange, marginLeft: 8, fontSize: 11 }}>(dirty: {data.modified_count} modified, {data.untracked_count} untracked)</span>}
              </div>
              <div style={{ fontSize: 12, color: C.text }}>{data.head_subject}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                by {data.head_author} at {data.head_date ? new Date(data.head_date).toLocaleString("ja-JP") : "?"}
              </div>
            </div>

            {/* Stats */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 8,
              marginBottom: 12,
            }}>
              {[
                { label: "Total Commits", value: data.stats?.total_commits ?? "?" },
                { label: "Commits (7d)", value: data.stats?.commits_7d ?? "?" },
                { label: "Contributors", value: data.stats?.contributors ?? "?" },
                { label: "Repo Size", value: `${data.stats?.repo_size_mb ?? "?"}MB` },
              ].map(s => (
                <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Recent commits */}
            {data.recent_commits?.length > 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 0, marginBottom: 12, color: C.textSub }}>Recent Commits</h3>
                {data.recent_commits.map((c: any, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}22`, fontSize: 12 }}>
                    <span style={{ color: C.accent, fontFamily: "monospace", flexShrink: 0, width: 60 }}>{c.sha}</span>
                    <span style={{ color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</span>
                    <span style={{ color: C.textMuted, flexShrink: 0, fontSize: 11 }}>{c.author}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tags */}
            {data.recent_tags?.length > 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 0, marginBottom: 12, color: C.textSub }}>Tags</h3>
                {data.recent_tags.map((t: any, i: number) => (
                  <div key={i} style={{ fontSize: 12, padding: "4px 0", display: "flex", gap: 10 }}>
                    <span style={{ color: C.accent }}>{t.name}</span>
                    <span style={{ color: C.textMuted }}>{t.sha}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </McLayout>
  );
}
