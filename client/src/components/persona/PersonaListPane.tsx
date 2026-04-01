export type PersonaItem = {
  id: string;
  slug: string;
  name: string;
  status: string;
  role_summary?: string;
  system_mantra?: string;
  tone?: string;
  memory_inheritance_mode?: string;
};

type Props = {
  personas: PersonaItem[];
  selectedId: string | null;
  onSelect: (persona: PersonaItem) => void;
  onReload: () => void;
  loading: boolean;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "#6b7280",
  testing: "#f59e0b",
  active: "#10b981",
  archived: "#374151",
};

export function PersonaListPane(props: Props) {
  const { personas, selectedId, onSelect, onReload, loading } = props;

  return (
    <div style={{ width: "280px", borderRight: "1px solid #1e293b", padding: "16px", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <h2 style={{ color: "#a78bfa", fontSize: "16px", margin: 0 }}>Persona Studio</h2>
        <button
          onClick={onReload}
          disabled={loading}
          style={{
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid #334155",
            background: "#111827",
            color: "#e5e7eb",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          再読込
        </button>
      </div>

      {personas.length === 0 && <div style={{ color: "#6b7280", fontSize: "12px" }}>ペルソナなし</div>}
      {personas.map((p) => (
        <div
          key={p.id}
          onClick={() => onSelect(p)}
          style={{
            padding: "10px",
            background: selectedId === p.id ? "#1e293b" : "#0f172a",
            borderRadius: "8px",
            marginBottom: "8px",
            cursor: "pointer",
            border: `1px solid ${selectedId === p.id ? "#7c3aed" : "#1e293b"}`,
          }}
        >
          <div style={{ fontWeight: "bold", fontSize: "13px" }}>{p.name}</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>{p.slug}</span>
            <span
              style={{
                fontSize: "11px",
                padding: "1px 6px",
                borderRadius: "10px",
                background: (STATUS_COLOR[p.status] || "#6b7280") + "33",
                color: STATUS_COLOR[p.status] || "#6b7280",
              }}
            >
              {p.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default PersonaListPane;
