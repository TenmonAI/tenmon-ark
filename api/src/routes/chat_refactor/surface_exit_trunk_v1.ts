/**
 * SURFACE_EXIT_TRUNK_V1 — chat.ts から外出しした LLM 応答枠の最終表面クリーニング。
 * FIX_PRE_GATE_GENERAL_SURFACE_V1 と同等の挙動（観測キー・ログプレフィックス維持）。
 */
import {
  applyExitContractLockV1,
  trimTenmonSurfaceNoiseV3,
  weaveKhsEvidenceIntoHybridSurfaceV1,
  isKhsFractalEvidenceArrayV1,
} from "../../core/tenmonConversationSurfaceV2.js";
import {
  extractTenmonUserFacingFinalTextV1,
  stripTenmonInternalSurfaceLeakV1,
  suppressPrefaceDuplicateBeforeSeenmarkV1,
  suppressRepetitiveTruthFrameV1,
} from "../../core/tenmonResponseProjector.js";
import { applyAnswerProfilePostComposeV1 } from "../../core/answerProfileLayer.js";

export { weaveKhsEvidenceIntoHybridSurfaceV1, isKhsFractalEvidenceArrayV1 };

/** finalize 非経由の早期 return でも exit contract を掛けられる（任意） */
export type CleanLlmFrameContextV1 = {
  routeReason?: string;
  userMessage?: string;
  answerLength?: string | null;
  answerFrame?: string | null;
  answerProfileFrame?: string | null;
};

export function cleanLlmFrameV1(r: string, ctx?: CleanLlmFrameContextV1): string {
  const __in = extractTenmonUserFacingFinalTextV1(String(r ?? ""));
  const __out = __in
    .replace(/いまの言葉を[\u201c\u201d\u0022][^\u201c\u201d\u0022\n]*[\u201c\u201d\u0022]\s*と受け取りました。?/gu, "")
    .replace(/(【天聞の所見】\s*)いまの言葉を[^\n]*と受け取りました。?\s*/u, "$1")
    .replace(/^いまの言葉を[^\n]*\n?/gm, "")
    .trimStart();
  let __stripped = trimTenmonSurfaceNoiseV3(__out);
  const rr = String(ctx?.routeReason ?? "").trim();
  if (rr) {
    __stripped = applyExitContractLockV1({
      surface: __stripped,
      routeReason: rr,
      userMessage: String(ctx?.userMessage ?? ""),
      answerLength: ctx?.answerLength ?? null,
      answerFrame: ctx?.answerFrame ?? null,
      preCompose: true,
    });
    __stripped = applyExitContractLockV1({
      surface: __stripped,
      routeReason: rr,
      userMessage: String(ctx?.userMessage ?? ""),
      answerLength: ctx?.answerLength ?? null,
      answerFrame: ctx?.answerFrame ?? null,
      preCompose: false,
    });
  }
  const __pf = String(ctx?.answerProfileFrame ?? "").trim();
  if (__pf) {
    try {
      __stripped = applyAnswerProfilePostComposeV1(__stripped, __pf);
    } catch {
      /* fail-open */
    }
  }
  __stripped = stripTenmonInternalSurfaceLeakV1(__stripped);
  __stripped = suppressRepetitiveTruthFrameV1(__stripped);
  __stripped = suppressPrefaceDuplicateBeforeSeenmarkV1(__stripped);
  if (__in !== __out || __out !== __stripped) console.log("[CLEAN_LLM_FRAME] stripped");
  else if (__in.includes("いまの言葉を")) console.log("[CLEAN_LLM_FRAME] MISS pattern=", JSON.stringify(__in.slice(0, 40)));
  return __stripped;
}
