export type TruthCheckInput = {
  doc: string;
  pdfPage: number;
  message: string;
  pageText?: string;
  appliedLaws: Array<{ lawId: string; title: string; source?: string }>;
  operations: Array<{ op: string; description: string }>;
};

export type TruthCheckItem = {
  key: string;
  label: string;
  present: boolean;
  evidence: string[];
  missingReason?: string;
};

export type TruthCheckResult = {
  items: TruthCheckItem[];
  recommendedNextPages: Array<{ doc: string; pdfPage: number; reason: string }>;
  summary: string;
};

// 統一された真理チェックキー
export type TruthKey = "himizu" | "taiyo" | "seichu" | "genesis" | "tenioha" | "ops";

// 互換マッピング（内部キー → 統一キー）
const keyMap: Record<string, TruthKey> = {
  hisui: "himizu",
  taiyou: "taiyo",
  ji: "tenioha",
};

// キーを正規化（互換性のため）
const normalizedKey = (k: string): TruthKey => (keyMap[k] ?? (k as TruthKey));

// 内部キー（処理用）と外部キー（返却用）のマッピング
const CHECKS: Array<{
  internalKey: string; // 内部処理用キー
  externalKey: string; // 外部返却用キー（統一）
  label: string;
  keywords: string[];
}> = [
  { internalKey: "hisui", externalKey: "himizu", label: "火水", keywords: ["火水", "火", "水"] },
  { internalKey: "taiyou", externalKey: "taiyo", label: "体用", keywords: ["体用", "体", "用"] },
  { internalKey: "seichu", externalKey: "seichu", label: "正中", keywords: ["御中主", "天之御中主", "正中", "0", "ヽ"] },
  { internalKey: "genesis", externalKey: "genesis", label: "生成鎖", keywords: ["凝", "息", "音", "形仮名", "五十連", "十行"] },
  { internalKey: "ji", externalKey: "tenioha", label: "辞", keywords: ["辞", "テニヲハ", "てにをは"] },
  { internalKey: "ops", externalKey: "ops", label: "操作", keywords: ["省", "延開", "反約", "反", "約", "略", "転"] },
];

function textContainsAny(text: string | undefined, keywords: string[]): { hit: boolean; evidence: string[] } {
  if (!text) return { hit: false, evidence: [] };
  const evidence: string[] = [];

  for (const kw of keywords) {
    if (!kw) continue;
    const idx = text.indexOf(kw);
    if (idx >= 0) {
      const start = Math.max(0, idx - 15);
      const end = Math.min(text.length, idx + kw.length + 15);
      evidence.push(text.substring(start, end));
    }
  }

  return { hit: evidence.length > 0, evidence };
}

export function runTruthCheck(input: TruthCheckInput): TruthCheckResult {
  const { doc, pdfPage, message, pageText, appliedLaws, operations } = input;

  const lawText = appliedLaws.map((l) => `${l.title} ${l.source ?? ""}`).join("\n");
  const opText = operations.map((o) => `${o.op} ${o.description}`).join("\n");
  const combined = [message, pageText ?? "", lawText, opText].join("\n");

  const items: TruthCheckItem[] = [];

  for (const c of CHECKS) {
    const { hit, evidence } = textContainsAny(combined, c.keywords);
    // 互換マッピングを適用してキーを正規化
    const normalized = normalizedKey(c.externalKey);
    items.push({
      key: normalized, // 統一された外部キーで返す（互換マッピング適用済み）
      label: c.label,
      present: hit,
      evidence,
      missingReason: hit ? undefined : "関連する語が入力・ページ・法則・操作のいずれにも見当たりませんでした。",
    });
  }

  // 推奨次ページ：現段階では「次ページ」を単純提案
  const recommendedNextPages = [
    {
      doc,
      pdfPage: pdfPage + 1,
      reason: "真理構造の連続性を確認するため、次ページの参照が推奨されます。",
    },
  ];

  const covered = items.filter((i) => i.present).map((i) => i.label).join("、");
  const missing = items.filter((i) => !i.present).map((i) => i.label).join("、");

  const summary =
    `火水構造の観点から、次の要素が確認されました: ${covered || "（該当なし）"}。` +
    ` 一方で、未カバーの要素: ${missing || "（なし）"}。`;

  return { items, recommendedNextPages, summary };
}

