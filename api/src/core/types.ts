// /opt/tenmon-ark/api/src/core/types.ts
// CoreAnswerPlan 型定義（真理骨格固定の中枢型）

export type EvidenceRef = {
  doc: string;
  pdfPage: number;
  imageUrl?: string;
  sha256?: string;
};

export type CoreAnswerPlan = {
  mode: "HYBRID" | "GROUNDED";
  intent: "domain";
  topic: string;                 // 例: "言灵"
  truthAxes: string[];           // 例: ["生成鎖","火水","体用"]
  refs: EvidenceRef[];           // 必ず1件以上
  quotes: Array<{ 
    ref: EvidenceRef; 
    lawId?: string; 
    title?: string; 
    quote: string;
  }>; // EvidencePack由来のみ
  steps: string[];               // 骨格推論ステップ（短い箇条書き）
  conclusion: string;            // コア結論（短い）
  missing?: string[];            // 不足軸など
  suggestNext?: EvidenceRef[];   // 次のpdfPage候補（1〜3）
  estimated?: { explain: string; score: number };
};


