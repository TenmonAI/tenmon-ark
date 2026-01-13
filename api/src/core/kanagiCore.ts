// /opt/tenmon-ark/api/src/core/kanagiCore.ts
// 天津金木コア推論（非LLM）

import type { EvidencePack } from "../kotodama/evidencePack.js";
import type { TruthSkeleton } from "../truth/truthSkeleton.js";
import { inferTruthAxesFromEvidence } from "../truth/axes.js";

/**
 * CorePlan（天津金木コア推論の出力）
 */
export type CorePlan = {
  answerType: "direct" | "needsEvidence" | "askClarify" | "liveSearch";
  keyAxes: {
    present: string[];  // 火水/体用/正中/生成鎖/辞/操作 の present
    missing: string[];  // 火水/体用/正中/生成鎖/辞/操作 の missing
  };
  operations: string[];  // ["省","延開","反約","反","約","略","転"] の採用候補
  claims: string[];      // "根拠で言える最小主張"の配列（真理構造の答えの種）
  nextQuestion?: string; // 1個だけ（必要なら）
  recommendedEvidence?: Array<{ doc: string; pdfPage: number }>; // 推定含む
  strictness: "strict" | "soft"; // domainは strict
};

/**
 * 天津金木コア推論（非LLM）
 * 
 * 入力：message, intent, truthSkeleton, evidencePack?, threadContext?
 * 出力：CorePlan
 */
export function buildKanagiCorePlan(
  message: string,
  intent: string,
  truthSkeleton: TruthSkeleton,
  evidencePack?: EvidencePack | null,
  threadContext?: Array<{ role: string; content: string }>
): CorePlan {
  const isDomain = intent === "domain";
  const strictness: "strict" | "soft" = isDomain ? "strict" : "soft";

  // evidencePack がない場合
  if (!evidencePack) {
    if (isDomain) {
      // domain では断定禁止
      return {
        answerType: "needsEvidence",
        keyAxes: { present: [], missing: [] },
        operations: [],
        claims: [],
        recommendedEvidence: [],
        strictness,
      };
    } else {
      // 非domain では askClarify
      return {
        answerType: "askClarify",
        keyAxes: { present: [], missing: [] },
        operations: [],
        claims: [],
        nextQuestion: "どの資料を参照しますか？",
        strictness,
      };
    }
  }

  // truthAxes を抽出
  const presentAxes = inferTruthAxesFromEvidence(evidencePack);
  const presentAxesStr = presentAxes.map(a => String(a));
  const allAxes: string[] = ["火水", "体用", "正中", "生成鎖", "辞", "操作"];
  const missingAxes = allAxes.filter(axis => !presentAxesStr.includes(axis));

  // operations を決定（質問/intentから）
  const operations = inferOperations(message, intent, evidencePack);

  // claims を構築（"根拠で言える最小主張"の配列）
  const claims = buildClaims(evidencePack, presentAxes);

  // nextQuestion（必要なら1個だけ）
  const nextQuestion = buildNextQuestion(message, presentAxes, missingAxes, evidencePack);

  // recommendedEvidence（推定候補）
  const recommendedEvidence: Array<{ doc: string; pdfPage: number }> = [];
  if (evidencePack.isEstimated && evidencePack) {
    recommendedEvidence.push({
      doc: evidencePack.doc,
      pdfPage: evidencePack.pdfPage,
    });
  }

  // answerType を決定
  let answerType: "direct" | "needsEvidence" | "askClarify" | "liveSearch" = "direct";
  if (claims.length === 0) {
    answerType = "needsEvidence";
  } else if (nextQuestion) {
    answerType = "askClarify";
  }

  return {
    answerType,
    keyAxes: {
      present: presentAxesStr,
      missing: missingAxes,
    },
    operations,
    claims,
    nextQuestion,
    recommendedEvidence: recommendedEvidence.length > 0 ? recommendedEvidence : undefined,
    strictness,
  };
}

/**
 * operations を推論（質問/intent/evidencePackから）
 */
function inferOperations(
  message: string,
  intent: string,
  evidencePack: EvidencePack
): string[] {
  const operations: string[] = [];
  const allOps = ["省", "延開", "反約", "反", "約", "略", "転"];

  // メッセージから操作を推論
  if (/(省|省略|簡略)/.test(message)) operations.push("省");
  if (/(延|展開|拡張)/.test(message)) operations.push("延開");
  if (/(反|逆|反対)/.test(message)) operations.push("反");
  if (/(約|要約|まとめ)/.test(message)) operations.push("約");
  if (/(略|省略|簡略)/.test(message)) operations.push("略");
  if (/(転|転換|変換)/.test(message)) operations.push("転");

  // デフォルト: 省・約・略
  if (operations.length === 0) {
    operations.push("省", "約", "略");
  }

  return operations.slice(0, 5); // 最大5個
}

/**
 * claims を構築（"根拠で言える最小主張"の配列）
 * 
 * domain(HYBRID/GROUNDED) の claims は evidencePack 由来だけ
 * pageText/lawCandidatesに無い主張は禁止
 */
function buildClaims(evidencePack: EvidencePack, truthAxes: string[]): string[] {
  const claims: string[] = [];

  // lawCandidates から claims を構築
  for (const law of evidencePack.laws.slice(0, 5)) {
    const claim = `${law.title}: ${law.quote.substring(0, 100)}${law.quote.length > 100 ? "..." : ""}`;
    claims.push(claim);
  }

  // pageText から短い抜粋を追加（lawCandidatesが少ない場合）
  if (claims.length < 3 && evidencePack.pageText) {
    const excerpt = evidencePack.pageText.substring(0, 150).replace(/\s+/g, " ").trim();
    if (excerpt.length > 30) {
      claims.push(`ページ本文より: ${excerpt}${excerpt.length >= 150 ? "..." : ""}`);
    }
  }

  // truthAxes に基づく位置づけを追加
  const truthAxesStr = truthAxes.map(a => String(a));
  if (truthAxesStr.length > 0) {
    claims.push(`真理軸（${truthAxesStr.join("、")}）に照らして、資料準拠の結論を導出。`);
  }

  return claims.slice(0, 5); // 最大5個
}

/**
 * nextQuestion を構築（必要なら1個だけ）
 */
function buildNextQuestion(
  message: string,
  presentAxes: string[],
  missingAxes: string[],
  evidencePack: EvidencePack
): string | undefined {
  // missingAxes がある場合
  if (missingAxes.length > 0) {
    return `真理軸（${missingAxes.slice(0, 2).join("、")}）について、さらに詳しく知りたいですか？`;
  }

  // claims が少ない場合
  if (evidencePack.laws.length === 0 && !evidencePack.pageText) {
    return "他のページも参照しますか？";
  }

  return undefined;
}

