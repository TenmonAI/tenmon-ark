import type { ReleaseMode, ReleasePolicy } from "./releaseModePolicy.js";

function cloneJson<T>(v: T): T {
  try {
    return JSON.parse(JSON.stringify(v));
  } catch {
    return v;
  }
}

function trimText(v: unknown, max = 140): unknown {
  if (typeof v !== "string") return v;
  const s = v.replace(/\s+/g, " ").trim();
  return s.length <= max ? s : s.slice(0, max) + "…";
}

function dropKeys(obj: Record<string, any>, keys: string[]): Record<string, any> {
  const out = { ...obj };
  for (const k of keys) delete out[k];
  return out;
}

function shallowSummary(obj: Record<string, any>): Record<string, any> {
  const picked: Record<string, any> = {};
  const allow = [
    "sourceRouteReason",
    "sourceLedgerHint",
    "notionHint",
    "reconcileHint",
    "topicClass",
    "conceptMode",
    "conceptAlignment",
    "centerKey",
    "centerLabel",
    "centerMeaning",
    "centerHint",
  ];
  for (const k of allow) {
    if (obj[k] !== undefined) picked[k] = trimText(obj[k]);
  }
  return picked;
}

export interface ReleaseExposureInput {
  releasePolicy: ReleasePolicy;
  synapseTop?: any;
  sourceKanagiSelf?: any;
  sourceIntention?: any;
  sourceHeart?: any;
  centerHint?: any;
  kanagiCenterHint?: any;
  coreIntentionTop?: any;
  learningPriorityTop?: any;
  responseSelectionTop?: any;
}

export interface ReleaseExposureOutput {
  mode: ReleaseMode;
  sourcePolicy: ReleasePolicy["sourcePolicy"];
  truthGate: ReleasePolicy["truthGate"];
  exposure: Record<string, any>;
}

export function applyReleaseKnowledgeExposure(
  input: ReleaseExposureInput,
): ReleaseExposureOutput {
  const policy = input.releasePolicy;
  const raw = cloneJson({
    synapseTop: input.synapseTop,
    sourceKanagiSelf: input.sourceKanagiSelf,
    sourceIntention: input.sourceIntention,
    sourceHeart: input.sourceHeart,
    centerHint: input.centerHint,
    kanagiCenterHint: input.kanagiCenterHint,
    coreIntentionTop: input.coreIntentionTop,
    learningPriorityTop: input.learningPriorityTop,
    responseSelectionTop: input.responseSelectionTop,
  });

  if (policy.mode === "STRICT") {
    return {
      mode: policy.mode,
      sourcePolicy: policy.sourcePolicy,
      truthGate: policy.truthGate,
      exposure: raw,
    };
  }

  if (policy.mode === "HYBRID") {
    const summarized = dropKeys(raw, [
      "sourceHeart",
      "learningPriorityTop",
      "responseSelectionTop",
    ]);

    if (summarized.synapseTop && typeof summarized.synapseTop === "object") {
      summarized.synapseTop = shallowSummary(summarized.synapseTop);
    }
    summarized.centerHint = trimText(summarized.centerHint, 120);
    summarized.kanagiCenterHint = trimText(summarized.kanagiCenterHint, 120);
    summarized.coreIntentionTop = trimText(summarized.coreIntentionTop, 120);

    return {
      mode: policy.mode,
      sourcePolicy: policy.sourcePolicy,
      truthGate: policy.truthGate,
      exposure: summarized,
    };
  }

  const light = {
    synapseTop: raw?.synapseTop && typeof raw.synapseTop === "object"
      ? shallowSummary(raw.synapseTop)
      : undefined,
  };

  return {
    mode: policy.mode,
    sourcePolicy: policy.sourcePolicy,
    truthGate: policy.truthGate,
    exposure: light,
  };
}
