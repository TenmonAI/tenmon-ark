import type { CSSProperties } from "react";

export type PersonaForm = {
  name: string;
  slug: string;
  role_summary: string;
  system_mantra: string;
  tone: string;
  memory_inheritance_mode: string;
};

type Props = {
  form: PersonaForm;
  loading: boolean;
  status: string;
  onFormChange: (next: PersonaForm) => void;
  onCreate: () => void;
};

const input: CSSProperties = {
  width: "100%",
  padding: "8px",
  borderRadius: 6,
  border: "1px solid #334155",
  background: "#0b1220",
  color: "#e2e8f0",
  marginBottom: 10,
};

export function PersonaEditorPane({ form, loading, status, onFormChange, onCreate }: Props) {
  return (
    <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
      <h3 style={{ color: "#e2e8f0", marginBottom: "16px" }}>新規ペルソナ作成</h3>
      {[
        ["名前 *", "name", "例: 空海深層解読"],
        ["スラッグ", "slug", "例: kukai-deepread"],
        ["役割概要", "role_summary", "例: 空海の密教を正典から読む"],
        ["システムマントラ", "system_mantra", "例: 正典に基づき、断定を避けて応答する"],
        ["文体", "tone", "例: 丁寧・格調高く"],
      ].map(([label, key, placeholder]) => (
        <div key={key}>
          <label style={{ color: "#9ca3af", fontSize: "11px", display: "block", marginBottom: "3px" }}>{label}</label>
          <input
            value={(form as any)[key] || ""}
            onChange={(e) => onFormChange({ ...form, [key]: e.target.value })}
            placeholder={String(placeholder)}
            style={input}
          />
        </div>
      ))}
      <label style={{ color: "#9ca3af", fontSize: "11px", display: "block", marginBottom: "3px" }}>記憶継承モード</label>
      <select
        value={form.memory_inheritance_mode}
        onChange={(e) => onFormChange({ ...form, memory_inheritance_mode: e.target.value })}
        style={input}
      >
        <option value="none">none（記憶なし）</option>
        <option value="user_only">user_only</option>
        <option value="user_plus_project">user_plus_project（推奨）</option>
        <option value="persona_isolated">persona_isolated</option>
      </select>
      <button
        onClick={onCreate}
        disabled={loading || !form.name.trim()}
        style={{
          padding: "8px 16px",
          background: "#7c3aed",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "13px",
        }}
      >
        {loading ? "作成中..." : "作成"}
      </button>
      {status && (
        <div style={{ marginTop: "12px", padding: "8px", background: "#1e293b", borderRadius: "6px", fontSize: "12px" }}>
          {status}
        </div>
      )}
    </div>
  );
}

