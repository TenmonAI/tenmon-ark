// src/ku/kuGovernor.ts
// Kū Governor（空の守護）：未確定状態を保持し、候補提示または質問の絞り込みを返す

import type { AutoEvidenceResult, AutoEvidenceHit } from "../kotodama/retrieveAutoEvidence.js";
import { RANKING_POLICY } from "../kotodama/rankingPolicy.js";

export type KuStance = "ANSWER" | "ASK";

export type KuGovernorResult = {
  stance: KuStance;
  reason: string;
  nextNeed?: string[];
  response?: string;
  detail?: string;
  doc?: string;
  pdfPage?: number;
  candidates?: AutoEvidenceHit[];
  autoEvidence?: AutoEvidenceResult;
};

/**
 * Kū Governor: 入力から適切な stance（ANSWER/ASK）を決定し、response/detail を生成
 * 
 * @param message - ユーザーの質問
 * @param mode - モード（HYBRID/GROUNDED）
 * @param autoEvidence - 自動検索結果（nullの場合は未検索）
 * @param selected - 選択されたdoc/pdfPage（nullの場合は未選択）
 * @param detailRequested - #詳細 が要求されているか
 */
export function decideKuStance(
  message: string,
  mode: string,
  autoEvidence: AutoEvidenceResult | null,
  selected: { doc: string; pdfPage: number } | null,
  detailRequested: boolean = false
): KuGovernorResult {
  // 既に選択されている場合は ANSWER
  if (selected) {
    return {
      stance: "ANSWER",
      reason: "doc/pdfPageが選択済み",
      nextNeed: ["根拠候補を提示して回答を生成"],
    };
  }

  // 自動検索結果がない場合は ASK（hits=0）
  if (!autoEvidence || !autoEvidence.hits || autoEvidence.hits.length === 0) {
    const response =
      "資料準拠で答えるための該当箇所が見つかりませんでした。\n" +
      "次のいずれかで確定できます：\n" +
      "1) 資料名とpdfPageを指定（例：言霊秘書.pdf pdfPage=6）\n" +
      "2) 質問をもう少し具体化（例：火水の生成鎖／正中／辞 など）";

    let detail: string | undefined;
    if (detailRequested) {
      detail =
        "#詳細\n- 状態: autoEvidence hits=0\n" +
        `- keywords: ${message}\n` +
        "- 次の導線: 言霊秘書.pdf pdfPage=6 / pdfPage=13 / pdfPage=69 など";
    }

    return {
      stance: "ASK",
      reason: "該当箇所が見つかりませんでした",
      nextNeed: ["doc or keywords"],
      response,
      detail,
    };
  }

  // confidence が低い場合は ASK（候補提示）
  if (autoEvidence.confidence < RANKING_POLICY.CONFIDENCE_THRESHOLD) {
    const lines = autoEvidence.hits.map((h, i) => {
      const sn = h.quoteSnippets?.[0] ? ` / ${h.quoteSnippets[0]}` : "";
      return `${i + 1}) ${h.doc} pdfPage=${h.pdfPage} (score=${Math.round(h.score)})${sn}`;
    });

    const response =
      "関連候補が複数あります。どれを土台にしますか？\n" +
      lines.join("\n") +
      "\n\n返信例：『1』または『2』（番号だけ送信してください）";

    let detail: string | undefined;
    if (detailRequested) {
      detail =
        "#詳細\n- 状態: autoEvidence confidence低\n" +
        `- confidence: ${autoEvidence.confidence.toFixed(2)}\n` +
        lines.join("\n");
    }

    return {
      stance: "ASK",
      reason: `関連候補が複数あります（confidence=${autoEvidence.confidence.toFixed(2)}）`,
      nextNeed: ["choice(1..3)"],
      response,
      detail,
      candidates: autoEvidence.hits,
      autoEvidence,
    };
  }

  // confidence が高い場合は ANSWER（暫定採用）
  const top = autoEvidence.hits[0];
  return {
    stance: "ANSWER",
    reason: `自動検索で高信頼度の候補が見つかりました（confidence=${autoEvidence.confidence.toFixed(2)}）`,
    nextNeed: ["最上位候補を採用して回答を生成"],
    doc: top.doc,
    pdfPage: top.pdfPage,
    candidates: autoEvidence.hits,
    autoEvidence,
  };
}

