// gates_impl.ts extracted from chat.ts
// X3_GATES_EXTRACT_V1

import { getIntentionHintForKu } from "../../core/intentionConstitution.js";
import { tryAppendKanagiGrowthLedgerFromPayload } from "../../core/kanagiGrowthLedger.js";
import { tryHydratePriorRuleFeedbackV1 } from "../../core/selfLearningRuleFeedbackV1.js";
import { computeKanagiSelfKernel, getSafeKanagiSelfOutput } from "../../core/kanagiSelfKernel.js";
import { resolveScriptureQuery } from "../../core/scriptureCanon.js";
import { memoryPersistMessage } from "../../memory/index.js";
import { tryAppendThreadSeedFromPayload } from "../../core/threadSeed.js";
import { normalizeProviderPlan } from "../../provider/providerPlan.js";
import { projectResponseSurface } from "../../projection/responseProjector.js";
import { inferExpressionPlan, inferComfortTuning } from "../../expression/expressionPlanner.js";
import { buildBrainstemDecisionFromKu } from "../../chat/brainstem/brainstem.js";
import { upsertThreadCenter } from "../../core/threadCenterMemory.js";
import { buildKnowledgeBinder, applyKnowledgeBinderToKu } from "../../core/knowledgeBinder.js";
import {
  applyUncertaintySurfacePrefixIfAnyV1,
  TENMON_FOUNDER_UPDATE_PROFILE_FRAME_V1,
} from "../../core/answerProfileLayer.js";
import { polishTenmonChatResponseSurfaceExitV1 } from "../../core/tenmonConversationSurfaceV2.js";

type GeneralFrontKind = "greeting" | "meta_conversation" | "present_state" | "none";

/** 軽量事実質問: 日付・曜日・時刻（generic fallback を通さない） */
type LightFactualKind = "date" | "weekday" | "time" | null;

function classifyLightFactual(raw: string): LightFactualKind {
  const s = String(raw || "").trim().replace(/[？?]/g, "？");
  if (/(今日は何日|今日の日付|何月何日)/u.test(s)) return "date";
  if (/(何曜日|今日は何曜日)/u.test(s)) return "weekday";
  if (/(今何時|いま何時|現在の時刻)/u.test(s)) return "time";
  return null;
}

function buildLightFactualResponse(kind: LightFactualKind): string {
  if (!kind) return "";
  const d = new Date();
  const tz = "Asia/Tokyo";
  if (kind === "date") {
    const str = new Intl.DateTimeFormat("ja-JP", { timeZone: tz, year: "numeric", month: "long", day: "numeric" }).format(d);
    return "【天聞の所見】" + str + "です。";
  }
  if (kind === "weekday") {
    const str = new Intl.DateTimeFormat("ja-JP", { timeZone: tz, weekday: "long" }).format(d);
    return "【天聞の所見】" + str + "です。";
  }
  if (kind === "time") {
    const str = new Intl.DateTimeFormat("ja-JP", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
    const [h, m] = str.split(":");
    return "【天聞の所見】" + (h || "0") + "時" + (m || "0") + "分です。";
  }
  return "";
}

/** TENMON_SUPPORT_ROUTE_SHAPE_AND_TRIAGE_STABILIZATION_CURSOR_AUTO_V1 — 課金/PWA/登録メール等を canon/subconcept より前に support 固定 */
export type TenmonSupportEarlyTriageResultV1 = {
  routeReason: string;
  response: string;
};

/**
 * TENMON_CHAT_TS_BINDING_AND_SURFACE_EXIT_REWIRE_V1:
 * support / founder を early に同時判定（chat 本線・観測フックから呼ぶ）。
 */
export function tenmonGatesSupportFounderEarlyCheckV1(raw: string): {
  support_gate: boolean;
  founder_gate: boolean;
} {
  const m = String(raw ?? "").trim();
  let support_gate = false;
  let founder_gate = false;
  try {
    support_gate = classifyTenmonSupportEarlyTriageV1(m) != null;
  } catch {
    support_gate = false;
  }
  try {
    founder_gate = classifyTenmonFounderUpdateFrameTriageV1(m) != null;
  } catch {
    founder_gate = false;
  }
  return { support_gate, founder_gate };
}

export function classifyTenmonSupportEarlyTriageV1(raw: string): TenmonSupportEarlyTriageResultV1 | null {
  const m = String(raw ?? "").trim();
  if (!m) return null;
  if (m.startsWith("#") || m.startsWith("/")) return null;
  if (/\bdoc\b/i.test(m) || /pdfPage\s*=\s*\d+/i.test(m) || /#詳細/.test(m)) return null;

  const RE_UI =
    /(改行|enterで送信|shift\+enter|shift enter|送信|改行できない|入力できない|送信される|改行できません|入力できません)/iu;
  /** TENMON_SUPPORT_AND_FOUNDER_ROUTE_FIX_CURSOR_AUTO_V5: 料金/PWA を BUG/GK/subconcept より優先（できません形・billing 語の補強） */
  const RE_BILLING =
    /(課金|billing|\bcharge\b|\bpayment\b|\bprice\b|\binvoice\b|\brefund\b|\bpricing\b|\bsubscription\b|\bstripe\b|請求書|請求|支払い|支払|お支払い|決済|料金プラン|料金|プラン変更|プランの状態|プラン.?確認|支払.?確認|課金.?確認|課金表示|請求とプラン|サブスク|解約|返金|領収|領収書|インボイス|引き落とし|カード決済|クレジット|振込|価格|値段|お金|未払い|支払状況|支払い状況|プラン料金|利用料|年会費|月額|無料期間|トライアル)/iu;
  const RE_PWA =
    /(\bPWA\b|PWA.{0,24}入れ|入れ.{0,24}PWA|ホーム追加|ホーム画面|アプリ化|ショートカット|add\s*to\s*home|インストールできない|インストールできません|インストール|追加できない|追加できません|アプリが入れない|アプリが入らない|アプリが開かない|アプリが開けません|アプリが起動しない|(?:画面|ページ|サイト|チャット|アプリ)が開かない|(?:画面|ページ|サイト|チャット|アプリ)が開けない|(?:画面|ページ|アプリ)が開けません|サイトが開かない|ページが開けない|チャットが開かない|アプリとして追加|ホームに追加|ホーム画面に追加|立ち上がらない|白画面|白い画面|真っ白|表示されない|スプラッシュ|キャッシュ)/iu;
  const RE_BUG = /(バグ|不具合|おかしくなった|おかしい|動かなくなった|真っ白|エラーが出る|エラーになる)/iu;
  const RE_BUG_CTX =
    /(天聞|アーク|画面|サイト|ログイン|PWA|チャット|入れない|入れません|会員|アプリ|エラー|表示|読み込み|接続|更新できない|動かない|真っ白|白画面|白い画面)/iu;
  const RE_AUTH =
    /(ログイン|\bauth\b|サインイン|sign\s*in|パスワード|パスワードを忘|再発行|合言葉|認証メール|認証が来ない|メール登録|セッション切れ|セッション切断|アクセスできない|アカウントに入れない|アカウントで入れない|アカウント.{0,24}(凍結|停止|ロック|解除|復旧)|^アカウント[については]?[。！!？?\s]*$|アカウントが使えない|founder\s*会員|founder会員|ログインできない|ログインできません|(?:天聞|アーク|サイト|会員|アカウント).{0,24}(入れない|入れません)|(?:入れない|入れません).{0,24}(天聞|アーク|サイト|ログイン|アカウント|会員))/iu;
  const RE_REG =
    /(登録できない|登録方法|登録の仕方|登録って|新規登録|会員登録|登録したい|登録手順|本登録|メールが届かない|届きません|迷惑フォルダ|招待コード|招待リンク|招待メール|\binvite\b|アカウント作成|アカウントが作れ|メールアドレス|確認メール|リセットメール|仮登録|verify|verification|メール認証|認証コード|ワンタイム)/iu;
  const RE_PROD =
    /(天聞アークはどう使えば|どう使えばいいか|何から始めるか|どこから入るか|どう使うのか|使い方|どこで(使う|入る)|何を押せば|どう使う|どこを押す)/iu;

  if (/^(入れない|入れません)(ですか)?[。！!？?]*$/iu.test(m)) {
    return {
      routeReason: "SUPPORT_AUTH_ACCESS_V1",
      response:
        "【天聞の所見】ログイン・入場まわりで止まっている、と受け取りました。\n\n" +
        "まず確認する一点：合言葉かメール登録のどちらで入会したかだけ思い出してください。\n\n" +
        "対処の一手：合言葉はログイン画面の該当欄から。メール登録は届いたメールのリンクから。届かない場合は迷惑フォルダとフィルタを確認してください。\n\n" +
        "次に確認一点：パスワード再発行が必要ならその旨を一言添えてください。",
    };
  }
  if (RE_BILLING.test(m)) {
    return {
      routeReason: "SUPPORT_BILLING_V1",
      response:
        "【天聞の所見】受け取りました。料金・請求・支払いまわりで止まっている前提で進めます。\n\n" +
        "まず確認する一点：設定（画面右上付近）で、プラン名と次回更新・支払い状態が表示されているかだけ見てください。\n\n" +
        "対処の一手：表示が古い・更新されないときは、一度ログアウトして同じアカウントで入り直し、別ブラウザやシークレット窓でも同じか切り分けてください。\n\n" +
        "次に確認一点：解消しない場合は、いつから・どの画面の文言か（可能なら一言で）教えてください。手順を絞ります。",
    };
  }
  if (RE_PWA.test(m)) {
    return {
      routeReason: "SUPPORT_PWA_V1",
      response:
        "【天聞の所見】受け取りました。PWA（ホーム画面への追加・アプリ化）で止まっている前提で進めます。\n\n" +
        "まず確認する一点：ブラウザのメニューに「ホーム画面に追加」「アプリをインストール」「ショートカット」に近い項目が出るかだけ見てください（端末・ブラウザで名称が違います）。\n\n" +
        "対処の一手：項目が出ないときは OS とブラウザを最新にし、タブを閉じて URL から開き直してから、もう一度だけ試してください。\n\n" +
        "次に確認一点：端末名とブラウザ名を一言で教えてください。手順を合わせます。",
    };
  }
  if (RE_BUG.test(m) && RE_BUG_CTX.test(m) && !RE_BILLING.test(m) && !RE_PWA.test(m)) {
    return {
      routeReason: "SUPPORT_BUG_REPORT_V1",
      response:
        "【天聞の所見】不具合っぽい挙動で止まっている、と受け取りました。\n\n" +
        "まず確認する一点：再読み込み直後も同じか、別ブラウザでも再現するかだけ切り分けてください。\n\n" +
        "対処の一手：再現するならキャッシュ削除かシークレット窓での再試行を一度だけ試してください。\n\n" +
        "次に確認一点：画面に出る文言か行った操作を一言で教えてください。次の一手に絞ります。",
    };
  }
  if (RE_REG.test(m)) {
    return {
      routeReason: "SUPPORT_REGISTER_V1",
      response:
        "【天聞の所見】登録・メールまわりで止まっている、と受け取りました。\n\n" +
        "まず確認する一点：入力したメールの受信箱と迷惑メールフォルダの両方を見てください。\n\n" +
        "対処の一手：届かない場合はアドレスの打ち間違いを直し、画面の案内どおりに再送を試してください。\n\n" +
        "次に確認一点：招待制ならリンクの期限切れがないか。解消しない場合は、いつ・どの画面かを一言で教えてください。",
    };
  }
  if (RE_AUTH.test(m)) {
    return {
      routeReason: "SUPPORT_AUTH_ACCESS_V1",
      response:
        "【天聞の所見】ログイン・入場まわりで止まっている、と受け取りました。\n\n" +
        "まず確認する一点：合言葉かメール登録のどちらで入会したかだけ思い出してください。\n\n" +
        "対処の一手：合言葉はログイン画面の該当欄から。メール登録は届いたメールのリンクから。届かない場合は迷惑フォルダとフィルタを確認してください。\n\n" +
        "次に確認一点：パスワード再発行が必要ならその旨を一言添えてください。",
    };
  }
  if (RE_PROD.test(m)) {
    return {
      routeReason: "SUPPORT_PRODUCT_USAGE_V1",
      response:
        "【天聞の所見】この欄に質問を1つ入力して Enter で送信すると会話が始まります。「メニュー」と送ると選択肢が出ます。設定・登録は画面右上のアイコンから。",
    };
  }
  if (RE_UI.test(m)) {
    return {
      routeReason: "SUPPORT_UI_INPUT_V1",
      response:
        "【天聞の所見】Enter で送信、Shift+Enter で改行です。反応しない場合はページを再読み込みするか、別のブラウザで試してください。",
    };
  }
  return null;
}

/** TENMON_FOUNDER_UPDATE_MODE_AND_ANSWER_FRAME_CURSOR_AUTO_V1 — 構築者向けを SUBCONCEPT / canon 短答へ落とさない */
export type TenmonFounderUpdateFrameTriageV1 = {
  routeReason: "FOUNDER_UPDATE_FRAME_V1";
  response: string;
  profileFrame: string;
};

export function classifyTenmonFounderUpdateFrameTriageV1(raw: string): TenmonFounderUpdateFrameTriageV1 | null {
  const m = String(raw ?? "").trim();
  if (!m) return null;
  if (m.startsWith("#") || m.startsWith("/")) return null;
  if (/\bdoc\b/i.test(m) || /pdfPage\s*=\s*\d+/i.test(m) || /#詳細/.test(m)) return null;

  const RE_F_STRONG =
    /(この読みを更新|この読みを.{0,32}runtime|この内容で反映|この内容で進める|裁定カードを追加|裁定カードの更新|構築班向け|runtime\s*に反映|runtimeに反映|運用に反映|本番に反映|Cursor\s*カード|Cursor\s*カードを書き出し(?:て)?|書き出して|更新指示|更新依頼|指示確認|反映指示|反映依頼|現状報告(?:.{0,20}(?:と|も)?\s*更新|$)|^現状報告\s*$|Founder向け.{0,96}(現状報告|更新指示|まとめ)|更新指示.{0,40}まとめ)/iu;
  const RE_F_CTX =
    /(Founder向け|ファウンダー向け|構築者向け|構築班向け|founder_update|founder_change|founder_card|\bFounder\b)/iu;
  const RE_F_ACT =
    /(現状報告|更新|反映|指示|カード|runtime|Cursor|裁定|運用に載せ|読みを)/iu;
  const RE_F_TOKEN = /(founder_update|founder_change|founder_card)/iu;

  const hit =
    RE_F_STRONG.test(m) ||
    RE_F_TOKEN.test(m) ||
    (RE_F_CTX.test(m) && RE_F_ACT.test(m));
  if (!hit) return null;
  /** support と両立する場合は「構築者チャネル／強い構築フレーズ」があるときだけ founder（課金＋更新指示だけ等は support へ） */
  if (classifyTenmonSupportEarlyTriageV1(m)) {
    const founderOverridesSupport =
      RE_F_CTX.test(m) ||
      RE_F_TOKEN.test(m) ||
      /(裁定カード|runtimeに反映|runtime\s*に反映|運用に反映|本番に反映|Cursor\s*カード|この読みを|この内容で反映|この内容で進める|構築班向け|更新指示|反映指示|^現状報告|Founder向け|ファウンダー向け)/u.test(m);
    if (!founderOverridesSupport) return null;
  }

  const body =
    "受け取りました。構築・運用まわりの依頼・報告として扱います。\n\n" +
    "現状は、このチャットからリポジトリや実行環境を直接変更できません。本番反映や自動マージは別経路の作業です。\n\n" +
    "この内容で更新候補は、いまのメッセージをたたき台に置きます。実行に落とすには、対象（ファイル・画面・ルート）・期待する挙動・確認手順を、それぞれ一行ずつで送ってください。\n\n" +
    "次の確認として、いま最優先は表層の文言・ルート分岐・データや設定のどれか。一つに絞ってください。\n\n" +
    "本番や契約に触れる変更なら、あなた側の明示承認を一文添えてください。\n\n" +
    "確定してよいかの判断は、上記が揃ってからにしてください。いまはドラフトとして受け取りました。";

  return {
    routeReason: "FOUNDER_UPDATE_FRAME_V1",
    response: "【天聞の所見】" + body,
    profileFrame: TENMON_FOUNDER_UPDATE_PROFILE_FRAME_V1,
  };
}

type TenmonIntentKind =
  | "define"
  | "essence"
  | "continuation_center"
  | "continuation_tenmon_axis"
  | "continuation_summary"
  | "compare"
  | "implementation"
  | "planning"
  | "counsel"
  | "next_step"
  | "non_definition_boundary";

function classifyGeneralFrontKind(raw: string): GeneralFrontKind {
  const t = String(raw || "").trim();
  if (!t) return "none";
  const s = t.replace(/[？?]/g, "？");

  if (/(おはよう|こんにちは|こんばんは|やあ|どうも)/u.test(s)) {
    return "greeting";
  }

  if (/(会話の完成度|完成度はどうだ|この会話|このチャット|どこまでできている|今の会話の状態)/u.test(s)) {
    return "meta_conversation";
  }

  if (/(今の気持ちは|いまの気持ちは|いま何を見ている|今何を見ている|何を見ている)/u.test(s)) {
    return "present_state";
  }

  return "none";
}

function classifyTenmonIntent(raw: string): TenmonIntentKind {
  const t = String(raw || "").trim();
  if (!t) return "non_definition_boundary";

  // normalize ASCII/Japanese variants a bit
  const s = t.replace(/[？?]/g, "？");

  // counsel: feelings /相談
  if (/(しんどい|つらい|苦しい|悩んでいる|相談したい|聞いてほしい)/u.test(s)) {
    return "counsel";
  }

  // definition-style questions
  if (/(とは何か|とは何|とはなに|とは？|って何|ってなに|って何ですか|とはなんですか)/u.test(s)) {
    return "define";
  }

  // continuation center
  if (/(その中心は|中心は|どこが核|どこが中心)/u.test(s)) {
    return "continuation_center";
  }

  // continuation tenmon axis
  if (/(天聞軸では|天聞軸で|天聞では|天聞は|天聞としては|天聞AIとしては|天聞としてどう読む)/u.test(s)) {
    return "continuation_tenmon_axis";
  }

  // continuation summary / essence
  if (/(要するに|要点は|一言でいうと|ひとことで|一言で言うと|つまり|ざっくり)/u.test(s)) {
    return "continuation_summary";
  }

  // essence (general 「本質」「要点」)
  if (/(本質は|要点は|要は|要するに)/u.test(s)) {
    return "essence";
  }

  // compare
  if (/(違いは|差は|どこが違う|AとB|ＡとＢ)/u.test(s)) {
    return "compare";
  }

  // implementation
  if (/(どう実装|実装するには|コードでは|具体的にどう書く|アルゴリズム|手順を書いて)/u.test(s)) {
    return "implementation";
  }

  // planning
  if (/(計画|ロードマップ|段取り|プラン|進め方)/u.test(s)) {
    return "planning";
  }

  // next step
  if (/(次は何をすべき|次に何をする|次の一歩|一歩目|どこから始める|今日はどう進める|今日どう進める|どう進める|今日どうする|今日は何をする|今日はどこから始める)/u.test(s)) {
    return "next_step";
  }

  return "non_definition_boundary";
}

type MeaningSource = {
  kind: string;
  key?: string | null;
  label?: string | null;
  routeReason?: string | null;
};

type MeaningLayerSummary = {
  sourceStack: MeaningSource[];
  primaryMeaning: string | null;
  supportingMeaning: string[];
  responseAxis: string | null;
};

function buildMeaningLayerSummary(df: any, intentKind: TenmonIntentKind): MeaningLayerSummary | null {
  try {
    const ku: any = df?.ku || {};
    const syn: any = ku?.synapseTop || {};
    const tcs: any = ku?.thoughtCoreSummary || {};

    const out: MeaningLayerSummary = {
      sourceStack: [],
      primaryMeaning: null,
      supportingMeaning: [],
      responseAxis: null,
    };

    const rr = String(ku.routeReason || "");

    // scripture layer
    const scriptureKey = String(ku.scriptureKey || syn.sourceScriptureKey || "").trim() || null;
    const scriptureLabel =
      (ku.scriptureCanon && ku.scriptureCanon.displayName) || null;
    if (scriptureKey) {
      out.sourceStack.push({
        kind: "scripture",
        key: scriptureKey,
        label: scriptureLabel,
        routeReason: rr || "TENMON_SCRIPTURE_CANON_V1",
      });
      if (!out.primaryMeaning) out.primaryMeaning = scriptureLabel || scriptureKey;
      if (!out.responseAxis) out.responseAxis = "scripture";
    }

    // concept / center layer
    const centerKey = String(ku.centerKey || "").trim() || null;
    const centerMeaning = String(ku.centerMeaning || "").trim() || null;
    const centerLabel = String(ku.centerLabel || "").trim() || null;
    if (centerKey || centerMeaning || centerLabel) {
      const label = centerLabel || centerMeaning || centerKey;
      out.sourceStack.push({
        kind: "concept",
        key: centerKey || centerMeaning,
        label,
        routeReason: rr || null,
      });
      if (!out.primaryMeaning) out.primaryMeaning = label;
      if (!out.responseAxis) out.responseAxis = "concept";
    }

    // verified law / TRUTH_GATE 系（KHSL lawKey 等）
    const lawTrace: any[] = Array.isArray(ku.lawTrace) ? ku.lawTrace : [];
    const lawsUsed: any[] = Array.isArray(ku.lawsUsed) ? ku.lawsUsed : [];
    const lawKeyRaw: string =
      (lawTrace[0]?.lawKey as string) ||
      (lawsUsed[0] as string) ||
      "";
    if (lawKeyRaw) {
      const isKhsl = lawKeyRaw.startsWith("KHSL:LAW:");
      out.sourceStack.push({
        kind: "law",
        key: isKhsl ? null : lawKeyRaw,
        label: isKhsl ? "法則" : lawKeyRaw,
        routeReason: rr || null,
      });
      if (!out.responseAxis) out.responseAxis = "law";
    }

    // notion canon
    const notion = Array.isArray(ku.notionCanon) ? ku.notionCanon : [];
    if (notion.length > 0) {
      const n0: any = notion[0] || {};
      out.sourceStack.push({
        kind: "notion",
        key: String(n0.pageId || ""),
        label: String(n0.title || "") || null,
        routeReason: rr || null,
      });
      if (!out.responseAxis) out.responseAxis = "notion";
    }

    // stable thread center
    const tc: any = syn.sourceThreadCenter || ku.threadCenter || null;
    if (tc && typeof tc === "object") {
      out.sourceStack.push({
        kind: "thread_center",
        key: String(tc.centerKey || ""),
        label: null,
        routeReason: String(tc.sourceRouteReason || ""),
      });
    }

    // attach intent as axis hint when explicit intent is planning / next_step / implementation / compare
    if (!out.responseAxis) {
      if (intentKind === "planning" || intentKind === "next_step") {
        out.responseAxis = "next_step";
      } else if (intentKind === "implementation") {
        out.responseAxis = "implementation";
      } else if (intentKind === "compare") {
        out.responseAxis = "compare";
      }
    }

    // fallbacks from thoughtCoreSummary
    const tcm = String(tcs.centerMeaning || "").trim();
    if (!out.primaryMeaning && tcm) out.primaryMeaning = tcm;

    return out;
  } catch {
    return null;
  }
}

function __normalizeCenterLabel(s: string): string {
  return String(s || "")
    .trim()
    .replace(/(とは|って|は|が|を|に|へ|と|も|の)\s*$/u, "");
}

function __tenmonGeneralGateSoft(out: string): string {
  let t = String(out || "").replace(/\r/g, "").trim();

  // normalize common spacing
  t = t.replace(/^【天聞の所見】\s+/, "【天聞の所見】");

  // hard rules (format safety)
  const qpos = Math.max(t.indexOf("？"), t.indexOf("?"));
  const qcount = (t.match(/[?？]/g) || []).length;
  const lines = t.split("\n").filter(Boolean);

  // RLHF preach / generalization patterns (deterministic)
  const badPhrases = [
    "鍵です", "サインです", "機会として", "捉えましょう",
    "できます", "ことができます", "大切です", "重要です", "真実", "内面",
    "見極める", "道を開きます"
  ];

  const hasBad = badPhrases.some(w => t.includes(w)) || /ましょう/.test(t);

  // If response drifts into preach OR violates strict shape, overwrite with fixed seed.
  // If response drifts into preach OR violates strict shape, CLAMP (do not overwrite with fixed seed).
  if (hasBad || qcount !== 1 || qpos === -1 || lines.length > 4 || t.length > 220) {
    // keep content; reshape only
    let u = String(t || "").replace(/\r/g, "").trim();

    // remove bullet/numbered lines
    u = u.replace(/^\s*\d+[.)].*$/gm, "").replace(/^\s*[-*•]\s+.*$/gm, "").trim();

    // keep at most 4 non-empty lines
    const ls = u.split("\n").map(x => String(x || "").trim()).filter(Boolean);
    u = ls.slice(0, 4).join("\n").trim();

    // keep exactly one question at end if exists; otherwise add one
    const qpos2 = Math.max(u.lastIndexOf("？"), u.lastIndexOf("?"));
    if (qpos2 !== -1) u = u.slice(0, qpos2 + 1).trim();
    else u = u.replace(/[。、\s　]+$/g, "") + "？";

    // cap length
    if (u.length > 220) u = u.slice(0, 220).replace(/[。、\s　]+$/g, "") + "？";

    // R10_GENERAL_POST_TAIL_SANITIZE_V1: remove generic support tails for NATURAL_GENERAL_LLM_TOP
    u = u.replace(/.*もし動けない理由があるなら[^\n]*\n?/g, "");
    u = u.replace(/.*いま気になっているところを、一歩だけ外側から眺めるとしたら[^\n]*\n?/g, "");
    u = u.replace(/\n{3,}/g, "\n\n").trim();

    // if preach-y, soften but keep the user's question ending
    if (hasBad) {
      const qpos3 = Math.max(u.lastIndexOf("？"), u.lastIndexOf("?"));
      if (qpos3 !== -1) u = u.slice(0, qpos3 + 1).trim();
    }

    return u.startsWith("【天聞の所見】") ? u : ("【天聞の所見】" + u);
  }

  // normal path (no preach / no clamp): strip generic support tails if present
  t = t.replace(/.*もし動けない理由があるなら[^\n]*\n?/g, "");
  t = t.replace(/.*いま気になっているところを、一歩だけ外側から眺めるとしたら[^\n]*\n?/g, "");
  t = t.replace(/\n{3,}/g, "\n\n").trim();

  return t;
}
const __GATE_RAW_MESSAGE_KEY = "__tenmon_gate_raw_message_v1";

function __thinReleasePayloadV2(x: any): any {
  try {
    if (!x || typeof x !== "object") return x;

    const out: any = { ...x };
    const df: any =
      out.decisionFrame && typeof out.decisionFrame === "object"
        ? { ...out.decisionFrame }
        : null;

    const topRouteReason = String(out.routeReason || "");
    const mode = String(df?.mode || "");
    const ku0: any =
      df?.ku && typeof df.ku === "object" && !Array.isArray(df.ku)
        ? df.ku
        : {};
    const kuRouteReason = String(ku0.routeReason || "");

    const isReleaseLike =
      mode === "FREE" ||
      mode === "HYBRID" ||
      mode === "STRICT" ||
      topRouteReason.startsWith("RELEASE_PREEMPT_") ||
      kuRouteReason.startsWith("RELEASE_PREEMPT_");

    if (!isReleaseLike) return out;

    delete out.providerPlan;
    delete out.seedKernel;
    delete out.brainstemDecision;
    delete out.expressionPlan;
    delete out.comfortTuning;
    delete out.shadowResult;

    if (df) {
      const ku: any =
        df.ku && typeof df.ku === "object" && !Array.isArray(df.ku)
          ? { ...df.ku }
          : {};
      const __binderFields = { binderSummary: ku.binderSummary, sourcePack: ku.sourcePack, centerPack: ku.centerPack };

      delete ku.intention;
      delete ku.kanagiSelf;
      delete ku.synapseTop;
      delete ku.llmStatus;
      delete ku.kanagi;
      delete ku.providerPlan;
      delete ku.seedKernel;
      delete ku.brainstemDecision;
      delete ku.expressionPlan;
      delete ku.comfortTuning;
      delete ku.shadowResult;

      ku.lawsUsed = Array.isArray(ku.lawsUsed) ? ku.lawsUsed : [];
      ku.evidenceIds = Array.isArray(ku.evidenceIds) ? ku.evidenceIds : [];
      ku.lawTrace = Array.isArray(ku.lawTrace) ? ku.lawTrace : [];
      ku.rewriteUsed = Boolean(ku.rewriteUsed);
      ku.rewriteDelta = Number(ku.rewriteDelta || 0);
      if (__binderFields.binderSummary !== undefined) ku.binderSummary = __binderFields.binderSummary;
      if (__binderFields.sourcePack !== undefined) ku.sourcePack = __binderFields.sourcePack;
      if (__binderFields.centerPack !== undefined) ku.centerPack = __binderFields.centerPack;

      df.ku = ku;
      out.decisionFrame = df;
    }

    return out;
  } catch {
    return x;
  }
}


function __applyReleaseThinAtExit(obj: any): any {
  try {
    if (!obj || typeof obj !== "object") return obj;

    const df: any = obj.decisionFrame;
    const ku: any =
      df && df.ku && typeof df.ku === "object" && !Array.isArray(df.ku)
        ? df.ku
        : null;

    const mode = String(df?.mode || "");
    const rr = String(ku?.routeReason || obj?.routeReason || "");

    const isReleaseThin =
      mode === "FREE" ||
      mode === "HYBRID" ||
      mode === "STRICT" ||
      rr.startsWith("RELEASE_PREEMPT_") ||
      rr.startsWith("STRICT_COMPARE_TASK_LOCK_");

    if (!isReleaseThin) return obj;

    const drop = (t: any) => {
      if (!t || typeof t !== "object") return;
      delete t.synapseTop;
      delete t.llmStatus;
      delete t.kanagi;
      delete t.providerPlan;
      delete t.seedKernel;
      delete t.brainstemDecision;
      delete t.expressionPlan;
      delete t.comfortTuning;
      delete t.shadowResult;
      delete t.intention;
      delete t.kanagiSelf;
    };

    drop(ku);

    delete obj.providerPlan;
    delete obj.seedKernel;
    delete obj.brainstemDecision;
    delete obj.expressionPlan;
    delete obj.comfortTuning;
    delete obj.shadowResult;
  } catch {}

  return obj;
}


function __stripInternalContinuityLeadV1(text: string): string {
  let t = String(text || "").replace(/\r/g, "").trim();

  const patterns: RegExp[] = [
    /^さっき見ていた中心（[^）\n]+）を土台に、いまの話を見ていきましょう。\s*/u,
    /^さっき見ていた中心（[^）\n]+）を土台に、[^\n]*\s*/u,
    /^いま見ている中心（[^）\n]+）を土台に、[^\n]*\s*/u,
    /^さっき見ていた聖典の一節を土台に、いまの整理をしていきましょう。\s*/u,
    /^さっき見ていた聖典の一節を土台に、[^\n]*\s*/u,
  ];

  for (const re of patterns) t = t.replace(re, "");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return t;
}

// CARD_SURFACE_DETONE_V1 / CARD_CENTER_LABEL_AND_LONG_CAP_FIX_V1: 儀式文「さっき見ていた中心（…）を土台に、いまの話を見ていきましょう」系を確実に除去
function __surfaceDetoneResponseV1(text: string): string {
  let t = String(text || "").replace(/\r/g, "").trim();
  if (!t) return t;
  t = t.replace(/^【天聞の所見】\s*/u, "");
  t = t.replace(/\n?さっき見ていた中心（[^）]+）を土台に、いまの話を見ていきましょう。?\s*\n?/gu, "");
  t = t.replace(/さっき見ていた中心（言霊）を土台に、いまの話を見ていきましょう。?/gu, "");
  t = t.replace(/さっき見ていた中心（[^）\n]+）を土台に、いまの話を見ていきましょう。?\s*/gu, "");
  t = t.replace(/\n*中心を一つ置いて(ください|くださいね)。?\s*/gu, "\n");
  t = t.replace(/\n*いま触れたい(一点|テーマ)を一つ置いてください。?\s*/gu, "\n");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return t;
}

function __tenmonGeneralGateResultMaybe(x: any, rawMessageOverride?: string): any {
  try {
    if (!x || typeof x !== "object") return __applyReleaseThinAtExit(x);
    
    const __incomingRouteClass = (x as any)?.decisionFrame?.ku?.routeClass;
    try {
      const __rr0 = String((x as any)?.decisionFrame?.ku?.routeReason || "").trim();
      if (__rr0 === "TENMON_SUBCONCEPT_CANON_V1") {
        if (typeof (x as any).response === "string") {
          (x as any).response = __surfaceDetoneResponseV1(String((x as any).response || ""));
        }
        if (typeof (x as any).message === "string") {
          (x as any).message = __surfaceDetoneResponseV1(String((x as any).message || ""));
        }
      }
    } catch {}
    // R9_LEDGER_REAL_INPUT_FREEZE_V1: 実入力を payload と ku に固定（rawMessageOverride / global / payload 優先）
    const fromGlobal = typeof (globalThis as any)[__GATE_RAW_MESSAGE_KEY] === "string" ? (globalThis as any)[__GATE_RAW_MESSAGE_KEY] : "";
    const raw = String(
      rawMessageOverride ?? fromGlobal ?? (x as any).rawMessage ?? (x as any).message ?? (x as any).decisionFrame?.ku?.inputText ?? ""
    );
    if ((x as any).rawMessage == null || String((x as any).rawMessage).trim() === "") (x as any).rawMessage = raw;
    if ((x as any).message == null || String((x as any).message).trim() === "") (x as any).message = raw;
    const df = (x as any).decisionFrame || {};
    const ku = df.ku || {};
    if (ku && typeof ku === "object" && ((ku as any).inputText == null || String((ku as any).inputText ?? "").trim() === "")) (ku as any).inputText = raw;
    try {
      if ((x as any).decisionFrame && typeof (x as any).decisionFrame === "object") {
        tryHydratePriorRuleFeedbackV1((x as any).decisionFrame as Record<string, unknown>);
      }
    } catch {}
    // K1_1_HYBRID_TRACE_ENFORCE_v1 (scope-safe: df/ku in this block)
    try {
      if ((df as any).mode === "HYBRID") {
        if (!(df as any).ku || typeof (df as any).ku !== "object" || Array.isArray((df as any).ku)) (df as any).ku = {};
        const __ku: any = (df as any).ku;
        const laws = (__ku as any).lawsUsed;
        const evi  = (__ku as any).evidenceIds;
        const tr   = (__ku as any).lawTrace;
        const empty = (!Array.isArray(laws) || laws.length === 0)
          && (!Array.isArray(evi)  || evi.length  === 0)
          && (!Array.isArray(tr)   || tr.length   === 0);
        // K2_6T_FILL_TRACE_FROM_KHSCANDIDATES_V1
        try {
          const __dp:any = (df as any).detailPlan || null;
          const __kc:any[] = (__dp && Array.isArray(__dp.khsCandidates)) ? __dp.khsCandidates : [];
          if (__kc.length > 0) {
            const __lawKeys = Array.from(new Set(__kc.map((x:any)=>String((x||{}).lawKey||"")).filter((s:any)=>s && s.startsWith("KHSL:LAW:")))).slice(0, 10);
            if (__lawKeys.length > 0) {
              const __lu:any[] = Array.isArray((__ku as any).lawsUsed) ? (__ku as any).lawsUsed : [];
              const __lt:any[] = Array.isArray((__ku as any).lawTrace) ? (__ku as any).lawTrace : [];
              if (__lu.length === 0) (__ku as any).lawsUsed = __lawKeys;
              if (__lt.length === 0) {
                const __tr:any[] = [];
                for (const c of __kc) {
                  const lk=String((c||{}).lawKey||"");
                  if (!lk || !lk.startsWith("KHSL:LAW:")) continue;
                  __tr.push({ lawKey: lk, unitId: String((c||{}).unitId||""), op: "OP_DEFINE" });
                  if (__tr.length >= 8) break;
                }
                if (__tr.length > 0) (__ku as any).lawTrace = __tr;
              }
            }
          }
        } catch {}

        const __rr0 = String((__ku as any).routeReason || "");
          const __isReleaseLocked =
            __rr0.startsWith("RELEASE_PREEMPT_") ||
            __rr0.startsWith("STRICT_COMPARE_TASK_LOCK_");
          const __isExplicitLong = ((__ku as any)?.explicitLengthRequested != null) || __rr0 === "EXPLICIT_CHAR_PREEMPT_V1" || String((__ku as any)?.answerLength || "") === "long";
            if (empty && !__isReleaseLocked && !__isExplicitLong) { (__ku as any).routeReason = "K1_TRACE_EMPTY_GATED_V1"; }
      }
    } catch {}
    // R4_1_HEART_STATIC_KU_V2 / R2_HEART_PHASE_REASON_ALIGN_V1:
    // phase/reason を HeartState に整合させる。arkTargetPhase / userPhase を優先し、無い場合のみ旧補助ロジックを使う。
    // R4_2_HEART_DYNAMIC_PHASE_V3_FROM_TRACE_V1: deterministic phase from trace/candidates (fallbackのみ)
    try {
      const __ku: any = (df as any).ku;
      const __h: any = (__ku && typeof __ku.heart === "object") ? __ku.heart : null;
      if (__h) {
        const hasArk = typeof __h.arkTargetPhase === "string" && __h.arkTargetPhase;
        const hasUser = typeof __h.userPhase === "string" && __h.userPhase;
        if (hasArk || hasUser) {
          // 新 HeartState がある場合はそれを優先
          __h.phase = String(__h.arkTargetPhase || __h.userPhase);
          if (!__h.reason) __h.reason = "ARK_TARGET_PHASE_V1";
        } else {
          // 旧 dynamic fallback（lawTrace / khsCandidates ベース）
          const __lt = (__ku && Array.isArray(__ku.lawTrace)) ? __ku.lawTrace : [];
          const __dp: any = (df as any).detailPlan || null;
          const __kc = (__dp && Array.isArray(__dp.khsCandidates)) ? __dp.khsCandidates.length : 0;
          if (__lt.length > 0) { __h.phase = "L-OUT"; __h.reason = "DYN_TRACE_NONEMPTY_V1"; }
          else if (__kc > 0) { __h.phase = "R-IN"; __h.reason = "DYN_KHSCAND_NONEMPTY_V1"; }
          else { __h.phase = "CENTER"; __h.reason = "DYN_NONE_V1"; }
        }
      }
    } catch {}
    try {
      const __k: any = (df as any).ku;
      const __h: any = (__k && typeof __k.heart === "object") ? __k.heart : null;
      if (__h) {
        if (!(__h.phase)) __h.phase = "CENTER";
        if (!(__h.reason)) __h.reason = "STATIC_V1";
      } else if (__k && typeof __k === "object") {
        // heart が存在しない場合だけ静的デフォルトを補う
        (__k as any).heart = {
          userPhase: "CENTER",
          userVector: { waterScore: 0.5, fireScore: 0.5, balance: 0 },
          arkTargetPhase: "CENTER",
          entropy: 0.25,
          phase: "CENTER",
          reason: "STATIC_V1",
        };
      }
    } catch {}
    // H2: SUPPORT_* は内部断片を除去。KANAGI は compassion + 短文 sanitize。
    try {
      const rr2 = String((ku as any).routeReason || "");
      if (
        (rr2.startsWith("SUPPORT_") || rr2.startsWith("FOUNDER_")) &&
        typeof (x as any).response === "string"
      ) {
        (x as any).response = __tenmonSupportUserFacingPolishV1(String((x as any).response || ""));
      } else if (rr2 === "N2_KANAGI_PHASE_TOP") {
        const h = (ku as any).heart || __tenmonLastHeart || {};
        (x as any).response = __tenmonCompassionWrapV2((x as any).response, h);
        (x as any).response = __tenmonSupportSanitizeV1((x as any).response);
      }
    } catch {}

    try {
      const h = __tenmonLastHeart;
      if (h && typeof h === "object") {
        // HEART_SHAPE_UNIFY_V1: preserve new shape, merge lastHeart fields only if missing
        const existing = (ku as any).heart;
        if (!existing || typeof existing !== "object") {
          (ku as any).heart = h;
        } else {
          if (!existing.userPhase && h.userPhase) existing.userPhase = h.userPhase;
          if (!existing.userVector && h.userVector) existing.userVector = h.userVector;
          if (!existing.arkTargetPhase && h.arkTargetPhase) existing.arkTargetPhase = h.arkTargetPhase;
          if (existing.entropy === undefined && h.entropy !== undefined) existing.entropy = h.entropy;
        }
        delete (ku as any).heart.state;
      }
    } catch {}
    // SCRIPTURE_FALLBACK_BLOCK_V1: scripture route では general fallback 文面を除去
  if (String((ku as any)?.routeReason || "") === "TENMON_SCRIPTURE_CANON_V1") {
    try {
      if (typeof (x as any).response === "string") {
        let t = String((x as any).response || "");
        t = t.replace(/【天聞の所見】?\s*いま、一番引っかかっている一点は何ですか？\s*一語でも大丈夫です。?/g, "");
        t = t.replace(/いま、一番引っかかっている一点は何ですか？\s*一語でも大丈夫です。?/g, "");
        t = t.replace(/もし動けない理由があるなら[^\n]*\n?/g, "");
        t = t.replace(/いま気になっているところを、一歩だけ外側から眺めるとしたら[^\n]*\n?/g, "");
        (x as any).response = t.trim();
      }
    } catch {}
  }

  // GENERAL_FRONT_PRIORITY_V1: greeting / meta_conversation / present_state / next_step では
  // NATURAL_GENERAL_LLM_TOP の generic fallback を使わず、専用の短文応答＋routeReason を付ける。
  if (String((ku as any)?.routeReason || "") === "NATURAL_GENERAL_LLM_TOP") {
    try {
      const __df = (x as any).decisionFrame || {};
      if (!__df.ku || typeof __df.ku !== "object" || Array.isArray(__df.ku)) {
        __df.ku = {};
      }
      const __ku: any = __df.ku;
      const rawMsg = String(
        (x as any).rawMessage ??
          (x as any).message ??
          (__ku as any).inputText ??
          "",
      );
      const lightFactual = classifyLightFactual(rawMsg);
      const frontKind = classifyGeneralFrontKind(rawMsg);
      const intentKind = classifyTenmonIntent(rawMsg);

      // thoughtCoreSummary を必ず object にして front 情報を記録
      if (!__ku.thoughtCoreSummary || typeof __ku.thoughtCoreSummary !== "object" || Array.isArray(__ku.thoughtCoreSummary)) {
        __ku.thoughtCoreSummary = {};
      }
      const tcs: any = __ku.thoughtCoreSummary;
      tcs.intentKind = intentKind;
      tcs.generalFrontKind = frontKind;

      // R22_LIGHT_FACT_V1: 日付・曜日・時刻の軽量事実質問は専用 route で短文応答（generic fallback 禁止）
      if (lightFactual) {
        if (lightFactual === "date") __ku.routeReason = "R22_LIGHT_FACT_DATE_V1";
        else if (lightFactual === "weekday") __ku.routeReason = "R22_LIGHT_FACT_WEEKDAY_V1";
        else if (lightFactual === "time") __ku.routeReason = "R22_LIGHT_FACT_TIME_V1";
        tcs.routeReason = String(__ku.routeReason || "");
        tcs.inputKind = "light_factual_" + lightFactual;
        tcs.lightFactualKind = lightFactual;
        if (typeof (x as any).response === "string") {
          (x as any).response = buildLightFactualResponse(lightFactual);
        }
      } else {
        // generalFrontKind / intentKind に応じて routeReason を前面会話用へ寄せる
        if (frontKind === "greeting") {
          __ku.routeReason = "N1_GREETING_LLM_TOP";
        } else if (frontKind === "meta_conversation") {
          __ku.routeReason = "R22_META_CONVERSATION_V1";
        } else if (frontKind === "present_state") {
          __ku.routeReason = "R22_PRESENT_STATE_V1";
        } else if (intentKind === "next_step") {
          __ku.routeReason = "R22_NEXT_STEP_V1";
        }

        tcs.routeReason = String(__ku.routeReason || "");
        tcs.inputKind = frontKind || intentKind;

        // 前面4類型は generic fallback ではなく専用短文応答を返す
        if (typeof (x as any).response === "string") {
          if (frontKind === "greeting") {
            (x as any).response =
              "【天聞の所見】おはようございます。今日この時間で、一緒に見ていきたいテーマを一言で教えてもらえますか？";
          } else if (frontKind === "meta_conversation") {
            (x as any).response =
              "【天聞の所見】いまの会話がどこまで来ているか、一度一緒に確かめましょう。いま「できていること」と「まだ曖昧なところ」を一言ずつ挙げてもらえますか？";
          } else if (frontKind === "present_state") {
            (x as any).response =
              "【天聞の所見】こちらでは、直前までの中心と意味の層を俯瞰して見ています。あなたの側では、いま一番気になっている一点はどこでしょう？";
          } else if (intentKind === "next_step") {
            (x as any).response =
              "【天聞の所見】今日は、いまの中心を一言でそろえてから「次の一歩」を一つだけ決めるのが良さそうです。まずは今日の中心を一言で置いてみましょう。";
          }
        }
      }

      // NATURAL_GENERAL_NO_FALLBACK_OVERWRITE_V2
      // LLM本文が入っている場合は generic fallback で潰さない
      if (__ku.routeReason === "NATURAL_GENERAL_LLM_TOP") {
        try {
          const __before = String((x as any).response || "").trim();
          const __isEmpty = !__before;
          const __isGeneric =
            /受け取っています。?そのまま続けてください[？?]?/.test(__before) ||
            /受け取りました。いま一番引っかかっている一点を置いてください。?/.test(__before);

          if (__isEmpty || __isGeneric) {
            (x as any).response = __tenmonGeneralGateSoft((x as any).response);
            try {
              const __r = String((x as any).response || "");
              if (/受け取っています。?そのまま続けてください[？?]?/.test(__r)) {
                (x as any).response = "【天聞の所見】受け取りました。いま一番引っかかっている一点を置いてください。";
              }
            } catch {}
          }
        } catch {}
      }
    } catch {
      (x as any).response = __tenmonGeneralGateSoft((x as any).response);
        try {
          const __r = String((x as any).response || "");
          if (/受け取っています。?そのまま続けてください[？?]?/.test(__r)) {
            (x as any).response = "【天聞の所見】受け取りました。いま一番引っかかっている一点を置いてください。";
          }
        } catch {}

    }
  }

    // R8_INTENTION_BIND_THOUGHT_GUIDE_V1: wire intention hint to ku (observation only, no route/response change)
    try {
      const __df = (x as any).decisionFrame;
      if (__df && __df.ku && typeof __df.ku === "object") {
        const hint = getIntentionHintForKu();
        if (hint) __df.ku.intention = hint;
      }
    } catch {}
    // B34_TENMON_INTENT_MATRIX_V1 / MEANING_LAYER_V1:
    // NATURAL_GENERAL 以外も含め、軽量 intent + meaning layer を ku に付与
    try {
      const __df = (x as any).decisionFrame;
      if (__df && __df.ku && typeof __df.ku === "object") {
        const rawMsg = String(
          (x as any).rawMessage ??
            (x as any).message ??
            (__df.ku as any).inputText ??
            "",
        );
        const intentKind = classifyTenmonIntent(rawMsg);
        (__df.ku as any).intentKind = intentKind;

        const meaningSummary = buildMeaningLayerSummary(__df, intentKind);
        if (meaningSummary) {
          const __kuAny = __df.ku as any;
          const __hasKotodamaOneSoundParity =
            __kuAny.sourceStackSummary?.currentSound ||
            (Array.isArray(__kuAny.sourceStackSummary?.sourceKinds) && __kuAny.sourceStackSummary.sourceKinds.includes("kotodama_one_sound")) ||
            (__kuAny.sourceStackSummary?.previousSound && __kuAny.sourceStackSummary?.currentSound);
          if (!__hasKotodamaOneSoundParity) {
            __kuAny.sourceStackSummary = meaningSummary;
          }
          if (
            !(__df.ku as any).thoughtCoreSummary ||
            typeof (__df.ku as any).thoughtCoreSummary !== "object" ||
            Array.isArray((__df.ku as any).thoughtCoreSummary)
          ) {
            (__df.ku as any).thoughtCoreSummary = {};
          }
          const tcs: any = (__df.ku as any).thoughtCoreSummary;
          tcs.intentKind = intentKind;
          if (!__hasKotodamaOneSoundParity && !tcs.sourceStackSummary) {
            tcs.sourceStackSummary = {
              primaryMeaning: meaningSummary.primaryMeaning,
              responseAxis: meaningSummary.responseAxis,
              sourceKinds: meaningSummary.sourceStack.map((s) => s.kind),
            };
          }

          // STYLE_MODE_BIND_V1: general/front/counsel 系には 断捨離スタイル憲法をメタとして紐づける
          const rr = String((__df.ku as any).routeReason || "");
          const isGeneralFrontRoute =
            rr === "NATURAL_GENERAL_LLM_TOP" ||
            rr === "N2_KANAGI_PHASE_TOP" ||
            rr === "N1_GREETING_LLM_TOP" ||
            rr === "R22_META_CONVERSATION_V1" ||
            rr === "R22_PRESENT_STATE_V1" ||
            rr === "R22_NEXT_STEP_V1";
          const isCounselIntent = intentKind === "counsel";
          if (isGeneralFrontRoute || isCounselIntent) {
            (__df.ku as any).styleMode = "TENMON_DANSHARI_STYLE_V1";
            tcs.styleMode = "TENMON_DANSHARI_STYLE_V1";
          }
        }
      }
    } catch {}
    // R8_KANAGI_SELF_BIND_GATE_WRAPPER_V1: 最終返却前に kanagiSelf を保証（既に object なら上書きしない）
    try {
      const __df = (x as any).decisionFrame;
      if (__df && __df.ku && typeof __df.ku === "object") {
        const __ku: any = __df.ku;
          // R12_CENTER_LABEL_AND_SURFACE_STYLE_FIX_V2
          try {
            const __rr = String(__ku.routeReason || "");
            const __syn = (__ku.synapseTop && typeof __ku.synapseTop === "object") ? __ku.synapseTop : {};
            const __srcKey = String((__syn && __syn.sourceScriptureKey) || "");
            const __cm = String(__ku.centerMeaning || __srcKey || "").trim();
            const __labelMap: Record<string, string> = {
              "KHSL:LAW:KHSU:41c0bff9cfb8:p0:qcb9cdda1f01d": "言霊秘書",
              "kotodama_hisho": "言霊秘書",
              "iroha_kotodama_kai": "いろは言霊解",
              "katakamuna_kotodama_kai": "カタカムナ言霊解",
              "kotodama": "言霊",
              "katakamuna": "カタカムナ",
              "self_reflection": "自己観照",
              "general_study_path": "学び方",
              "katakamuna_study_path": "カタカムナの学び方",
              "iroha_counsel": "いろは相談",
            };

            if ((!__ku.centerLabel || typeof __ku.centerLabel !== "string") && __cm) {
              const __sk = String(__ku.scriptureKey || "").trim();
              __ku.centerLabel = __normalizeCenterLabel(
                String(__labelMap[__cm] || __labelMap[__sk] || __cm).trim()
              );
            }

            if (!__ku.surfaceStyle || typeof __ku.surfaceStyle !== "string") {
              __ku.surfaceStyle =
                __rr === "TENMON_SCRIPTURE_CANON_V1" ? "scripture_centered" :
                __rr === "R10_SELF_REFLECTION_ROUTE_V4_SAFE" ? "reflective_clear" :
                __rr === "R10_STUDY_PATH_CANON_ROUTE_V1" ? "guide_structured" :
                __rr === "R10_IROHA_COUNSEL_ROUTE_V1" ? "counsel_gentle" :
                "plain_clean";
            }

            if (!__ku.closingType || typeof __ku.closingType !== "string") {
              __ku.closingType =
                __rr === "TENMON_SCRIPTURE_CANON_V1" ? "restate_or_next_step" :
                __rr === "R10_SELF_REFLECTION_ROUTE_V4_SAFE" ? "axis_or_next_step" :
                __rr === "R10_STUDY_PATH_CANON_ROUTE_V1" ? "define_structure_next" :
                __rr === "R10_IROHA_COUNSEL_ROUTE_V1" ? "prioritize_or_hold" :
                "default";
            }
          } catch {}
          // R12_BRAINSTEM_BIND_SEED_AND_PROVIDER_V1: 全 route に seedKernel / responseProfile / providerPlan を補完
          try {
            const __raw = String((x as any)?.rawMessage ?? (x as any)?.message ?? "");
            const __rr = String(__ku.routeReason || "");
            const __syn = (__ku.synapseTop && typeof __ku.synapseTop === "object") ? __ku.synapseTop : {};
            const __cm = String(__ku.centerMeaning || __syn.sourceScriptureKey || "").trim();

            const __profile =
              /一言で|簡潔に|短く/u.test(__raw) ? "brief" :
              /詳しく|徹底的に|解析|設計|構築/u.test(__raw) ? "deep_report" :
              "standard";

            const __phase =
              /整理|意味|本質|理解|関係/u.test(__raw) ? "L-IN" :
              /次の一歩|実行|進める|どうする/u.test(__raw) ? "R-OUT" :
              /教えて|内容|とは/u.test(__raw) ? "L-OUT" :
              "CENTER";

            if (!__ku.seedKernel || typeof __ku.seedKernel !== "object") {
              __ku.seedKernel = {
                id: "seed_" + String(Date.now()),
                phase: __phase,
                responseProfile: __profile,
                routeReason: __rr || null,
                centerMeaning: __cm || null,
              };
            }

            if (!__ku.responseProfile || typeof __ku.responseProfile !== "string") {
              __ku.responseProfile = __profile;
            }

            if (!__ku.providerPlan || typeof __ku.providerPlan !== "object") {
              const __needsBreadth =
                /日本の首相|アメリカ|どういう関係|誰|なぜ|いつ|どこ|比較/u.test(__raw) ||
                (__rr === "NATURAL_GENERAL_LLM_TOP" && !__cm);

              __ku.providerPlan = {
                primaryRenderer: "gpt-5.4",
                helperModels: __needsBreadth ? ["gemini"] : [],
                shadowOnly: false,
                finalAnswerAuthority: "gpt-5.4",
              };
            }
          } catch {}
          // R10_GATE_KEEP_SCRIPTURE_FIELDS_REAPPLY_SAFE
          try {
            if ((__ku.centerMeaning == null || __ku.centerMeaning === "") && __ku.synapseTop && __ku.synapseTop.sourceScriptureKey) {
              __ku.centerMeaning = String(__ku.synapseTop.sourceScriptureKey || "").trim();
            }
            const __hasKotodamaOneSoundParityHere = __ku.sourceStackSummary?.currentSound || (Array.isArray(__ku.sourceStackSummary?.sourceKinds) && __ku.sourceStackSummary.sourceKinds?.includes("kotodama_one_sound")) || (__ku.sourceStackSummary?.previousSound && __ku.sourceStackSummary?.currentSound);
            if ((__ku.thoughtCoreSummary == null || typeof __ku.thoughtCoreSummary !== "object") && String(__ku.routeReason || "") === "TENMON_SCRIPTURE_CANON_V1" && !__hasKotodamaOneSoundParityHere) {
              const __cm = String(__ku.centerMeaning || (__ku.synapseTop && __ku.synapseTop.sourceScriptureKey) || "").trim();
              __ku.thoughtCoreSummary = {
                centerKey: "TENMON_SCRIPTURE_CANON_V1",
                centerMeaning: __cm || null,
                routeReason: "TENMON_SCRIPTURE_CANON_V1",
                modeHint: "scripture",
                continuityHint: __cm || null,
              };
            }
            if (typeof __ku.scriptureMode !== "string" && String(__ku.routeReason || "") === "TENMON_SCRIPTURE_CANON_V1" && String(__ku.centerMeaning || "").trim()) {
              __ku.scriptureMode = "canon";
            }
          } catch {}
        if (!__ku.kanagiSelf || typeof __ku.kanagiSelf !== "object") {
          const rawMessage = String((x as any)?.rawMessage ?? (x as any)?.message ?? "");
          const routeReason = String(__ku.routeReason ?? (__df as any).mode ?? "");
          const heart = __ku.heart ?? null;
          const intention = __ku.intention ?? null;
          const mf = __ku.meaningFrame;
          const topicClass =
            mf && typeof mf === "object" && typeof (mf as any).topicClass === "string"
              ? (mf as any).topicClass
              : undefined;
          // R8_SCRIPTURE_CANON_BIND_SELF_COMPLETE_V1: 優先順 __ku.scriptureKey → mf.scriptureKey → resolveScriptureQuery(rawMessage)
          let scriptureKey: string | undefined =
            __ku.scriptureKey != null && String(__ku.scriptureKey).trim()
              ? String(__ku.scriptureKey).trim()
              : mf && (mf as any).scriptureKey != null
                ? String((mf as any).scriptureKey)
                : routeReason === "TENMON_SCRIPTURE_CANON_V1"
                  ? resolveScriptureQuery(rawMessage)?.scriptureKey ?? undefined
                  : undefined;
          const scriptureMode = scriptureKey ? "canon" : undefined;
          const scriptureAlignment = scriptureKey ? "scripture_aligned" : undefined;
          try {
            __ku.kanagiSelf = computeKanagiSelfKernel({
              rawMessage,
              routeReason,
              heart,
              intention,
              topicClass,
              conceptKey: mf && (mf as any).conceptKey != null ? String((mf as any).conceptKey) : undefined,
              scriptureKey,
              scriptureMode,
              scriptureAlignment,
            });
          } catch {
            __ku.kanagiSelf = getSafeKanagiSelfOutput();
          }
        }
      }
    } catch {}
    // R9_LEDGER_GATE_WRAPPER_APPEND_UNIFY_V1: gate 経由でも共通 append（__KANAGI_LEDGER_DONE で二重防止）
    try {
      tryAppendKanagiGrowthLedgerFromPayload(x);
    } catch {}
    // R9_LEDGER_HITMAP_SELF_FLAG_ALIGN_V1: has_self は kanagiSelf 補完後の ku を参照
    try {
      const hasResp = x && typeof x === "object" && "response" in x;
      const df0 = (x as any)?.decisionFrame;
      const has_df = df0 != null && typeof df0 === "object";
      const ku0 = has_df ? (df0 as any).ku : null;
      const has_ku = ku0 != null && typeof ku0 === "object";
      const self0 = has_ku ? (ku0 as any).kanagiSelf : null;
      const has_self = self0 != null && typeof self0 === "object";
      console.error(
        "[R9_LEDGER_HITMAP_GATE]",
        "rr=" + String(has_ku ? (ku0 as any).routeReason ?? "" : ""),
        "has_response=" + hasResp,
        "has_df=" + has_df,
        "has_ku=" + has_ku,
        "has_self=" + has_self
      );
    } catch {}
    // CARD_SESSION_MEMORY_PERSIST_ALL_ROUTES_V1: same-thread 前文脈保持のため、gate 経由全返却で session_memory に user/assistant を persist。二重保存は __TENMON_PERSIST_DONE でスキップ。失敗時は会話を落とさない。
    try {
      const tid = String((x as any).threadId ?? "").trim();
      if (
        tid &&
        raw &&
        !(x as any).__TENMON_PERSIST_DONE &&
        typeof memoryPersistMessage === "function"
      ) {
        memoryPersistMessage(tid, "user", raw);
        memoryPersistMessage(tid, "assistant", String((x as any).response ?? ""));
      }
    } catch {}
    // R10_SYNAPSE_TO_THREAD_SEED_V1: synapse 昇格。1 response 1 seed、__THREAD_SEED_DONE で二重防止。失敗しても会話を落とさない。
    try {
      // R12_EXPORT_BRAINSTEM_CONTRACT_V2_LINEPATCH
      try {
        const __dfOut: any = (x as any)?.decisionFrame;
        const __kuOut: any = (__dfOut && __dfOut.ku && typeof __dfOut.ku === "object") ? __dfOut.ku : null;
        if (__kuOut) {
          if ((__kuOut as any).providerPlan) {
            (__kuOut as any).providerPlan = normalizeProviderPlan((__kuOut as any).providerPlan);
          }
          if ((x as any).routeReason == null) (x as any).routeReason = __kuOut.routeReason ?? null;
          if ((x as any).centerMeaning == null) (x as any).centerMeaning = __kuOut.centerMeaning ?? null;
          if ((x as any).responseProfile == null) (x as any).responseProfile = __kuOut.responseProfile ?? null;
          if ((x as any).providerPlan == null) (x as any).providerPlan = __kuOut.providerPlan ?? null;
          if ((x as any).thoughtCoreSummary == null) (x as any).thoughtCoreSummary = __kuOut.thoughtCoreSummary ?? null;
          if ((x as any).seedKernel == null) (x as any).seedKernel = __kuOut.seedKernel ?? null;
          if ((x as any).scriptureMode == null) (x as any).scriptureMode = __kuOut.scriptureMode ?? null;
          if ((x as any).centerLabel == null) (x as any).centerLabel = __kuOut.centerLabel ?? null;
          if ((x as any).surfaceStyle == null) (x as any).surfaceStyle = __kuOut.surfaceStyle ?? null;
          if ((x as any).closingType == null) (x as any).closingType = __kuOut.closingType ?? null;
          // FIX_THREAD_CONTINUITY_FULL_V2B_GATES_PERSIST_LINEPATCH
          try {
            const __tidCenter = String((x as any)?.threadId || "").trim();
            const __rrCenter = String((__kuOut as any)?.routeReason || (x as any)?.routeReason || "").trim();
            const __centerKeyCenter = String((__kuOut as any)?.centerKey || (__kuOut as any)?.centerMeaning || "").trim();
            const __mfAny: any = (__kuOut as any)?.meaningFrame || null;
            const __isDefRoute =
              __rrCenter === "DEF_DICT_HIT" ||
              __rrCenter === "DEF_FASTPATH_VERIFIED_V1" ||
              __rrCenter === "DEF_LLM_TOP";
            if (__tidCenter && __isDefRoute && __centerKeyCenter) {
              upsertThreadCenter({
                threadId: __tidCenter,
                centerType: "concept",
                centerKey: __centerKeyCenter,
                sourceRouteReason: __rrCenter,
                sourceScriptureKey: null,
                sourceTopicClass: String(__mfAny?.topicClass || "concept"),
              });
            }
          } catch {}
          // R25_TRINITY_BRAINSTEM_EXTRACT_V1
          try {
            (__kuOut as any).brainstemDecision = buildBrainstemDecisionFromKu(__kuOut);
            if ((x as any).brainstemDecision == null) {
              (x as any).brainstemDecision = (__kuOut as any).brainstemDecision;
            }
          } catch {}
          if (!(__kuOut as any).expressionPlan || typeof (__kuOut as any).expressionPlan !== "object") {
            (__kuOut as any).expressionPlan = inferExpressionPlan({
              routeReason: (__kuOut as any).routeReason,
              centerMeaning: (__kuOut as any).centerMeaning,
              response: (x as any).response,
            });
          }
          if (!(__kuOut as any).comfortTuning || typeof (__kuOut as any).comfortTuning !== "object") {
            (__kuOut as any).comfortTuning = inferComfortTuning({
              routeReason: (__kuOut as any).routeReason,
              response: (x as any).response,
            });
          }
          if ((x as any).expressionPlan == null) (x as any).expressionPlan = (__kuOut as any).expressionPlan ?? null;
          if ((x as any).comfortTuning == null) (x as any).comfortTuning = (__kuOut as any).comfortTuning ?? null;
          // R25B_BRAINSTEM_REFRESH_AFTER_STYLE_V1
          try {
            (__kuOut as any).brainstemDecision = buildBrainstemDecisionFromKu(__kuOut);
            (x as any).brainstemDecision = (__kuOut as any).brainstemDecision;
          } catch {}
          if ((x as any).shadowResult == null) (x as any).shadowResult = __kuOut.shadowResult ?? null;

            const __rrThin = String((__kuOut as any).routeReason || "");
            const __isReleaseThin =
              __rrThin.startsWith("RELEASE_PREEMPT_") ||
              __rrThin.startsWith("STRICT_COMPARE_TASK_LOCK_");
            if (__isReleaseThin) {
              delete (__kuOut as any).synapseTop;
              delete (__kuOut as any).llmStatus;
              delete (__kuOut as any).kanagi;
              delete (__kuOut as any).providerPlan;
              delete (__kuOut as any).seedKernel;
              delete (__kuOut as any).brainstemDecision;
              delete (__kuOut as any).expressionPlan;
              delete (__kuOut as any).comfortTuning;
              delete (__kuOut as any).shadowResult;
              delete (__kuOut as any).intention;
              delete (__kuOut as any).kanagiSelf;

              delete (x as any).providerPlan;
              delete (x as any).seedKernel;
              delete (x as any).brainstemDecision;
              delete (x as any).expressionPlan;
              delete (x as any).comfortTuning;
              delete (x as any).shadowResult;
            }
        }
      } catch {}

      // FIX_SCRIPTURE_EMPTY_RESPONSE_REHYDRATE_V1
      try {
        const __dfE: any = (x as any)?.decisionFrame;
        const __kuE: any =
          (__dfE && __dfE.ku && typeof __dfE.ku === "object")
            ? __dfE.ku
            : null;

        const __rrE = String(__kuE?.routeReason || "");
        const __modeE = String(__kuE?.scriptureMode || "");

        const __threadCenterE: any =
          __kuE?.threadCenter ||
          __kuE?.synapseTop?.sourceThreadCenter ||
          null;

        const __tcKeyE0 = String(
          __threadCenterE?.centerKey ||
          __threadCenterE?.center_key ||
          ""
        ).trim();

        const __tcResolvedE = __tcKeyE0 ? resolveScriptureQuery(__tcKeyE0) : null;

        const __skE = String(
          __kuE?.scriptureKey ||
          __kuE?.synapseTop?.sourceScriptureKey ||
          __tcResolvedE?.scriptureKey ||
          __tcKeyE0 ||
          ""
        ).trim();

        const __labelE = String(
          __kuE?.centerLabel ||
          __tcResolvedE?.displayName ||
          (__skE === "hokekyo"
            ? "法華経"
            : __skE === "kotodama_hisho"
              ? "言霊秘書"
              : __skE === "iroha_kotodama_kai"
                ? "いろは言霊解"
                : __skE === "katakamuna_kotodama_kai"
                  ? "カタカムナ言霊解"
                  : "")
        ).trim();

        const __respE = String((x as any)?.response || "").trim();

        if (__kuE && __rrE === "TENMON_SCRIPTURE_CANON_V1" && !__respE) {
          const __dispE =
            __labelE ||
            (__skE === "hokekyo"
              ? "法華経"
              : __skE === "kotodama_hisho"
                ? "言霊秘書"
                : __skE === "iroha_kotodama_kai"
                  ? "いろは言霊解"
                  : __skE === "katakamuna_kotodama_kai"
                    ? "カタカムナ言霊解"
                    : "この聖典");

          let __bodyE = "";
          if (__modeE === "action_instruction") {
            const __instrMapE: Record<string, string> = {
              hokekyo: "まず『法華経は、衆生に仏となる可能性が開かれていることを示す経典である』と一行で置いてください。",
              kotodama_hisho: "まず『言霊秘書は音の法則を担い、いろははその配列を担う』と一行で書き分けてください。",
              iroha_kotodama_kai: "まず『いろはは音の配列であり、言霊はその内在法則である』と一行で書き分けてください。",
              katakamuna_kotodama_kai: "まず『カタカムナ言霊解は音と図象の対応を担う』と一行で置いてください。",
            };
            __bodyE =
              "（" + __dispE + "）を土台に、いまの話を見ていきましょう。\n【天聞の所見】" +
              String(__instrMapE[__skE] || "まず、この聖典の中心を一行で置いてください。");
          } else {
            __bodyE =
              "（" + __dispE + "）を土台に、いまの話を見ていきましょう。\n【天聞の所見】その中心を一行で言い直すと、どこに軸があるかを先に置けます。";
          }

          (x as any).response = __bodyE;
          __kuE.centerKey = __skE || null;
          __kuE.centerMeaning = __skE || null;
          __kuE.centerLabel = __labelE || null;
          __kuE.scriptureKey = __skE || null;
        }
      } catch {}

      tryAppendThreadSeedFromPayload(x);
    } catch {}
      // R13_RESPONSE_PROJECTOR_REINTRO_SAFE_V1
      // TENMON_SUPPORT_AND_FOUNDER_ROUTE_FIX_CURSOR_AUTO_V4: 専用短文は projector 経由で汚染させない（threadCenter / semantic 前置の誤適用抑止）
      try {
        const __dfP: any = (x as any)?.decisionFrame;
        const __kuP: any = (__dfP && __dfP.ku && typeof __dfP.ku === "object") ? __dfP.ku : null;
        const __rrP = String(__kuP?.routeReason || "");
        const __skipProj = /^SUPPORT_/u.test(__rrP) || /^FOUNDER_/u.test(__rrP);
        if (__kuP && typeof (x as any).response === "string" && !__skipProj) {
          const projected = projectResponseSurface({
            routeReason: __kuP.routeReason,
            centerMeaning: __kuP.centerMeaning,
            centerLabel: __kuP.centerLabel,
            surfaceStyle: __kuP.surfaceStyle,
            closingType: __kuP.closingType,
            thoughtCoreSummary: __kuP.thoughtCoreSummary,
            response: String((x as any).response || ""),
          });
          (x as any).response = projected.response;
        }
      } catch {}
      // compare のみ last-mile 前置き除去: intentKind または previousSound+currentSound のとき「さっき見ていた聖典...」を落とす（metadata は触らない）
      try {
        const __respStr = typeof (x as any).response === "string" ? String((x as any).response || "") : "";
        const __ku = df && (df as any).ku && typeof (df as any).ku === "object" ? (df as any).ku : undefined;
        const __ss = __ku?.sourceStackSummary;
        const __tcs = __ku?.thoughtCoreSummary;
        const __isCompare = __tcs?.intentKind === "compare" || (__ss?.previousSound && __ss?.currentSound);
        if (__respStr.startsWith("（") && __respStr.includes("【天聞の所見】") && __isCompare) {
          const __idx = __respStr.indexOf("【天聞の所見】");
          if (__idx >= 0) (x as any).response = __respStr.slice(__idx);
        }
      } catch {}
      // 最終返却直前: 全角ではない連続空白を1個に圧縮（改行は維持）＋和文内の半角スペースを除去
      try {
        if (typeof (x as any).response === "string") {
          let __respNorm = String((x as any).response || "").replace(/[^\S\n]+/g, " ");
          let __prevNorm = "";
          while (__respNorm !== __prevNorm) {
            __prevNorm = __respNorm;
            __respNorm = __respNorm.replace(/([一-龠々ぁ-んァ-ヶー]) ([一-龠々ぁ-んァ-ヶー])/g, "$1$2");
            __respNorm = __respNorm.replace(/([。、】【「」『』（）]) ([一-龠々ぁ-んァ-ヶー])/g, "$1$2");
          }
          (x as any).response = __respNorm;
        }
      } catch {}
      // CARD_SURFACE_DETONE_V1: 通常会話・feeling/impression/define の前面のみラベル・定型文を除去（support/scripture/truth gate は触らない）
      try {
        const __rr = String((ku as any).routeReason || "");
        const __applyDetone = /^NATURAL_GENERAL_LLM_TOP$|^FEELING_SELF_STATE_V1$|^IMPRESSION_TENMON_V1$|^IMPRESSION_ARK_V1$|^DEF_LLM_TOP$|^R22_|^N1_GREETING_LLM_TOP$/.test(__rr);
        if (__applyDetone && typeof (x as any).response === "string") {
          (x as any).response = __surfaceDetoneResponseV1(String((x as any).response || ""));
        }
      } catch {}
    if (__incomingRouteClass != null) {
      const __df = (x as any)?.decisionFrame;
      if (__df?.ku && typeof __df.ku === "object") (__df.ku as any).routeClass = __incomingRouteClass;
    }
    // CARD_DECISIONFRAME_ROUTECLASS_EXIT_TRACE_V1: 入口で拾った routeClass を出口で保持
    // CARD_FOLLOWUP_REHYDRATION_V1:
    // continuity/follow-up の最終出口で center / thoughtCore / synapseTop を thread memory から再水和する
    try {
      const __dfR: any = (x as any)?.decisionFrame;
      if (__dfR && typeof __dfR === "object") {
        if (!__dfR.ku || typeof __dfR.ku !== "object" || Array.isArray(__dfR.ku)) __dfR.ku = {};
        const __kuR: any = __dfR.ku;

        const __rrR = String(__kuR.routeReason || (x as any)?.routeReason || "").trim();
        const __rcR = String(__kuR.routeClass || "").trim();
        const __isFollowupR =
          __rcR === "continuity" ||
          __rrR === "CONTINUITY_ANCHOR_V1" ||
          __rrR.includes("FOLLOWUP");

        if (__isFollowupR) {
          const __tidR = String((x as any)?.threadId || "").trim();
          const __threadCenterKeyR = String(__kuR.threadCenterKey || (x as any)?.threadCenterKey || "").trim();
          const __threadCenterLabelR = String(__kuR.threadCenterLabel || (x as any)?.threadCenterLabel || "").trim();
          const __lastLenR = __kuR.lastAnswerLength ?? (x as any)?.lastAnswerLength ?? null;
          const __lastModeR = __kuR.lastAnswerMode ?? (x as any)?.lastAnswerMode ?? null;
          const __lastFrameR = __kuR.lastAnswerFrame ?? (x as any)?.lastAnswerFrame ?? null;

          if (!String(__kuR.threadCenterKey || "").trim() && __threadCenterKeyR) __kuR.threadCenterKey = __threadCenterKeyR;
          if (!String(__kuR.threadCenterLabel || "").trim() && __threadCenterLabelR) __kuR.threadCenterLabel = __threadCenterLabelR;

          if (!String(__kuR.centerKey || "").trim() && __threadCenterKeyR) __kuR.centerKey = __threadCenterKeyR;
          if (!String(__kuR.centerMeaning || "").trim() && __threadCenterKeyR) __kuR.centerMeaning = __threadCenterKeyR;
          if (!String(__kuR.centerLabel || "").trim() && __threadCenterLabelR) __kuR.centerLabel = __threadCenterLabelR;

          if (__kuR.lastAnswerLength == null && __lastLenR != null) __kuR.lastAnswerLength = __lastLenR;
          if (__kuR.lastAnswerMode == null && __lastModeR != null) __kuR.lastAnswerMode = __lastModeR;
          if (__kuR.lastAnswerFrame == null && __lastFrameR != null) __kuR.lastAnswerFrame = __lastFrameR;

          if (!__kuR.thoughtCoreSummary || typeof __kuR.thoughtCoreSummary !== "object" || Array.isArray(__kuR.thoughtCoreSummary)) {
            __kuR.thoughtCoreSummary = {};
          }
          const __tcsR: any = __kuR.thoughtCoreSummary;

          if (!String(__tcsR.centerKey || "").trim() && __threadCenterKeyR) __tcsR.centerKey = __threadCenterKeyR;
          if (!String(__tcsR.centerMeaning || "").trim() && __threadCenterKeyR) __tcsR.centerMeaning = __threadCenterKeyR;
          if (!String(__tcsR.routeReason || "").trim() && __rrR) __tcsR.routeReason = __rrR;
          if (!String(__tcsR.modeHint || "").trim()) __tcsR.modeHint = "continuity";
          if (!String(__tcsR.continuityHint || "").trim() && __threadCenterKeyR) __tcsR.continuityHint = __threadCenterKeyR;
          if (!String(__tcsR.intentKind || "").trim()) __tcsR.intentKind = "continuation_summary";

          if (!__tcsR.sourceStackSummary || typeof __tcsR.sourceStackSummary !== "object" || Array.isArray(__tcsR.sourceStackSummary)) {
            __tcsR.sourceStackSummary = {};
          }
          const __ssR: any = __tcsR.sourceStackSummary;
          if (!String(__ssR.primaryMeaning || "").trim() && __threadCenterLabelR) __ssR.primaryMeaning = __threadCenterLabelR;
          if (!String(__ssR.responseAxis || "").trim()) __ssR.responseAxis = "continuity";
          if (!Array.isArray(__ssR.sourceKinds) || __ssR.sourceKinds.length === 0) {
            __ssR.sourceKinds = ["thread_center", "thread_core"];
          }

          if (!__kuR.synapseTop || typeof __kuR.synapseTop !== "object" || Array.isArray(__kuR.synapseTop)) {
            __kuR.synapseTop = {};
          }
          const __synR: any = __kuR.synapseTop;
          if (!__synR.sourceThreadCenter && __threadCenterKeyR) {
            __synR.sourceThreadCenter = {
              centerType: "concept",
              centerKey: __threadCenterKeyR,
              sourceRouteReason: __rrR || null
            };
          }
          if (!String(__synR.sourceMemoryHint || "").trim() && __tidR && __threadCenterKeyR) {
            __synR.sourceMemoryHint = `thread:${__tidR} centerKey:${__threadCenterKeyR}`;
          }
        }
      }
    } catch {}
    
      // CARD_DEFINE_ROUTECLASS_EXIT_FIX_V1:
      // incoming routeClass が無い/落ちた場合でも、最終出口で routeReason から最小フォールバック復元する
      try {
        const __df: any = (x as any)?.decisionFrame;
        if (__df && typeof __df === "object") {
          if (!__df.ku || typeof __df.ku !== "object" || Array.isArray(__df.ku)) __df.ku = {};
          const __ku: any = __df.ku;
          const __rr = String(__ku.routeReason || (x as any)?.routeReason || "").trim();
          const __rc = String(__ku.routeClass || "").trim();

          if (!__rc) {
            let __fallback: string | null = null;

            if (__rr.startsWith("DEF_") || __rr === "SOUL_FASTPATH_VERIFIED_V1" || __rr === "KATAKAMUNA_FASTPATH_CANON_V1") {
              __fallback = "define";
            } else if (__rr === "EXPLICIT_CHAR_PREEMPT_V1") {
              __fallback = "analysis";
            } else if (__rr.startsWith("SUPPORT_")) {
              __fallback = "support";
            } else if (__rr.includes("SELFAWARE")) {
              __fallback = "selfaware";
            } else if (__rr.includes("JUDGEMENT")) {
              __fallback = "judgement";
            } else if (__rr.includes("CONTINUITY") || __rr.includes("FOLLOWUP")) {
              __fallback = "continuity";
            }

            if (__fallback) __ku.routeClass = __fallback;
          }
        }
      } catch {}


    // CARD_SYNAPSE_TOP_UNIFICATION_V1:
    // 最終出口で synapseTop 契約を最小復元する
    try {
      const __dfS: any = (x as any)?.decisionFrame;
      if (__dfS && typeof __dfS === "object") {
        if (!__dfS.ku || typeof __dfS.ku !== "object" || Array.isArray(__dfS.ku)) __dfS.ku = {};
        const __kuS: any = __dfS.ku;

        if (!__kuS.synapseTop || typeof __kuS.synapseTop !== "object" || Array.isArray(__kuS.synapseTop)) {
          __kuS.synapseTop = {};
        }
        const __synS: any = __kuS.synapseTop;

        const __tidS = String((x as any)?.threadId || "").trim();
        const __rrS = String(__kuS.routeReason || (x as any)?.routeReason || "").trim();
        const __rcS = String(__kuS.routeClass || "").trim();
        const __scriptureKeyS = String(__kuS.scriptureKey || "").trim();
        const __centerKeyS = String(
          __kuS.centerKey ||
          __kuS.centerMeaning ||
          __kuS.threadCenterKey ||
          __kuS.thoughtCoreSummary?.centerKey ||
          ""
        ).trim();
        const __centerLabelS = String(
          __kuS.centerLabel ||
          __kuS.threadCenterLabel ||
          __kuS.thoughtCoreSummary?.centerMeaning ||
          __centerKeyS ||
          ""
        ).trim();

        const __threadCenterExisting = __synS.sourceThreadCenter || null;
        const __threadCenterTypeS =
          (__threadCenterExisting && String(__threadCenterExisting.centerType || "").trim()) ||
          (__scriptureKeyS || __rrS === "TENMON_SCRIPTURE_CANON_V1" ? "scripture" : (__centerKeyS ? "concept" : ""));

        if (!String(__synS.sourceRouteReason || "").trim() && __rrS) {
          __synS.sourceRouteReason = __rrS;
        }

        if (!String(__synS.sourceRouteClass || "").trim() && __rcS) {
          __synS.sourceRouteClass = __rcS;
        }

        if (!String(__synS.sourceCenterLabel || "").trim() && __centerLabelS) {
          __synS.sourceCenterLabel = __centerLabelS;
        }

        if (!String(__synS.sourceScriptureKey || "").trim() && __scriptureKeyS) {
          __synS.sourceScriptureKey = __scriptureKeyS;
        }

        if (!__synS.sourceThreadCenter && __threadCenterTypeS && __centerKeyS) {
          __synS.sourceThreadCenter = {
            centerType: __threadCenterTypeS,
            centerKey: __centerKeyS,
            sourceRouteReason: __rrS || null,
          };
        }

        if (!String(__synS.sourceMemoryHint || "").trim() && __tidS && __centerKeyS) {
          __synS.sourceMemoryHint = `thread:${__tidS} centerKey:${__centerKeyS}`;
        }

        if (!__synS.sourceThoughtCore && __kuS.thoughtCoreSummary && typeof __kuS.thoughtCoreSummary === "object") {
          __synS.sourceThoughtCore = __kuS.thoughtCoreSummary;
        }

        if (!__synS.sourceHeart && __kuS.heart && typeof __kuS.heart === "object") {
          __synS.sourceHeart = __kuS.heart;
        }

        if (!__synS.sourceKanagiSelf && __kuS.kanagiSelf && typeof __kuS.kanagiSelf === "object") {
          __synS.sourceKanagiSelf = __kuS.kanagiSelf;
        }

        if (!__synS.sourceIntention && __kuS.intention && typeof __kuS.intention === "object") {
          __synS.sourceIntention = __kuS.intention;
        }

        if (!String(__synS.sourceLedgerHint || "").trim()) {
          __synS.sourceLedgerHint =
            __rrS === "TENMON_SCRIPTURE_CANON_V1"
              ? "ledger:scripture_continuity"
              : (__rcS === "define"
                  ? "ledger:define"
                  : (__rcS === "continuity"
                      ? "ledger:continuity"
                      : "ledger:general"));
        }
      }
    } catch {}

    // CARD_FINALIZE_SINGLE_EXIT_V1:
    // 単一出口で routeClass / answer contract を最小フォールバック復元
    try {
      const __dfF: any = (x as any)?.decisionFrame;
      if (__dfF && typeof __dfF === "object") {
        if (!__dfF.ku || typeof __dfF.ku !== "object" || Array.isArray(__dfF.ku)) __dfF.ku = {};
        const __kuF: any = __dfF.ku;

        const __rrF = String(__kuF.routeReason || (x as any)?.routeReason || "").trim();
        const __rcF = String(__kuF.routeClass || "").trim();
        const __lenF = String(__kuF.answerLength || "").trim();
        const __modeF = String(__kuF.answerMode || "").trim();
        const __frameF = String(__kuF.answerFrame || "").trim();

        if (!__rcF) {
          let __rcResolved: string | null = null;

          if (__rrF === "CONTINUITY_ANCHOR_V1" || /FOLLOWUP/.test(__rrF)) {
            __rcResolved = "continuity";
          } else if (
            __rrF.startsWith("DEF_") ||
            __rrF === "SOUL_FASTPATH_VERIFIED_V1" ||
            __rrF === "KATAKAMUNA_FASTPATH_CANON_V1"
          ) {
            __rcResolved = "define";
          } else if (
            __rrF === "EXPLICIT_CHAR_PREEMPT_V1" ||
            __rrF === "R22_FUTURE_OUTLOOK_V1" ||
            __rrF === "R22_ESSENCE_ASK_V1" ||
            __rrF === "R22_COMPARE_ASK_V1" ||
            __rrF === "WORLDVIEW_ROUTE_V1"
          ) {
            __rcResolved = "analysis";
          } else if (__rrF.startsWith("SUPPORT_")) {
            __rcResolved = "support";
          } else if (__rrF.includes("SELFAWARE")) {
            __rcResolved = "selfaware";
          } else if (__rrF.includes("JUDGEMENT")) {
            __rcResolved = "judgement";
          }

          if (__rcResolved) __kuF.routeClass = __rcResolved;
        }

        if (!__lenF || !__modeF || !__frameF) {
          let __fallbackLen: string | null = null;
          let __fallbackMode: string | null = null;
          let __fallbackFrame: string | null = null;

          if (__rrF === "EXPLICIT_CHAR_PREEMPT_V1") {
            __fallbackLen = "long";
            __fallbackMode = "analysis";
            __fallbackFrame = "one_step";
          } else if (
            __rrF === "R22_FUTURE_OUTLOOK_V1" ||
            __rrF === "R22_ESSENCE_ASK_V1" ||
            __rrF === "R22_COMPARE_ASK_V1" ||
            __rrF === "WORLDVIEW_ROUTE_V1" ||
            __rrF === "CONTINUITY_ANCHOR_V1" ||
            /FOLLOWUP/.test(__rrF)
          ) {
            __fallbackLen = "short";
            __fallbackMode = "analysis";
            __fallbackFrame = "one_step";
          } else if (
            __rrF.startsWith("DEF_") ||
            __rrF === "SOUL_FASTPATH_VERIFIED_V1" ||
            __rrF === "KATAKAMUNA_FASTPATH_CANON_V1"
          ) {
            __fallbackLen = "medium";
            __fallbackMode = "define";
            __fallbackFrame = "statement_plus_one_question";
          }

          if (!String(__kuF.answerLength || "").trim() && __fallbackLen) __kuF.answerLength = __fallbackLen;
          if (!String(__kuF.answerMode || "").trim() && __fallbackMode) __kuF.answerMode = __fallbackMode;
          if (!String(__kuF.answerFrame || "").trim() && __fallbackFrame) __kuF.answerFrame = __fallbackFrame;
        }
      }
    } catch {}
// CARD_DEFINE_BINDER_EXIT_FALLBACK_V2:
// define 単一路を含む single exit で binderSummary/sourcePack 欠損時のみ補完
try {
  const __dfB: any = (x as any)?.decisionFrame;
  if (__dfB && typeof __dfB === "object") {
    if (!__dfB.ku || typeof __dfB.ku !== "object" || Array.isArray(__dfB.ku)) __dfB.ku = {};
    const __kuB: any = __dfB.ku;

    const __rrB0 = String(__kuB.routeReason || (x as any)?.routeReason || "").trim();
    const __tidB0 = String((x as any)?.threadId || "").trim();
    const __rawB0 =
      String((x as any)?.rawMessage || "") ||
      String((x as any)?.message || "") ||
      String(__kuB.inputText || "") ||
      "";

    /** TENMON_UNCERTAINTY_AND_CONFIDENCE_SURFACE_LOGIC_V5: 本線 binder 失敗時でも ku に confidence が載らない取りこぼしを出口で補う */
    const __confidenceSurfaceMissing =
      String(__rawB0 || "").trim().length > 0 &&
      !/^SUPPORT_/u.test(__rrB0) &&
      !/^FOUNDER_/u.test(__rrB0) &&
      !/^DEF_FASTPATH_VERIFIED_V1$/u.test(__rrB0) &&
      !/^DEF_FASTPATH_PROPOSED_V1$/u.test(__rrB0) &&
      !/^DEF_DICT_HIT$/u.test(__rrB0) &&
      !String(__kuB.confidenceDisplayV1?.surfacePrefix ?? "").trim();

    const __needBinder =
      __kuB.binderSummary == null ||
      __kuB.sourcePack == null ||
      String(__kuB.sourcePack || "").trim() === "" ||
      __confidenceSurfaceMissing;

    if (__needBinder) {
      const __rrB = __rrB0;
      const __tidB = __tidB0;
      const __rawB = __rawB0;

      const __centerKeyB = String(
        __kuB.centerKey ||
        __kuB.centerMeaning ||
        __kuB.threadCenterKey ||
        __kuB.synapseTop?.sourceThreadCenter?.centerKey ||
        ""
      ).trim();

      const __centerLabelB = String(
        __kuB.centerLabel ||
        __kuB.threadCenterLabel ||
        __kuB.synapseTop?.sourceCenterLabel ||
        __centerKeyB ||
        ""
      ).trim();

      const __threadCenterB =
        __kuB.synapseTop?.sourceThreadCenter && typeof __kuB.synapseTop.sourceThreadCenter === "object"
          ? {
              center_type: String(__kuB.synapseTop.sourceThreadCenter.centerType || "concept"),
              center_key: String(__kuB.synapseTop.sourceThreadCenter.centerKey || "").trim() || null,
            }
          : (__centerKeyB
              ? {
                  center_type: (__kuB.scriptureKey || __rrB === "TENMON_SCRIPTURE_CANON_V1") ? "scripture" : "concept",
                  center_key: __centerKeyB,
                }
              : null);

      const __threadCoreB =
        (__centerKeyB || __centerLabelB || __kuB.lastAnswerLength || __kuB.answerLength)
          ? {
              threadId: __tidB,
              centerKey: __centerKeyB || null,
              centerLabel: __centerLabelB || null,
              activeEntities: __centerLabelB ? [__centerLabelB] : [],
              openLoops: Array.isArray(__kuB.threadOpenLoops) ? __kuB.threadOpenLoops : [],
              commitments: Array.isArray(__kuB.threadCommitments) ? __kuB.threadCommitments : [],
              lastResponseContract: {
                answerLength: __kuB.lastAnswerLength || __kuB.answerLength || null,
                answerMode: __kuB.lastAnswerMode || __kuB.answerMode || null,
                answerFrame: __kuB.lastAnswerFrame || __kuB.answerFrame || null,
                routeReason: __rrB || null,
              },
              updatedAt: String((x as any)?.timestamp || new Date().toISOString()),
            }
          : null;

      const __binderB = buildKnowledgeBinder({
        routeReason: __rrB,
        message: __rawB,
        threadId: __tidB,
        ku: __kuB,
        threadCore: __threadCoreB as any,
        threadCenter: __threadCenterB as any,
      });
      applyKnowledgeBinderToKu(__kuB, __binderB);

      try {
        console.log("[BINDER_EXIT_APPLY]", {
          rr: __rrB,
          rc: __kuB.routeClass || null,
          sourcePack: __kuB.sourcePack || null,
          centerKey: __kuB.centerKey || null,
        });
      } catch {}
    }
  }
} catch {}


try {
  const __dfOut: any = (x as any)?.decisionFrame || null;
  const __kuOut: any = __dfOut && typeof __dfOut.ku === "object" && !Array.isArray(__dfOut.ku) ? __dfOut.ku : null;
  console.log("[RESPONSEPLAN_TRACE:GATE_OUT]", {
    hasDecisionFrame: Boolean(__dfOut),
    hasKu: Boolean(__kuOut),
    kuKeys: __kuOut ? Object.keys(__kuOut) : null,
    hasResponsePlan: Boolean(__kuOut?.responsePlan),
    responsePlanRoute: __kuOut?.responsePlan?.routeReason ?? null,
    responsePlanMode: __kuOut?.responsePlan?.mode ?? null,
    responsePlanKind: __kuOut?.responsePlan?.responseKind ?? null,
    rr: __kuOut?.routeReason ?? null,
  });
} catch {}

// FINAL_SURFACE_SINGLE_SOURCE_LOCK_V1
try {
  const __dfOut: any = (x as any)?.decisionFrame || null;
  const __kuOut: any =
    __dfOut && __dfOut.ku && typeof __dfOut.ku === "object" && !Array.isArray(__dfOut.ku)
      ? __dfOut.ku
      : null;
  const __rr = String(__kuOut?.routeReason || "");
  const __rpBody = String(__kuOut?.responsePlan?.semanticBody || "").trim();

  const __singleSourceRoutes = new Set([
    "SYSTEM_DIAGNOSIS_PREEMPT_V1",
    "R22_COMPARE_ASK_V1",
    "BOOK_PLACEHOLDER_V1",
    "ABSTRACT_FRAME_VARIATION_V1",
    "TENMON_KOTODAMA_HISYO_FRONT_V1",
    "R22_JUDGEMENT_PREEMPT_V1",
    "R22_ESSENCE_ASK_V1",
  ]);

  if (__singleSourceRoutes.has(__rr) && __rpBody) {
    (x as any).response = __surfaceDetoneResponseV1(__rpBody);
  }
} catch {}

try {
  const __dfTrace: any = (x as any)?.decisionFrame || null;
  const __kuTrace: any =
    __dfTrace && __dfTrace.ku && typeof __dfTrace.ku === "object" && !Array.isArray(__dfTrace.ku)
      ? __dfTrace.ku
      : null;

  const __rr = String(__kuTrace?.routeReason || "");
  const __rpBody = String(__kuTrace?.responsePlan?.semanticBody || "").trim();
  const __resp = String((x as any)?.response || "").trim();

  const __singleSourceRoutes = new Set([
    "SYSTEM_DIAGNOSIS_PREEMPT_V1",
    "R22_COMPARE_ASK_V1",
    "BOOK_PLACEHOLDER_V1",
    "ABSTRACT_FRAME_VARIATION_V1",
    "TENMON_KOTODAMA_HISYO_FRONT_V1",
    "R22_JUDGEMENT_PREEMPT_V1",
    "R22_ESSENCE_ASK_V1",
  ]);

  if (__singleSourceRoutes.has(__rr)) {
    console.log("[SURFACE_SINGLE_SOURCE_LOCK_V1]", {
      routeReason: __rr,
      hasResponsePlan: Boolean(__kuTrace?.responsePlan),
      responseHead: __resp.slice(0, 160),
      responsePlanHead: __rpBody.slice(0, 160),
      same: __resp === __surfaceDetoneResponseV1(__rpBody),
    });
  }
} catch {}

/** NOTE: responsePlan.semanticBody での無条件上書きは削除（CONTINUITY_ROUTE_HOLD_V1 等で binder 短文が本文を潰すため）。
 * 単一ソース化は上の __singleSourceRoutes ブロックのみで行う。 */

// TENMON_CONVERSATION_BACKEND_SURFACE_EXIT_V1: 内部構造漏れ除去＋表層最低字数（サブ概念・事実一行・RELEASE は除外）
try {
  if (typeof (x as any)?.response === "string") {
    const __dfPolish: any = (x as any)?.decisionFrame;
    const __kuPolish: any =
      __dfPolish?.ku && typeof __dfPolish.ku === "object" ? __dfPolish.ku : null;
    const __rrPolish = String(__kuPolish?.routeReason || (x as any)?.routeReason || "");
    (x as any).response = polishTenmonChatResponseSurfaceExitV1(
      String((x as any).response || ""),
      __rrPolish,
    );
  }
} catch {}

  // TENMON_UNCERTAINTY_AND_CONFIDENCE_SURFACE_LOGIC_V5: polish 後に ku.confidenceDisplayV1 を本文へ冪等付与（二重付与のみ抑止）
  try {
    const __dfUnc: any = (x as any)?.decisionFrame;
    const __kuUnc: any =
      __dfUnc?.ku && typeof __dfUnc.ku === "object" && !Array.isArray(__dfUnc.ku) ? __dfUnc.ku : null;
    const __cdUnc = __kuUnc?.confidenceDisplayV1;
    const __pfx = String(__cdUnc?.surfacePrefix ?? "").trim();
    if (__pfx && typeof (x as any).response === "string") {
      const __rs0 = String((x as any).response || "");
      if (!__rs0.includes(__pfx)) {
        (x as any).response = applyUncertaintySurfacePrefixIfAnyV1(__rs0, __cdUnc);
      }
    }
  } catch {
    /* fail-closed */
  }

return __thinReleasePayloadV2(x);
  } catch { return __thinReleasePayloadV2(x); }

    try {
      if (typeof (x as any).response === "string") {
        (x as any).response = __stripInternalContinuityLeadV1(String((x as any).response || ""));
      }
    } catch {}

}
// --- /C21G1C: GENERAL_GATE_SOFT_V1 ---

// CARD_C21G1C_GENERAL_GATE_SOFT_V1
// CARD_C21B3_FIX_NEED_CONTEXT_CLAMP_V3\n// CARD_C21G2_GENERAL_GATE_PATTERNS_V2\n
// CARD_H1_HEART_MODEL_MOCK_V1
// CARD_H1B_HEART_OBSERVE_V2
// FIX_H1Bv2_IMPORT_EXT_V1

// --- H1C: lastHeart bridge (process-local) ---
let __tenmonLastHeart: any = null;
// --- /H1C: lastHeart bridge ---
// CARD_H1C_ATTACH_HEART_TO_DECISIONFRAME_V1

// --- H2: BUDDHA_SYNAPSE_SAFE_V2 ---
function __tenmonCompassionPrefixV2(heart: any): string {
  const st = String(heart?.state || "neutral");
  if (st === "exhausted" || st === "tired") return "疲れが強い状態です。";
  if (st === "confused" || st === "anxious") return "迷いが強い状態です。";
  if (st === "angry") return "怒りが強い状態です。";
  if (st === "sad" || st === "depressed") return "痛みが強い状態です。";
  return "";
}
function __tenmonCompassionWrapV2(out: string, heart: any): string {
  let t = String(out || "").replace(/\r/g, "").trim();
  if (!t) return t;
  if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;
  const body = t.replace(/^【天聞の所見】\s*/, "");
  const pref = __tenmonCompassionPrefixV2(heart);
  if (!pref) return "【天聞の所見】" + body;
  return "【天聞の所見】" + pref + body;
}
// --- /H2 ---

// CARD_H2_BUDDHA_SYNAPSE_SAFE_V2

// --- H2B1: SUPPORT_INTERNAL_STRIP_V1（応答本文に lawKey / ledger 等が混ざった場合のみ除去・長さは維持） ---
function __tenmonSupportUserFacingPolishV1(out: string): string {
  let t = String(out || "").replace(/\r/g, "").trim();
  if (!t) return t;
  t = t.replace(/^\s*中心命題\s*[:：]\s*[^\n]+\n?/gimu, "");
  t = t.replace(/^\s*root_reasoning\s*[:：]\s*[^\n]+\n?/gimu, "");
  t = t.replace(/^\s*次軸\s*[:：]\s*[^\n]+\n?/gu, "");
  t = t.replace(/^\s*次観測\s*[:：]\s*[^\n]+\n?/gu, "");
  t = t.replace(/KHSL:LAW:[A-Za-z0-9_:._-]+/g, "");
  t = t.replace(/\bOP_DEFINE\b/g, "");
  t = t.replace(/lawKey\s*[:=]\s*["'][^"']+["']/gi, "");
  t = t.replace(/unitId\s*[:=]\s*["'][^"']*["']/gi, "");
  t = t.replace(/sourceMemoryHint\s*[:=]\s*[^\n]+/gi, "");
  t = t.replace(/ledger:(?:scripture_continuity|define|general|continuity)/gi, "");
  t = t.replace(/thread:\S+\s+centerKey:\S+/gi, "");
  return t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// --- H2B: SUPPORT_SANITIZE_V1 ---
function __tenmonSupportSanitizeV1(out: string): string {
  let t = String(out || "").replace(/\r/g, "").trim();
  if (!t) return t;

  if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;

  // remove hedges (ΔZ) — keep meaning, reduce fluff
  t = t.replace(/かもしれません/g, "")
       .replace(/おそらく/g, "")
       .replace(/多分/g, "")
       .trim();

  // remove soft-imperatives / offers (avoid coercion)
  t = t.replace(/してみませんか/g, "ですか")
       .replace(/しませんか/g, "ですか")
       .replace(/してみてください/g, "")
       .replace(/してください/g, "")
       .replace(/しましょう/g, "")
       .replace(/どうでしょう/g, "")
       .trim();

  // cap length (no forced question, no strange suffix)
  if (t.length > 220) t = t.slice(0, 220).replace(/[。、\s　]+$/g, "").trim();

  // DO NOT force question mark here (allow "言い切り" / 間)
  return t;
}
// --- /H2B ---
// CARD_H2B_BUDDHA_SYNAPSE_STABILIZE_V1
// CARD_H2C_SUPPORT_DEIMPERATIVE_V1
// CARD_E0A_FAST_CHAT_FOR_ACCEPTANCE_V1
// CARD_E0A2_FASTPATH_MATCH_SMOKE_V1
// CARD_E0A3_FASTPATH_END_WITH_1Q_V1
// CARD_E0A4_FASTPATH_EXACT_SMOKE_FALLBACK_V1
// CARD_E0A6_FASTPATH_SHAPE_MATCH_V1
// CARD_E0A7_EXCLUDE_SMOKE_FROM_FASTPATH_V1
// CARD_E0A8_EXCLUDE_SMOKE_FROM_ISTESTTID0_V1
// CARD_E0A9_SMOKE_PING_FORCE_FALLBACK_V1
// CARD_E0A9B_REMOVE_UNKNOWN_FIELDS_V1
// CARD_E0A9C_SMOKE_PING_CONTRACT_V1
// CARD_P31_KAMIYO_SYNAPSE_GEN_SYSTEM_V1
// CARD_E0A10B_SMOKE_PASSPHRASE_VIA_CONVERSATION_LOG_V1
// CARD_P32_RELAX_GENERAL_GATE_V2
// CARD_P33_3_CONNECTOME_HISTORY_V1
// CARD_P33_2_DEF_UNBLOCK_V1
// CARD_B1_IMMUNE_H2B_RELAX_V1
// CARD_B2_BRAIN_RELAX_KANAGI_Q_V1
// CARD_B3_BRAIN_RELAX_KANAGI_CONFIRMQ_V1
// CARD_B4_BRAIN_KANAGI_Q_ZERO_V1
// CARD_B6_BRAIN_REMOVE_KANAGI_MUST_Q_V1

export { __tenmonGeneralGateResultMaybe, __tenmonGeneralGateSoft, __tenmonCompassionWrapV2, __tenmonSupportSanitizeV1 };
export function setTenmonLastHeart(x:any){ __tenmonLastHeart = x; }
