import fs from "node:fs";
import path from "node:path";

export type ScriptureCanonItem = {
  scriptureKey: string;
  displayName: string;
  aliases: string[];
  short_definition: string;
  standard_definition: string;
  deep_definition: string;
  negative_definition: string[];
  core_axes: string[];
  reading_algorithm: string[];
  subconcepts: string[];
  evidence_priority: string[];
  related_scriptures: string[];
  next_axes: string[];
};

export type ScriptureCanonFile = {
  schema: string;
  updated_at: string;
  scriptures: ScriptureCanonItem[];
};

function canonPath(): string {
  return path.resolve(process.cwd(), "../canon/tenmon_scripture_canon_v1.json");
}

let __cache: ScriptureCanonFile | null = null;

export function loadTenmonScriptureCanon(): ScriptureCanonFile {
  if (__cache) return __cache;
  const p = canonPath();
  const raw = fs.readFileSync(p, "utf-8");
  const json = JSON.parse(raw) as ScriptureCanonFile;
  __cache = json;
  return json;
}

export function resolveScriptureQuery(text: string): ScriptureCanonItem | null {
  const q = String(text || "").trim().toLowerCase();
  if (!q) return null;
  const canon = loadTenmonScriptureCanon();
  for (const s of canon.scriptures) {
    const names = [s.displayName, s.scriptureKey, ...(s.aliases || [])]
      .map((x) => String(x || "").trim().toLowerCase())
      .filter(Boolean);
    if (names.some((name) => q.includes(name))) return s;
  }
  return null;
}

export function buildScriptureCanonResponse(
  scriptureKey: string,
  level: "short" | "standard" | "deep" = "standard"
): {
  scriptureKey: string;
  displayName: string;
  text: string;
  negative_definition: string[];
  next_axes: string[];
} | null {
  const canon = loadTenmonScriptureCanon();
  const hit = canon.scriptures.find((s) => s.scriptureKey === scriptureKey);
  if (!hit) return null;

  const text =
    level === "short"
      ? hit.short_definition
      : level === "deep"
      ? hit.deep_definition
      : hit.standard_definition;

  return {
    scriptureKey: hit.scriptureKey,
    displayName: hit.displayName,
    text,
    negative_definition: Array.isArray(hit.negative_definition) ? hit.negative_definition : [],
    next_axes: Array.isArray(hit.next_axes) ? hit.next_axes : [],
  };
}

export function getScriptureConceptEvidence(scriptureKey: string):
  | { doc: string; pdfPage: number; lawKey: string; quoteHint: string }
  | null {
  switch (scriptureKey) {
    case "kotodama_hisho":
      return {
        doc: "KHS",
        pdfPage: 24,
        lawKey: "KHSL:LAW:KHSU:41c0bff9cfb8:p0:q043f16b3a0e8",
        quoteHint: "言霊秘書・五十音一言法則",
      };
    case "iroha_kotodama_kai":
      return {
        doc: "いろは最終原稿.docx",
        pdfPage: 1,
        lawKey: "TENMON:SCRIPTURE:IROHA:TEXT:V1",
        quoteHint: "いろは口伝・時間構文",
      };
    case "katakamuna_kotodama_kai":
      return {
        doc: "カタカムナ言灵解.pdf",
        pdfPage: 1,
        lawKey: "TENMON:SCRIPTURE:KATAKAMUNA_KAI:TEXT:V1",
        quoteHint: "カタカムナを稲荷の言霊で読み解く",
      };
    default:
      return null;
  }
}
