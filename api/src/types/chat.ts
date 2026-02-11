export type ChatRequestBody = {
  message: string;
  sessionId?: string;
};

import type { CorePlan } from "../kanagi/core/corePlan.js";

import type { KokuzoCandidate } from "../kokuzo/search.js";

export type ChatResponseBody = {
  response: string;
  timestamp: string;
  trace?: unknown; // KanagiTrace（型循環を避けるため unknown）
  provisional?: boolean;
  error?: string;
  evidence?: unknown;
  threadId?: string;
  detailPlan?: CorePlan;
  candidates?: KokuzoCandidate[];
  decisionFrame?: {
    mode: string;
    intent: string;
    llm: string | null;
    ku: Record<string, unknown>;
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
