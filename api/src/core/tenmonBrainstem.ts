/**
 * CARD_TENMON_BRAINSTEM_V1: 会話判断を単一脳幹で決める
 * answerLength / answerMode / answerFrame / routeClass / responsePolicy を1箇所で出す
 */

import { isTenmonBinaryCompareQuestionV1 } from "./compareAskDisambigV1.js";
import {
  isSoulCompareQuestionV1,
  isSoulDefinitionQuestionV1,
  isSoulTenmonBridgeQuestionV1,
} from "./soulDefineDisambigV1.js";

export type BrainstemRouteClass =
  | "support"
  | "define"
  | "analysis"
  | "worldview"
  | "continuity"
  | "judgement"
  | "selfaware"
  | "impression"
  | "fallback";

export type BrainstemResponsePolicy =
  | "answer_first"
  | "clarify_first"
  | "summary_then_deepen";

export type BrainstemDecision = {
  routeClass: BrainstemRouteClass;
  centerKey: string | null;
  centerLabel: string | null;
  answerLength: "short" | "medium" | "long";
  answerMode: "support" | "define" | "analysis" | "worldview" | "continuity";
  answerFrame:
    | "one_step"
    | "statement_plus_one_question"
    | "d_delta_s_one_step";
  responsePolicy: BrainstemResponsePolicy;
  explicitLengthRequested: number | null;
  forbiddenMoves: string[];
  nextTurnSeed: string | null;
  fallthroughAllowed: boolean;
};

export type BrainstemInput = {
  message: string;
  threadCore?: {
    centerKey?: string | null;
    centerLabel?: string | null;
    openLoops?: string[];
    commitments?: string[];
    lastResponseContract?: {
      answerLength?: string | null;
      answerMode?: string | null;
      answerFrame?: string | null;
      routeReason?: string | null;
    } | null;
  } | null;
  explicitLengthRequested?: number | null;
  bodyProfile?: {
    answerLength?: "short" | "medium" | "long" | null;
    answerMode?: string | null;
    answerFrame?: string | null;
  } | null;
};

const RE_SUPPORT_UI = /(改行|enter|shift\+enter|shift enter|送信|改行できない|入力できない)/iu;
const RE_SUPPORT_BILLING =
  /(課金|billing|\bcharge\b|\bpayment\b|\bprice\b|\binvoice\b|\brefund\b|\bpricing\b|\bsubscription\b|\bstripe\b|請求書|請求|支払い|支払|お支払い|決済|料金プラン|料金|プラン変更|プランの状態|プラン.?確認|支払.?確認|課金.?確認|課金表示|請求とプラン|サブスク|解約|返金|領収|領収書|インボイス|引き落とし|カード決済|クレジット|振込|価格|値段|お金|未払い|支払状況|支払い状況|プラン料金|利用料|年会費|月額|無料期間|トライアル)/iu;
/** gates_impl.classifyTenmonSupportEarlyTriageV1 と整合（TENMON_SUPPORT_AND_FOUNDER_ROUTE_FIX_CURSOR_AUTO_V5） */
const RE_SUPPORT_PWA =
  /(\bPWA\b|PWA.{0,24}入れ|入れ.{0,24}PWA|ホーム追加|ホーム画面|アプリ化|ショートカット|add\s*to\s*home|インストールできない|インストールできません|インストール|追加できない|追加できません|アプリが入れない|アプリが入らない|アプリが開かない|アプリが開けません|アプリが起動しない|(?:画面|ページ|サイト|チャット|アプリ)が開かない|(?:画面|ページ|サイト|チャット|アプリ)が開けない|(?:画面|ページ|アプリ)が開けません|サイトが開かない|ページが開けない|チャットが開かない|アプリとして追加|ホームに追加|ホーム画面に追加|立ち上がらない|白画面|白い画面|真っ白|表示されない|スプラッシュ|キャッシュ)/iu;
const RE_SUPPORT_REG =
  /(登録できない|登録方法|登録の仕方|登録って|新規登録|会員登録|登録したい|登録手順|本登録|メールが届かない|届きません|迷惑フォルダ|招待コード|招待リンク|招待メール|\binvite\b|アカウント作成|アカウントが作れ|メールアドレス|確認メール|リセットメール|仮登録|verify|verification|メール認証|認証コード|ワンタイム)/iu;
const RE_SUPPORT_AUTH =
  /(ログイン|\bauth\b|サインイン|sign\s*in|パスワード|パスワードを忘|再発行|合言葉|メール登録|認証メール|認証が来ない|セッション切れ|セッション切断|アクセスできない|アカウントに入れない|アカウントで入れない|アカウント.{0,24}(凍結|停止|ロック|解除|復旧)|^アカウント[については]?[。！!？?\s]*$|アカウントが使えない|founder\s*会員|founder会員|ログインできない|ログインできません|(?:天聞|アーク|サイト|会員|アカウント).{0,24}(入れない|入れません)|(?:入れない|入れません).{0,24}(天聞|アーク|サイト|ログイン|アカウント|会員))/iu;
const RE_SUPPORT_BUG = /(バグ|不具合|おかしくなった|おかしい|動かなくなった|真っ白|エラーが出る|エラーになる)/iu;
const RE_SUPPORT_BUG_CTX =
  /(天聞|アーク|画面|サイト|ログイン|PWA|チャット|入れない|入れません|会員|アプリ|エラー|表示|読み込み|接続|更新できない|動かない|真っ白|白画面|白い画面)/iu;
const RE_SUPPORT_PRODUCT = /(使い方|利用方法|利用手順|使う流れ|どう使う|どう利用|使えば|始め方|どう始め|最初に何|まず何|何を入力|何ができる|操作方法|質問方法|どうやって質問|この欄|この画面の使い方|ここでの質問|手順を|使う方法|使い始め)/iu;
const RE_JUDGEMENT =
  /(良い|悪い|正しい|間違い|べき|どっちが|どちらが|した方が|整理すれば|どう整理|優先すべき|何を優先|何から手をつけ|次に何を直|未接続)/u;
const RE_FEELING = /(気分|どんな気分|どう感じる|感情)/u;
const RE_IMPRESSION = /(感想|印象)/u;
const RE_SELFAWARE =
  /(天聞アークとは何|天聞とは何|天聞アークに意識|天聞に意識|意識はある|心はある|意識はないの|心はないの|意識と心)/u;
/** STAGE2_ROUTE_AUTHORITY_V2: 経題＋言霊秘書・カタカムナ解系を原典／source pack 主命題として define / diagnosis より先に拾う */
const RE_SCRIPTURE_CORE_PROBE =
  /(法華経|涅槃経|般若心経|華厳経|金剛経|阿弥陀経|無量義経|言[霊灵靈]秘書|いろは言[霊灵靈]解|イロハ言[霊灵靈]解|カタカムナ言[霊灵靈]解|水穂伝)/u;

const RE_WORLDVIEW = /(魂|死後|輪廻|霊|灵)/u;
const RE_CONTINUITY_NEXT = /^(次は\?|次は？|次の一手は\?|次の一手は？)$/u;
const RE_CONTINUITY_ESSENCE = /(要するに|要点は|本質は)/u;
const RE_CONTINUITY_COMPARE = /(違いは|どう違う|何が違う)/u;
const RE_CONTINUITY_BACKGROUND = /(背景は|もう少し|法則で見ると)/u;
// CARD_BRAINSTEM_FULL_WIRING_V1: define 判定（DEF_FASTPATH_VERIFIED_V1 / DEF_DICT_HIT / 言霊とは何ですか 等 → routeClass=define）
const RE_DEFINE = /(とは(何|どういう|どのような)|って(何|どういう)|とは\s*[？?]?\s*$)/u;

function isSupport(msg: string): boolean {
  const m = String(msg ?? "").trim();
  if (/^(入れない|入れません)(ですか)?[。！!？?]*$/iu.test(m)) return true;
  if (RE_SUPPORT_UI.test(m)) return true;
  if (RE_SUPPORT_BILLING.test(m)) return true;
  if (RE_SUPPORT_PWA.test(m)) return true;
  if (RE_SUPPORT_REG.test(m)) return true;
  if (RE_SUPPORT_AUTH.test(m)) return true;
  if (RE_SUPPORT_BUG.test(m) && RE_SUPPORT_BUG_CTX.test(m)) return true;
  if (RE_SUPPORT_PRODUCT.test(m)) return true;
  return false;
}

function isContinuity(msg: string, centerKey: string | null | undefined): boolean {
  if (!centerKey || String(centerKey).trim() === "") return false;
  const t = String(msg).trim();
  return RE_CONTINUITY_NEXT.test(t) || RE_CONTINUITY_ESSENCE.test(t) || RE_CONTINUITY_COMPARE.test(t) || RE_CONTINUITY_BACKGROUND.test(t);
}

export function tenmonBrainstem(input: BrainstemInput): BrainstemDecision {
  const msg = String(input.message ?? "").trim();
  const threadCore = input.threadCore ?? null;
  const centerKey = threadCore?.centerKey ?? null;
  const centerLabel = threadCore?.centerLabel ?? null;
  const explicitLen = input.explicitLengthRequested != null && Number(input.explicitLengthRequested) > 0 ? Number(input.explicitLengthRequested) : null;

  // 1. explicit length
  if (explicitLen != null) {
    return {
      routeClass: "analysis",
      centerKey,
      centerLabel,
      answerLength: "long",
      answerMode: "analysis",
      answerFrame: "one_step",
      responsePolicy: "answer_first",
      explicitLengthRequested: explicitLen,
      forbiddenMoves: ["feeling_preempt", "future_preempt"],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // 2. support（明示字数なしのときのみ優先：課金/PWA/登録の誤落下を防ぐ）
  if (isSupport(msg)) {
    return {
      routeClass: "support",
      centerKey,
      centerLabel,
      answerLength: "short",
      answerMode: "support",
      answerFrame: "one_step",
      responsePolicy: "answer_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // STAGE2_ROUTE_AUTHORITY_V2: 二項比較は judgement（比較して等）より先に analysis へ（GPT×天聞 等）
  if (isTenmonBinaryCompareQuestionV1(msg) && !isSoulCompareQuestionV1(msg)) {
    return {
      routeClass: "analysis",
      centerKey,
      centerLabel,
      answerLength: /(詳しく|くわしく|十分に|丁寧に).{0,12}(比較|対比|違い)/u.test(msg) ? "long" : "medium",
      answerMode: "analysis",
      answerFrame: "statement_plus_one_question",
      responsePolicy: "answer_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // 3. judgement（既存互換: answerMode=analysis）
  if (RE_JUDGEMENT.test(msg)) {
    return {
      routeClass: "judgement",
      centerKey,
      centerLabel,
      answerLength: "short",
      answerMode: "analysis",
      answerFrame: "one_step",
      responsePolicy: "clarify_first",
      explicitLengthRequested: null,
      forbiddenMoves: ["generic_relative_answer"],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // 4. feeling
  if (RE_FEELING.test(msg)) {
    return {
      routeClass: "analysis",
      centerKey,
      centerLabel,
      answerLength: "short",
      answerMode: "analysis",
      answerFrame: "one_step",
      responsePolicy: "answer_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // 5. impression（既存互換: answerMode=analysis）
  if (RE_IMPRESSION.test(msg)) {
    return {
      routeClass: "impression",
      centerKey,
      centerLabel,
      answerLength: "short",
      answerMode: "analysis",
      answerFrame: "one_step",
      responsePolicy: "answer_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // 6. continuity (center あり + 継続フレーズ)
  if (isContinuity(msg, centerKey)) {
    return {
      routeClass: "continuity",
      centerKey,
      centerLabel,
      answerLength: "short",
      answerMode: "continuity",
      answerFrame: "one_step",
      responsePolicy: "summary_then_deepen",
      explicitLengthRequested: null,
      forbiddenMoves: ["lose_center", "generic_opening"],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // 6b. selfaware（scripture / define より先：構造・役割・意識の区別を主命題に）
  if (RE_SELFAWARE.test(msg)) {
    return {
      routeClass: "selfaware",
      centerKey,
      centerLabel,
      answerLength: "medium",
      answerMode: "analysis",
      answerFrame: "statement_plus_one_question",
      responsePolicy: "answer_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // 6c. scripture 主命題（define の「とは」より先に拾い、原典系へ主権を寄せる）
  if (
    RE_SCRIPTURE_CORE_PROBE.test(msg) &&
    /(説く|説いて|何を|宗旨|思想|教え|核心|意味|内容|読み解き)/u.test(msg)
  ) {
    return {
      routeClass: "worldview",
      centerKey: centerKey ?? "scripture",
      centerLabel: centerLabel ?? "聖典",
      answerLength: "medium",
      answerMode: "worldview",
      answerFrame: "statement_plus_one_question",
      responsePolicy: "clarify_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: true,
    };
  }

  // 8. define（〇〇とは何 / 〇〇って何 → DEF_FASTPATH と parity）
  if (RE_DEFINE.test(msg)) {
    return {
      routeClass: "define",
      centerKey,
      centerLabel,
      answerLength: "medium",
      answerMode: "define",
      answerFrame: "statement_plus_one_question",
      responsePolicy: "answer_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // SOUL_DEFINE_DISAMBIG_V1: RE_DEFINE に掛からない魂の定義形（魂の定義を教えて 等）も define に固定
  if (isSoulDefinitionQuestionV1(msg)) {
    return {
      routeClass: "define",
      centerKey,
      centerLabel,
      answerLength: "medium",
      answerMode: "define",
      answerFrame: "statement_plus_one_question",
      responsePolicy: "answer_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // SOUL_DEFINE_DISAMBIG_V1: 魂の二項比較は worldview より analysis へ
  if (isSoulCompareQuestionV1(msg)) {
    return {
      routeClass: "analysis",
      centerKey: centerKey ?? "soul",
      centerLabel: centerLabel ?? "魂",
      answerLength: "short",
      answerMode: "analysis",
      answerFrame: "one_step",
      responsePolicy: "answer_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // SOUL_DEFINE_DISAMBIG_V1: 天聞軸での魂の読解は define 主線（worldview に吸わせない）
  if (isSoulTenmonBridgeQuestionV1(msg)) {
    return {
      routeClass: "define",
      centerKey: centerKey ?? "soul",
      centerLabel: centerLabel ?? "魂",
      answerLength: "medium",
      answerMode: "define",
      answerFrame: "statement_plus_one_question",
      responsePolicy: "answer_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // 9. worldview（魂の定義問いは上で define 済み）
  if (RE_WORLDVIEW.test(msg)) {
    return {
      routeClass: "worldview",
      centerKey,
      centerLabel,
      answerLength: "medium",
      answerMode: "worldview",
      answerFrame: "statement_plus_one_question",
      responsePolicy: "clarify_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: true,
    };
  }

  // 10. fallback
  return {
    routeClass: "fallback",
    centerKey,
    centerLabel,
    answerLength: "medium",
    answerMode: "analysis",
    answerFrame: "statement_plus_one_question",
    responsePolicy: "clarify_first",
    explicitLengthRequested: null,
    forbiddenMoves: [],
    nextTurnSeed: null,
    fallthroughAllowed: true,
  };
}
