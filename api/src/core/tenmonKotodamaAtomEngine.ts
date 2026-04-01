import type { KotodamaAtomV1 } from "./tenmonConstitutionV3.js";

type LegacyIndexEntry = {
  symbol?: string;
  shape_description?: string;
  fire_water_axis?: "water" | "fire" | "center" | "cycle";
  root_laws?: string[];
  corresponding_terms?: string[];
  scripture_occurrences?: Array<{ doc: string; page: number }>;
  modern_projection?: string;
  caution_notes?: string[];
  lens_khs?: string;
  lens_iroha?: string;
  lens_katakamuna?: string;
  lens_mizuho?: string;
};

const FALLBACK_INDEX_V1: Record<string, LegacyIndexEntry> = {
  ム: {
    symbol: "ム",
    shape_description: "渦巻きの収束と循環",
    fire_water_axis: "cycle",
    root_laws: ["KOTODAMA_CYCLE"],
    corresponding_terms: ["循環", "統合", "結び"],
    scripture_occurrences: [{ doc: "KHS", page: 1 }],
    modern_projection: "循環を閉じて次相へ接続する力点",
    caution_notes: ["単独断定より文脈結合を優先"],
    lens_khs: "結び・回帰・循環",
    lens_iroha: "うねりを収束し節へ戻す",
    lens_katakamuna: "渦の統合点",
    lens_mizuho: "水火の巡りを合わせる",
  },
  コ: {
    symbol: "コ",
    shape_description: "区切りと構造化",
    fire_water_axis: "center",
    root_laws: ["KOTODAMA_STRUCTURE"],
    corresponding_terms: ["構造", "型"],
    scripture_occurrences: [{ doc: "KHS", page: 2 }],
    modern_projection: "情報を区切って扱える形にする",
    caution_notes: ["断片化の過剰に注意"],
    lens_khs: "構造を立てる",
    lens_iroha: "枠を作る",
    lens_katakamuna: "位相を定義する",
    lens_mizuho: "秩序を定める",
  },
  ト: {
    symbol: "ト",
    shape_description: "取り込みと接続",
    fire_water_axis: "water",
    root_laws: ["KOTODAMA_CONNECT"],
    corresponding_terms: ["接続", "導入"],
    scripture_occurrences: [{ doc: "KHS", page: 3 }],
    modern_projection: "入力を取り込んで流路へ接続する",
    caution_notes: [],
    lens_khs: "取り込んで結ぶ",
    lens_iroha: "入口を開く",
    lens_katakamuna: "流路を作る",
    lens_mizuho: "受容して配流",
  },
  ダ: {
    symbol: "ダ",
    shape_description: "濁りを持つ現実負荷",
    fire_water_axis: "fire",
    root_laws: ["KOTODAMA_LOAD"],
    corresponding_terms: ["負荷", "現実化"],
    scripture_occurrences: [{ doc: "KHS", page: 4 }],
    modern_projection: "抽象を現実負荷へ下ろす",
    caution_notes: ["過負荷時は分割して扱う"],
    lens_khs: "現実負荷の顕在化",
    lens_iroha: "重みを受ける",
    lens_katakamuna: "濁りを伴う顕現",
    lens_mizuho: "地上化の圧",
  },
  マ: {
    symbol: "マ",
    shape_description: "間合いと保持",
    fire_water_axis: "center",
    root_laws: ["KOTODAMA_HOLD"],
    corresponding_terms: ["間", "保持"],
    scripture_occurrences: [{ doc: "KHS", page: 5 }],
    modern_projection: "処理の間合いを保って破綻を防ぐ",
    caution_notes: [],
    lens_khs: "間を取り保持する",
    lens_iroha: "余白で整える",
    lens_katakamuna: "相を安定化",
    lens_mizuho: "水火の均衡点",
  },
};

const WORD_READING_MAP_V1: Record<string, string> = {
  言霊: "コトダマ",
};

function toKatakanaV1(input: string): string {
  return input.replace(/[ぁ-ん]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + 0x60)
  );
}

function normalizeToAtomV1(symbol: string, entry: LegacyIndexEntry): KotodamaAtomV1 {
  return {
    symbol,
    shape_description: entry.shape_description ?? "未定義",
    fire_water_axis: entry.fire_water_axis ?? "center",
    root_laws: entry.root_laws ?? [],
    corresponding_terms: entry.corresponding_terms ?? [],
    scripture_occurrences: entry.scripture_occurrences ?? [],
    modern_projection: entry.modern_projection ?? "",
    caution_notes: entry.caution_notes ?? [],
    lens_khs: entry.lens_khs ?? "",
    lens_iroha: entry.lens_iroha ?? "",
    lens_katakamuna: entry.lens_katakamuna ?? "",
    lens_mizuho: entry.lens_mizuho ?? "",
  };
}

function getAdapterIndexV1(): Record<string, LegacyIndexEntry> {
  // 既存インデックスが将来注入される場合に対応。未定義時はフォールバック。
  const injected = (globalThis as { __TENMON_KOTODAMA_INDEX_V1?: unknown })
    .__TENMON_KOTODAMA_INDEX_V1;
  if (injected && typeof injected === "object") {
    return injected as Record<string, LegacyIndexEntry>;
  }
  return FALLBACK_INDEX_V1;
}

// 既存の kotodamaOneSoundLawIndex.ts の INDEX から atom を構築
export function buildKotodamaAtomV1(sound: string): KotodamaAtomV1 | null {
  const s = toKatakanaV1(String(sound ?? "").trim());
  if (!s) return null;
  const index = getAdapterIndexV1();
  const hit = index[s];
  if (!hit) return null;
  return normalizeToAtomV1(s, hit);
}

// 単語を音節に分解して各 atom を展開
export function expandWordToAtomsV1(word: string): KotodamaAtomV1[] {
  const raw = String(word ?? "").trim();
  if (!raw) return [];
  const normalizedWord = WORD_READING_MAP_V1[raw] ?? toKatakanaV1(raw);
  const atoms: KotodamaAtomV1[] = [];
  for (const ch of normalizedWord) {
    const atom = buildKotodamaAtomV1(ch);
    if (atom) atoms.push(atom); // null の音はスキップ
  }
  return atoms;
}

// レンズ指定で atom を読む
export type KotodamaLens = "khs" | "iroha" | "katakamuna" | "mizuho" | "kukai";
export function readAtomByLensV1(atom: KotodamaAtomV1, lens: KotodamaLens): string {
  if (lens === "khs") return atom.lens_khs;
  if (lens === "iroha") return atom.lens_iroha;
  if (lens === "katakamuna") return atom.lens_katakamuna;
  if (lens === "mizuho") return atom.lens_mizuho;
  // kukai は当面 KHS レンズへフォールバック
  return atom.lens_khs;
}

const PROHIBITED_MERGE_MIN_V1: Record<string, string[]> = {
  KHS: ["KATAKAMUNA_PRIMARY"],
  KATAKAMUNA: ["KHS_DIRECT_MAP"],
  KUKAI: ["KATAKAMUNA_PRIMARY"],
};

// 混線禁止チェック
export function checkProhibitedMergeV1(family1: string, family2: string): boolean {
  const f1 = String(family1 ?? "").trim();
  const f2 = String(family2 ?? "").trim();
  if (!f1 || !f2) return false;
  const list = PROHIBITED_MERGE_MIN_V1[f1] ?? [];
  return list.includes(f2);
}

// プロンプト用 atom 注入テキスト生成（最大200字）
export function buildAtomPromptInjectionV1(
  atoms: KotodamaAtomV1[],
  lens: KotodamaLens
): string {
  if (!Array.isArray(atoms) || atoms.length === 0) return "";
  const compact = atoms
    .map((atom) => {
      const lensText = readAtomByLensV1(atom, lens).trim();
      const root = atom.root_laws[0] ?? "";
      return `${atom.symbol}:${lensText || root}`;
    })
    .join(" / ");
  const out = `【KotodamaAtom:${lens}】${compact}`;
  return out.slice(0, 200);
}
