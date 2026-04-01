import { useEffect, useState } from "react";
import PersonaStudioShell from "@/components/persona/PersonaStudioShell";
import type { PersonaItem } from "@/components/persona/PersonaListPane";

type PersonaForm = {
  name: string;
  slug: string;
  role_summary: string;
  system_mantra: string;
  tone: string;
  memory_inheritance_mode: string;
};

const initialForm: PersonaForm = {
  name: "",
  slug: "",
  role_summary: "",
  system_mantra: "",
  tone: "",
  memory_inheritance_mode: "user_plus_project",
};

export function PersonaStudioPage() {
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [selected, setSelected] = useState<PersonaItem | null>(null);
  const [form, setForm] = useState<PersonaForm>(initialForm);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewThread, setPreviewThread] = useState("");
  const [previewMsg, setPreviewMsg] = useState("");
  const [previewResponse, setPreviewResponse] = useState("");

  const load = async () => {
    try {
      const r = await fetch("/api/persona/list");
      const d = await r.json();
      if (d.ok && Array.isArray(d.personas)) {
        setPersonas(d.personas);
      }
    } catch {
      // keep UI responsive even when API is down
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        slug: form.slug || `persona-${Date.now()}`,
      };
      const r = await fetch("/api/persona/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.ok) {
        setStatus(`作成: ${String(d.name || payload.name)}`);
        setForm(initialForm);
        await load();
      } else {
        setStatus(`エラー: ${String(d.error || "create_failed")}`);
      }
    } catch (e: any) {
      setStatus(`エラー: ${String(e?.message || e)}`);
    } finally {
      setLoading(false);
    }
  };

  const onDeploy = async (id: string) => {
    try {
      const r = await fetch(`/api/persona/${id}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const d = await r.json();
      setStatus(d.ok ? `デプロイ完了: ${id.slice(0, 8)}` : `エラー: ${String(d.error || "deploy_failed")}`);
      await load();
    } catch (e: any) {
      setStatus(`エラー: ${String(e?.message || e)}`);
    }
  };

  const onStartPreview = async (id: string) => {
    try {
      const r = await fetch(`/api/persona/${id}/preview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const d = await r.json();
      if (d.ok) {
        setPreviewThread(String(d.previewThreadId || ""));
        setStatus(`Preview開始: ${String(d.previewThreadId || "").slice(-12)}`);
      } else {
        setStatus(`エラー: ${String(d.error || "preview_start_failed")}`);
      }
    } catch (e: any) {
      setStatus(`エラー: ${String(e?.message || e)}`);
    }
  };

  const onSendPreview = async () => {
    if (!previewThread || !previewMsg.trim()) return;
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: previewMsg, threadId: previewThread }),
      });
      const d = await r.json();
      setPreviewResponse(String(d.response || ""));
      setPreviewMsg("");
    } catch (e: any) {
      setPreviewResponse(`エラー: ${String(e?.message || e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PersonaStudioShell
      personas={personas}
      selected={selected}
      onSelect={setSelected}
      form={form}
      loading={loading}
      status={status}
      previewThread={previewThread}
      previewMsg={previewMsg}
      previewResponse={previewResponse}
      onReload={load}
      onFormChange={setForm}
      onCreate={onCreate}
      onDeploy={onDeploy}
      onStartPreview={onStartPreview}
      onPreviewMsgChange={setPreviewMsg}
      onSendPreview={onSendPreview}
    />
  );
}

export default PersonaStudioPage;
