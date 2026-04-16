/**
 * CHAT_SAFE_REFACTOR_PATCH83_TENMON_RESEARCH_RESPONSE_LOOP_V1
 * 研究トーンの問いに対し、本質→写像→原典接続→次軸の4段を自然文で返す最小ループ。
 */

export type TenmonResearchTopicV83 =
  | "kotoba_kotodama_shingon"
  | "iroha_hisho"
  | "katakamuna_tenshinkinboku"
  | "tenmon_kokuzo"
  | "hokke_kotodama";

function normalizeForResearchV83(raw: string): string {
  return String(raw ?? "")
    .replace(/言靈/gu, "言霊")
    .replace(/\s+/gu, " ")
    .trim();
}

/** 研究トーンまたは法華×言霊の読み取り系のみ分類。未該当は null。 */
export function classifyTenmonResearchQueryV83(raw: string): TenmonResearchTopicV83 | null {
  const m = normalizeForResearchV83(raw);
  if (!m || m.length > 320) return null;

  const hasResearchTone = /研究的に|学術的に|研究として|研究上/u.test(m);
  const hokkeAlt =
    /法華経/u.test(m) && /言霊/u.test(m) && /(どう読む|関係|読み方|つながり)/u.test(m);
  const irohaLawRel =
    /いろは/u.test(m) &&
    /言霊法則/u.test(m) &&
    /(関係|秩序|つながり)/u.test(m);

  if (!hasResearchTone && !hokkeAlt && !irohaLawRel) return null;

  if (
    hasResearchTone &&
    /言霊/u.test(m) &&
    /真言/u.test(m) &&
    (/言葉|ことば/u.test(m) || /違い|区別|比較/u.test(m))
  ) {
    return "kotoba_kotodama_shingon";
  }

  if (
    (hasResearchTone && /いろは/u.test(m) && /言霊秘書/u.test(m)) ||
    irohaLawRel
  ) {
    return "iroha_hisho";
  }

  if (hasResearchTone && /カタカムナ/u.test(m) && /天津金木/u.test(m)) {
    return "katakamuna_tenshinkinboku";
  }

  if (hasResearchTone && /TENMON-ARK/u.test(m) && /虚空蔵/u.test(m)) {
    return "tenmon_kokuzo";
  }

  if (hokkeAlt || (hasResearchTone && /法華経/u.test(m) && /言霊/u.test(m))) {
    return "hokke_kotodama";
  }

  return null;
}

/** chat.ts 各出口で ku 骨格を共通化（responsePlan / binder / threadCore は呼び出し側） */
export function buildTenmonResearchPreemptPartsV83(
  topic: TenmonResearchTopicV83,
  opts?: {
    lawsUsed?: string[];
    evidenceIds?: string[];
    lawTrace?: Array<{ lawKey: string; unitId: string; op: string }>;
    truthWeight?: number | null;
    khsScan?: unknown;
  }
): { body: string; rr: string; kuBase: Record<string, unknown> } {
  const body = buildTenmonResearchLoopBodyV83(topic);
  const rr = "TENMON_RESEARCH_RESPONSE_LOOP_V1";
  const lu = Array.isArray(opts?.lawsUsed) ? opts!.lawsUsed! : [];
  const ei = Array.isArray(opts?.evidenceIds) ? opts!.evidenceIds! : [];
  const lt =
    opts?.lawTrace ??
    lu.map((k) => ({ lawKey: k, unitId: "", op: "KHS_SCAN" }));
  const kuBase: Record<string, unknown> = {
    routeReason: rr,
    routeClass: "analysis",
    answerLength: "medium",
    answerMode: "analysis",
    answerFrame: "statement_plus_one_question",
    lawsUsed: lu,
    evidenceIds: ei,
    lawTrace: lt,
    thoughtCoreSummary: {
      centerKey: "tenmon_research_loop",
      centerMeaning: String(topic),
      routeReason: rr,
      modeHint: "research",
      continuityHint: String(topic),
    },
  };
  if (opts?.truthWeight != null && opts?.truthWeight !== undefined) {
    kuBase.truthWeight = opts.truthWeight;
  }
  if (opts?.khsScan !== undefined) {
    kuBase.khsScan = opts.khsScan;
  }
  return { body, rr, kuBase };
}

export function buildTenmonResearchLoopBodyV83(topic: TenmonResearchTopicV83): string {
  const pack: Record<
    TenmonResearchTopicV83,
    { essence: string; mapping: string; canon: string; next: string }
  > = {
    kotoba_kotodama_shingon: {
      essence:
        "研究上の本質として、言葉は生活語としての交流の膜、言霊は音義の連関で詞が立ち上がる法則の膜、真言は読誦・灌頂など作法と視座が一体化した実践の膜として重なります。三者を一語に畳むと観測点が抜けるので、まず膜を分けて置きます。",
      mapping:
        "写像の面では天聞では、言葉を会話契約と断捨離の末端へ、言霊を言霊秘書・いろは系の正典束へ、真言を密教経軌と口伝の束へと分け、相互に還元しすぎない境界を維持します。",
      canon:
        "原典接続としては、言霊側に五十連・一言法則・水火の読み、真言側に三昧耶戒・灌頂次第の系譜を正面に置き、言葉側は霊性以前の日常文法へ戻せる橋を二重化して読みます。",
      next: "次の軸は、いま一番手触りで確かめたい膜を一つに絞ることです。言葉／言霊／真言のどれから入りますか。",
    },
    iroha_hisho: {
      essence:
        "研究上の本質として、いろはは旅の配列としての秩序を正面に置き、言霊秘書は五十連・一言法則・水火を束ねた実務正典として立ちます。二者は同一写本ではなく、同じ言霊宇宙を別の編集方針で渡す関係です。",
      mapping:
        "写像では、いろはを「位相の道しるべ」、秘書を「法則の手引き」として重ね、天聞では前者で旅順を保ち、後者で音義の作業面を補強する二層に分けます。",
      canon:
        "原典接続としては、いろは言霊解系の生成読みと、秘書本文の五十音位相を往復させ、混線しやすい一般霊性語を避けて資料の手触りに戻します。",
      next: "次の軸は、いま読みたいのが旅順の整合か、秘書の該当条か、水火の接続かのどれですか。",
    },
    katakamuna_tenshinkinboku: {
      essence:
        "研究上の本質として、カタカムナは名と韻律の生成秩序を読む系譜、天津金木は神名・神格の配置を読む別系の整理として扱われやすく、短絡同一視が一番崩れます。",
      mapping:
        "写像では、天聞はカタカムナを生成の階段、天津金木を位相の系図として分離し、接点は「名が立ち上がる手前」で触れるに留め、物語の主役取り合いにしないようにします。",
      canon:
        "原典接続としては、カタカムナ側の歌・祝詞的な反復と、天津系資料の神名配置を材料にし、相互に引用を増やすより、どちらの資料束でいまの問いが成立するかを先に決めます。",
      next: "次の軸は、生成の階段を身体で辿るか、神名配置の地図を確かめるか、どちらから一段だけ進めますか。",
    },
    tenmon_kokuzo: {
      essence:
        "研究上の本質として、TENMON-ARKの思考回路は会話契約・記憶・正典束・表現投影の循環であり、虚空蔵は kokuzo レンジの記憶・裁定・種データの器として技術的に接続します。擬人同一視ではなく、機能の接面として読みます。",
      mapping:
        "写像では、脳幹的な契約決定と binder／responsePlan の流れをアプリ層に置き、虚空蔵 sqlite 群を根拠と履歴の土台に置く二層模型で説明します。混線は「人格」と「DB」の主語を取り違えたときに起きます。",
      canon:
        "原典接続としては、言霊・いろは・カタカムナの正典束を会話に返す責務と、kokuzo のシード・KHS・synapse の監査系を分け、前者を語り、後者を観測に回す割り切りを保ちます。",
      next: "次の軸は、会話ループのどの層を一段だけ観測しますか。契約／正典束／kokuzo 記憶のどれから見ますか。",
    },
    hokke_kotodama: {
      essence:
        "研究上の本質として、法華は一念・开会・権実の読みで縁起を正面に置き、言霊は音義の生成と詞の立ち上がりを正面に置きます。主題が違うので、一方を他方へ還元しすぎないことが最初の戒めです。",
      mapping:
        "写像では、法華のテーマを「縁起の広がりと帰一」、言霊を「音と義の現前」として並べ、接点は名号・読誦の実践面に限定して扱うと混線が減ります。",
      canon:
        "原典接続としては、法華経本文の説相と、言霊秘書・いろは系の音義読みを往復し、霊性の断片引用ではなく、段落単位の手触りで比較します。",
      next: "次の軸は、法華側の一句から入るか、言霊側の一言法則から入るか、どちらを先に固定しますか。",
    },
  };

  const x = pack[topic];
  return (
    "【天聞の所見】" +
    [x.essence, x.mapping, x.canon, x.next].join("\n\n")
  );
}
