// src/ku/kuGovernor.ts
// Kū Governor（空の守護）：未確定状態を保持し、候補提示または質問の絞り込みを返す

import type { AutoEvidenceResult, AutoEvidenceHit } from "../kotodama/retrieveAutoEvidence.js";

export type KuStance = "ANSWER" | "ASK";

export type KuGovernorResult = {
  stance: KuStance;
  reason: string;
  nextActions: string[];
  doc?: string;
  pdfPage?: number;
  candidates?: AutoEvidenceHit[];
};

/**
 * Kū Governor: 入力から適切な stance（ANSWER/ASK）を決定
 * 
 * @param message - ユーザーの質問
 * @param mode - モード（HYBRID/GROUNDED）
 * @param autoEvidence - 自動検索結果（nullの場合は未検索）
 * @param selected - 選択されたdoc/pdfPage（nullの場合は未選択）
 */
export function decideKuStance(
  message: string,
  mode: string,
  autoEvidence: AutoEvidenceResult | null,
  selected: { doc: string; pdfPage: number } | null
): KuGovernorResult {
  // 既に選択されている場合は ANSWER
  if (selected) {
    return {
      stance: "ANSWER",
      reason: "doc/pdfPageが選択済み",
      nextActions: ["根拠候補を提示して回答を生成"],
    };
  }

  // 自動検索結果がない場合は ASK
  if (!autoEvidence || !autoEvidence.hits || autoEvidence.hits.length === 0) {
    return {
      stance: "ASK",
      reason: "該当箇所が見つかりませんでした",
      nextActions: [
        "資料名とpdfPageを指定（例：言霊秘書.pdf pdfPage=6）",
        "質問をもう少し具体化（例：火水の生成鎖／正中／辞 など）",
      ],
    };
  }

  // confidence が低い場合は ASK（候補提示）
  if (autoEvidence.confidence < 0.6) {
    const candidates = autoEvidence.hits.slice(0, 3);
    return {
      stance: "ASK",
      reason: `関連候補が複数あります（confidence=${autoEvidence.confidence.toFixed(2)}）`,
      nextActions: candidates.map((h, i) => 
        `${i + 1}) ${h.doc} pdfPage=${h.pdfPage} (score=${Math.round(h.score)})`
      ),
      candidates: autoEvidence.hits,
    };
  }

  // confidence が高い場合は ANSWER（暫定採用）
  const top = autoEvidence.hits[0];
  return {
    stance: "ANSWER",
    reason: `自動検索で高信頼度の候補が見つかりました（confidence=${autoEvidence.confidence.toFixed(2)}）`,
    nextActions: ["最上位候補を採用して回答を生成"],
    doc: top.doc,
    pdfPage: top.pdfPage,
    candidates: autoEvidence.hits,
  };
}

