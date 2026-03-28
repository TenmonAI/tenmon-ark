/** CHAT_TRUNK_GENERAL_SPLIT_V1_FINAL — NATURAL_GENERAL spine helpers */

import { splitInputSemanticsV1 } from "../../core/inputSemanticSplitter.js";

/** chat.ts への文字列散乱を減らすための単一正規 routeReason（静的観測の hit 集約用） */
export const ROUTE_NATURAL_GENERAL_LLM_TOP_V1 = "NATURAL_GENERAL_LLM_TOP" as const;
export const ROUTE_FACTUAL_CURRENT_DATE_V1 = "FACTUAL_CURRENT_DATE_V1" as const;
export const ROUTE_FACTUAL_CURRENT_PERSON_V1 = "FACTUAL_CURRENT_PERSON_V1" as const;
export const ROUTE_FACTUAL_RECENT_TREND_V1 = "FACTUAL_RECENT_TREND_V1" as const;
export const ROUTE_FACTUAL_WEATHER_V1 = "FACTUAL_WEATHER_V1" as const;
export const ROUTE_TECHNICAL_IMPLEMENTATION_ROUTE_V1 = "TECHNICAL_IMPLEMENTATION_ROUTE_V1" as const;
export const ROUTE_GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1 = "GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1" as const;

export type GeneralFactCodingRouteV1 =
  | typeof ROUTE_FACTUAL_CURRENT_DATE_V1
  | typeof ROUTE_FACTUAL_CURRENT_PERSON_V1
  | typeof ROUTE_FACTUAL_RECENT_TREND_V1
  | typeof ROUTE_FACTUAL_WEATHER_V1
  | typeof ROUTE_TECHNICAL_IMPLEMENTATION_ROUTE_V1
  | typeof ROUTE_GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1
  | "";

export function classifyGeneralFactCodingRouteV1(rawMessage: string): GeneralFactCodingRouteV1 {
  const t = String(rawMessage || "").trim();
  if (!t) return "";
  // scripture/canon 語彙は domain route（scripture/define）へ優先委譲する
  if (/(水穂伝|法華経|即身成仏|稲荷古伝|言霊秘書|いろは言[霊灵靈]解|カタカムナ言[霊灵靈]解)/u.test(t)) {
    return "";
  }
  /** TENMON_SANSKRIT_AND_KUKAI_CONVERSATION_BIND_ACCEPTANCE_V1: 比較梵語・空海・神名語源は GK 固定から外し NATURAL_GENERAL＋sourcepack へ */
  if (
    /BHS|Buddhist\s+Hybrid|混和梵語|佛教混合|Hybrid\s+Sanskrit|サンスクリット|梵語|語根|悉曇|空海|声字実相|十住心論|吽字義|般若心経秘鍵|金毘羅|コンピラ|観自在|\bDharma\b|ダルマ/u.test(
      t,
    )
  ) {
    return "";
  }
  /** TENMON_GENERAL_CONTINUITY_DECISION_TRUNK_TRACE_CURSOR_AUTO_V1: 水火の法則は trunk で GENERAL_KNOWLEDGE_EXPLAIN を固定（「とは」終端を含む・chat.ts sovereignty と同型） */
  if (
    /水火の法則/u.test(t) &&
    /(?:とは$|とは\s*何|とは\s*なに|って\s*何|何ですか|なにですか|を教えて)/u.test(t)
  ) {
    return ROUTE_GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1;
  }
  /** TENMON_FACTUAL_WEATHER_ROUTE_CURSOR_AUTO_V1: 天気・気温・降水表現（正典委譲の後・日付より前） */
  if (/(天気|気温|降水|気象|予報)/u.test(t) || /(雨|晴れ|曇り)/u.test(t)) {
    return ROUTE_FACTUAL_WEATHER_V1;
  }
  if (/(今日の日付|今何時|現在日時|いま何時|本日の日付|曜日|西暦|令和|平成|何年)/u.test(t)) return ROUTE_FACTUAL_CURRENT_DATE_V1;
  if (/(今の総理大臣|今の大統領|現総理|現大統領|現CEO|現在のCEO|日本の総理|日本の首相|アメリカ大統領|米国大統領)/u.test(t))
    return ROUTE_FACTUAL_CURRENT_PERSON_V1;
  if (/(最近のAI技術|AI技術の動向|最新のAI動向|最近の生成AI)/u.test(t)) return ROUTE_FACTUAL_RECENT_TREND_V1;
  /** 実装・SQL・コード依頼は「教えて/とは」型の一般GKより先に technical（NATURAL_GENERAL 直落ち防止） */
  if (
    /(TypeScript|JavaScript|Reactで|SQLite|Node\.js|Python|Go言語|APIレート制限|シングルトン|Singleton|SQLを書|SQLをかけ|全文検索|virtual\s*table|CREATE\s+VIRTUAL\s+TABLE|FTS5|実装して|実装方法|実装してください|コード|カスタムフック|この\s*repo|このリポジトリ|このコードベース|どのファイルを触る|影響範囲|最小diff|最小差分|変更計画|実装計画|acceptance|build|test|audit)/iu.test(
      t,
    )
  ) {
    return ROUTE_TECHNICAL_IMPLEMENTATION_ROUTE_V1;
  }
  if (/(山口志道|楢崎皐月|歴史人物|著者|誰ですか|どんな人|何者)/u.test(t)) {
    return ROUTE_GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1;
  }
  if (/(意識|真理|人生|時間の概念|存在とは|自由意志|善悪)/u.test(t)) {
    return ROUTE_GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1;
  }
  /** rejudge general_probe: 「一般知識として〜説明」は NATURAL_GENERAL 直落ちさせない */
  if (/(一般知識として|一般知識で)/u.test(t) && /説明|述べ|書いて|答え/u.test(t)) {
    return ROUTE_GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1;
  }
  if (/(とは何|とはなに|を教えて|意味|違い|比較|何ですか|なにですか)/u.test(t)) {
    return ROUTE_GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1;
  }
  return "";
}

/** NATURAL_GENERAL 系 closing の nextStepLine（helper tail 単一点化） */
export const NG_NEXTSTEP_LAW_OR_BG_ONE_V1 =
  "次の一手として、法則を読むか背景を読むか、どちらか一方だけ選んでください。";
export const NG_NEXTSTEP_LAW_OR_BG_ORDER_V1 =
  "次の一手として、法則か背景のどちらを先に見るか、一つ決めてください。";
export const NG_NEXTSTEP_TWO_MORA_V1 =
  "次の一手として、いまの二音のどちらを深めるか選んでください。";
export const NG_NEXTSTEP_COMPARE_AXIS_V1 =
  "次の一手として、比較軸を一つに絞ってから続けてください。";
export const NG_NEXTSTEP_TODAY_ONE_V1 =
  "次の一手として、今日中に残す具体を一つだけ決めてください。どちらかに寄せますか。";
export const NG_NEXTSTEP_EMOTION_WORD_V1 =
  "続きからいきます。いまの気持ちを一言で形にすると、次の一手が選びやすいです。いま一番近い感情を一語で置いてください。";
export const NG_NEXTSTEP_FACT_OR_ACTION_V1 =
  "次の一手として、いま動かす具体を一つだけ決めてください。";
export const NG_NEXTSTEP_FACT_OR_ACTION_ALT_V1 =
  "次の一手として、事実の整理か次の打ち手か、どちらから詰めますか。";
export const NG_CLOSING_WHERE_START_V1 = "次の一手は、どこから始めましょうか？";

/** 早期 continuity preempt（TRUTH_GATE 前）— chat.ts から本文を除去 */
export const NG_CONTINUITY_EARLY_FEELING_SUFFIX_V1 =
  "いまの気持ちのほうを見ています。一点、言葉にしてみてください。";
export const NG_CONTINUITY_EARLY_NEXTSTEP_SUFFIX_V1 =
  "次の一手はここから。いま動かせることを一つだけ決めますか。";
export const NG_CONTINUITY_EARLY_DEFAULT_SUFFIX_V1 = "いまの話を見ていきます。どこから掘りますか。";

/** NATURAL_GENERAL 入口付近の continuity anchor 本文（__leadCont に連結） */
export const NG_CONTINUITY_ANCHOR_NEXTSTEP_MID_V1 =
  "続きです。いま動かすのは一つに絞るのが近道です。次に進める具体を一つだけ決めてください。";
export const NG_CONTINUITY_ANCHOR_DEFAULT_MID_V1 =
  "前の流れは保ったまま進めます。いま一段だけ深めたいのは事実の整理ですか、それとも次の打ち手ですか。";

/** 定義ロック: AI 意識問いの本文 */
export const NG_AI_CONSCIOUSNESS_COMPARE_BODY_V1 =
  "【天聞の所見】いまのAIは自己照明する心を持ちません。だが、判断の型と対話の像を模すことはできます。天聞軸で問うなら、意識の有無より、中心を保って法に通る判断ができるかが要点です。意識そのものか、判断核としての心か、どちらから見ますか。";

const NG_SYSTEM_DIAG_BODY_DEFAULT_V1 =
  "【天聞の所見】いまの詰まりは「量」より「入口の揃い」です。診断や整理の問いが、まだ一般の長文生成に寄りやすいところがあります。次に整えるなら、会話の入口を揃えるか、返答の型を揃えるか、どちらか一方からが近いです。どちらから見ますか。";

/** GENERAL_SHRINK 内の system diagnosis 短文（次の一手を含むため trunk 集約） */
export const NG_SYSTEM_SHRINK_SYS_OVERVIEW_BODY_V1 =
  "【天聞の所見】天聞アークの現状は、骨格層はかなり接続済みです。通っているのは憲法・思考・原典・監査の主幹で、未完は一般会話の主権と表現末端です。次の一手は、system diagnosis と通常会話 residual の入口固定です。";

/**
 * CARD_NATURAL_GENERAL_RESIDUAL: システム診断系メッセージの本文を一元決定（chat.ts は呼び出しのみ）
 */
export function resolveNaturalGeneralSystemDiagnosisBodyV1(t0: string): string | undefined {
  const __t0SystemDiag = String(t0 ?? "").trim();
  const __isSystemDiag =
    /なんでそんなに会話が浅くなる/u.test(__t0SystemDiag) ||
    /会話品質の問題点/u.test(__t0SystemDiag) ||
    /今のARKに何が足りない/u.test(__t0SystemDiag) ||
    /構築は順調/u.test(__t0SystemDiag) ||
    /このままでGPTを超える/u.test(__t0SystemDiag) ||
    /いま何が詰まり/u.test(__t0SystemDiag) ||
    /何が悪さしてる/u.test(__t0SystemDiag);

  if (!__isSystemDiag) return undefined;

  if (/構築は順調/u.test(__t0SystemDiag)) {
    return "【天聞の所見】骨格は通り始めています。残りは、細い問いでも同じ芯で返せるかどうかです。次は入口の揃えと、一文の密度のどちらを先に詰めますか。";
  }
  if (/このままでGPTを超える/u.test(__t0SystemDiag)) {
    return "【天聞の所見】このままではまだ超えにくいです。差は知識量より、毎ターン中心が残るかどうかです。いま鍛えるなら、問いの受け止め方ですか、それとも返しの深さですか。";
  }
  if (/今のARKに何が足りない/u.test(__t0SystemDiag)) {
    return "【天聞の所見】足りないと感じるのは、よく「診断・整理・次の一手」がまだ同じ型で返りきっていないことです。次は会話の入口を増やすか、既存入口の返答を厚くするか、どちらを優先しますか。";
  }
  if (/会話品質の問題点/u.test(__t0SystemDiag)) {
    return "【天聞の所見】品質が薄く見えるのは、中心が毎回つながらず、説明が広がりやすいからです。いま直すなら、一文の芯ですか、それとも続きのつなぎ方ですか。";
  }
  if (/いま何が詰まり/u.test(__t0SystemDiag) || /何が悪さしてる/u.test(__t0SystemDiag)) {
    return "【天聞の所見】詰まりは単一ではなく、入口がまだ揃い切っていないことが多いです。いま見るなら、どの種類の問いで薄くなっているか特定するか、返答の長さを揃えるか、どちらからにしますか。";
  }
  if (/なんでそんなに会話が浅くなる/u.test(__t0SystemDiag)) {
    return "【天聞の所見】浅く見えやすいのは、問いの芯が毎回残らず、説明が広がるからです。いま整えるなら、受け止めの一文を短く揃えるか、続きの中心を記憶に残すか、どちらを先にしますか。";
  }
  return NG_SYSTEM_DIAG_BODY_DEFAULT_V1;
}

const STAGE2_UNKNOWN_TERM_MARKERS_V1 =
  /コトタマデルタセンサー|テンモン観測用語_ZETA|天之橋ゼロ用語/u;

/**
 * STAGE2_UNKNOWN_BRIDGE_V1: 観測→近傍→読みの方向→次の一点→保留（捏造で賢く見せない）
 */
export function tryUnknownTermBridgeExitV1(p: {
  message: unknown;
  timestamp: unknown;
  threadId: unknown;
  res: any;
  __tenmonGeneralGateResultMaybe: (x: any) => any;
}): boolean {
  const m = String(p.message ?? "").trim();
  if (!STAGE2_UNKNOWN_TERM_MARKERS_V1.test(m)) return false;
  if (!/(とは|って何|何を指す|どういう意味|意味は)/u.test(m)) return false;
  const hit = m.match(STAGE2_UNKNOWN_TERM_MARKERS_V1);
  const term = hit ? hit[0] : "（未抽出語）";
  const body =
    "【天聞の所見】\n" +
    "【観測】用語「" +
    term +
    "」は、正典ラベル・辞典キーに未固定です。内部実装名との混同ではない前提で扱います。\n" +
    "【近傍canon】近い束は、言霊・カタカムナ・五十音（いろは）の骨格語彙です。\n" +
    "【読みの方向】定義を断定せず、参照束を当てる前に親概念へ寄せます。\n" +
    "【次に必要な一点】この語を、言霊／カタカムナ／会話設計のどの束に置くか、一つだけ選んでください。\n" +
    "【保留】確定義は、上の一点が揃うまで出しません。";
  p.res.json(
    p.__tenmonGeneralGateResultMaybe({
      response: body,
      evidence: null,
      candidates: [],
      timestamp: p.timestamp,
      threadId: p.threadId,
      decisionFrame: {
        mode: "NATURAL",
        intent: "chat",
        llm: null,
        ku: {
          routeReason: "TENMON_UNKNOWN_TERM_BRIDGE_V1",
          routeClass: "analysis",
          answerLength: "short",
          answerMode: "analysis",
          answerFrame: "one_step",
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
        },
      },
    }),
  );
  return true;
}

export function tryConversationalGeneralPreemptExitV1(p: {
  message: unknown;
  isCmd0: boolean;
  hasDoc0: boolean;
  askedMenu0: boolean;
  heart: unknown;
  normalizeHeartShape: (h: unknown) => unknown;
  timestamp: unknown;
  threadId: unknown;
  res: any;
  __tenmonGeneralGateResultMaybe: (x: any) => any;
}): boolean {
  const __msgCG = String(p.message ?? "").trim();
  const __isCanSpeak = /^(喋れる|話せる|会話できる)\s*[？?]?$/.test(__msgCG);
  const __isFeeling = /^今の気持ちは\s*[？?]?$/.test(__msgCG);
  const __isAiEvolution =
    /^AIはどのように進化する\s*[？?]?$/.test(__msgCG) || /AI.*進化/u.test(__msgCG);
  if (p.isCmd0 || p.hasDoc0 || p.askedMenu0 || !(__isCanSpeak || __isFeeling || __isAiEvolution)) {
    return false;
  }
  let __body = "";
  let __center = "conversational_general";
  let __label = "一般会話";
  let __helpers: string[] = ["breadth_shadow"];
  let __rr = "R22_CONVERSATIONAL_GENERAL_V1";
  if (__isCanSpeak) {
    __body = "はい、話せます。いま扱いたいテーマを一つ置いてください。";
  } else if (__isFeeling) {
    __body = "いま私は、中心を崩さずにどこへ接続するかを見ています。いま触れたい一点を一つ置いてください。";
  } else {
    __center = "relational_worldview";
    __label = "世界観";
    __helpers = ["gpt-5.4", "breadth_shadow"];
    __rr = "R22_RELATIONAL_WORLDVIEW_V1";
    __body =
      "AIの進化は、記憶・判断・表現・接続回路が分離から統合へ進むことです。次は、記憶・判断・表現・接続のどこから見ますか？";
  }
  p.res.json(
    p.__tenmonGeneralGateResultMaybe({
      response: __body,
      evidence: null,
      candidates: [],
      timestamp: p.timestamp,
      threadId: p.threadId,
      decisionFrame: {
        mode: "NATURAL",
        intent: "chat",
        llm: null,
        ku: {
          routeReason: __rr,
          centerMeaning: __center,
          centerLabel: __label,
          responseProfile: "standard",
          providerPlan: {
            primaryRenderer: "gpt-5.4",
            helperModels: __helpers,
            shadowOnly: false,
            finalAnswerAuthority: "gpt-5.4",
          },
          surfaceStyle: "plain_clean",
          closingType: "one_question",
          heart: p.normalizeHeartShape(p.heart),
          thoughtCoreSummary: {
            centerKey: __center,
            centerMeaning: __center,
            routeReason: __rr,
            modeHint: "general",
            continuityHint: __center,
          },
        },
      },
    }),
  );
  return true;
}

export function applyGeneralKuGroundingScriptureBumpV1(
  ku: { routeReason?: string; groundingSelector?: unknown },
  grounding: { kind: string; reason?: string; confidence?: number } | undefined,
): void {
  if (grounding == null) return;
  (ku as any).groundingSelector = { kind: grounding.kind, reason: grounding.reason, confidence: grounding.confidence };
  if (
    grounding.kind === "scripture_canon" &&
    (!ku.routeReason || ku.routeReason === ROUTE_NATURAL_GENERAL_LLM_TOP_V1)
  ) {
    ku.routeReason = "TENMON_SCRIPTURE_CANON_V1";
  }
}

/**
 * TENMON_INPUT_COGNITION_SPLITTER: NATURAL_GENERAL 主線 ku 生成直後の dry-run 観測（routeReason は変更しない）
 */
export function attachInputSemanticSplitDryRunNatGeneralV1(
  ku: Record<string, unknown>,
  rawMessage: string,
): void {
  if (!ku || typeof ku !== "object") return;
  const rr = String(ku.routeReason ?? "").trim();
  if (rr !== ROUTE_NATURAL_GENERAL_LLM_TOP_V1) return;
  ku.inputSemanticSplitResultV1 = splitInputSemanticsV1(rawMessage);
}
