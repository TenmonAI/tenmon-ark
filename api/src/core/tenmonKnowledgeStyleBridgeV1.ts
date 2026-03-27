/**
 * TENMON_KNOWLEDGE_TO_STYLE_BRIDGE_V1
 * understandingReductionV1 を表面整形 hint へ橋渡し（本文捏造なし・meta 文字列は本文に出さない）。
 *
 * TENMON_TRUTH_REASONING_DENSITY_TUNE: thoughtCoreSummary の truthStructure* を
 * center/next へ優先接続し、KANAGI / NATURAL_GENERAL で次軸推論を有効化。
 */

/** 表面に出す一行から内部ラベルを落とす（本文捏造はしない） */
function stripMetaLeakFromHint(s: string): string {
  return String(s || "")
    .replace(/\s*\(pri:[^)]*\)/giu, "")
    .replace(/\s*\(pri:[^)]*$/giu, "")
    .replace(/\btier:[^\s]+/giu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/** 人生/技術相談の surface 行から内部裁定ラベルを落とし、密度句（中心・分断・結び・循環・修復）を前に出す（本文捏造なし） */
function stripTruthStructureDebugLabels(s: string): string {
  const idStop = "\u3002";
  return String(s || "")
    .replace(/^root_reasoning:\s*/giu, "")
    .replace(new RegExp(`truth_structure:相=[^${idStop}]*${idStop}\\s*`, "gu"), "")
    .replace(new RegExp(`verdict=[\\w]+${idStop}\\s*`, "gu"), "")
    .replace(/\s+/gu, " ")
    .trim();
}

function splitSemanticLines(semanticBody: string): string[] {
  return String(semanticBody || "")
    .trim()
    .split(/\n+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** inferNextAxisLineV1 と独立（循環 import 回避） */
function inferSecondSemanticLine(semanticBody: string, centerClaimHint: string): string {
  const lines = splitSemanticLines(semanticBody);
  const c = centerClaimHint.replace(/\s+/gu, " ").trim().slice(0, 40);
  if (lines.length >= 2) {
    if (c && lines[0].includes(c.slice(0, Math.min(6, c.length)))) {
      return lines[1].slice(0, 240);
    }
    return lines[1].slice(0, 240);
  }
  return "";
}

export type KnowledgeStyleBridgeHintsV1 = {
  centerClaimHint: string;
  nextAxisHint?: string;
};

/**
 * route family ごとに内部理解を hint へ写像（routeReason / ku は変更しない）。
 */
export function buildKnowledgeSurfaceBridgeHintsV1(
  ku: Record<string, unknown>,
  routeReason: string,
  semanticBody: string,
): KnowledgeStyleBridgeHintsV1 {
  const rr = String(routeReason || "").trim();
  const tcs = ku.thoughtCoreSummary as Record<string, unknown> | undefined;
  const ur = (tcs?.understandingReductionV1 || null) as Record<string, unknown> | null;
  const claim = String(ur?.centerClaim ?? "").replace(/\s+/gu, " ").trim();
  const meaning = String(ur?.centerMeaning ?? "").replace(/\s+/gu, " ").trim();
  const axis = String(ur?.understandingAxis ?? "").trim();

  const generalLike =
    /^(NATURAL_GENERAL_LLM_TOP|NATURAL_GENERAL_LLM_TOP_V1|GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1)$/u.test(rr);
  const kanagiLike = rr === "KANAGI_CONVERSATION_V1" || rr === "N2_KANAGI_PHASE_TOP";
  const counselOrTechSurface = generalLike || kanagiLike;

  let centerClaimHint = "";
  if (claim.length >= 6) centerClaimHint = stripMetaLeakFromHint(claim).slice(0, 240);
  else if (meaning.length >= 6) centerClaimHint = stripMetaLeakFromHint(meaning).slice(0, 240);

  const tsCenterRaw = stripMetaLeakFromHint(String(tcs?.truthStructureCenterClaimHint ?? "").trim());
  const tsCenter = counselOrTechSurface ? stripTruthStructureDebugLabels(tsCenterRaw) : tsCenterRaw;
  const tsNext = stripMetaLeakFromHint(String(tcs?.truthStructureNextAxisHint ?? "").trim());
  const trmq = (tcs?.truthReasoningAndMixedQuestion || null) as
    | { mixedQuestionIntent?: boolean; rootReasoningRouteGuardReady?: boolean }
    | null;
  const mixedIntent = trmq?.mixedQuestionIntent === true;
  const mixedGuardReady = trmq?.rootReasoningRouteGuardReady === true;
  const rootCenterClaim = stripMetaLeakFromHint(
    String((tcs?.rootCenterClaim ?? (ku as any).rootCenterClaim ?? "") as string).trim(),
  );
  const fractalLawRaw = (tcs?.fractalLawAxis ?? (ku as any).fractalLawAxis ?? null) as
    | string
    | { primary?: string; secondary?: string[]; axes?: string[] }
    | null;
  const fractalLawAxis = (() => {
    if (typeof fractalLawRaw === "string") return stripMetaLeakFromHint(fractalLawRaw.trim());
    if (fractalLawRaw && typeof fractalLawRaw === "object") {
      const p = String(fractalLawRaw.primary ?? "").trim();
      const s0 = Array.isArray(fractalLawRaw.secondary) ? String(fractalLawRaw.secondary[0] ?? "").trim() : "";
      const a0 = Array.isArray(fractalLawRaw.axes) ? String(fractalLawRaw.axes[0] ?? "").trim() : "";
      const joined = [p, s0, a0].filter(Boolean).join("/");
      return stripMetaLeakFromHint(joined);
    }
    return "";
  })();
  const mappingLayer = (tcs?.mappingLayer ?? (ku as any).mappingLayer ?? null) as
    | { mappingPairLabel?: string; mappingConfidence?: number }
    | null;
  const mappingPairLabel = stripMetaLeakFromHint(String(mappingLayer?.mappingPairLabel ?? "").trim());
  const mappingConfidence =
    typeof mappingLayer?.mappingConfidence === "number" ? Number(mappingLayer.mappingConfidence) : null;
  const mythCenterRaw = (tcs?.mythogenesisCenterClaim ?? (ku as any).mythogenesisCenterClaim ?? null) as
    | string
    | { mythogenesisCenterClaim?: string; centerClaim?: string; phase?: string }
    | null;
  const mythCenter = (() => {
    if (typeof mythCenterRaw === "string") return stripMetaLeakFromHint(mythCenterRaw.trim());
    if (mythCenterRaw && typeof mythCenterRaw === "object") {
      const mc = String(mythCenterRaw.mythogenesisCenterClaim ?? mythCenterRaw.centerClaim ?? mythCenterRaw.phase ?? "").trim();
      return stripMetaLeakFromHint(mc);
    }
    return "";
  })();
  if (tsCenter.length >= 8) {
    centerClaimHint = tsCenter.slice(0, 240);
  } else if (tsCenter.length >= 6 && centerClaimHint.length < 6) {
    centerClaimHint = tsCenter.slice(0, 240);
  }
  if (mixedIntent && mixedGuardReady) {
    const root = rootCenterClaim.length >= 6 ? rootCenterClaim : centerClaimHint;
    const bridgeParts: string[] = [];
    if (fractalLawAxis.length >= 4) bridgeParts.push(fractalLawAxis);
    if (mappingPairLabel.length >= 4) {
      if (mappingConfidence != null && Number.isFinite(mappingConfidence)) {
        bridgeParts.push(`${mappingPairLabel}(conf:${mappingConfidence.toFixed(2)})`);
      } else {
        bridgeParts.push(mappingPairLabel);
      }
    }
    if (mythCenter.length >= 6) bridgeParts.push(mythCenter);
    const bridge = bridgeParts.join(" / ").slice(0, 140);
    if (root.length >= 6) {
      centerClaimHint = bridge
        ? `root_reasoning: ${root} 接点: ${bridge}`.slice(0, 240)
        : `root_reasoning: ${root}`.slice(0, 240);
    }
  }

  let nextAxisHint: string | undefined;

  const scriptureLike =
    /^(K1_TRACE_EMPTY_GATED_V1|SCRIPTURE_LOCAL_RESOLVER_V4|TENMON_SCRIPTURE_CANON_V1|TRUTH_GATE_RETURN_V2)$/u.test(rr);
  const selfawareLike = /^R22_SELFAWARE_/u.test(rr) || rr === "WILL_CORE_PREEMPT_V1";
  const continuityLike = rr === "CONTINUITY_ROUTE_HOLD_V1";

  if (scriptureLike) {
    const na = inferSecondSemanticLine(semanticBody, centerClaimHint);
    if (na.length >= 8 && na !== centerClaimHint.slice(0, 240)) nextAxisHint = na;
  } else if (selfawareLike) {
    const na = inferSecondSemanticLine(semanticBody, centerClaimHint);
    if (na.length >= 8 && na !== centerClaimHint.slice(0, 240)) nextAxisHint = na;
  } else if (continuityLike) {
    /* 質問は surface 契約側で抑制。次軸は付けない */
    nextAxisHint = undefined;
  } else if (generalLike) {
    // truth structure の次軸を優先して本文へ還元（内部裁定済みの薄化を防ぐ）
    if (tsNext.length >= 8) {
      nextAxisHint = tsNext.slice(0, 240);
    } else {
      const na = inferSecondSemanticLine(semanticBody, centerClaimHint);
      if (na.length >= 8 && na !== centerClaimHint.slice(0, 240)) nextAxisHint = na;
    }
  } else if (kanagiLike) {
    // 人生相談系も同様に nextAxis を優先し、center/repair の密度を維持
    if (tsNext.length >= 8) {
      nextAxisHint = tsNext.slice(0, 240);
    } else {
      const na = inferSecondSemanticLine(semanticBody, centerClaimHint);
      if (na.length >= 8 && na !== centerClaimHint.slice(0, 240)) nextAxisHint = na;
    }
  } else if (/^DEF_/u.test(rr) || axis === "kotodama_define") {
    const na = inferSecondSemanticLine(semanticBody, centerClaimHint);
    if (na.length >= 8 && na !== centerClaimHint.slice(0, 240)) nextAxisHint = na;
  }

  if (!nextAxisHint && tsNext.length >= 8) {
    nextAxisHint = tsNext.slice(0, 240);
  }
  if (mixedIntent && mixedGuardReady && rootCenterClaim.length >= 6 && nextAxisHint) {
    const n = stripMetaLeakFromHint(String(nextAxisHint).trim());
    if (!/^次軸[:：]/u.test(n)) {
      nextAxisHint = `次軸: ${n}`.slice(0, 240);
    } else {
      nextAxisHint = n.slice(0, 240);
    }
  }

  /** 人生/技術: 次軸行へ repairAxis を併記（裁定語が support 文に埋もれるのを防ぐ） */
  const tsRepair = stripMetaLeakFromHint(String(tcs?.truthStructureRepairAxis ?? "").trim());
  const counselOrTech = counselOrTechSurface;
  if (counselOrTech && tsRepair.length >= 6) {
    const cur = (nextAxisHint || "").trim();
    const head = tsRepair.slice(0, Math.min(14, tsRepair.length));
    if (!cur) {
      nextAxisHint = tsRepair.slice(0, 240);
    } else if (!cur.includes(head)) {
      nextAxisHint = `${cur} ${tsRepair}`.trim().slice(0, 240);
    }
  }

  /** いろは×断捨離 bridge（優先）— 無いときのみ断捨離一行を併記 */
  const idBridge = tcs?.irohaDanshariCounselingBridgeV1 as
    | { humanCounselingBridgeReady?: boolean; combinedSurfaceHint?: string }
    | undefined;
  const idCombined = stripMetaLeakFromHint(String(idBridge?.combinedSurfaceHint ?? "").trim());
  if (kanagiLike && idBridge?.humanCounselingBridgeReady && idCombined.length >= 12) {
    const base = (centerClaimHint || "").trim();
    const headI = idCombined.slice(0, Math.min(14, idCombined.length));
    if (!base.includes(headI)) {
      centerClaimHint = `${base} ${idCombined}`.trim().slice(0, 240);
    }
  } else {
    const dKernel = tcs?.danshariLifeOrderKernelV1 as Record<string, unknown> | undefined;
    const dSurf = stripMetaLeakFromHint(String(dKernel?.lifeOrderSurfaceHint ?? "").trim());
    if (kanagiLike && dSurf.length >= 8) {
      const base = (centerClaimHint || "").trim();
      const headD = dSurf.slice(0, Math.min(12, dSurf.length));
      if (!base.includes(headD)) {
        centerClaimHint = `${base} ${dSurf}`.trim().slice(0, 240);
      }
    }
  }

  return { centerClaimHint: centerClaimHint || "", nextAxisHint };
}
