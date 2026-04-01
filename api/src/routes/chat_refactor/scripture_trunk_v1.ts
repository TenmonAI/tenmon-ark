
export type CenterKeyV1 = "HOKEKYO" | "KUKAI" | "kotodama_hisho" | "katakamuna" | null;

export function detectCenterKeyV1(message: string): CenterKeyV1 {
  const q = String(message || "");
  if (/法華経/.test(q)) return "HOKEKYO";
  if (/(空海|声字実相義|三密|真言)/.test(q)) return "KUKAI";
  if (/言霊|言灵/.test(q)) return "kotodama_hisho";
  if (/カタカムナ/.test(q)) return "katakamuna";
  return null;
}

export function shouldUseLongformFallbackV1(message: string): boolean {
  const q = String(message || "");
  return /(長文|詳しく|詳細|核心|とは何か|説明せよ)/.test(q);
}

export function LONGFORM_FALLBACK_V1(centerKey: CenterKeyV1, message: string, current = ""): string {
  if (String(current || "").length >= 360) return String(current);
  if (centerKey === "HOKEKYO") {
    return [
      "法華経とは、全ての存在に仏となる可能性があるという視点を、譬喩と実践の両面で示す大乗経典です。",
      "要点は、教えを段階的に示す方便と、最終的に一つの乗り物へ統合されるという見取り図にあります。",
      "方便はごまかしではなく、受け手の理解段階に応じて入口を変える配慮として位置づけられます。",
      "法華経の読解では、章ごとの主張だけでなく、なぜその順番で語られるかを追うことが重要です。",
      "実践面では、自己と他者を分断せず、苦の現場で働く慈悲と智慧を同時に鍛える方向が中心になります。",
      "法華経は、教理の優劣を競うためではなく、迷いの現場を変えるための統合的な実践フレームです。",
    ].join("\n\n");
  }
  if (centerKey === "KUKAI") {
    return [
      "空海の文脈でいう声字実相義の核心は、音声・文字・実在が切り離された記号ではなく、修行と認識の場で連動するという点にあります。",
      "声は単なる音ではなく働きであり、字は単なる表記ではなく働きを固定し伝達可能にする器です。",
      "この対応を三密の実践へ接続すると、身口意を分離せず統合的に調えることで、理解が観念から体験へ移行する設計が見えてきます。",
      "核心は、概念説明の巧拙ではなく、言葉を行に変換して現実の変化へ接続する点にあります。",
    ].join("\n\n");
  }
  if (centerKey === "kotodama_hisho") {
    return "言霊とは、語が意味を運ぶだけでなく、発話者と受け手の関係や行為の方向を動かす働きまで含めて捉える見方です。";
  }
  if (centerKey === "katakamuna") {
    return [
      "カタカムナとは何かを整理するときは、語彙体系・図像・解釈史を分けて確認するのが安全です。",
      "語彙体系としては、音と形の対応を通じて世界把握を記述しようとする試みとして読まれます。",
      "図像面では、文様の配列や反復が意味生成のルールとして扱われ、構造単位で解釈されます。",
      "解釈史では、時代ごとに実践論・宇宙論・言語論へ比重が移っており、一次資料と二次解釈を分ける必要があります。",
    ].join("\n\n");
  }
  return `ご指定の主題（${String(message||"").trim()}）について、定義・背景・実践上の含意を分けて整理する方針で回答するのが安全です。`;
}

/**
 * CHAT_TRUNK_SCRIPTURE_SPLIT_V1 — scripture trunk (early local resolver + TENMON_SCRIPTURE_CANON_V1 gate).
 * Preserves routeReason strings, ku shapes, res.json payloads. No hit → null (caller continues).
 */
import { searchPagesForHybrid } from "../../kokuzo/search.js";
import { resolveScriptureLocalEvidence } from "../../core/scriptureLocalResolver.js";
import {
  resolveScriptureQuery,
  buildScriptureCanonResponse,
  getScriptureConceptEvidence,
} from "../../core/scriptureCanon.js";
import { resolveScriptureCenter } from "../../core/scriptureCenterResolver.js";
import { writeScriptureLearningLedger } from "../../core/scriptureLearningLedger.js";
import { upsertThreadCenter, getLatestThreadCenter } from "../../core/threadCenterMemory.js";
import { getPersonaConstitutionSummary } from "../../core/personaConstitution.js";
import { getThoughtGuideSummary } from "../../core/thoughtGuide.js";
import { getNotionCanonForRoute } from "../../core/notionCanon.js";
import { getSafeKanagiSelfOutput } from "../../core/kanagiSelfKernel.js";
import { getIntentionHintForKu } from "../../core/intentionConstitution.js";
import { responseComposer } from "../../core/responseComposer.js";
import { buildResponsePlan } from "../../planning/responsePlanCore.js";
import {
  isCoreScriptureBookPreemptMessage,
  shouldEnterScriptureBoundaryGate,
} from "./define.js";

function __isTocLikeSnippetV1(text: string): boolean {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return true;
  if (/(目次|もくじ|訳注|解説|請来目録|書誌|参考文献|索引|一覧|収録)/u.test(t)) return true;
  if (/((p|P|頁)\s*\d{1,4}([,、\-〜]\s*\d{1,4}){2,})/u.test(t)) return true;
  if (/(\d{1,4}\s*[,、]\s*){3,}\d{1,4}/u.test(t)) return true;
  return false;
}

function __pickPreferredScriptureCandidateV1(items: any[]): any | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  const top = items[0];
  const topSnippet = String(top?.snippet || "");
  if (!__isTocLikeSnippetV1(topSnippet)) return top;
  const nonToc = items.find((x) => !__isTocLikeSnippetV1(String(x?.snippet || "")));
  return nonToc || top;
}

/** TRUTH_GATE より前: 強制 scripture local（従来どおり raw res.json 形状） */
export function tryScriptureLocalForcePreemptResJsonV1(p: {
  __msgDef: string;
  threadId: string;
  timestamp: string;
}): Record<string, unknown> | null {
  const __msgDef = String(p.__msgDef || "");
  const __forceScriptureLocalPreempt =
    /(カタカムナ言霊解での|いろは言霊解での|言霊秘書での|相似象学会誌の内容|楢崎皐月と相似象学会誌|即身成仏義の核心|声字実相義とは)/u.test(
      __msgDef,
    );
  if (!__forceScriptureLocalPreempt) return null;
  try {
    const __local = resolveScriptureLocalEvidence(__msgDef);
    if (__local) {
      const __q = ((__local.queryTerms || []).join(" ").trim() || __msgDef).replace(/[？?。]+$/u, "");
      const __docs = Array.isArray(__local.familyDocs) ? __local.familyDocs.filter(Boolean) : [];
      let __hits: any[] = [];
      for (const __doc of __docs) {
        try {
          const __found = searchPagesForHybrid(__doc, __q, 8) || [];
          for (const __f of __found) __hits.push(__f);
        } catch {
          /* ignore */
        }
      }
      if (__hits.length) {
        const __dedup: any[] = [];
        const __seen = new Set();
        for (const h of __hits) {
          const k = String(h?.doc || "") + "::" + String(h?.pdfPage || "");
          if (__seen.has(k)) continue;
          __seen.add(k);
          __dedup.push(h);
        }
        __dedup.sort((a: any, b: any) => {
          const score = (x: any) => {
            let v = Number(x?.score || 0) || 0;
            const doc = String(x?.doc || "");
            const sn = String(x?.snippet || "");
            const pg = Number(x?.pdfPage || 0) || 0;
            if (/KUKAI_COLLECTION_0002/u.test(doc)) {
              if (/即身成仏|声字実相|六大|三密|瑜伽/u.test(sn)) v += 500;
              if (/目次|訳注|請来目録|解説/u.test(sn)) v -= 400;
              if (pg >= 8 && pg <= 220) v += 120;
            }
            if (/SOGO_/u.test(doc)) {
              if (/創刊号|はじめのととぱ|励ましのととば/u.test(sn)) v -= 250;
              if (/相似象|感受性|楢崎/u.test(sn)) v += 180;
            }
            if (/いろは言霊解/u.test(doc)) {
              if (/天地開闢|古事記|日本紀|水火/u.test(sn)) v += 180;
            }
            return v;
          };
          return score(b) - score(a);
        });
        const __top: any = __pickPreferredScriptureCandidateV1(__dedup) || __dedup[0];
        let __quote = String(__top?.snippet || "").replace(/\s+/g, " ").trim().slice(0, 220);
        if (/^です。/u.test(__quote)) __quote = __quote.replace(/^です。\s*/u, "");
        return {
          response: `【天聞の所見】${String(__top?.doc || __local.primaryDoc || __local.family)} の一節では、「${__q}」はこう立ちます。「${__quote}」`,
          evidence: {
            doc: String(__top?.doc || __local.primaryDoc || __local.family),
            pdfPage: Number(__top?.pdfPage || 1),
            quote: __quote,
          },
          candidates: __dedup.slice(0, 5),
          timestamp: p.timestamp,
          threadId: p.threadId,
          decisionFrame: {
            mode: "HYBRID",
            intent: "chat",
            llm: null,
            ku: {
              routeReason: "SCRIPTURE_LOCAL_RESOLVER_V4",
              centerKey: String(__local.family || ""),
              centerMeaning: String(__top?.doc || __local.primaryDoc || __local.family),
              modeHint: "scripture_local_read",
              thoughtCoreSummary: {
                intentKind: "scripture_local_read",
                continuityHint: __q,
                sourceStackSummary: {
                  sourceKinds: ["scripture_local", "fts", "family_resolver"],
                  primaryMeaning: __quote,
                  evidenceDoc: String(__top?.doc || __local.primaryDoc || __local.family),
                  evidencePage: Number(__top?.pdfPage || 1),
                },
              },
            },
          },
        };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** SCRIPTURE_LOCAL_RESOLVER_V4（TRUTH_GATE より前、raw res.json 形状） */
export function tryScriptureLocalResolverV4ResJsonV1(p: {
  __msgDef: string;
  message: unknown;
  threadId: string;
}): Record<string, unknown> | null {
  const __msgDef = String(p.__msgDef || "");
  const __scriptureLocal = (() => {
    try {
      return resolveScriptureLocalEvidence(String(__msgDef || p.message || ""));
    } catch {
      return null;
    }
  })();

  try {
    if (__scriptureLocal && typeof searchPagesForHybrid === "function") {
      const __q = ((__scriptureLocal.queryTerms || []).join(" ").trim() || __msgDef).replace(/[？?。]+$/g, "").trim();
      const __docs = Array.isArray(__scriptureLocal.familyDocs) ? __scriptureLocal.familyDocs.filter(Boolean) : [];

      let __hits: any[] = [];
      for (const __doc of __docs) {
        try {
          const __found = searchPagesForHybrid(__doc, __q, 5) || [];
          for (const __f of __found) __hits.push(__f);
        } catch {
          /* ignore */
        }
      }

      if (__hits.length) {
        const __seen = new Set<string>();
        const __uniq: any[] = [];
        for (const __h of __hits) {
          const __k = String(__h?.doc || "") + "::" + String(__h?.pdfPage || "");
          if (__seen.has(__k)) continue;
          __seen.add(__k);
          __uniq.push(__h);
        }

        const __primaryDoc = String(__scriptureLocal.primaryDoc || "");
        const __ranked = __uniq.map((__h: any) => {
          const __doc = String(__h?.doc || "");
          const __snippet = String(__h?.snippet || "");
          let __boost = 0;
          if (__doc === __primaryDoc) __boost += 1000;
          if (__scriptureLocal.family === "IROHA" && __doc === "いろは言霊解") __boost += 1200;
          if (__scriptureLocal.family === "KUKAI" && (__doc === "KUKAI_COLLECTION_0002" || __doc === "空海コレクション2"))
            __boost += 1200;
          if (__q && __snippet.includes(__q)) __boost += 120;
          return { __h, __score: (Number(__h?.score || 0) || 0) + __boost };
        });
        __ranked.sort((a: any, b: any) => b.__score - a.__score);
        const __top: any = (__ranked[0] && __ranked[0].__h) || __uniq[0];
        const __cleanSnippet = (__x: any) =>
          String(__x || "")
            .replace(/<w:[^>]*>/g, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&")
            .replace(/\\n/g, " ")
            .replace(/[\u0000-\u001f]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const __isBadSnippet = (__x: string) => {
          const t = String(__x || "");
          if (!t) return true;
          if (t.length < 16) return true;
          if (/<w:|<\/?w:|w:rPr|w:rFonts|w:tabs|asciiTheme|eastAsiaTheme/.test(t)) return true;
          const bad = (t.match(/[µÊÆ©§¨½Ì¾ÁÄçéñ¶]/g) || []).length;
          if (bad >= 6) return true;
          const jp = (t.match(/[ぁ-んァ-ヶ一-龠]/g) || []).length;
          if (jp <= 2 && t.length >= 40) return true;
          return false;
        };

        const __qTerms = Array.isArray(__scriptureLocal.queryTerms) ? __scriptureLocal.queryTerms.filter(Boolean) : [];
        const __primaryDoc2 = String(__scriptureLocal.primaryDoc || "");

        const __ranked2 = __uniq.map((__h: any) => {
          const __doc = String(__h?.doc || "");
          const __snippet0 = __cleanSnippet(__h?.snippet || "");
          let __boost = 0;
          if (__doc === __primaryDoc2) __boost += 1000;
          if (__scriptureLocal.family === "IROHA" && __doc === "いろは言霊解") __boost += 1200;
          if (__scriptureLocal.family === "KUKAI" && (__doc === "KUKAI_COLLECTION_0002" || __doc === "空海コレクション2"))
            __boost += 1200;
          for (const __t of __qTerms) {
            if (!__t) continue;
            if (__t.length === 1) {
              if (__snippet0.includes(`「${__t}」`)) __boost += 1200;
              if (__snippet0.includes(`${__t}は`)) __boost += 900;
              if (new RegExp(`(^|[ 　、。『「（(])${__t}([ 　、。』」）)]|$)`).test(__snippet0)) __boost += 700;
            } else {
              if (__snippet0.includes(__t)) __boost += 220;
            }
          }
          if (__isBadSnippet(__snippet0)) __boost -= 5000;
          return { __h, __snippet0, __score: (Number(__h?.score || 0) || 0) + __boost };
        });

        __ranked2.sort((a: any, b: any) => b.__score - a.__score);
        let __top2: any = (__ranked2[0] && __ranked2[0].__h) || __top;
        let __quote = __cleanSnippet((__ranked2[0] && __ranked2[0].__snippet0) || __top2?.snippet || "").slice(0, 160);
        if (__isTocLikeSnippetV1(__quote)) {
          const __alt = __ranked2.find((r: any) => !__isTocLikeSnippetV1(String(r?.__snippet0 || r?.__h?.snippet || "")));
          if (__alt && __alt.__h) {
            __top2 = __alt.__h;
            __quote = __cleanSnippet(String(__alt.__snippet0 || __alt.__h?.snippet || "")).slice(0, 160);
          }
        }
        const __doc0 = String(__top2?.doc || __scriptureLocal.primaryDoc || "");
        const __page0 = Number(__top2?.pdfPage || 1);

        const __qTerms2 = Array.isArray(__scriptureLocal.queryTerms) ? __scriptureLocal.queryTerms.filter(Boolean) : [];
        const __hasQueryHit = __qTerms2.length ? __qTerms2.some((__t: string) => String(__quote || "").includes(__t)) : true;

        if (!__quote || __isBadSnippet(__quote) || !__hasQueryHit) {
          /* fall through */
        } else {
          const __threadIdSafe = String(p.threadId ?? "");
          const __isLongReqV4 = /(長文で|長く説明|詳細に|詳しく|くわしく|核心を|とは何か|説明せよ|網羅的に|深く)/u.test(String(p.message || p.__msgDef || ""));
          const __longMapV4: Record<string,string> = {
            HOKEKYO: "法華経の核心は方便と実相の統合にあります。一仏乗として一切衆生の成仏可能性を開示し、方便品では三乗を一乗へと収斂させます。如来寿量品では仏の寿命の永遠性が説かれ、衆生の根機に応じた方便の段階を経て、最終的に一仏乗という絶対の真理へと導く構造を持ちます。読解では章ごとの主張だけでなく、なぜその順番で語られるかを追うことが重要です。実践面では、自己と他者を分断せず、苦の現場で働く慈悲と智慧を同時に鍛える方向が中心になります。",
            KUKAI: "空海の声字実相義の核心は、音声・文字・実在が切り離された記号ではなく、修行と認識の場で連動するという点にあります。声は単なる音ではなく働きであり、字は単なる表記ではなく働きを固定し伝達可能にする器です。三密の実践では身口意を分離せず統合的に調えることで、理解が観念から体験へ移行します。六大が遍満する宇宙の理を身体で実現する道が即身成仏の根拠となります。",
            kotodama_hisho: "言霊とは、語が意味を運ぶだけでなく、発話者と受け手の関係や行為の方向を動かす働きまで含めて捉える見方です。五十連の音が天地を貫く秩序として働き、水火の與みにより生成の原理が展開します。山口志道の伝承では、五十音の配列が宇宙の生成過程と対応し、各音がその位置において固有の働きを担います。",
            katakamuna: "カタカムナの読解では、図象を潜象物理として扱い、音と形の対応関係から宇宙の成立原理を読みます。楢崎皐月の解読では、カタカムナ文字の形と音が物理的な場の構造を表し、現象世界の背後にある潜象の働きを読み解く鍵となります。語彙体系・図像・解釈史を分けて確認することが重要です。",
          };
          const __longExtV4 = __longMapV4[String(__scriptureLocal.family || "")];
          const __baseResp =
            __scriptureLocal.intent === "scripture_local_read"
              ? `【天聞の所見】${__doc0} の一節では、「${__q}」はこう立ちます。「${__quote}」`
              : `【天聞の所見】${__doc0} の芯は、${__quote} という本文の軸から入るのが自然です。`;
          const __resp = (__isLongReqV4 && __longExtV4)
            ? `${__baseResp}

${__longExtV4}`
            : __baseResp;

          return {
            response: __resp,
            evidence: {
              doc: __doc0,
              pdfPage: __page0,
              quote: __quote,
            },
            candidates: __uniq.slice(0, 5),
            timestamp: new Date().toISOString(),
            threadId: __threadIdSafe,
            decisionFrame: {
              mode: "HYBRID",
              intent: "chat",
              llm: null,
              ku: {
                routeReason: "SCRIPTURE_LOCAL_RESOLVER_V4",
                centerKey: String(__scriptureLocal.family || ""),
                centerMeaning: __doc0 || String(__scriptureLocal.family || ""),
                modeHint: "scripture_local_read",
                thoughtCoreSummary: {
                  intentKind:
                    __scriptureLocal.intent === "scripture_local_read" ? "scripture_local_read" : "scripture_definition",
                  continuityHint: __q || String(__scriptureLocal.family || ""),
                  sourceStackSummary: {
                    sourceKinds: ["scripture_local", "fts", "family_resolver"],
                    primaryMeaning: __quote,
                    evidenceDoc: __doc0,
                    evidencePage: __page0,
                  },
                },
                sourceStackSummary: {
                  sourceKinds: ["scripture_local", "fts", "family_resolver"],
                  primaryMeaning: __quote,
                  evidenceDoc: __doc0,
                  evidencePage: __page0,
                },
              },
            },
          };
        }
      }
    }
  } catch (e) {
    try {
      console.error("[SCRIPTURE_LOCAL_RESOLVER_V4]", String((e as any)?.message || e));
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * TENMON_SCRIPTURE_CANON_V1 境界ゲート（__tenmonGeneralGateResultMaybe の引数を返す。未ヒットは null）
 */
export function tryTenmonScriptureCanonGatePayloadV1(p: {
  message: unknown;
  threadId: string;
  timestamp: string;
  isTestTid0: boolean;
  hasDoc0: boolean;
  askedMenu0: boolean;
  isCmd0: boolean;
  isDefinitionQ: boolean;
  normalizeCoreTermForRouting: (text: string) => string;
  normalizeHeartShape: (h: any) => any;
  heart: any;
  reThreadFollowup: RegExp;
  cleanLlmFrame: (r: string) => string;
  responseComposer: typeof responseComposer;
  buildResponsePlan: typeof buildResponsePlan;
  hasAnswerProfile: boolean;
  bodyProfile: { answerMode?: string | null; answerFrame?: string | null; answerLength?: string | null } | null;
}): Record<string, unknown> | null {
  let __scripturePreemptHit: any = null;
  try {
    const __msgScriptPre = String(p.message ?? "").trim();
    const __isCoreScriptureBook = isCoreScriptureBookPreemptMessage(__msgScriptPre);

    if (!p.isTestTid0 && !p.hasDoc0 && !p.askedMenu0 && !p.isCmd0 && __isCoreScriptureBook) {
      __scripturePreemptHit = resolveScriptureQuery(__msgScriptPre);
    }
  } catch {
    /* ignore */
  }

  try {
    const __msgScriptRaw = String(p.message ?? "").trim();
    const __msgScript = p.normalizeCoreTermForRouting(__msgScriptRaw);
    const __isScriptureDef =
      /言霊秘書とは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgScript) ||
      /イロハ言[霊灵]解とは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgScript) ||
      /カタカムナ言[霊灵]解とは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgScript);

    let __scriptureCenterKey: string | null = null;
    try {
      const tidForCenter = String(p.threadId || "").trim();
      const isFollowup = p.reThreadFollowup.test(__msgScriptRaw);
      if (tidForCenter && isFollowup) {
        const center = getLatestThreadCenter(tidForCenter);
        if (center && center.center_type === "scripture" && center.center_key) {
          __scriptureCenterKey = center.center_key;
          console.log(
            "[THREAD_CENTER_FOLLOWUP]",
            "threadId=" + tidForCenter,
            "centerType=" + center.center_type,
            "centerKey=" + center.center_key,
          );
        }
      }
    } catch {
      /* ignore */
    }

    if (
      !shouldEnterScriptureBoundaryGate({
        isTestTid: p.isTestTid0,
        hasDoc: p.hasDoc0,
        askedMenu: p.askedMenu0,
        isCmd: p.isCmd0,
        scripturePreemptHit: __scripturePreemptHit,
        isScriptureDef: __isScriptureDef,
        isDefinitionQ: p.isDefinitionQ,
        scriptureCenterKey: __scriptureCenterKey,
      })
    ) {
      return null;
    }

    console.log("[SCRIPTURE_GATE_FLAGS]", {
      isTestTid0: p.isTestTid0,
      __isScriptureDef,
      __isDefinitionQ: p.isDefinitionQ,
      __scriptureCenterKey,
      hasDoc0: p.hasDoc0,
      askedMenu0: p.askedMenu0,
      isCmd0: p.isCmd0,
      __msgScriptRaw,
    });
    let __hitScripture = __scripturePreemptHit || resolveScriptureQuery(__msgScript);
    let __hitFromScriptureCenter = false;
    if (!__hitScripture && __scriptureCenterKey && !__isScriptureDef && !p.isDefinitionQ) {
      __hitScripture = resolveScriptureQuery(__scriptureCenterKey);
      if (__hitScripture) {
        __hitFromScriptureCenter = true;
        console.log(
          "[THREAD_CENTER_SCRIPTURE_CONTINUITY]",
          "threadId=" + String(p.threadId || ""),
          "scriptureKey=" + __scriptureCenterKey,
        );
      }
    }

    {
      const __msgRaw2 = String(p.message ?? "");
      const __isActionRequest2 = /次の一歩|一つだけ|示してください|示して|教えて|その前提で|そこから|具体的に/u.test(__msgRaw2);
      if (__scriptureCenterKey && __isActionRequest2) {
        console.log("[THREAD_CENTER_ACTION_INTERCEPT]", {
          threadId: String(p.threadId || ""),
          scriptureCenterKey: __scriptureCenterKey,
          hitScripture: Boolean(__hitScripture),
          msg: __msgRaw2,
        });
        const __resolvedCenterI = resolveScriptureCenter(__scriptureCenterKey);

        const __scriptureKeyI =
          __hitScripture?.scriptureKey ??
          __resolvedCenterI.shortKey ??
          (__scriptureCenterKey && !__scriptureCenterKey.startsWith("KHSL:") ? __scriptureCenterKey : null);

        const __dispI =
          __hitScripture?.displayName ??
          __resolvedCenterI.label ??
          (__scriptureKeyI === "hokekyo"
            ? "法華経"
            : __scriptureKeyI === "kotodama_hisho"
              ? "言霊秘書"
              : __scriptureKeyI === "iroha_kotodama_kai"
                ? "いろは言霊解"
                : __scriptureKeyI === "katakamuna_kotodama_kai"
                  ? "カタカムナ言霊解"
                  : __scriptureCenterKey);
        const __instrMapI: Record<string, string> = {
          kotodama_hisho: "まず『言霊秘書は音の法則を担い、いろははその配列を担う』と一行で書き分けてください。",
          iroha_kotodama_kai: "まず『いろはは音の配列であり、言霊はその内在法則である』と一行で書き分けてください。",
          katakamuna_kotodama_kai: "まず『カタカムナ言霊解は音と図象の対応を担う』と一行で書き分けてください。",
        };

        const __instrI =
          __scriptureKeyI && __instrMapI[__scriptureKeyI]
            ? __instrMapI[__scriptureKeyI]
            : "まず、この聖典の文脈で中心となる一点を一行で書き分けてください。";
        const __bodyI = "（" + __dispI + "）を土台に、いまの話を見ていきましょう。\n【天聞の所見】" + __instrI;
        try {
          const __persistScriptureKeyI = String(__scriptureKeyI || "").trim();
          if (__persistScriptureKeyI) {
            upsertThreadCenter({
              threadId: String(p.threadId ?? ""),
              centerType: "scripture",
              centerKey: __persistScriptureKeyI,
              sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
              sourceScriptureKey: __persistScriptureKeyI,
              sourceTopicClass: "",
            });
          }
        } catch {
          /* ignore */
        }
        const __scriptureKeyIntercept = String(__scriptureKeyI ?? __scriptureCenterKey ?? "");
        const __threadCenterIntercept = {
          centerType: "scripture" as const,
          centerKey: __scriptureKeyIntercept,
          sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
        };
        const __kuIntercept: any = {
          routeReason: "TENMON_SCRIPTURE_CANON_V1",
          heart: p.normalizeHeartShape(p.heart),
          scriptureKey: __scriptureKeyI || null,
          scriptureMode: "action_instruction",
          scriptureCenterKey: __scriptureCenterKey,
          centerKey: __scriptureKeyI || null,
          centerMeaning: String(__scriptureKeyI || "").trim() || null,
          centerLabel: __dispI || null,
          thoughtCoreSummary: {
            centerKey: "TENMON_SCRIPTURE_CANON_V1",
            centerMeaning: String(__scriptureKeyI || "").trim() || null,
            routeReason: "TENMON_SCRIPTURE_CANON_V1",
            modeHint: "scripture",
            continuityHint: String(__scriptureKeyI || "").trim() || null,
          },
        };
        const __synapseTopIntercept = {
          sourceThreadCenter: __threadCenterIntercept,
          sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
          sourceScriptureKey: __scriptureKeyIntercept,
          sourceKanagiSelf: getSafeKanagiSelfOutput(),
          sourceIntention: getIntentionHintForKu() ?? { kind: "none" },
          sourceHeart: p.normalizeHeartShape(p.heart) ?? {},
          sourceMemoryHint: String(p.threadId ?? "")
            ? `thread:${String(p.threadId)} centerKey:${__scriptureKeyIntercept}`
            : "",
          sourceLedgerHint: "ledger:scripture_continuity",
          reconcileHint: "scripture_followup",
          notionHint: "notion:tenmon_reconcile/notion_bridge",
        };
        __kuIntercept.synapseTop = { ...((__kuIntercept as any).synapseTop || {}), ...__synapseTopIntercept };
        return {
          response: __bodyI,
          evidence: null,
          candidates: [],
          timestamp: p.timestamp,
          threadId: p.threadId,
          decisionFrame: {
            mode: "NATURAL",
            intent: "action",
            llm: null,
            ku: __kuIntercept,
          },
        };
      }
    }

    if (__hitScripture) {
      const __msgRaw = String(p.message ?? "");
      const __isNextStepAsk = /次の一歩|一つだけ|示してください|示して|教えて|その前提で|そこから/u.test(__msgRaw);
      const __isCenterAsk = /(その中心は|中心は|どこが核|どこが中心)/u.test(__msgRaw);
      const __isTenmonAxisAsk =
        /(天聞軸では|天聞軸で|天聞では|天聞は|天聞としては|天聞AIとしては|天聞としてどう読む)/u.test(__msgRaw);
      const __isSummaryAsk = /(要するに|要点は|一言でいうと|ひとことで|一言で言うと|つまり|ざっくり)/u.test(__msgRaw);
      console.log("[SCRIPTURE_ACTION_FLAGS]", {
        __scriptureCenterKey,
        __hitFromScriptureCenter,
        __hitScriptureKey: __hitScripture?.scriptureKey ?? null,
        __msgRaw,
        __isNextStepAsk,
        __isCenterAsk,
        __isTenmonAxisAsk,
        __isSummaryAsk,
      });

      if (__scriptureCenterKey && (__isCenterAsk || __isTenmonAxisAsk || __isSummaryAsk)) {
        console.log("[THREAD_CENTER_CONTINUITY_FOLLOWUP]", {
          threadId: String(p.threadId || ""),
          scriptureKey: __hitScripture.scriptureKey,
          kind: __isCenterAsk ? "center" : __isTenmonAxisAsk ? "tenmon_axis" : "summary",
        });
        const __disp = __hitScripture.displayName ?? __hitScripture.scriptureKey;
        const __prefix = "（" + __disp + "）を土台に、いまの話を見ていきましょう。";
        let __followBody = "";
        if (__isCenterAsk) {
          __followBody =
            "【天聞の所見】いま見ている中心は「" + __disp + "」です。\nその一点から、次にどこを一つだけ見たいですか？";
        } else if (__isTenmonAxisAsk) {
          __followBody =
            "【天聞の所見】天聞軸では、「" +
            __disp +
            "」を、日常の問いを支える土台として読みます。\n次は、その軸でどこを一歩だけ見たいですか？";
        } else {
          __followBody =
            "【天聞の所見】要するに、「" +
            __disp +
            "」のいまの中心だけを一行で言い直すことが大事です。\n次は、その一点について何を一つだけ確かめたいですか？";
        }
        const __body = __prefix + "\n" + __followBody;
        try {
          const __persona = getPersonaConstitutionSummary();
          writeScriptureLearningLedger({
            threadId: String(p.threadId || ""),
            message: __msgRaw,
            routeReason: "TENMON_SCRIPTURE_CANON_V1",
            scriptureKey: __hitScripture.scriptureKey,
            subconceptKey: null,
            conceptKey: null,
            thoughtGuideKey: null,
            personaConstitutionKey: __persona?.constitutionKey ?? null,
            hasEvidence: false,
            hasLawTrace: false,
            resolvedLevel: "scripture",
            unresolvedNote: null,
          });
        } catch {
          /* ignore */
        }
        try {
          upsertThreadCenter({
            threadId: String(p.threadId || ""),
            centerType: "scripture",
            centerKey: String(__hitScripture.scriptureKey),
            sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
            sourceScriptureKey: String(__hitScripture.scriptureKey),
            sourceTopicClass: "",
          });
        } catch {
          /* ignore */
        }
        const __scriptureKey = String(__hitScripture.scriptureKey ?? "");
        const __threadCenterScr = {
          centerType: "scripture" as const,
          centerKey: __scriptureKey,
          sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
        };
        const __kuInstr: any = {
          routeReason: "TENMON_SCRIPTURE_CANON_V1",
          heart: p.normalizeHeartShape(p.heart),
          scriptureKey: __hitScripture.scriptureKey,
          scriptureMode: __isTenmonAxisAsk ? "tenmon_axis" : __isCenterAsk ? "center_followup" : "summary_followup",
          scriptureAlignment: "scripture_aligned",
          centerKey: __scriptureKey || null,
          centerMeaning: String(__scriptureKey || "").trim(),
          centerLabel: __disp || null,
          thoughtCoreSummary: {
            centerKey: "TENMON_SCRIPTURE_CANON_V1",
            centerMeaning: String(__scriptureKey || "").trim() || null,
            routeReason: "TENMON_SCRIPTURE_CANON_V1",
            modeHint: "scripture",
            continuityHint: String(__scriptureKey || "").trim() || null,
          },
          scriptureCanon: {
            scriptureKey: __hitScripture.scriptureKey,
            displayName: __disp,
          },
        };
        const __synapseTopScr = {
          sourceThreadCenter: __threadCenterScr,
          sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
          sourceScriptureKey: __scriptureKey,
          sourceKanagiSelf: getSafeKanagiSelfOutput(),
          sourceIntention: getIntentionHintForKu() ?? { kind: "none" },
          sourceHeart: p.normalizeHeartShape(p.heart) ?? {},
          sourceMemoryHint: String(p.threadId ?? "") ? `thread:${String(p.threadId)} centerKey:${__scriptureKey}` : "",
          sourceLedgerHint: "ledger:scripture_continuity",
          reconcileHint: "scripture_followup",
          notionHint: "notion:tenmon_reconcile/notion_bridge",
        };
        __kuInstr.synapseTop = { ...((__kuInstr as any).synapseTop || {}), ...__synapseTopScr };
        return {
          response: __body,
          evidence: null,
          candidates: [],
          timestamp: p.timestamp,
          threadId: p.threadId,
          decisionFrame: {
            mode: "NATURAL",
            intent: __isTenmonAxisAsk ? "essence" : "define",
            llm: null,
            ku: __kuInstr,
          },
        };
      }

      if (__scriptureCenterKey && __isNextStepAsk) {
        console.log(
          "[THREAD_CENTER_ACTION_RESPONSE]",
          "threadId=" + String(p.threadId || ""),
          "scriptureKey=" + String(__hitScripture?.scriptureKey || __scriptureCenterKey),
        );
        const __disp = __hitScripture.displayName ?? __hitScripture.scriptureKey;
        const __prefix = "（" + __disp + "）を土台に、いまの話を見ていきましょう。";
        const __instructionByKey: Record<string, string> = {
          kotodama_hisho: "まず『言霊秘書は音の法則を担い、いろははその配列を担う』と一行で書き分けてください。",
          iroha_kotodama_kai: "まず『いろはは音の配列であり、言霊はその内在法則である』と一行で書き分けてください。",
          katakamuna_kotodama_kai: "まず『カタカムナ言霊解は音と図象の対応を担う』と一行で書き分けてください。",
        };
        const __instruction =
          __instructionByKey[__hitScripture.scriptureKey] ??
          "まず、その聖典のいまの文脈で中心となる一点を一行で書き分けてください。";
        const __body = __prefix + "\n【天聞の所見】" + __instruction;
        try {
          const __persona = getPersonaConstitutionSummary();
          writeScriptureLearningLedger({
            threadId: String(p.threadId || ""),
            message: __msgRaw,
            routeReason: "TENMON_SCRIPTURE_CANON_V1",
            scriptureKey: __hitScripture.scriptureKey,
            subconceptKey: null,
            conceptKey: null,
            thoughtGuideKey: null,
            personaConstitutionKey: __persona?.constitutionKey ?? null,
            hasEvidence: false,
            hasLawTrace: false,
            resolvedLevel: "scripture",
            unresolvedNote: null,
          });
        } catch {
          /* ignore */
        }
        try {
          upsertThreadCenter({
            threadId: String(p.threadId ?? ""),
            centerType: "scripture",
            centerKey: String(__hitScripture.scriptureKey),
            sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
            sourceScriptureKey: String(__hitScripture.scriptureKey),
            sourceTopicClass: "",
          });
        } catch {
          /* ignore */
        }
        const __scriptureKey = String(__hitScripture.scriptureKey ?? "");
        const __threadCenterScr = {
          centerType: "scripture" as const,
          centerKey: __scriptureKey,
          sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
        };
        const __kuInstr: any = {
          routeReason: "TENMON_SCRIPTURE_CANON_V1",
          heart: p.normalizeHeartShape(p.heart),
          scriptureKey: __hitScripture.scriptureKey,
          scriptureMode: "canon",
          scriptureAlignment: "scripture_aligned",
          centerMeaning: String(__scriptureKey || "").trim(),
          thoughtCoreSummary: {
            centerKey: "TENMON_SCRIPTURE_CANON_V1",
            centerMeaning: String(__scriptureKey || "").trim() || null,
            routeReason: "TENMON_SCRIPTURE_CANON_V1",
            modeHint: "scripture",
            continuityHint: String(__scriptureKey || "").trim() || null,
          },
          scriptureCanon: {
            scriptureKey: __hitScripture.scriptureKey,
            displayName: __hitScripture.displayName ?? __hitScripture.scriptureKey,
          },
          sourcePack: "seiten",
          groundedRequired: true,
          conceptEvidence: getScriptureConceptEvidence(__hitScripture.scriptureKey),
          thoughtGuideSummary: getThoughtGuideSummary("scripture"),
          notionCanon: getNotionCanonForRoute("TENMON_SCRIPTURE_CANON_V1", __msgRaw),
          personaConstitutionSummary: getPersonaConstitutionSummary(),
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
        };
        const __synapseTopInstr: any = {
          sourceThreadCenter: __threadCenterScr,
          sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
          sourceScriptureKey: __scriptureKey,
          sourceHeart: p.normalizeHeartShape(p.heart) ?? {},
          sourceMemoryHint: String(p.threadId ?? "") ? `thread:${String(p.threadId)} centerKey:${__scriptureKey}` : "",
          sourceLedgerHint: "ledger:scripture_continuity",
          notionHint: "notion:tenmon_reconcile/notion_bridge",
        };
        __kuInstr.synapseTop = { ...((__kuInstr as any).synapseTop || {}), ...__synapseTopInstr };
        try {
          console.log("[SYNAPSETOP_AFTER_ASSIGN_SCRIPTURE]", {
            path: "instruction",
            keys: Object.keys((__kuInstr as any).synapseTop || {}),
          });
        } catch {
          /* ignore */
        }
        try {
          console.log("[SYNAPSETOP_BEFORE_RETURN]", { path: "scripture_instr", synapseTop: (__kuInstr as any).synapseTop });
        } catch {
          /* ignore */
        }
        return {
          response: __body,
          evidence: null,
          candidates: [],
          timestamp: p.timestamp,
          threadId: p.threadId,
          decisionFrame: {
            mode: "NATURAL",
            intent: "define",
            llm: null,
            ku: __kuInstr,
          },
        };
      }

      const __canon = buildScriptureCanonResponse(__hitScripture.scriptureKey, "standard");
      if (__canon) {
        let __body = String(__canon.text ?? "").trim();

        if (
          __hitScripture.scriptureKey === "kotodama_hisho" &&
          /言霊秘書とは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgScript)
        ) {
          __body +=
            " 言霊秘書データベースは、法則断片・人物・図・イロハ口伝を横断して読むための正典ハブです。";
        }
        const __neg = __canon.negative_definition ? String(__canon.negative_definition) : "";
        if (__neg) __body += "\n\n読み違いやすい点：" + __neg;
        const __axes = Array.isArray(__canon.next_axes) ? __canon.next_axes.slice(0, 2) : [];
        if (__axes.length) __body += "\n\nこの流れなら、" + __axes.join("・") + "のどれから払いますか？";

        const __composed = p.responseComposer({
          response: __body,
          rawMessage: String(p.message ?? ""),
          mode: "NATURAL",
          routeReason: "TENMON_SCRIPTURE_CANON_V1",
          truthWeight: 0,
          katakamunaSourceHint: null,
          katakamunaTopBranch: "",
          naming: null,
          lawTrace: [],
          evidenceIds: [],
          lawsUsed: [],
          sourceHint: null,
          heart: p.normalizeHeartShape(p.heart),
        } as any);

        try {
          const __persona = getPersonaConstitutionSummary();
          const __kuTmp: any = __composed.meaningFrame ?? {};
          writeScriptureLearningLedger({
            threadId: String(p.threadId || ""),
            message: String(p.message ?? ""),
            routeReason: "TENMON_SCRIPTURE_CANON_V1",
            scriptureKey: __hitScripture.scriptureKey,
            subconceptKey: null,
            conceptKey: null,
            thoughtGuideKey: null,
            personaConstitutionKey: __persona?.constitutionKey ?? null,
            hasEvidence: Boolean(__kuTmp.hasEvidence),
            hasLawTrace: Boolean(__kuTmp.hasLawTrace),
            resolvedLevel: "scripture",
            unresolvedNote: null,
          });
        } catch {
          /* ignore */
        }

        const __ku: any = {
          routeReason: "TENMON_SCRIPTURE_CANON_V1",
          heart: p.normalizeHeartShape(p.heart),
          centerKey: String(__hitScripture.scriptureKey || "").trim() || null,
          centerMeaning: String(__hitScripture.scriptureKey || "").trim() || null,
          centerLabel: String(__hitScripture.displayName || __hitScripture.scriptureKey || "").trim() || null,
          scriptureKey: String(__hitScripture.scriptureKey || "").trim() || null,
          scriptureMode: "canon",
          thoughtCoreSummary: {
            centerKey: "TENMON_SCRIPTURE_CANON_V1",
            centerMeaning: String(__hitScripture.scriptureKey || "").trim() || null,
            routeReason: "TENMON_SCRIPTURE_CANON_V1",
            modeHint: "scripture",
            continuityHint: String(__hitScripture.scriptureKey || "").trim() || null,
          },
          scriptureAlignment: "scripture_aligned",
          scriptureCanon: {
            scriptureKey: __hitScripture.scriptureKey,
            displayName: __hitScripture.displayName ?? __hitScripture.scriptureKey,
          },
          conceptEvidence: getScriptureConceptEvidence(__hitScripture.scriptureKey),
          thoughtGuideSummary: getThoughtGuideSummary("scripture"),
          notionCanon: getNotionCanonForRoute("TENMON_SCRIPTURE_CANON_V1", String(p.message ?? "")),
          personaConstitutionSummary: getPersonaConstitutionSummary(),
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
        };
        if (__composed.meaningFrame != null) {
          __ku.meaningFrame = { ...__composed.meaningFrame, scriptureKey: __hitScripture.scriptureKey };
        }

        try {
          const __persistScriptureKey = String(__hitScripture.scriptureKey || "").trim();
          if (__persistScriptureKey) {
            upsertThreadCenter({
              threadId: String(p.threadId ?? ""),
              centerType: "scripture",
              centerKey: __persistScriptureKey,
              sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
              sourceScriptureKey: __persistScriptureKey,
              sourceTopicClass: String(__composed.meaningFrame?.topicClass ?? ""),
            });
          }
        } catch {
          /* ignore */
        }
        const __scriptureKey = String(__hitScripture.scriptureKey ?? "");
        const __threadCenterScr = {
          centerType: "scripture" as const,
          centerKey: __scriptureKey,
          sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
        };
        const __synapseTopScr: any = {
          sourceThreadCenter: __threadCenterScr,
          sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
          sourceScriptureKey: __scriptureKey,
          sourceHeart: (__ku as any).heart ?? p.normalizeHeartShape(p.heart) ?? {},
          sourceMemoryHint: String(p.threadId ?? "") ? `thread:${String(p.threadId)} centerKey:${__scriptureKey}` : "",
          sourceLedgerHint: "ledger:scripture_continuity",
          notionHint: "notion:tenmon_reconcile/notion_bridge",
        };
        __ku.synapseTop = { ...((__ku as any).synapseTop || {}), ...__synapseTopScr };
        try {
          console.log("[SYNAPSETOP_AFTER_ASSIGN_SCRIPTURE]", {
            path: "canon",
            keys: Object.keys((__ku as any).synapseTop || {}),
          });
        } catch {
          /* ignore */
        }
        const __respCanon = p.cleanLlmFrame(__composed.response);
        __ku.responsePlan = p.buildResponsePlan({
          routeReason: "TENMON_SCRIPTURE_CANON_V1",
          rawMessage: String(p.message ?? ""),
          centerKey: String(__hitScripture.scriptureKey || "").trim() || null,
          centerLabel: String(__hitScripture.displayName || __hitScripture.scriptureKey || "").trim() || null,
          scriptureKey: String(__hitScripture.scriptureKey || "").trim() || null,
          semanticBody: __respCanon,
          mode: "canon",
          responseKind: "statement_plus_question",
          ...(p.hasAnswerProfile && p.bodyProfile
            ? { answerMode: p.bodyProfile.answerMode ?? undefined, answerFrame: p.bodyProfile.answerFrame ?? undefined }
            : {}),
        } as any);
        try {
          console.log("[SYNAPSETOP_BEFORE_RETURN]", { path: "scripture_canon", synapseTop: (__ku as any).synapseTop });
        } catch {
          /* ignore */
        }
        return {
          response: __respCanon,
          evidence: null,
          candidates: [],
          timestamp: p.timestamp,
          threadId: p.threadId,
          decisionFrame: {
            mode: "NATURAL",
            intent: "define",
            llm: null,
            ku: __ku,
          },
        };
      }
    }
  } catch (e) {
    try {
      console.error("[TENMON_SCRIPTURE_CANON_V1]", e);
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * NATURAL_GENERAL_LLM_TOP: threadCenter が scripture の follow-up 時に ku を TENMON_SCRIPTURE_CANON_V1 へ再水和（chat.ts から deps 注入）
 */
export function applyScriptureThreadCenterFollowupToGeneralKuV1(
  __ku: any,
  p: {
    threadId: string;
    message: unknown;
    tc: { center_type: string; center_key: string | null; source_route_reason?: string | null };
    reShortContinuation: RegExp;
    deps: {
      resolveScriptureQuery: (q: string) => any;
      memoryReadSession: (tid: string, n: number) => any[];
      searchKotodamaFtsLocal: (q: string, n: number) => Array<{ doc: string; pdfPage: number; snippet: string }>;
      buildKotodamaFtsQueryLocal: (s: string) => string;
      searchKotodamaFts: (s: string, n: number) => any[];
      getKotodamaOneSoundEntry: (s: string) => any;
      getPreviousSoundFromHistory: (h: any[]) => string | null | undefined;
      getLastTwoKotodamaSoundsFromHistory: (h: any[]) => [string, string] | null;
      getRelationHint: (a: string, b: string) => string;
      getKotodamaOneSoundSourceKinds: (e: any) => string[];
      getKotodamaOneSoundNotionMeta: (e: any) => Record<string, unknown> | null | undefined;
    };
  },
): void {
  if (p.tc.center_type !== "scripture") return;
  const __scriptureKeyTC0 = String(p.tc.center_key || "").trim();
  const __scriptureResolvedTC = p.deps.resolveScriptureQuery(__scriptureKeyTC0);
  const __scriptureKeyTC = String(__scriptureResolvedTC?.scriptureKey || __scriptureKeyTC0 || "").trim();
  const __scriptureLabelTC = String(
    __scriptureResolvedTC?.displayName ||
      (__scriptureKeyTC === "hokekyo"
        ? "法華経"
        : __scriptureKeyTC === "kotodama_hisho"
          ? "言霊秘書"
          : __scriptureKeyTC === "iroha_kotodama_kai"
            ? "いろは言霊解"
            : __scriptureKeyTC === "katakamuna_kotodama_kai"
              ? "カタカムナ言霊解"
              : __scriptureKeyTC0),
  ).trim();

  __ku.routeReason = "TENMON_SCRIPTURE_CANON_V1";
  __ku.scriptureKey = __scriptureKeyTC || null;
  __ku.scriptureMode = /次の一歩|一つだけ|示してください|示して|教えて|その前提で|そこから/u.test(String(p.message || ""))
    ? "action_instruction"
    : "canon";
  __ku.centerKey = __scriptureKeyTC || null;
  __ku.centerMeaning = __scriptureKeyTC || null;
  const __shortContMsg = String(p.message ?? "").trim().match(p.reShortContinuation);
  const __soundLabel = __shortContMsg ? __shortContMsg[2] : "";
  const __isKotodamaHishoTC = __scriptureKeyTC === "kotodama_hisho" || __scriptureKeyTC0 === "kotodama_hisho";
  const __isCompareMsgTC = /(違いは|どう違う|何が違う)/u.test(String(p.message ?? "").trim());
  __ku.centerLabel =
    __soundLabel && __isKotodamaHishoTC && !__isCompareMsgTC ? __soundLabel + " の言霊" : __scriptureLabelTC || null;
  if (__soundLabel && __isKotodamaHishoTC && !__isCompareMsgTC) {
    const __histTC = p.deps.memoryReadSession(String(p.threadId || ""), 8) || [];
    const __prevSoundTC = p.deps.getPreviousSoundFromHistory(__histTC);
    const __relHintTC = __prevSoundTC ? p.deps.getRelationHint(__prevSoundTC, __soundLabel) : "";
    if (!__ku.sourceStackSummary || typeof __ku.sourceStackSummary !== "object") __ku.sourceStackSummary = {};
    __ku.sourceStackSummary.previousSound = __prevSoundTC || undefined;
    __ku.sourceStackSummary.currentSound = __soundLabel;
    __ku.sourceStackSummary.relationHint = __relHintTC || undefined;
    const __entryTC = p.deps.getKotodamaOneSoundEntry(__soundLabel);
    let __ftsRowsTC: Array<{ doc: string; pdfPage: number; snippet: string }> = [];
    try {
      __ftsRowsTC = p.deps.searchKotodamaFtsLocal(p.deps.buildKotodamaFtsQueryLocal(__soundLabel), 3);
    } catch {
      /* ignore */
    }
    if (__entryTC) {
      __ku.sourceStackSummary.sourceKinds = [...p.deps.getKotodamaOneSoundSourceKinds(__entryTC), "thread_center"];
      __ku.sourceStackSummary.primaryMeaning = __entryTC.preferredMeaning;
      __ku.sourceStackSummary.lawIndexHit = true;
      if (__entryTC.textualGrounding?.length) __ku.sourceStackSummary.textualGroundingHit = true;
      const __notionMetaTC = p.deps.getKotodamaOneSoundNotionMeta(__entryTC);
      if (__notionMetaTC) Object.assign(__ku.sourceStackSummary, __notionMetaTC);
    } else {
      __ku.sourceStackSummary.sourceKinds = ["kotodama_one_sound", "vps", "thread_center"];
    }
    const __ftsTC = p.deps.searchKotodamaFts(__soundLabel, 3);
    const __topFtsTC = __ftsTC.length > 0 ? __ftsTC[0] : null;
    if (__topFtsTC)
      Object.assign(__ku.sourceStackSummary, {
        ftsHit: true,
        ftsDoc: __topFtsTC.doc,
        ftsPage: __topFtsTC.pdfPage,
        ftsSnippetHead: String(__topFtsTC.snippet || "").slice(0, 80),
      });
    if (__ku.thoughtCoreSummary && typeof __ku.thoughtCoreSummary === "object") {
      __ku.thoughtCoreSummary.sourceStackSummary = { ...__ku.sourceStackSummary };
      __ku.thoughtCoreSummary.continuityHint = __entryTC ? __entryTC.sound : __soundLabel;
    }
  } else if (__isCompareMsgTC && __isKotodamaHishoTC) {
    const __histCmp = p.deps.memoryReadSession(String(p.threadId || ""), 8) || [];
    const __twoSoundsCmp = p.deps.getLastTwoKotodamaSoundsFromHistory(__histCmp);
    if (!__ku.sourceStackSummary || typeof __ku.sourceStackSummary !== "object") __ku.sourceStackSummary = {};
    if (__twoSoundsCmp) {
      __ku.sourceStackSummary.previousSound = __twoSoundsCmp[0];
      __ku.sourceStackSummary.currentSound = __twoSoundsCmp[1];
      __ku.sourceStackSummary.relationHint = p.deps.getRelationHint(__twoSoundsCmp[0], __twoSoundsCmp[1]) || undefined;
      const __entryCmp = p.deps.getKotodamaOneSoundEntry(__twoSoundsCmp[1]);
      __ku.sourceStackSummary.sourceKinds = __entryCmp
        ? [...p.deps.getKotodamaOneSoundSourceKinds(__entryCmp), "thread_center"]
        : ["kotodama_one_sound", "vps", "thread_center"];
      if (__entryCmp) {
        __ku.sourceStackSummary.primaryMeaning = __entryCmp.preferredMeaning;
        __ku.sourceStackSummary.lawIndexHit = true;
        if (__entryCmp.textualGrounding?.length) __ku.sourceStackSummary.textualGroundingHit = true;
        const __notionMetaCmp = p.deps.getKotodamaOneSoundNotionMeta(__entryCmp);
        if (__notionMetaCmp) Object.assign(__ku.sourceStackSummary, __notionMetaCmp);
      }
      const __ftsCmp1 = p.deps.searchKotodamaFts(__twoSoundsCmp[0], 1);
      const __ftsCmp2 = p.deps.searchKotodamaFts(__twoSoundsCmp[1], 1);
      const __topCmp = __ftsCmp2.length > 0 ? __ftsCmp2[0] : __ftsCmp1.length > 0 ? __ftsCmp1[0] : null;
      if (__topCmp)
        Object.assign(__ku.sourceStackSummary, {
          ftsHit: true,
          ftsDoc: __topCmp.doc,
          ftsPage: __topCmp.pdfPage,
          ftsSnippetHead: String(__topCmp.snippet || "").slice(0, 80),
        });
      const __continuityHintCmp = __entryCmp ? __entryCmp.sound : __twoSoundsCmp[1];
      if (__ku.thoughtCoreSummary && typeof __ku.thoughtCoreSummary === "object") {
        __ku.thoughtCoreSummary.sourceStackSummary = { ...__ku.sourceStackSummary };
        __ku.thoughtCoreSummary.continuityHint = __continuityHintCmp;
      } else {
        __ku.thoughtCoreSummary = {
          centerKey: "TENMON_SCRIPTURE_CANON_V1",
          centerMeaning: __scriptureKeyTC || null,
          routeReason: "TENMON_SCRIPTURE_CANON_V1",
          modeHint: "scripture",
          continuityHint: __continuityHintCmp,
          sourceStackSummary: { ...__ku.sourceStackSummary },
        };
      }
    } else {
      const __prevCmp = p.deps.getPreviousSoundFromHistory(__histCmp);
      __ku.sourceStackSummary.currentSound = __prevCmp || undefined;
      __ku.sourceStackSummary.sourceKinds = ["kotodama_one_sound", "vps", "thread_center"];
      if (__ku.thoughtCoreSummary && typeof __ku.thoughtCoreSummary === "object") {
        __ku.thoughtCoreSummary.continuityHint = __prevCmp || null;
        __ku.thoughtCoreSummary.sourceStackSummary = { ...__ku.sourceStackSummary };
      } else {
        __ku.thoughtCoreSummary = {
          centerKey: "TENMON_SCRIPTURE_CANON_V1",
          centerMeaning: __scriptureKeyTC || null,
          routeReason: "TENMON_SCRIPTURE_CANON_V1",
          modeHint: "scripture",
          continuityHint: __prevCmp || null,
          sourceStackSummary: { ...__ku.sourceStackSummary },
        };
      }
    }
  }
  __ku.threadCenter = {
    centerType: "scripture",
    centerKey: __scriptureKeyTC || __scriptureKeyTC0 || null,
    sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
  };

  if (!__ku.thoughtCoreSummary || typeof __ku.thoughtCoreSummary !== "object") {
    __ku.thoughtCoreSummary = {
      centerKey: "TENMON_SCRIPTURE_CANON_V1",
      centerMeaning: __scriptureKeyTC || null,
      routeReason: "TENMON_SCRIPTURE_CANON_V1",
      modeHint: "scripture",
      continuityHint:
        (__soundLabel && __isKotodamaHishoTC
          ? p.deps.getKotodamaOneSoundEntry(__soundLabel)?.sound ?? __soundLabel
          : __scriptureKeyTC) || null,
    };
  }

  const __synTopTC: any = {
    sourceThreadCenter: {
      centerType: "scripture",
      centerKey: __scriptureKeyTC || __scriptureKeyTC0 || null,
      sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
    },
    sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
    sourceScriptureKey: __scriptureKeyTC || __scriptureKeyTC0 || null,
    sourceLedgerHint: "ledger:scripture_continuity",
    notionHint: "notion:tenmon_reconcile/notion_bridge",
  };
  __ku.synapseTop = { ...(__ku.synapseTop || {}), ...__synTopTC };
}
