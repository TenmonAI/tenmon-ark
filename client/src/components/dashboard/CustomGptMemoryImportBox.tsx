/**
 * CUSTOM_GPT_MEMORY_IMPORT_BOX_V1 + MEMORY_INHERITANCE_RENDERER_V1
 * 記憶継承指示欄（保存・確認のみ。chat へ自動反映しない）
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type InheritanceStructuredV1 = {
  renderer_version?: string;
  ai_naming: string | null;
  user_naming: string | null;
  tone_profile: string;
  persona_core: string;
  forbidden_moves: string[];
  response_format_profile: string;
  inherited_memory_facts: string[];
  parse_confidence?: number;
};

type StatusJson = {
  ok?: boolean;
  saved?: boolean;
  updated_at?: string;
  source?: string | null;
  raw_length?: number;
  raw_head?: string;
  inheritance_structured?: InheritanceStructuredV1 | null;
  structured_preview_placeholder?: unknown;
  runtime_chat_injection?: boolean;
  error?: string;
};

function StructuredPreview({ s }: { s: InheritanceStructuredV1 }) {
  return (
    <div className="space-y-3 text-sm rounded-md border p-3 bg-muted/25 max-h-[28rem] overflow-y-auto">
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>renderer: {s.renderer_version || "—"}</span>
        {typeof s.parse_confidence === "number" && (
          <span>confidence: {(s.parse_confidence * 100).toFixed(0)}%</span>
        )}
      </div>
      <div>
        <p className="font-medium text-xs text-muted-foreground mb-1">ai_naming</p>
        <p className="text-sm">{s.ai_naming ?? "（未検出）"}</p>
      </div>
      <div>
        <p className="font-medium text-xs text-muted-foreground mb-1">user_naming</p>
        <p className="text-sm">{s.user_naming ?? "（未検出）"}</p>
      </div>
      <div>
        <p className="font-medium text-xs text-muted-foreground mb-1">tone_profile</p>
        <p className="text-xs whitespace-pre-wrap break-words">{s.tone_profile || "（未検出）"}</p>
      </div>
      <div>
        <p className="font-medium text-xs text-muted-foreground mb-1">persona_core</p>
        <p className="text-xs whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
          {s.persona_core || "（未検出）"}
        </p>
      </div>
      <div>
        <p className="font-medium text-xs text-muted-foreground mb-1">forbidden_moves</p>
        {s.forbidden_moves.length === 0 ? (
          <p className="text-xs text-muted-foreground">（未検出）</p>
        ) : (
          <ul className="list-disc pl-4 text-xs space-y-0.5">
            {s.forbidden_moves.map((x, i) => (
              <li key={i} className="break-words">
                {x}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="font-medium text-xs text-muted-foreground mb-1">response_format_profile</p>
        <p className="text-xs whitespace-pre-wrap break-words">{s.response_format_profile || "（未検出）"}</p>
      </div>
      <div>
        <p className="font-medium text-xs text-muted-foreground mb-1">inherited_memory_facts</p>
        {s.inherited_memory_facts.length === 0 ? (
          <p className="text-xs text-muted-foreground">（未検出）</p>
        ) : (
          <ul className="list-disc pl-4 text-xs space-y-0.5">
            {s.inherited_memory_facts.map((x, i) => (
              <li key={i} className="break-words">
                {x}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function CustomGptMemoryImportBox() {
  const [raw, setRaw] = useState("");
  const [source, setSource] = useState("custom_gpt_paste");
  const [status, setStatus] = useState<StatusJson | null>(null);
  const [lastSavedStructured, setLastSavedStructured] = useState<InheritanceStructuredV1 | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const r = await fetch("/api/memory/custom-gpt-import/v1/status", {
        credentials: "include",
      });
      const j = (await r.json()) as StatusJson;
      if (!r.ok) {
        setMessage(j.error || `HTTP ${r.status}`);
        setStatus(null);
        return;
      }
      setStatus(j);
    } catch (e) {
      setMessage(String(e));
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const onSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const r = await fetch("/api/memory/custom-gpt-import/v1/save", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inheritance_prompt_raw: raw,
          source: source || "custom_gpt_paste",
        }),
      });
      const j = (await r.json()) as StatusJson & { note?: string; inheritance_structured?: InheritanceStructuredV1 };
      if (!r.ok) {
        setMessage(j.error || `HTTP ${r.status}`);
        return;
      }
      if (j.inheritance_structured) {
        setLastSavedStructured(j.inheritance_structured);
      }
      setMessage(j.note || "保存しました（user スコープのみ。会話へは未反映）。");
      setRaw("");
      await loadStatus();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setSaving(false);
    }
  };

  const previewStructured =
    lastSavedStructured ?? status?.inheritance_structured ?? null;

  return (
    <Card className="border-amber-900/30 bg-card/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          記憶継承（旧カスタム GPT）
        </CardTitle>
        <CardDescription>
          継承プロンプトを user 単位で保存し、<strong>MEMORY_INHERITANCE_RENDERER_V1</strong> で structured
          分解します。いまのバージョンでは <strong>天聞チャットへ自動では載せません</strong>。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="inherit-raw">継承プロンプト（raw）</Label>
          <Textarea
            id="inherit-raw"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="旧 GPT の指示文をそのまま貼り付け…"
            rows={8}
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="inherit-source">source（任意）</Label>
            <Input
              id="inherit-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="custom_gpt_paste"
            />
          </div>
          <div className="space-y-2">
            <Label>structured preview（renderer 出力）</Label>
            {previewStructured ? (
              <StructuredPreview s={previewStructured} />
            ) : (
              <p className="text-xs text-muted-foreground rounded-md border p-3 bg-muted/40">
                保存後、または「状態を再読込」でサーバが分解した結果がここに表示されます。編集中の raw
                は保存時に API 側でパースされます。
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void onSave()} disabled={saving || !raw.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            保存
          </Button>
          <Button type="button" variant="outline" onClick={() => void loadStatus()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            状態を再読込
          </Button>
        </div>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        {status?.saved && (
          <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/30">
            <div>
              <span className="text-muted-foreground">updated_at:</span> {status.updated_at || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">raw_length:</span> {status.raw_length ?? 0}
            </div>
            <div>
              <span className="text-muted-foreground">source:</span> {status.source || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">先頭プレビュー:</span>
            </div>
            <pre className="text-xs whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
              {status.raw_head || "（空）"}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
