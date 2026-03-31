import React, { useEffect, useState } from "react";

type ActivePersona = {
  id: string;
  profile_name: string;
  assistant_call_name?: string | null;
  user_call_name?: string | null;
  forbidden_moves?: string | null;
  is_active?: number;
  created_at?: string | null;
};

type AuditSnapshot = {
  centerKey: string | null;
  routeReason: string;
  sourcePriority: string;
  usedLawNames: string[];
  answerLength: string;
};

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : [];
}

export function PersonaAuditPage() {
  const [tab, setTab] = useState<"persona" | "audit">("persona");
  const [activePersona, setActivePersona] = useState<ActivePersona | null>(null);
  const [audit, setAudit] = useState<AuditSnapshot>({
    centerKey: null,
    routeReason: "",
    sourcePriority: "",
    usedLawNames: [],
    answerLength: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftProfileName, setDraftProfileName] = useState("Default Persona");
  const [draftAssistantName, setDraftAssistantName] = useState("");
  const [draftUserName, setDraftUserName] = useState("");
  const [draftForbiddenMoves, setDraftForbiddenMoves] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const pRes = await fetch("/api/persona/active");
      const pJson = await pRes.json();
      setActivePersona((pJson?.persona ?? null) as ActivePersona | null);

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: "pwa-audit-probe",
          message: "法華経について長文で",
        }),
      });
      const chatJson = await chatRes.json();
      const ku = chatJson?.decisionFrame?.ku ?? {};
      setAudit({
        centerKey: ku?.centerKey ? String(ku.centerKey) : null,
        routeReason: asString(ku?.routeReason),
        sourcePriority: asString(ku?.source_priority),
        usedLawNames: asArray(ku?.usedLawNames),
        answerLength: asString(ku?.answerLength),
      });
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "fetch failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function savePersona() {
    setError("");
    try {
      const r = await fetch("/api/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_name: draftProfileName,
          assistant_call_name: draftAssistantName || null,
          user_call_name: draftUserName || null,
          forbidden_moves: draftForbiddenMoves || null,
        }),
      });
      const j = await r.json();
      if (!j?.ok) {
        setError(asString(j?.error, "save failed"));
        return;
      }
      await fetch(`/api/persona/${encodeURIComponent(String(j.id))}/activate`, {
        method: "PUT",
      });
      await refresh();
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "save failed");
    }
  }

  return (
    <div className="gpt-scroll gpt-page-wrap">
      <div className="gpt-page-title">PWA Persona / Audit</div>
      <div className="gpt-page-sub">
        PersonaタブとAuditタブをバックエンドAPIで表示します。
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button className="gpt-btn" onClick={() => setTab("persona")} aria-pressed={tab === "persona"}>
          Persona
        </button>
        <button className="gpt-btn" onClick={() => setTab("audit")} aria-pressed={tab === "audit"}>
          Audit
        </button>
      </div>

      {tab === "persona" ? (
        <div className="gpt-page-card">
          <div className="gpt-page-card-title">Persona</div>
          <div style={{ display: "grid", gap: 8 }}>
            <div>active profile: {activePersona?.profile_name ?? "(none)"}</div>
            <div>assistant_call_name: {activePersona?.assistant_call_name ?? "-"}</div>
            <div>user_call_name: {activePersona?.user_call_name ?? "-"}</div>
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              <input value={draftProfileName} onChange={(e) => setDraftProfileName(e.target.value)} placeholder="profile_name" />
              <input value={draftAssistantName} onChange={(e) => setDraftAssistantName(e.target.value)} placeholder="assistant_call_name" />
              <input value={draftUserName} onChange={(e) => setDraftUserName(e.target.value)} placeholder="user_call_name" />
              <input value={draftForbiddenMoves} onChange={(e) => setDraftForbiddenMoves(e.target.value)} placeholder="forbidden_moves" />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="gpt-btn" onClick={savePersona}>edit</button>
                <button className="gpt-btn" onClick={refresh}>refresh</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="gpt-page-card">
          <div className="gpt-page-card-title">Audit</div>
          <div style={{ display: "grid", gap: 6 }}>
            <div>centerKey: {audit.centerKey ?? "-"}</div>
            <div>routeReason: {audit.routeReason || "-"}</div>
            <div>source_priority: {audit.sourcePriority || "-"}</div>
            <div>answerLength: {audit.answerLength || "-"}</div>
            <div>使用 laws: {audit.usedLawNames.length ? audit.usedLawNames.join(", ") : "(none)"}</div>
          </div>
        </div>
      ) : null}

      {loading ? <div className="gpt-page-sub">loading...</div> : null}
      {error ? <div className="gpt-page-sub">error: {error}</div> : null}
    </div>
  );
}
