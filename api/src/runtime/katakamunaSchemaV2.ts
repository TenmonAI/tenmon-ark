import fs from "node:fs";
import path from "node:path";

type BranchRule = {
  branch_id: string;
  display_name?: string;
  priority?: number;
  positive_keywords?: string[];
  negative_keywords?: string[];
  one_line_definition?: string;
  not_equal_to?: string[];
  related_axes?: string[];
};

type SchemaV2 = {
  schema?: string;
  updated_at?: string;
  branch_resolution_rules?: BranchRule[];
  tenmon_canonical_definition?: {
    short_definition?: string;
    standard_definition?: string;
    negative_definition?: string;
    relation_to_narasaki?: string;
    relation_to_kukai?: string;
    relation_to_modern_applied?: string;
  };
  response_templates?: Record<string, string>;
};

let __cache: SchemaV2 | null = null;

function schemaPath(): string {
  return path.resolve(process.cwd(), "../canon/katakamuna_runtime_schema_v2.json");
}

export function loadKatakamunaSchemaV2(): SchemaV2 | null {
  try {
    if (__cache) return __cache;
    const raw = fs.readFileSync(schemaPath(), "utf-8");
    __cache = JSON.parse(raw);
    return __cache;
  } catch {
    return null;
  }
}

export function resolveKatakamunaBranchesV2(input: string) {
  const data = loadKatakamunaSchemaV2();
  const text = String(input || "");
  const rules = Array.isArray(data?.branch_resolution_rules) ? data.branch_resolution_rules : [];

  const candidates = rules
    .map((r) => {
      const pos = Array.isArray(r.positive_keywords) ? r.positive_keywords : [];
      const neg = Array.isArray(r.negative_keywords) ? r.negative_keywords : [];
      let score = Number(r.priority || 0);
      const reason: string[] = [];

      for (const k of pos) {
        if (k && text.includes(k)) {
          score += 10;
          reason.push("+" + k);
        }
      }

      for (const k of neg) {
        if (k && text.includes(k)) {
          score -= 12;
          reason.push("-" + k);
        }
      }

      if (/カタカムナ/.test(text)) {
        score += 1;
        reason.push("+総称");
      }

      return {
        branch: String(r.branch_id || ""),
        displayName: String(r.display_name || ""),
        score,
        reason,
      };
    })
    .filter((x) => x.branch && x.score > 0)
    .sort((a, b) => b.score - a.score);

  const topBranch = String(candidates?.[0]?.branch || "");
  const sourceMap = (data as any)?.canonical_sources || {};
  const sourceHint = topBranch ? (sourceMap[topBranch] || null) : null;

  return {
    schema: String(data?.schema || "KATAKAMUNA_RUNTIME_SCHEMA_V2"),
    updatedAt: String(data?.updated_at || ""),
    tenmon: data?.tenmon_canonical_definition || {},
    templates: data?.response_templates || {},
    candidates,
    sourceHint,
  };
}
