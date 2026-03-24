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

const SCRIPTURE_SHORT_COMPLETION_FALLBACKS_V1: Record<string, string> = {
  mizuho_den:
    "水穂伝は、山口志道系の言霊伝承を読み解くための基幹資料であり、水火の法則・五十音の成立原理を結ぶ伝承軸です。",
  inari_koden:
    "稲荷古伝は、稲荷系伝承を言霊・生成原理の文脈で読むための古伝束であり、象徴解釈ではなく成立構文の読解軸として扱います。",
  kukai_sokushin_jobutsu:
    "空海の即身成仏は、この身このままで仏位が開かれるという成仏観で、六大と三密の一致を通して実現可能性を示す立場です。",
  hokekyo:
    "法華経の核心は、一仏乗の立場から衆生すべてに成仏可能性が開かれていることを示し、方便と真実の統合を説く点にあります。",
  narasaki_satsuki:
    "楢崎皐月は、カタカムナ解読を潜象物理・図象読解の系で展開した人物として位置づけられます。",
  kotodama_hisho:
    "言霊秘書は、五十音と一言法則を軸に言霊の作用を体系化した書物で、語義の説明だけでなく運用原理まで接続して読むための基幹文献です。",
  yamaguchi_shido:
    "山口志道は、水穂伝・言霊秘書を読む上での中核伝承者として扱われ、言霊と水火法則を結ぶ軸に位置づけられます。",
  heian_kotodama_thought:
    "平安期の言霊思想は、和歌・声明・真言の実践を通じて、音声と言葉の働きが現実へ作用するという理解を深めた思潮です。",
  manyoshu_kotodama_view:
    "万葉集の言霊観は、言葉を単なる記述でなく、祈り・誓い・共同体秩序を担う力として扱う古層理解に立ちます。",
  kojiki_kotodama_relation:
    "古事記と言霊の関係は、神名・歌謡・語りの構文を通じ、言葉が生成秩序を担うという古代語りの原理にあります。",
};

export function loadTenmonScriptureCanon(): ScriptureCanonFile {
  if (__cache) return __cache;
  const p = canonPath();
  const raw = fs.readFileSync(p, "utf-8");
  const json = JSON.parse(raw) as ScriptureCanonFile;
  __cache = json;
  return json;
}

/** OPS_IROHA_SCRIPTURE_ALIAS_FIX_V1: 軽い正規化。言灵/言靈→言霊、イロハ→いろは。マッチング前にのみ使用。 */
function normalizeScriptureQuery(q: string): string {
  return q
    .replace(/言灵/g, "言霊")
    .replace(/言靈/g, "言霊")
    .replace(/イロハ/g, "いろは")
    .replace(/(とは何か|とは何|とはなに|とは\s*(何|なに)\s*ですか|って\s*(何|なに)\s*ですか|って\s*(何|なに)|とは[？?]?|って[？?]?|は[？?]?)$/u, "")
    .trim();
}

export function resolveScriptureQuery(text: string): ScriptureCanonItem | null {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const normalized = normalizeScriptureQuery(raw);
  const q = normalized.toLowerCase();
  const canon = loadTenmonScriptureCanon();
  for (const s of canon.scriptures) {
    const names = [s.displayName, s.scriptureKey, ...(s.aliases || [])]
      .map((x) => normalizeScriptureQuery(String(x || "").trim()).toLowerCase())
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

  let text =
    level === "short"
      ? hit.short_definition
      : level === "deep"
      ? hit.deep_definition
      : hit.standard_definition;
  if (/補完待ち/u.test(String(text || ""))) {
    const fb = SCRIPTURE_SHORT_COMPLETION_FALLBACKS_V1[String(hit.scriptureKey || "")];
    if (fb) text = fb;
  }

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
    case "hokekyo":
      return {
        doc: "法華経",
        pdfPage: 1,
        lawKey: "TENMON:SCRIPTURE:HOKEKYO:TEXT:V1",
        quoteHint: "法華経・一仏乗と方便真実",
      };
    default:
      return null;
  }
}
