export type ChatRequestBody = {
  message: string;
  sessionId?: string;
};

import type { DetailPlanContractP20V1 } from "../planning/detailPlanContractP20.js";

import type { KokuzoCandidate } from "../kokuzo/search.js";

export type ChatResponseBody = {
  response: string;
  timestamp: string;
  trace?: unknown; // KanagiTrace（型循環を避けるため unknown）
  provisional?: boolean;
  error?: string;
  evidence?: unknown;
  threadId?: string;
  detailPlan?: DetailPlanContractP20V1;
  candidates?: KokuzoCandidate[];
  decisionFrame?: {
    mode: string;
    intent: string;
    llm: string | null;
    ku: Record<string, unknown>;
    /** ゲート出口で常に object（top-level detailPlan と同一参照） */
    detailPlan?: DetailPlanContractP20V1;
  };

  caps?: {
    doc: string;
    pdfPage: number;
    quality?: string[];
    source?: string;
    updatedAt?: string;
    caption: string;
    caption_alt?: string[];
  };
};
