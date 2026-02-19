/* UI1_CHAT_DEBUGPANEL_V1 */
import { useMemo, useState } from "react";

function safeStringify(value: unknown, maxDepth: number, maxItems: number): string {
  const seen = new WeakSet<object>();
  const clip = (s: string) => (s.length <= 2000 ? s : s.slice(0, 2000) + " …(clipped)");

  function helper(v: any, depth: number): any {
    if (depth > maxDepth) return "[DEPTH_LIMIT]";
    if (v === null || v === undefined) return v;
    if (typeof v === "string") return clip(v);
    if (typeof v === "number" || typeof v === "boolean") return v;
    if (typeof v === "bigint") return String(v);
    if (typeof v === "function") return "[Function]";
    if (typeof v === "symbol") return String(v);
    if (typeof v !== "object") return String(v);

    if (seen.has(v)) return "[CYCLE]";
    seen.add(v);

    if (Array.isArray(v)) {
      const out: any[] = [];
      const n = Math.min(v.length, maxItems);
      for (let i = 0; i < n; i++) out.push(helper(v[i], depth + 1));
      if (v.length > n) out.push(`…(${v.length - n} more)`);
      return out;
    }

    const keys = Object.keys(v);
    const out: Record<string, any> = {};
    const n = Math.min(keys.length, maxItems);
    for (let i = 0; i < n; i++) {
      const k = keys[i];
      out[k] = helper((v as any)[k], depth + 1);
    }
    if (keys.length > n) out["…"] = `(${keys.length - n} more keys)`;
    return out;
  }

  try {
    return JSON.stringify(helper(value, 0), null, 2);
  } catch (e: any) {
    return JSON.stringify({ error: "STRINGIFY_FAILED", detail: String(e?.message ?? e) }, null, 2);
  }
}

function pickKoshiki(payload: any) {
  return (
    payload?.decisionFrame?.detailPlan?.debug?.koshiki ??
    payload?.detailPlan?.debug?.koshiki ??
    payload?.debug?.koshiki ??
    null
  );
}
function pickUfk(payload: any) {
  return (
    payload?.decisionFrame?.detailPlan?.debug?.ufk ??
    payload?.detailPlan?.debug?.ufk ??
    payload?.debug?.ufk ??
    null
  );
}
function pickEvidence(payload: any) {
  return {
    mode: payload?.decisionFrame?.mode ?? payload?.mode ?? null,
    intent: payload?.decisionFrame?.intent ?? payload?.intent ?? null,
    candidates: Array.isArray(payload?.candidates) ? payload.candidates.slice(0, 10) : (payload?.candidates ?? null),
    evidence: payload?.evidence ?? null,
    evidenceIds: payload?.detailPlan?.evidenceIds ?? payload?.decisionFrame?.detailPlan?.evidenceIds ?? null,
  };
}

export function DebugPanel(props: { payload: any | null | undefined }) {
  const { payload } = props;
  const [tab, setTab] = useState<"evidence" | "koshiki" | "ufk">("evidence");

  const evidence = useMemo(() => pickEvidence(payload), [payload]);
  const koshiki = useMemo(() => pickKoshiki(payload), [payload]);
  const ufk = useMemo(() => pickUfk(payload), [payload]);

  const text = useMemo(() => {
    if (!payload) return "(none)";
    if (tab === "evidence") return safeStringify(evidence, 6, 40);
    if (tab === "koshiki") return safeStringify(koshiki ?? "(none)", 8, 60);
    return safeStringify(ufk ?? "(none)", 8, 60);
  }, [payload, tab, evidence, koshiki, ufk]);

  return (
    <div style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 8, padding: 10, borderBottom: "1px solid rgba(255,255,255,0.08)", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setTab("evidence")} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: tab === "evidence" ? "rgba(255,255,255,0.10)" : "transparent", color: "inherit", cursor: "pointer" }}>
            Evidence
          </button>
          <button type="button" onClick={() => setTab("koshiki")} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: tab === "koshiki" ? "rgba(255,255,255,0.10)" : "transparent", color: "inherit", cursor: "pointer" }}>
            Koshiki
          </button>
          <button type="button" onClick={() => setTab("ufk")} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: tab === "ufk" ? "rgba(255,255,255,0.10)" : "transparent", color: "inherit", cursor: "pointer" }}>
            UFK
          </button>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>{payload ? "payload: yes" : "payload: no"}</div>
      </div>

      <pre style={{ margin: 0, padding: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.4, maxHeight: 360, overflow: "auto" }}>
        {text}
      </pre>
    </div>
  );
}
