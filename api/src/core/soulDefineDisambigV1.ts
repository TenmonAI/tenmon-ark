/**
 * SOUL_DEFINE_DISAMBIG_V1
 * 魂まわりを定義 / 世界観 / 比較 / 天聞軸ブリッジに分岐し、WORLDVIEW の一律短答や混線を抑える。
 */

import { DatabaseSync } from "node:sqlite";
import { getDbPath } from "../db/index.js";

/** doc / 詳細指定時は専用ルートへ任せる */
export function soulDefineHasDocOrCmdV1(raw: string): boolean {
  const t = String(raw ?? "").trim();
  return (
    /\bdoc\b/i.test(t) ||
    /pdfPage\s*=\s*\d+/i.test(t) ||
    /#詳細/.test(t) ||
    t.startsWith("#") ||
    t.startsWith("/")
  );
}

/** 分類（WORLDVIEW 先頭ブロック・脳幹で共有） */
export type SoulQuestionClassV1 =
  | "definition"
  | "worldview_existence"
  | "compare"
  | "bridge"
  | "none";

const _compact = (s: string) => s.replace(/\u3000/g, " ").replace(/\s+/g, " ").trim();

/** 魂と他概念の比較（define 単独・worldview 単発に落とさない） */
export function isSoulCompareQuestionV1(raw: string): boolean {
  const t0 = String(raw ?? "").trim();
  if (!/魂/u.test(t0) || soulDefineHasDocOrCmdV1(t0)) return false;
  const c = _compact(t0);
  if (
    /魂と.{1,36}?(の)?(違い|ちがい)/u.test(c) ||
    /魂と.{1,28}?どう違う/u.test(c) ||
    /(心|意識|息|霊|精神|自我)と魂の(違い|ちがい)/u.test(c) ||
    (/魂と(心|意識|息|霊|精神)/u.test(c) && /(違い|どう違う|比べ|比較)/u.test(c))
  ) {
    return true;
  }
  return false;
}

/** 存在論・科学・死後＋魂（定義問いではない） */
export function isSoulWorldviewExistenceQuestionV1(raw: string): boolean {
  const t0 = String(raw ?? "").trim();
  if (!/魂/u.test(t0) || soulDefineHasDocOrCmdV1(t0)) return false;
  if (isSoulDefinitionQuestionV1(t0)) return false;
  if (isSoulCompareQuestionV1(t0)) return false;
  if (isSoulTenmonBridgeQuestionV1(t0)) return false;
  const c = _compact(t0);
  if (
    /魂は(あるのか|いるのか|存在する|存在するのか)/u.test(c) ||
    /魂.*(科学|科学的|証明|実在)/u.test(c) ||
    /死後.*魂|魂.*(残る|消える|続く|行く)/u.test(c) ||
    /(霊魂|魂).*(あるのか|存在する)/u.test(c)
  ) {
    return true;
  }
  return false;
}

/** 天聞軸・言霊・火水での読解（定義の一文＋読みの橋） */
export function isSoulTenmonBridgeQuestionV1(raw: string): boolean {
  const t0 = String(raw ?? "").trim();
  if (!/魂/u.test(t0) || soulDefineHasDocOrCmdV1(t0)) return false;
  if (isSoulDefinitionQuestionV1(t0)) return false;
  if (isSoulCompareQuestionV1(t0)) return false;
  const c = _compact(t0);
  if (/魂を.{0,28}?(天聞軸|天聞で|天聞に|天聞として)/u.test(c)) return true;
  if (/魂を.{0,20}?(言霊|火水|イキ)/u.test(c)) return true;
  if (/魂の本質.{0,16}?(を|は)?.{0,12}?(火水|言霊|天聞|イキ)/u.test(c)) return true;
  if (/魂を.+読む/u.test(c) && /天聞/u.test(c)) return true;
  return false;
}

export function classifySoulQuestionV1(raw: string): SoulQuestionClassV1 {
  if (isSoulDefinitionQuestionV1(raw)) return "definition";
  if (isSoulCompareQuestionV1(raw)) return "compare";
  if (isSoulWorldviewExistenceQuestionV1(raw)) return "worldview_existence";
  if (isSoulTenmonBridgeQuestionV1(raw)) return "bridge";
  return "none";
}

/**
 * 魂の「定義問い」か（世界観の短答・汎用 LLM に吸わせないため広めに判定）
 */
export function isSoulDefinitionQuestionV1(raw: string): boolean {
  const t0 = String(raw ?? "").trim();
  if (!/魂/u.test(t0)) return false;
  if (soulDefineHasDocOrCmdV1(t0)) return false;

  const compact = _compact(t0);

  if (/天聞でいう魂\s*(とは|って)/u.test(compact)) return true;
  if (/魂\s*を\s*定義/u.test(compact)) return true;

  if (
    /^魂\s*(とは|って)\s*(何|なに|なん)(ですか|だ|でしょうか)?\s*[？?！!。…\s]*$/u.test(compact)
  ) {
    return true;
  }
  if (/^魂\s*とは\s*[？?]/u.test(compact) || /^魂\s*って\s*[？?]/u.test(compact)) {
    return true;
  }
  if (
    /^魂\s*の\s*定義/u.test(compact) &&
    /(教えて|聞きたい|知りたい|は何|って何|何ですか|なにですか|\?|？)/u.test(compact)
  ) {
    return true;
  }
  if (/^魂\s*(を|について)\s*(教えて|説明して|聞きたい|知りたい)/u.test(compact)) {
    return true;
  }
  if (/^魂って\s*どういう(もの|こと)(ですか|だ)?\s*[？?]?$/u.test(compact)) {
    return true;
  }

  return false;
}

export type SoulDefineComposerV1 = (opts: Record<string, unknown>) => {
  response: string;
  meaningFrame?: unknown;
};

function soulApplyThreeSegmentLockV1(raw: string): string {
  const s = String(raw ?? "");
  if (!s) return s;
  let prefix = "";
  let content = s;
  if (content.startsWith("【天聞の所見】")) {
    const nl = content.indexOf("\n");
    prefix = nl >= 0 ? content.slice(0, nl + 1) : "【天聞の所見】\n";
    content = content.slice(prefix.length);
  }
  const idxRoot = content.indexOf("【根拠】");
  const idxNext = content.indexOf("次は、");
  if (idxRoot < 0 || idxNext < 0) return s;
  const seg1End = content.indexOf("。");
  if (seg1End < 0 || seg1End > idxRoot) return s;
  const seg1 = content.slice(0, seg1End + 1).trim();
  const seg2 = content.slice(idxRoot, idxNext).trim();
  const seg3 = content.slice(idxNext).trim();
  if (!seg1 || !seg2 || !seg3) return s;
  return prefix + seg1 + "\n\n" + seg2 + "\n\n" + seg3;
}

export type SoulDefineGatePayloadV1 = {
  response: string;
  evidence: { doc: string; pdfPage: number; quote: string } | null;
  candidates: unknown[];
  timestamp: unknown;
  threadId: string;
  decisionFrame: {
    mode: string;
    intent: string;
    llm: null;
    ku: Record<string, unknown>;
  };
};

/**
 * 魂の定義問い用のゲート直前ペイロード。KHS verified が無い場合も SOUL_DEF_SURFACE_V1 で返す（worldview 誤吸着防止）。
 */
export function buildSoulDefineGatePayloadV1(input: {
  message: string;
  threadId: string;
  timestamp: unknown;
  heart: unknown;
  responseComposer: SoulDefineComposerV1;
  normalizeHeartShape: (h: unknown) => unknown;
}): SoulDefineGatePayloadV1 | null {
  if (!isSoulDefinitionQuestionV1(input.message)) return null;

  const __dbSoul = new DatabaseSync(getDbPath("kokuzo.sqlite"), { readOnly: true });
  const __hitSoul: any = __dbSoul
    .prepare(
      `
        SELECT
          l.lawKey,
          l.unitId,
          l.summary,
          l.operator,
          u.doc,
          u.pdfPage,
          u.quote,
          u.quoteHash
        FROM khs_laws l
        JOIN khs_units u ON u.unitId = l.unitId
        WHERE l.status = 'verified'
          AND l.termKey = '魂'
        ORDER BY l.confidence DESC, l.updatedAt DESC
        LIMIT 1
      `
    )
    .get();

  const heartNorm = input.normalizeHeartShape(input.heart);

  if (__hitSoul?.lawKey && __hitSoul?.unitId) {
    const __quoteSoul = String(__hitSoul.quote ?? "").trim();
    const __respSoul =
      "【天聞の所見】\n" +
      "魂とは、人間の胎内に宿る火水（イキ）であり、息として働く生命の本でもあります。" +
      "\n\n【根拠】" +
      __quoteSoul.replace(/\s+/g, " ").trim().slice(0, 180) +
      `\n\n出典: ${String(__hitSoul.doc ?? "")} P${Number(__hitSoul.pdfPage ?? 0)}` +
      "\n\n魂・息・火水のどこを深掘りしますか？";

    const __composed = input.responseComposer({
      response: String(__respSoul),
      rawMessage: String(input.message ?? ""),
      mode: "NATURAL",
      routeReason: "SOUL_FASTPATH_VERIFIED_V1",
      truthWeight: 0,
      katakamunaSourceHint: null,
      katakamunaTopBranch: "",
      naming: null,
      lawTrace: [{ lawKey: String(__hitSoul.lawKey), unitId: String(__hitSoul.unitId), op: "OP_DEFINE" }],
      evidenceIds: [String(__hitSoul.quoteHash ?? "")].filter(Boolean),
      lawsUsed: [String(__hitSoul.lawKey)],
      sourceHint: null,
    });
    const __respSoulLocked = soulApplyThreeSegmentLockV1(String(__composed.response ?? ""));
    const __ku: Record<string, unknown> = {
      routeReason: "SOUL_FASTPATH_VERIFIED_V1",
      lawsUsed: [String(__hitSoul.lawKey)],
      evidenceIds: [String(__hitSoul.quoteHash ?? "")].filter(Boolean),
      lawTrace: [
        {
          lawKey: String(__hitSoul.lawKey),
          unitId: String(__hitSoul.unitId),
          op: "OP_DEFINE",
        },
      ],
      term: "魂",
      heart: heartNorm,
      routeClass: "define",
      answerMode: "define",
      answerFrame: "statement_plus_one_question",
      centerKey: "soul",
      centerLabel: "魂",
    };
    if (__composed.meaningFrame != null) __ku.meaningFrame = __composed.meaningFrame;

    return {
      response: __respSoulLocked,
      evidence: {
        doc: String(__hitSoul.doc ?? ""),
        pdfPage: Number(__hitSoul.pdfPage ?? 0),
        quote: __quoteSoul.slice(0, 120),
      },
      candidates: [],
      timestamp: input.timestamp,
      threadId: input.threadId,
      decisionFrame: {
        mode: "NATURAL",
        intent: "define",
        llm: null,
        ku: __ku,
      },
    };
  }

  const __respFb =
    "【天聞の所見】\n" +
    "魂とは、人間の胎内に宿る火水（イキ）であり、息として働く生命の本でもあります。" +
    "\n\n魂・息・火水のどこを深掘りしますか？";

  const __composedFb = input.responseComposer({
    response: String(__respFb),
    rawMessage: String(input.message ?? ""),
    mode: "NATURAL",
    routeReason: "SOUL_DEF_SURFACE_V1",
    truthWeight: 0,
    katakamunaSourceHint: null,
    katakamunaTopBranch: "",
    naming: null,
    lawTrace: [],
    evidenceIds: [],
    lawsUsed: [],
    sourceHint: null,
  });

  const __kuFb: Record<string, unknown> = {
    routeReason: "SOUL_DEF_SURFACE_V1",
    lawsUsed: [],
    evidenceIds: [],
    lawTrace: [],
    term: "魂",
    heart: heartNorm,
    routeClass: "define",
    answerMode: "define",
    answerFrame: "statement_plus_one_question",
    centerKey: "soul",
    centerLabel: "魂",
    soulDefineFallback: true,
  };
  if (__composedFb.meaningFrame != null) __kuFb.meaningFrame = __composedFb.meaningFrame;

  return {
    response: String(__composedFb.response ?? __respFb).trim(),
    evidence: null,
    candidates: [],
    timestamp: input.timestamp,
    threadId: input.threadId,
    decisionFrame: {
      mode: "NATURAL",
      intent: "define",
      llm: null,
      ku: __kuFb,
    },
  };
}

/**
 * 魂の二項比較問い（WORLDVIEW 一律短答から切り離す）。chat 側で responsePlan / binder を足す前提。
 */
export function buildSoulCompareGatePayloadV1(input: {
  message: string;
  threadId: string;
  timestamp: unknown;
  heart: unknown;
  normalizeHeartShape: (h: unknown) => unknown;
}): SoulDefineGatePayloadV1 | null {
  if (!isSoulCompareQuestionV1(input.message)) return null;
  const heartNorm = input.normalizeHeartShape(input.heart);
  const body =
    "【天聞の所見】比較の問いです。天聞軸では魂を生命の本としての息・火水に近づけ、心や意識は注意と裁きの働きとして束ねる読み方がよく使われます。二者を「定義」「働き」「現れ方」のどれで揃えるかを先に決めると、ぶれにくいです。\n\n比べたい軸は定義・働き・現れ方のどれからにしますか。";
  return {
    response: body,
    evidence: null,
    candidates: [],
    timestamp: input.timestamp,
    threadId: input.threadId,
    decisionFrame: {
      mode: "NATURAL",
      intent: "chat",
      llm: null,
      ku: {
        routeReason: "R22_COMPARE_ASK_V1",
        answerLength: "short",
        answerMode: "analysis",
        answerFrame: "one_step",
        lawsUsed: [],
        evidenceIds: [],
        lawTrace: [],
        heart: heartNorm,
        centerKey: "soul",
        centerLabel: "魂",
        routeClass: "analysis",
        soulCompareDisambig: true,
      },
    },
  };
}

/** 魂の天聞軸読解（定義の芯＋読みの橋）。SOUL_DEF_SURFACE_V1 で整形。 */
export function buildSoulBridgeGatePayloadV1(input: {
  message: string;
  threadId: string;
  timestamp: unknown;
  heart: unknown;
  normalizeHeartShape: (h: unknown) => unknown;
  responseComposer: SoulDefineComposerV1;
}): SoulDefineGatePayloadV1 | null {
  if (!isSoulTenmonBridgeQuestionV1(input.message)) return null;
  const heartNorm = input.normalizeHeartShape(input.heart);
  const __respFb =
    "【天聞の所見】\n" +
    "魂とは、人間の胎内に宿る火水（イキ）であり、息として働く生命の本でもあります。" +
    "\n\n天聞軸では、抽象語で固定せず、息としての通い・火水としての生成と収束・反復する構文として読みます。" +
    "\n\n次は、息・火水・言霊のどの軸から一段だけ深掘りしますか。";
  const __composedFb = input.responseComposer({
    response: String(__respFb),
    rawMessage: String(input.message ?? ""),
    mode: "NATURAL",
    routeReason: "SOUL_DEF_SURFACE_V1",
    truthWeight: 0,
    katakamunaSourceHint: null,
    katakamunaTopBranch: "",
    naming: null,
    lawTrace: [],
    evidenceIds: [],
    lawsUsed: [],
    sourceHint: null,
  });
  const __ku: Record<string, unknown> = {
    routeReason: "SOUL_DEF_SURFACE_V1",
    lawsUsed: [],
    evidenceIds: [],
    lawTrace: [],
    term: "魂",
    heart: heartNorm,
    routeClass: "define",
    answerMode: "define",
    answerFrame: "statement_plus_one_question",
    centerKey: "soul",
    centerLabel: "魂",
    soulTenmonBridge: true,
  };
  if (__composedFb.meaningFrame != null) __ku.meaningFrame = __composedFb.meaningFrame;
  return {
    response: soulApplyThreeSegmentLockV1(String(__composedFb.response ?? __respFb).trim()),
    evidence: null,
    candidates: [],
    timestamp: input.timestamp,
    threadId: input.threadId,
    decisionFrame: {
      mode: "NATURAL",
      intent: "define",
      llm: null,
      ku: __ku,
    },
  };
}
