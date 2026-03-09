import fs from "node:fs";
import path from "node:path";

export type KatakamunaBranchId =
  | "narasaki"
  | "uno_society"
  | "kukai"
  | "tenmon"
  | "modern_applied";

export type KatakamunaBranchCandidate = {
  branch: KatakamunaBranchId;
  score: number;
  reason: string[];
};

type CanonJson = {
  schema?: string;
  updated_at?: string;
  axes?: Record<string, any>;
  modern_applied_branches?: Record<string, any>;
  response_rules?: string[];
};

let __cache: CanonJson | null = null;

function canonPath(): string {
  return path.resolve(process.cwd(), "../canon/katakamuna_lineage.json");
}

export function loadKatakamunaCanon(): CanonJson | null {
  try {
    if (__cache) return __cache;
    const p = canonPath();
    const raw = fs.readFileSync(p, "utf-8");
    __cache = JSON.parse(raw);
    return __cache;
  } catch {
    return null;
  }
}

export function resolveKatakamunaBranches(input: string): {
  schema: string;
  updatedAt: string;
  candidates: KatakamunaBranchCandidate[];
} {
  const canon = loadKatakamunaCanon();
  const text = String(input || "");
  const reasons: Record<KatakamunaBranchId, string[]> = {
    narasaki: [],
    uno_society: [],
    kukai: [],
    tenmon: [],
    modern_applied: [],
  };

  let score: Record<KatakamunaBranchId, number> = {
    narasaki: 0,
    uno_society: 0,
    kukai: 0,
    tenmon: 0,
    modern_applied: 0,
  };

  if (/楢崎|潜象物理|静電三法|図象|古事記/i.test(text)) {
    score.narasaki += 3;
    reasons.narasaki.push("楢崎/潜象物理/図象語彙");
  }

  if (/宇野|相似象|会誌|感受性|共振|鍛錬/i.test(text)) {
    score.uno_society += 3;
    reasons.uno_society.push("宇野/相似象会誌語彙");
  }

  if (/空海|声字実相|即身成仏|十住心|三密|六大/i.test(text)) {
    score.kukai += 4;
    reasons.kukai.push("空海並行正典軸語彙");
  }

  if (/天聞|言霊秘書|水穂伝|稲荷古伝|山口志道|天津金木|水火|三種神器/i.test(text)) {
    score.tenmon += 5;
    reasons.tenmon.push("天聞再統合軸語彙");
  }

  if (/吉野|板垣|丸山|芳賀|越智|秋山|音読|自己啓発|奇跡|グッズ|神聖幾何/i.test(text)) {
    score.modern_applied += 3;
    reasons.modern_applied.push("現代応用枝語彙");
  }

  if (/カタカムナ/i.test(text)) {
    score.narasaki += 1;
    score.uno_society += 1;
    score.kukai += 1;
    score.tenmon += 1;
    reasons.narasaki.push("カタカムナ総称");
    reasons.uno_society.push("カタカムナ総称");
    reasons.kukai.push("カタカムナ総称");
    reasons.tenmon.push("カタカムナ総称");
  }

  const candidates = (Object.keys(score) as KatakamunaBranchId[])
    .map((k) => ({
      branch: k,
      score: score[k],
      reason: reasons[k],
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    schema: String(canon?.schema ?? "TENMON_ARK_KATAKAMUNA_CANON_V1"),
    updatedAt: String(canon?.updated_at ?? ""),
    candidates,
  };
}
