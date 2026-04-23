/**
 * Mission Control vNext — SPA shell (CARD_MC_VNEXT_FOUNDATION_V1).
 * Canonical entry is /mc/vnext. Compatibility redirects are handled before the app boots.
 */
import React, { useEffect, useMemo, useState } from "react";
import McVnextLayout, { type McVnextNavKey } from "./McVnextLayout";
import VnextJsonPanel from "../../components/mc-vnext/VnextJsonPanel";
import { C } from "../mc/McLayout";

type GateState = "loading" | "disabled" | "forbidden" | "ready" | "error";

type RepairCard = {
  id: string;
  priority: number;
  title: string;
  why_now: string;
  affected_layer: string;
  suggested_fix_area: string;
  verify_hint: string;
  source_signals?: string[];
  related_thread_ids?: string[];
};

// priority の色分けは landing / react / acceptance 下段で統一:
//   90+ = CRIT(赤), 70-89 = HIGH(橙), 50-69 = MED(黄), <50 = WATCH(青)
function repairPrioColor(p: number): string {
  return p >= 90 ? "#ff6b6b" : p >= 70 ? "#f6a14c" : p >= 50 ? "#e0c04d" : "#6fa3c9";
}
function repairPrioLabel(p: number): string {
  return p >= 90 ? "CRIT" : p >= 70 ? "HIGH" : p >= 50 ? "MED" : "WATCH";
}

function RepairCardList({ cards }: { cards: RepairCard[] }) {
  if (cards.length === 0) return null;
  // priority 降順（すでに API 側でソート済みだが UI でも明示）
  const sorted = [...cards].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 10 }}>
      {sorted.map((c) => {
        const col = repairPrioColor(c.priority);
        const lbl = repairPrioLabel(c.priority);
        return (
          <div
            key={c.id}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderLeft: `4px solid ${col}`,
              borderRadius: 8,
              padding: "12px 14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: col, color: "#000", fontWeight: 700 }}>
                P{c.priority} · {lbl}
              </span>
              <span style={{ fontSize: 11, color: C.textMuted }}>{c.affected_layer}</span>
            </div>
            <div style={{ fontSize: 14, color: C.text, fontWeight: 600, marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5, marginBottom: 8 }}>{c.why_now}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
              <div><span style={{ color: C.accent }}>fix: </span>{c.suggested_fix_area}</div>
              <div style={{ marginTop: 4 }}><span style={{ color: C.accent }}>verify: </span>{c.verify_hint}</div>
              {Array.isArray(c.related_thread_ids) && c.related_thread_ids.length > 0 ? (
                <div style={{ marginTop: 6 }}>
                  <span style={{ color: C.accent }}>threads: </span>
                  {c.related_thread_ids.slice(0, 3).map((tid, i) => (
                    <span key={tid}>
                      {i > 0 ? " · " : ""}
                      <a href={`/mc/vnext/thread/${encodeURIComponent(tid)}`} style={{ color: C.textSub, textDecoration: "underline" }}>
                        {tid.slice(0, 24)}
                      </a>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function parseRoute(pathname: string): {
  active: McVnextNavKey;
  apiPath: string;
  threadId: string;
  fileRel: string;
} {
  const sub = pathname.replace(/^\/mc\/vnext\/?/, "").replace(/\/$/, "");
  if (!sub) return { active: "overview", apiPath: "/api/mc/vnext/overview", threadId: "", fileRel: "" };
  if (sub === "circuit") return { active: "circuit", apiPath: "/api/mc/vnext/circuit", threadId: "", fileRel: "" };
  if (sub.startsWith("thread/")) {
    const threadId = decodeURIComponent(sub.slice(7));
    return {
      active: "thread",
      apiPath: `/api/mc/vnext/thread/${encodeURIComponent(threadId)}`,
      threadId,
      fileRel: "",
    };
  }
  if (sub === "repo") return { active: "repo", apiPath: "/api/mc/vnext/repo", threadId: "", fileRel: "" };
  if (sub.startsWith("file/")) {
    const fileRel = decodeURIComponent(sub.slice(5));
    const q = new URLSearchParams({ rel: fileRel });
    return { active: "file", apiPath: `/api/mc/vnext/file?${q}`, threadId: "", fileRel };
  }
  if (sub === "graph") return { active: "graph", apiPath: "/api/mc/vnext/graph", threadId: "", fileRel: "" };
  if (sub === "sources") return { active: "sources", apiPath: "/api/mc/vnext/sources", threadId: "", fileRel: "" };
  if (sub === "infra") return { active: "infra", apiPath: "/api/mc/vnext/infra", threadId: "", fileRel: "" };
  if (sub === "quality") return { active: "quality", apiPath: "/api/mc/vnext/quality", threadId: "", fileRel: "" };
  if (sub === "alerts") return { active: "alerts", apiPath: "/api/mc/vnext/alerts", threadId: "", fileRel: "" };
  if (sub === "acceptance") return { active: "acceptance", apiPath: "/api/mc/vnext/acceptance", threadId: "", fileRel: "" };
  if (sub === "repair" || sub === "repair-hub") return { active: "repair", apiPath: "/api/mc/vnext/repair-hub", threadId: "", fileRel: "" };
  if (sub === "history") return { active: "history", apiPath: "/api/mc/vnext/history", threadId: "", fileRel: "" };
  return { active: "overview", apiPath: "/api/mc/vnext/overview", threadId: "", fileRel: "" };
}

export default function McVnextApp() {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/mc/vnext/";
  const { active, apiPath, threadId, fileRel } = useMemo(() => parseRoute(pathname), [pathname]);

  const [gate, setGate] = useState<GateState>("loading");
  const [payload, setPayload] = useState<unknown>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [analyzerEnabled, setAnalyzerEnabled] = useState<boolean | null>(null);
  const [ledgerWritesEnabled, setLedgerWritesEnabled] = useState<boolean | null>(null);
  const [ledgerWriteHint, setLedgerWriteHint] = useState<string>("");
  const [historySel, setHistorySel] = useState<string | null>(null);

  useEffect(() => {
    setHistorySel(null);
  }, [pathname]);

  useEffect(() => {
    let dead = false;
    (async () => {
      setErrMsg(null);
      setGate("loading");
      try {
        const en = await fetch("/api/mc/vnext/enabled", { credentials: "include" });
        const ej = await en.json().catch(() => ({}));
        if (dead) return;
        setAnalyzerEnabled(Boolean(ej?.analyzerEnabled));
        setLedgerWritesEnabled(
          typeof ej?.ledgerWritesEnabled === "boolean" ? (ej.ledgerWritesEnabled as boolean) : null,
        );
        setLedgerWriteHint(typeof ej?.ledgerWriteHint === "string" ? (ej.ledgerWriteHint as string) : "");
        if (!en.ok || !ej?.enabled) {
          setGate("disabled");
          setPayload(null);
          return;
        }
        const r = await fetch(apiPath, { credentials: "include" });
        const j = await r.json().catch(() => ({}));
        if (dead) return;
        if (r.status === 401 || r.status === 403) {
          setGate("forbidden");
          setPayload(j);
          return;
        }
        if (!r.ok) {
          setGate("error");
          setErrMsg(`HTTP ${r.status}`);
          setPayload(j);
          return;
        }
        setPayload(j);
        setGate("ready");
      } catch (e: unknown) {
        if (dead) return;
        setGate("error");
        setErrMsg(e instanceof Error ? e.message : "fetch failed");
      }
    })();
    return () => {
      dead = true;
    };
  }, [apiPath, pathname]);

  const showAnalyzerBanner =
    analyzerEnabled === false &&
    (active === "quality" || active === "alerts" || active === "acceptance" || active === "repair");

  const showLedgerBanner = gate === "ready" && ledgerWritesEnabled === false;

  const banner = (
    <>
      {gate === "disabled" ? (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: "rgba(245,158,11,0.08)",
            color: C.orange,
            fontSize: 13,
          }}
        >
          MC vNext は無効です（サーバで <code style={{ color: C.text }}>TENMON_MC_VNEXT=1</code> を設定後に再読み込み）。
        </div>
      ) : gate === "forbidden" ? (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: "rgba(239,68,68,0.08)",
            color: C.red,
            fontSize: 13,
          }}
        >
          founder（オーナー）のみが API を参照できます。MC P5 と同じアカウントで founder フラグが付いているか確認してください。
        </div>
      ) : null}
      {showLedgerBanner ? (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: "rgba(245,158,11,0.1)",
            color: C.orange,
            fontSize: 13,
          }}
        >
          <strong>Ledger 書き込み OFF</strong> — <code style={{ color: C.text }}>TENMON_MC_VNEXT_LEDGER=1</code>{" "}
          が無いと <code style={{ color: C.text }}>mc_*_ledger</code> は増えません（vNext API 有効とは別フラグです）。
          {ledgerWriteHint ? <div style={{ marginTop: 8, color: C.textSub, fontSize: 12 }}>{ledgerWriteHint}</div> : null}
        </div>
      ) : null}
      {showAnalyzerBanner ? (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: "rgba(59,130,246,0.08)",
            color: C.textSub,
            fontSize: 13,
          }}
        >
          Analyzer は OFF です（<code style={{ color: C.text }}>TENMON_MC_VNEXT_ANALYZER=1</code> で指標・アラート・acceptance が実データ駆動になります）。
        </div>
      ) : null}
    </>
  );

  const title =
    active === "thread"
      ? `${SECTION_LABEL.thread} · ${threadId || "—"}`
      : active === "file"
        ? `${SECTION_LABEL.file} · ${fileRel || "/"}`
        : SECTION_LABEL[active];

  return (
    <McVnextLayout active={active} banner={banner}>
      <div style={{ maxWidth: 960 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.accent }}>{title}</h1>
        <p style={{ fontSize: 12, color: C.textMuted, margin: "8px 0 0" }}>
          Read-only skeleton · 機密トークンや env 生値は表示しません
        </p>

        {gate === "loading" && <p style={{ color: C.textSub, marginTop: 24 }}>読み込み中…</p>}
        {gate === "error" && (
          <p style={{ color: C.red, marginTop: 16 }}>
            {errMsg || "error"}
          </p>
        )}

        {(gate === "ready" || gate === "forbidden" || gate === "error") && payload != null && (
          <VnextJsonPanel title="API payload (sanitized)" data={payload} />
        )}

        {gate === "ready" &&
          active === "thread" &&
          payload &&
          typeof payload === "object" &&
          (() => {
            const ledgers = (payload as Record<string, unknown>).ledgers as Record<string, unknown> | undefined;
            const turns = Array.isArray(ledgers?.turns) ? (ledgers?.turns as Record<string, unknown>[]) : [];
            const requests = Array.isArray(ledgers?.requests) ? (ledgers?.requests as Record<string, unknown>[]) : [];
            const summary = (ledgers?.summary ?? {}) as Record<string, unknown>;
            if (turns.length === 0) return null;

            const verdictColor = (verdict: string) => {
              if (/missing|fail|fallback|truncation/.test(verdict)) return C.red;
              if (/partial|assistant_only/.test(verdict)) return C.orange;
              if (/persisted|natural_end|hit_|finalized/.test(verdict)) return C.green;
              return C.textMuted;
            };

            return (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>Thread Trace</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    turns {String(summary.turn_count ?? turns.length)} · events {String(summary.event_count ?? 0)}
                    {" · continuation "}{String(summary.continuation_turns ?? 0)}
                    {" · requests "}{String(summary.request_count ?? requests.length)}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {turns.map((turn) => {
                    const events = Array.isArray(turn.events) ? (turn.events as Record<string, unknown>[]) : [];
                    const cont = (turn.continuation || {}) as Record<string, unknown>;
                    const isContinuation = Boolean(cont.requested);
                    const continuationVerdict = isContinuation
                      ? cont.success === true
                        ? "success"
                        : cont.success === false
                          ? "fail"
                          : "unknown"
                      : "—";
                    const continuationColor = isContinuation
                      ? cont.success === true
                        ? C.green
                        : cont.success === false
                          ? C.red
                          : C.orange
                      : C.textMuted;
                    const memVerdict = String(turn.memoryVerdict || "");
                    const persistVerdict = String(turn.persistVerdict || "");
                    const finalizeVerdict = String(turn.finalizeVerdict || "");
                    const reqId = String(turn.request_id || "");
                    const stepIdx = String(turn.step_index ?? "—");
                    const turnIdx = String(turn.turn_index ?? "—");
                    const userInput = String(turn.userInput || "").slice(0, 200);

                    return (
                      <div
                        key={`${turnIdx}-${stepIdx}`}
                        style={{
                          background: C.card,
                          border: `1px solid ${isContinuation ? C.accent : C.border}`,
                          borderRadius: 10,
                          padding: 14,
                          boxShadow: isContinuation ? "0 0 0 1px rgba(94,234,212,0.15) inset" : undefined,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                            turn #{turnIdx} <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 400 }}>(step {stepIdx})</span>
                          </div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11 }}>
                            <span style={{ color: continuationColor }}>
                              continuation: {continuationVerdict}
                              {isContinuation ? ` · ${String(cont.historySource || cont.source || "—")} hl=${String(cont.historyLen ?? "—")}` : ""}
                            </span>
                            <span style={{ color: verdictColor(memVerdict) }}>memory: {memVerdict || "—"}</span>
                            <span style={{ color: verdictColor(persistVerdict) }}>persist: {persistVerdict || "—"}</span>
                            <span style={{ color: verdictColor(finalizeVerdict) }}>finalize: {finalizeVerdict || "—"}</span>
                          </div>
                        </div>
                        {reqId ? (
                          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6, fontFamily: "monospace" }}>
                            request_id: {reqId}
                          </div>
                        ) : null}
                        {userInput ? (
                          <div style={{ marginTop: 8, padding: "6px 10px", background: C.bg, borderRadius: 6, fontSize: 12, color: C.textSub }}>
                            <span style={{ color: C.textMuted, fontSize: 10, marginRight: 6 }}>input</span>
                            {userInput}
                          </div>
                        ) : null}

                        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                          {events.map((ev, i) => {
                            const node = String(ev.node || "");
                            const emphasise = isContinuation && ["memory_read", "llm_call", "finalize", "persistence"].includes(node);
                            return (
                              <div
                                key={`${turnIdx}-${stepIdx}-${i}-${node}`}
                                style={{
                                  border: `1px solid ${emphasise ? C.accent : C.border}`,
                                  borderRadius: 8,
                                  padding: 10,
                                  background: emphasise ? "rgba(94,234,212,0.05)" : undefined,
                                }}
                              >
                                <div style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>{String(ev.label || node || "node")}</div>
                                <div style={{ fontSize: 11, color: C.textSub, marginTop: 6 }}>status: {String(ev.status || "—")}</div>
                                {ev.reason ? <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{String(ev.reason)}</div> : null}
                                {ev.provider || ev.effective_model ? (
                                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                                    {String(ev.provider || "—")} / {String(ev.effective_model || ev.requested_model || "—")}
                                  </div>
                                ) : null}
                                {ev.finish_reason ? <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>finish: {String(ev.finish_reason)}</div> : null}
                                {ev.source ? <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>source: {String(ev.source)}</div> : null}
                                {ev.history_len != null ? <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>history: {String(ev.history_len)}</div> : null}
                                {ev.out_len != null ? <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>out: {String(ev.out_len)}</div> : null}
                                {ev.final_len != null ? <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>final: {String(ev.final_len)}</div> : null}
                                {ev.persisted_rows != null ? <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>persisted: {String(ev.persisted_rows)}</div> : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {requests.length > 0 ? (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 8 }}>
                      Requests ({requests.length})
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 8 }}>
                      {requests.map((r, i) => (
                        <div
                          key={`${i}-${String(r.request_id)}`}
                          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 11 }}
                        >
                          <div style={{ fontFamily: "monospace", color: C.text }}>{String(r.request_id)}</div>
                          <div style={{ color: C.textMuted, marginTop: 4 }}>
                            turn {String(r.turn_index)} · step {String(r.step_index)} · {String(r.route_reason || "—")}
                          </div>
                          <div style={{ color: C.textMuted, marginTop: 2 }}>
                            {String(r.effective_model || r.requested_model || "—")} · {String(r.finish_reason || "—")}
                          </div>
                          <div style={{ color: C.textMuted, marginTop: 2 }}>
                            mem: {String(r.memory_verdict || "—")} · persist: {String(r.persist_verdict || "—")}
                            {r.continuation_requested ? ` · cont: ${r.continuation_success ? "ok" : "fail"} hl=${String(r.history_len ?? "—")}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })()}

        {gate === "ready" &&
          active === "circuit" &&
          payload &&
          typeof payload === "object" &&
          (() => {
            const ledgers = (payload as Record<string, unknown>).ledgers as Record<string, unknown> | undefined;
            const nodes = Array.isArray(ledgers?.nodes) ? (ledgers?.nodes as Record<string, unknown>[]) : [];
            if (nodes.length === 0) return null;
            return (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 10 }}>Circuit Map</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  {nodes.map((node, i) => (
                    <div key={`${i}-${String(node.node)}`} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: C.accent, fontWeight: 700 }}>{String(node.label || node.node || "node")}</div>
                      <div style={{ fontSize: 12, color: node.success ? C.green : node.status === "partial" ? C.orange : C.red, marginTop: 8 }}>
                        {String(node.status || "—")}
                      </div>
                      {node.reason ? <div style={{ fontSize: 11, color: C.textSub, marginTop: 6 }}>{String(node.reason)}</div> : null}
                      {(node.provider || node.effective_model) ? (
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
                          {String(node.provider || "—")} / {String(node.effective_model || node.requested_model || "—")}
                        </div>
                      ) : null}
                      {node.finish_reason ? <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>finish: {String(node.finish_reason)}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        {gate === "ready" &&
          active === "sources" &&
          payload &&
          typeof payload === "object" &&
          (() => {
            const ledgers = (payload as Record<string, unknown>).ledgers as Record<string, unknown> | undefined;
            const items = Array.isArray(ledgers?.items) ? (ledgers?.items as Record<string, unknown>[]) : [];
            const graph = (ledgers?.graph ?? {}) as Record<string, unknown>;
            const edges = Array.isArray(graph.edges) ? (graph.edges as Record<string, unknown>[]) : [];
            if (items.length === 0) return null;

            const labelById = new Map<string, string>();
            for (const it of items) {
              const id = String(it.id ?? "");
              if (!id) continue;
              const label = String(it.source_name || it.label || id);
              labelById.set(id, label);
            }
            const fmtLink = (id: string): string => labelById.get(id) || id;

            const roleOrder: Record<string, number> = { canonical: 0, mirror: 1, backup: 2, derived: 3 };
            const sorted = [...items].sort((a, b) => {
              const ra = String(a.source_role || a.role || "");
              const rb = String(b.source_role || b.role || "");
              return (roleOrder[ra] ?? 9) - (roleOrder[rb] ?? 9);
            });
            const roles: Array<{ role: string; list: Record<string, unknown>[] }> = [
              { role: "canonical", list: sorted.filter((x) => String(x.source_role || x.role) === "canonical") },
              { role: "mirror", list: sorted.filter((x) => String(x.source_role || x.role) === "mirror") },
              { role: "backup", list: sorted.filter((x) => String(x.source_role || x.role) === "backup") },
              { role: "derived", list: sorted.filter((x) => String(x.source_role || x.role) === "derived") },
            ];

            const chip = (label: string, tone: "accent" | "muted" = "muted") => (
              <span
                key={label}
                style={{
                  display: "inline-block",
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  background: C.bg,
                  color: tone === "accent" ? C.accent : C.textMuted,
                  marginRight: 4,
                  marginTop: 4,
                }}
              >
                {label}
              </span>
            );

            return (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>Source Registry</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    canonical {roles[0].list.length} · mirror {roles[1].list.length} · backup {roles[2].list.length} · derived {roles[3].list.length} · graph edges {edges.length}
                  </div>
                </div>

                {roles.map((group) =>
                  group.list.length === 0 ? null : (
                    <div key={group.role} style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                        {group.role} · {group.list.length}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                        {group.list.map((it) => {
                          const linked = Array.isArray(it.linked_to) ? (it.linked_to as unknown[]).map(String) : [];
                          const uri = String(it.source_uri || it.location || "");
                          const kind = String(it.source_kind || it.category || "—");
                          const name = String(it.source_name || it.label || it.id);
                          const lastSeen = String(it.last_seen || "");
                          return (
                            <div key={String(it.id)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{name}</div>
                                <div style={{ fontSize: 10, color: C.accent }}>{kind}</div>
                              </div>
                              <div style={{ fontSize: 11, color: C.textSub, marginTop: 6, wordBreak: "break-all" }}>{uri || "—"}</div>
                              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
                                id: {String(it.id)} · status: {String(it.status || "—")}
                                {lastSeen ? ` · last_seen: ${lastSeen.slice(0, 19)}` : ""}
                              </div>
                              {linked.length > 0 ? (
                                <div style={{ marginTop: 8 }}>
                                  <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>linked_to</div>
                                  <div>{linked.map((l) => chip(fmtLink(l)))}</div>
                                </div>
                              ) : null}
                              {it.note ? <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>{String(it.note)}</div> : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}

                {edges.length > 0 ? (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 8 }}>Linkage graph ({edges.length})</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8 }}>
                      {edges.slice(0, 60).map((e, i) => (
                        <div
                          key={`${i}-${String(e.from)}-${String(e.to)}`}
                          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 11 }}
                        >
                          <span style={{ color: C.text }}>{fmtLink(String(e.from))}</span>
                          <span style={{ color: C.textMuted }}> ─[{String(e.relation || "link")}]→ </span>
                          <span style={{ color: C.text }}>{fmtLink(String(e.to))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })()}

        {gate === "ready" &&
          (active === "repo" || active === "infra") &&
          payload &&
          typeof payload === "object" &&
          (() => {
            const ledgers = (payload as Record<string, unknown>).ledgers as Record<string, unknown> | undefined;
            if (!ledgers) return null;

            const renderPairs = (pairs: Array<{ k: string; v: string }>) => (
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                {pairs.map((p) => (
                  <div key={p.k} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>{p.k}</div>
                    <div style={{ fontSize: 13, color: C.text, wordBreak: "break-all" }}>{p.v}</div>
                  </div>
                ))}
              </div>
            );

            const renderListSection = (title: string, rows: Record<string, unknown>[], cols: Array<{ k: string; label?: string }>, limit = 12) => {
              if (!rows || rows.length === 0) return null;
              return (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 6 }}>
                    {title} ({rows.length})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8 }}>
                    {rows.slice(0, limit).map((r, i) => (
                      <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 11 }}>
                        {cols.map((c) => (
                          <div key={c.k} style={{ color: C.textSub }}>
                            <span style={{ color: C.textMuted }}>{c.label || c.k}: </span>
                            <span style={{ color: C.text, wordBreak: "break-all" }}>{String(r[c.k] ?? "—")}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            };

            if (active === "repo") {
              const pairs: Array<{ k: string; v: string }> = [
                { k: "repo_root", v: String(ledgers.repo_root || "—") },
                { k: "branch", v: String(ledgers.branch || "—") },
                { k: "head", v: String(ledgers.head_sha_short || "—") },
                { k: "head_subject", v: String(ledgers.head_subject || "—") },
                { k: "dirty", v: String(ledgers.dirty ?? "—") },
                { k: "modified_count", v: String(ledgers.modified_count ?? 0) },
                { k: "untracked_count", v: String(ledgers.untracked_count ?? 0) },
              ];
              const source = (ledgers.source || {}) as Record<string, unknown>;
              const keyFiles = Array.isArray(ledgers.key_files) ? (ledgers.key_files as Record<string, unknown>[]) : [];
              const recent = Array.isArray(ledgers.recent_commits) ? (ledgers.recent_commits as Record<string, unknown>[]) : [];
              const runtimeConn = Array.isArray(ledgers.runtime_connections) ? (ledgers.runtime_connections as Record<string, unknown>[]) : [];
              return (
                <>
                  {renderPairs(pairs)}
                  {source.source_uri ? (
                    <div style={{ marginTop: 12, padding: 10, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11, color: C.textSub }}>
                      <span style={{ color: C.textMuted }}>source: </span>
                      <span style={{ color: C.text }}>{String(source.source_name || source.id)}</span>
                      <span style={{ color: C.textMuted, marginLeft: 8 }}>{String(source.source_uri)}</span>
                    </div>
                  ) : null}
                  {renderListSection("Key files", keyFiles, [
                    { k: "path", label: "path" },
                    { k: "size_bytes", label: "size" },
                  ])}
                  {renderListSection("Recent commits", recent, [
                    { k: "sha", label: "sha" },
                    { k: "subject", label: "subject" },
                  ], 8)}
                  {renderListSection("Runtime connections", runtimeConn, [
                    { k: "id", label: "node" },
                    { k: "role", label: "role" },
                    { k: "location", label: "location" },
                  ])}
                </>
              );
            }

            const runtime = (ledgers.runtime || {}) as Record<string, unknown>;
            const runtimePairs: Array<{ k: string; v: string }> = [
              { k: "hostname", v: String(runtime.hostname || "—") },
              { k: "public_ip", v: String(runtime.public_ip || "—") },
              { k: "os", v: String(runtime.os || "—") },
              { k: "service", v: String(runtime.service || "—") },
              { k: "active", v: String(runtime.service_active ?? "—") },
              { k: "uptime_sec", v: String(runtime.uptime_sec ?? "—") },
              { k: "node", v: String(runtime.node_version || "—") },
              { k: "state_file_stale", v: String(runtime.state_file_stale ?? "—") },
            ];
            const directories = Array.isArray(ledgers.directories) ? (ledgers.directories as Record<string, unknown>[]) : [];
            const services = Array.isArray(ledgers.systemd_services) ? (ledgers.systemd_services as Record<string, unknown>[]) : [];
            const nginx = Array.isArray(ledgers.nginx_sites) ? (ledgers.nginx_sites as Record<string, unknown>[]) : [];
            const dbs = Array.isArray(ledgers.databases) ? (ledgers.databases as Record<string, unknown>[]) : [];
            const topo = Array.isArray(ledgers.topology_nodes) ? (ledgers.topology_nodes as Record<string, unknown>[]) : [];
            return (
              <>
                {renderPairs(runtimePairs)}
                {renderListSection("Directories", directories, [
                  { k: "path", label: "path" },
                  { k: "kind", label: "kind" },
                  { k: "entry_count", label: "entries" },
                ])}
                {renderListSection("Databases", dbs, [
                  { k: "name", label: "name" },
                  { k: "path", label: "path" },
                  { k: "size_mb", label: "MB" },
                ])}
                {renderListSection("Systemd", services, [
                  { k: "unit", label: "unit" },
                  { k: "active", label: "active" },
                  { k: "substate", label: "substate" },
                ])}
                {renderListSection("Nginx sites", nginx, [
                  { k: "name", label: "name" },
                  { k: "dir", label: "dir" },
                ])}
                {renderListSection("Topology", topo, [
                  { k: "id", label: "id" },
                  { k: "kind", label: "kind" },
                  { k: "location", label: "location" },
                ])}
              </>
            );
          })()}

        {gate === "ready" &&
          payload &&
          typeof payload === "object" &&
          (active === "quality" || active === "alerts" || active === "acceptance") &&
          (() => {
            const p = payload as Record<string, unknown>;
            const a = p.analyzer as Record<string, unknown> | undefined;
            if (!a || a.sample_count === 0) return null;
            const pct = (x: unknown) =>
              typeof x === "number" && Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : String(x ?? "—");
            const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x.toFixed(2) : String(x ?? "—"));
            const cells: Array<{ k: string; v: string }> = [
              { k: "avg length", v: num(a.average_length) },
              { k: "natural end rate", v: pct(a.natural_end_rate) },
              { k: "continuation success", v: pct(a.continuation_success_rate) },
              { k: "truncation suspect", v: pct(a.truncation_suspect_rate) },
              { k: "generic fallback", v: pct(a.generic_fallback_rate) },
              { k: "heading excess", v: pct(a.heading_excess_rate) },
              { k: "avg sentence len", v: num(a.average_sentence_length) },
              { k: "politeness", v: num(a.politeness_consistency_score) },
              { k: "readability", v: num(a.readability_score) },
              { k: "tenmon style fit", v: num(a.tenmon_style_fit_score) },
            ];
            const sc = a.sample_compare as Record<string, Record<string, unknown>> | undefined;
            return (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 10 }}>Analyzer（24h）</div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  {cells.map((c) => (
                    <div
                      key={c.k}
                      style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                      }}
                    >
                      <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>{c.k}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{c.v}</div>
                    </div>
                  ))}
                </div>
                {sc?.good?.final_tail != null || sc?.bad?.final_tail != null ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 11, color: C.green, marginBottom: 8 }}>良い応答 tail（truncation 低め）</div>
                      <pre style={{ margin: 0, fontSize: 11, color: C.textSub, whiteSpace: "pre-wrap" }}>
                        {String(sc?.good?.final_tail || "—")}
                      </pre>
                    </div>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 11, color: C.red, marginBottom: 8 }}>悪い応答 tail（truncation 高め）</div>
                      <pre style={{ margin: 0, fontSize: 11, color: C.textSub, whiteSpace: "pre-wrap" }}>
                        {String(sc?.bad?.final_tail || "—")}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })()}

        {gate === "ready" &&
          active === "alerts" &&
          payload &&
          typeof payload === "object" &&
          Array.isArray((payload as Record<string, unknown>).alerts) &&
          ((payload as Record<string, unknown>).alerts as Record<string, unknown>[]).length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 10 }}>重大度別アラート</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {((payload as Record<string, unknown>).alerts as Record<string, unknown>[]).map((al, i) => (
                  <div
                    key={i}
                    style={{
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "10px 12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color:
                          al.severity === "CRIT" ? C.red : al.severity === "HIGH" ? C.orange : C.textMuted,
                        marginRight: 8,
                      }}
                    >
                      {String(al.severity || "")}
                    </span>
                    <span style={{ fontSize: 12, color: C.text }}>{String(al.message || "")}</span>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>{String(al.hint || "")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {gate === "ready" &&
          active === "acceptance" &&
          payload &&
          typeof payload === "object" &&
          (() => {
            const p = payload as Record<string, unknown>;
            const acc = (p.acceptance as Record<string, unknown> | undefined) ?? p;
            if (!acc) return null;
            const st = String(acc.verdict || acc.status || "—");
            const reasons = Array.isArray(acc.reasons) ? (acc.reasons as string[]) : [];
            const passed = Array.isArray(acc.passed) ? (acc.passed as string[]) : [];
            const miss = Array.isArray(acc.missingProof) ? (acc.missingProof as string[]) : [];
            const nextCard = String(acc.nextRecommendedCard || "");
            const lastAt = String(acc.lastVerifiedAt || "");
            const checks = Array.isArray(acc.checks)
              ? (acc.checks as Array<{ id: string; label: string; status: string; detail: string; affected_layer?: string }>)
              : [];
            const topLayer = String(acc.top_affected_layer || "none");
            const whyNow = String(acc.why_now || "").trim();
            const statusColor = (s: string) =>
              s === "pass" ? C.green : s === "fail" ? C.red : C.orange;
            const reasonsLabel =
              st === "PASS" ? "確認済み (reasons)" : st === "WATCH" ? "未閉鎖 / 要観察の理由" : "破綻の理由";
            return (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: st === "PASS" ? C.green : st === "FAIL" ? C.red : C.orange }}>
                    {st}
                  </div>
                  {st !== "PASS" && topLayer !== "none" ? (
                    <div style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: st === "FAIL" ? "rgba(255,107,107,0.15)" : "rgba(246,161,76,0.15)", color: st === "FAIL" ? C.red : C.orange, fontWeight: 600 }}>
                      {st === "FAIL" ? "最優先 layer" : "要観察 layer"}: {topLayer}
                    </div>
                  ) : null}
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    {lastAt ? `last verified: ${lastAt}` : "current acceptance status"}
                  </div>
                </div>

                {whyNow ? (
                  <div style={{ marginTop: 12, fontSize: 13, color: C.textSub, lineHeight: 1.55 }}>
                    <span style={{ color: C.accent, fontWeight: 600 }}>why now · </span>
                    {whyNow}
                  </div>
                ) : null}

                {(() => {
                  const hint = String(p.why_still_fail_watch_hint || "").trim();
                  const hrc = Array.isArray(p.historical_root_causes) ? (p.historical_root_causes as Record<string, unknown>[]) : [];
                  if (!hint && hrc.length === 0) return null;
                  return (
                    <div style={{ marginTop: 16, padding: 12, borderRadius: 8, border: `1px solid ${C.border}`, background: "rgba(59,130,246,0.06)" }}>
                      <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 8 }}>history ledger（補助）</div>
                      {hint ? (
                        <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.55, marginBottom: hrc.length ? 10 : 0 }}>
                          <span style={{ color: C.textMuted }}>why still fail / watch · </span>
                          {hint}
                        </div>
                      ) : null}
                      {hrc.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.textSub, lineHeight: 1.45 }}>
                          {hrc.slice(0, 6).map((h) => (
                            <li key={String(h.record_id || h.title)}>
                              <strong style={{ color: C.text }}>{String(h.title || "").slice(0, 72)}</strong>
                              <span style={{ color: C.textMuted }}> · {String(h.status || "")}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <a href="/mc/vnext/history" style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: C.accent, textDecoration: "none" }}>
                        → system history タイムライン
                      </a>
                    </div>
                  );
                })()}

                {checks.length > 0 ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 6 }}>scorecard (7 signals)</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
                      {checks.map((c) => (
                        <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: statusColor(c.status), color: "#000", fontWeight: 700, textTransform: "uppercase" }}>
                              {c.status}
                            </span>
                            <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{c.label}</span>
                            {c.affected_layer ? (
                              <span style={{ fontSize: 10, color: C.textMuted, marginLeft: "auto" }}>{c.affected_layer}</span>
                            ) : null}
                          </div>
                          <div style={{ marginTop: 6, fontSize: 12, color: C.textSub, lineHeight: 1.5 }}>{c.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {reasons.length > 0 ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{reasonsLabel}</div>
                    <ul style={{ color: C.textSub, fontSize: 13, lineHeight: 1.5 }}>
                      {reasons.map((r) => (
                        <li key={r.slice(0, 60)}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {st !== "PASS" && passed.length > 0 ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>確認済み (passed)</div>
                    <ul style={{ color: C.textSub, fontSize: 12, lineHeight: 1.5 }}>
                      {passed.map((r) => (
                        <li key={r.slice(0, 60)}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {miss.length > 0 ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>missing proof</div>
                    <ul style={{ color: C.textMuted, fontSize: 12 }}>
                      {miss.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {nextCard ? (
                  <div style={{ marginTop: 14, padding: 12, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: C.textMuted }}>next recommended card</div>
                    <div style={{ fontSize: 13, color: C.text, marginTop: 6 }}>{nextCard}</div>
                  </div>
                ) : null}

                {(() => {
                  const rh = p.repair_hub as { cards?: unknown[]; total_candidates?: number; input_summary?: Record<string, unknown> } | undefined;
                  const cards = Array.isArray(rh?.cards) ? (rh!.cards as RepairCard[]) : [];
                  if (cards.length === 0) return null;
                  return (
                    <div style={{ marginTop: 22 }}>
                      <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 8 }}>
                        repair hub — 次に直すべき {cards.length} 件
                      </div>
                      <RepairCardList cards={cards} />
                      <div style={{ marginTop: 8 }}>
                        <a href="/mc/vnext/repair" style={{ fontSize: 12, color: C.accent, textDecoration: "none" }}>→ repair-hub 全面</a>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

        {gate === "ready" &&
          active === "repair" &&
          payload &&
          typeof payload === "object" &&
          (() => {
            const p = payload as Record<string, unknown>;
            const cards = Array.isArray(p.cards) ? (p.cards as RepairCard[]) : [];
            const summary = (p.input_summary as Record<string, unknown> | undefined) || {};
            const total = typeof p.total_candidates === "number" ? p.total_candidates : cards.length;
            return (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Repair hub</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    verdict={String(summary.verdict ?? "—")} · CRIT={String(summary.crit_alerts ?? 0)} · HIGH={String(summary.high_alerts ?? 0)} · live={String(summary.problematic_threads_live ?? summary.problematic_threads ?? 0)} · archived={String(summary.problematic_threads_archived ?? 0)} · canonical={String(summary.canonical_sources ?? 0)}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                  ルール発火候補 {total} 件から layer 別に dedup して上位 {cards.length} 件を提示。
                </div>
                <div style={{ marginTop: 16 }}>
                  <RepairCardList cards={cards} />
                </div>
                <div style={{ marginTop: 14, fontSize: 12, color: C.textMuted }}>
                  <a href="/mc/vnext/acceptance" style={{ color: C.accent, textDecoration: "none", marginRight: 14 }}>→ acceptance 判定へ</a>
                  <a href="/mc/vnext/history" style={{ color: C.accent, textDecoration: "none", marginRight: 14 }}>→ system history</a>
                  <a href="/mc/vnext/alerts" style={{ color: C.accent, textDecoration: "none", marginRight: 14 }}>→ alerts</a>
                  <a href="/mc/vnext/sources" style={{ color: C.accent, textDecoration: "none" }}>→ sources</a>
                </div>
              </div>
            );
          })()}

        {gate === "ready" &&
          active === "history" &&
          payload &&
          typeof payload === "object" &&
          (() => {
            const p = payload as Record<string, unknown>;
            const passed = Array.isArray(p.latest_passed_cards) ? (p.latest_passed_cards as Record<string, unknown>[]) : [];
            const failed = Array.isArray(p.latest_failed_cards) ? (p.latest_failed_cards as Record<string, unknown>[]) : [];
            const gaps = Array.isArray(p.current_open_gaps) ? (p.current_open_gaps as Record<string, unknown>[]) : [];
            const roots = Array.isArray(p.historical_root_causes) ? (p.historical_root_causes as Record<string, unknown>[]) : [];
            const timeline = Array.isArray(p.timeline) ? (p.timeline as Record<string, unknown>[]) : [];
            const dep = Array.isArray(p.deployment_timeline) ? (p.deployment_timeline as Record<string, unknown>[]) : [];
            const ver = Array.isArray(p.verification_timeline) ? (p.verification_timeline as Record<string, unknown>[]) : [];
            const statusBar = (st: string) => {
              const s = String(st || "").toLowerCase();
              if (s === "pass") return C.green;
              if (s === "fail") return C.red;
              if (s === "reverted") return "#a78bfa";
              if (s === "in_progress") return "#38bdf8";
              if (s === "planned") return C.textMuted;
              return C.textSub;
            };
            const selected = historySel ? timeline.find((r) => String(r.record_id || "") === historySel) : null;
            return (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55, marginBottom: 16 }}>
                  card / deploy / verify / regression を一本の ledger に束ねたタイムラインです。行をクリックすると proof・git・関連 thread が開きます。
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 18 }}>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: C.textMuted }}>latest passed (cards)</div>
                    <div style={{ fontSize: 12, color: C.text, marginTop: 6, fontWeight: 600 }}>
                      {passed[0] ? String(passed[0].card_id || passed[0].title || "—") : "—"}
                    </div>
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: C.textMuted }}>open gaps (acceptance)</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: gaps.length ? C.orange : C.green }}>{gaps.length}</div>
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: C.textMuted }}>deploy / build events</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{dep.length}</div>
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: C.textMuted }}>verify / card events</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{ver.length}</div>
                  </div>
                </div>
                {gaps.length > 0 ? (
                  <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, border: `1px solid ${C.orange}44`, background: "rgba(245,158,11,0.06)" }}>
                    <div style={{ fontSize: 12, color: C.orange, fontWeight: 600, marginBottom: 8 }}>current open gaps</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.textSub }}>
                      {gaps.slice(0, 8).map((g) => (
                        <li key={String(g.gap_id || g.label)}>
                          <strong style={{ color: C.text }}>{String(g.label || g.gap_id)}</strong> ({String(g.status || "")}) — {String(g.detail || "")}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {roots.length > 0 ? (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 8 }}>historical root causes / regression</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {roots.map((r) => (
                        <div
                          key={String(r.record_id || r.title)}
                          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 12 }}
                        >
                          <span style={{ fontWeight: 700, color: statusBar(String(r.status)) }}>{String(r.status || "").toUpperCase()}</span>
                          <span style={{ color: C.text, marginLeft: 8 }}>{String(r.title || "")}</span>
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{String(r.created_at || "").slice(0, 19)}</div>
                          <div style={{ fontSize: 11, color: C.textSub, marginTop: 6, lineHeight: 1.45 }}>{String(r.notes || "").slice(0, 280)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {selected ? (
                  <div
                    style={{
                      marginBottom: 18,
                      padding: 14,
                      borderRadius: 10,
                      border: `1px solid ${C.accent}55`,
                      background: "rgba(201,161,74,0.06)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{String(selected.title || "")}</div>
                      <button
                        type="button"
                        onClick={() => setHistorySel(null)}
                        style={{ fontSize: 11, background: "transparent", border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                      >
                        閉じる
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
                      {String(selected.event_kind || "")} ·{" "}
                      <span style={{ color: statusBar(String(selected.status)), fontWeight: 700 }}>{String(selected.status || "")}</span>
                      {" · "}
                      {String(selected.created_at || "").slice(0, 19)} · git <code style={{ color: C.accent }}>{String(selected.git_head || "—")}</code> · {String(selected.branch || "")}
                    </div>
                    {selected.card_id ? (
                      <div style={{ fontSize: 12, color: C.textSub, marginTop: 10 }}>
                        <span style={{ color: C.accent, fontWeight: 600 }}>card · </span>
                        {String(selected.card_id)}
                      </div>
                    ) : null}
                    <div style={{ fontSize: 12, color: C.textSub, marginTop: 10, lineHeight: 1.55 }}>
                      <span style={{ color: C.accent, fontWeight: 600 }}>why / notes · </span>
                      {String(selected.notes || "—")}
                    </div>
                    {Array.isArray(selected.proof_refs) && (selected.proof_refs as unknown[]).length > 0 ? (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>proof</div>
                        <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: C.textSub }}>
                          {(selected.proof_refs as string[]).map((pr) => (
                            <li key={pr}>{pr}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {Array.isArray(selected.related_threads) && (selected.related_threads as unknown[]).length > 0 ? (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>related threads</div>
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {(selected.related_threads as string[]).map((tid) => (
                            <a key={tid} href={`/mc/vnext/thread/${encodeURIComponent(tid)}`} style={{ fontSize: 11, color: C.textSub }}>
                              {tid.slice(0, 36)}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {selected.deltas && typeof selected.deltas === "object" ? (
                      <pre style={{ marginTop: 10, fontSize: 10, color: C.textMuted, whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto" }}>
                        {JSON.stringify(selected.deltas, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ) : null}
                <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 10 }}>ledger timeline（新しい順）</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {timeline.map((row, ti) => {
                    const rid = String(row.record_id || "");
                    const activeRow = historySel === rid;
                    const st = String(row.status || "");
                    const bar = statusBar(st);
                    return (
                      <button
                        key={rid || `tl-${ti}`}
                        type="button"
                        onClick={() => setHistorySel(rid || null)}
                        style={{
                          textAlign: "left",
                          cursor: "pointer",
                          background: activeRow ? "rgba(201,161,74,0.12)" : C.card,
                          border: `1px solid ${activeRow ? C.accent : C.border}`,
                          borderLeft: `4px solid ${bar}`,
                          borderRadius: 8,
                          padding: "10px 12px",
                          color: C.text,
                        }}
                      >
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline" }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: bar }}>{st.toUpperCase()}</span>
                          <span style={{ fontSize: 10, color: C.textMuted }}>{String(row.event_kind || "")}</span>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{String(row.title || "")}</span>
                        </div>
                        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
                          {String(row.created_at || "").slice(0, 19)} · {String(row.card_id || "—")} ·{" "}
                          <span style={{ fontFamily: "monospace" }}>{String(row.git_head || "").slice(0, 12)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {failed.length > 0 ? (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontSize: 12, color: C.red, fontWeight: 600, marginBottom: 8 }}>recent fail / reverted</div>
                    <ul style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5 }}>
                      {failed.map((f) => (
                        <li key={String(f.card_id || f.title)}>
                          <strong style={{ color: C.text }}>{String(f.card_id || "—")}</strong>: {String(f.title || "")} ({String(f.status || "")})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div style={{ marginTop: 14, fontSize: 12, color: C.textMuted }}>
                  <a href="/api/mc/vnext/regression" style={{ color: C.accent, textDecoration: "none", marginRight: 14 }} target="_blank" rel="noreferrer">
                    regression JSON →
                  </a>
                  <a href="/mc/vnext/acceptance" style={{ color: C.accent, textDecoration: "none" }}>
                    acceptance →
                  </a>
                </div>
              </div>
            );
          })()}

        {active === "overview" && gate === "ready" && payload && typeof payload === "object" && payload !== null ? (
          <>
            <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {OVERVIEW_CARDS.map((c) => (
                <div
                  key={c.key}
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{String(c.pick(payload as Record<string, unknown>) ?? "—")}</div>
                </div>
              ))}
            </div>
            {(() => {
              const p = payload as Record<string, unknown>;
              const acc = (p.latest_acceptance || {}) as Record<string, unknown>;
              const verdict = String(acc.verdict ?? acc.status ?? "—");
              const why = String(acc.why_now ?? "").trim();
              const nextC = String(acc.nextRecommendedCard ?? "").trim();
              const liveN = Number(acc.live_problematic_thread_count ?? 0);
              const archN = Number(acc.archived_problematic_thread_count ?? 0);
              const liveList = Array.isArray(p.failing_threads_live) ? (p.failing_threads_live as Record<string, unknown>[]) : [];
              const cont = (p.continuation_summary || {}) as Record<string, unknown>;
              const hs = (p.history_summary || {}) as Record<string, unknown>;
              const lastV = String(hs.last_verified_at || "").slice(0, 19);
              const gapN = Number(hs.current_open_gap_count ?? 0);
              const lastPass = String(hs.latest_passed_card_id || hs.latest_passed_card || "").trim();
              const ledgerN = Number(hs.ledger_row_count ?? 0);
              const showHist = p.history_summary != null && typeof p.history_summary === "object";
              const pct = (x: unknown) =>
                typeof x === "number" && Number.isFinite(x) ? `${(x * 100).toFixed(0)}%` : "—";
              return (
                <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                  {showHist ? (
                    <div
                      style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: 10,
                        padding: "14px 16px",
                      }}
                    >
                      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>System history · summary</div>
                      <div style={{ marginTop: 8, fontSize: 12, color: C.textSub, lineHeight: 1.55 }}>
                        <div>
                          <span style={{ color: C.textMuted }}>latest passed card · </span>
                          <span style={{ color: C.text, fontWeight: 600 }}>{lastPass || "—"}</span>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <span style={{ color: C.textMuted }}>open gaps · </span>
                          <span style={{ fontWeight: 700, color: gapN ? C.orange : C.green }}>{Number.isFinite(gapN) ? gapN : "—"}</span>
                          <span style={{ color: C.textMuted }}> · last verified · </span>
                          <span style={{ color: C.text }}>{lastV || "—"}</span>
                          <span style={{ color: C.textMuted }}> · ledger rows · </span>
                          <span style={{ color: C.text }}>{Number.isFinite(ledgerN) ? ledgerN : "—"}</span>
                        </div>
                      </div>
                      <a href="/mc/vnext/history" style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: C.accent, textDecoration: "none" }}>
                        → ledger タイムライン
                      </a>
                    </div>
                  ) : null}
                  <div
                    style={{
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: "14px 16px",
                    }}
                  >
                    <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>Acceptance · current</div>
                    <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: verdict === "PASS" ? C.green : verdict === "FAIL" ? C.red : C.orange }}>{verdict}</span>
                      <span style={{ fontSize: 12, color: C.textMuted }}>
                        live threads {liveN} · archived {archN}
                      </span>
                    </div>
                    {why ? <div style={{ marginTop: 10, fontSize: 13, color: C.textSub, lineHeight: 1.55 }}>{why}</div> : null}
                    {nextC ? (
                      <div style={{ marginTop: 10, fontSize: 12, color: C.text, padding: 10, background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
                        <span style={{ color: C.textMuted }}>next · </span>
                        {nextC}
                      </div>
                    ) : null}
                    <a href="/mc/vnext/acceptance" style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: C.accent, textDecoration: "none" }}>
                      → acceptance 詳細
                    </a>
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>Current vs all-time metrics</div>
                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 10, color: C.textMuted }}>continuation</div>
                        <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>live {pct(cont.continuation_success_live ?? cont.follow_up_success_rate)}</div>
                        <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>all-time {pct(cont.continuation_success_all_time)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: C.textMuted }}>persist</div>
                        <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>live {pct(cont.persist_success_live)}</div>
                        <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>all-time {pct(cont.persist_success_all_time)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: C.textMuted }}>memory hit</div>
                        <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>live {pct(cont.memory_hit_live ?? cont.memory_hit_rate)}</div>
                        <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>all-time {pct(cont.memory_hit_all_time)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: C.textMuted }}>conversation_log hit</div>
                        <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>live {pct(cont.conversation_log_hit_live)}</div>
                        <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>all-time {pct(cont.conversation_log_hit_all_time)}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>Failing threads · live (top 3)</div>
                    {liveList.length === 0 ? (
                      <div style={{ marginTop: 10, fontSize: 12, color: C.green }}>live 窓で再現中の失敗はありません。</div>
                    ) : (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                        {liveList.slice(0, 3).map((row, i) => {
                          const tid = String(row.thread_id ?? "");
                          const href = `/mc/vnext/thread/${encodeURIComponent(tid)}`;
                          return (
                            <a
                              key={`${tid}-${i}`}
                              href={href}
                              style={{
                                display: "block",
                                textDecoration: "none",
                                color: C.text,
                                border: `1px solid ${C.border}`,
                                borderRadius: 8,
                                padding: "8px 10px",
                                fontSize: 12,
                              }}
                            >
                              <div style={{ fontFamily: "monospace", fontSize: 11 }}>{tid}</div>
                              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                                {String(row.reason ?? "")} · {String(row.detail ?? "").slice(0, 120)}
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    )}
                    {archN > 0 ? (
                      <div style={{ marginTop: 10, fontSize: 11, color: C.textMuted }}>
                        過去履歴（live 窓外）: <strong style={{ color: C.textSub }}>{archN}</strong> 件 — 詳細は acceptance / quality で確認
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })()}
          </>
        ) : null}
      </div>
    </McVnextLayout>
  );
}

const SECTION_LABEL: Record<McVnextNavKey, string> = {
  overview: "Top overview",
  circuit: "Conversation circuit map",
  thread: "Thread trace",
  repo: "Repo / file tree",
  file: "File detail",
  graph: "Sacred / persona / learning graph",
  sources: "Notion / GitHub source map",
  infra: "Infra / storage / backup",
  quality: "Dialogue quality studio",
  alerts: "Alerts / regression",
  acceptance: "Acceptance gate",
  repair: "Repair hub (next-to-fix cards)",
  history: "System history (ledger timeline)",
};

const OVERVIEW_CARDS: Array<{ key: string; label: string; pick: (p: Record<string, unknown>) => unknown }> = [
  { key: "branch", label: "Branch", pick: (p) => (p.top as Record<string, unknown>)?.branch },
  { key: "head", label: "HEAD (short)", pick: (p) => (p.top as Record<string, unknown>)?.head_sha_short },
  { key: "commit", label: "Commit subject", pick: (p) => (p.top as Record<string, unknown>)?.commit_message },
  { key: "uptime", label: "Uptime (s)", pick: (p) => (p.top as Record<string, unknown>)?.uptime_sec },
  { key: "pid", label: "systemd PID", pick: (p) => (p.top as Record<string, unknown>)?.main_pid },
  { key: "alerts", label: "24h issues (crit/warn)", pick: (p) => {
      const a = p.alerts_24h as Record<string, unknown> | undefined;
      if (!a) return "—";
      return `${a.critical ?? 0} / ${a.warnings ?? 0}`;
    },
  },
  {
    key: "route",
    label: "Route health",
    pick: (p) => ((p.route_health as Record<string, unknown>)?.ok ? "ok" : "ng"),
  },
  {
    key: "dq",
    label: "Dialogue quality (stub)",
    pick: (p) =>
      String((p.dialogue_quality_summary as Record<string, unknown> | undefined)?.note ?? "").slice(0, 42) || "—",
  },
];
