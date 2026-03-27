/**
 * TENMON_IROHA_LIFE_COUNSELING_KERNEL_CURSOR_AUTO_V1
 * いろは言霊解を mapping（人生理解 layer）。KHS root と混同しない。
 */

export type IrohaLifeCounselingKernelBundleV1 = {
  card: "TENMON_IROHA_LIFE_COUNSELING_KERNEL_CURSOR_AUTO_V1";
  layer: "life_understanding_mapping";
  /** 1. 中心の迷いを一段で固定する観測 */
  irohaCenterHint: string;
  /** 2. いま受け止める現実・役割を示す（受容） */
  roleAcceptanceHint: string;
  /** 生死・循環の観測（断定でない） */
  passageFlowHint: string;
};

const CARD = "TENMON_IROHA_LIFE_COUNSELING_KERNEL_CURSOR_AUTO_V1" as const;

function scriptureRoute(rr: string): boolean {
  return /^(K1_TRACE_EMPTY_GATED_V1|SCRIPTURE_LOCAL_RESOLVER_V4|TENMON_SCRIPTURE_CANON_V1|TRUTH_GATE_RETURN_V2)$/u.test(
    String(rr || "").trim(),
  );
}

function shouldActivate(message: string, routeReason: string): boolean {
  if (scriptureRoute(routeReason)) return false;
  const msg = String(message || "").replace(/\s+/gu, " ").trim();
  if (msg.length < 6) return false;
  return /人生|迷い|役目|仕事|家庭|離婚|親|関係|いろは|受容|芯|優先|恋愛|人間関係|片付|手放|整理|どちらを/u.test(msg);
}

function hintsForMessage(msg: string): Pick<IrohaLifeCounselingKernelBundleV1, "irohaCenterHint" | "roleAcceptanceHint" | "passageFlowHint"> {
  if (/仕事と家庭|優先すべきか|家庭/u.test(msg)) {
    return {
      irohaCenterHint: "仕事と家庭のどちらを先に守るか、いまの一段だけの優先を一文で固定する。",
      roleAcceptanceHint: "いま受け止める負荷と期待を、事実として一つずつ列挙する。",
      passageFlowHint: "役割の巡りを観測し、完璧を求めない線を引く。",
    };
  }
  if (/離婚|別居|別れる/u.test(msg)) {
    return {
      irohaCenterHint: "離すか残すかの前に、いまの芯の迷いを一文で言語化する。",
      roleAcceptanceHint: "いま受けている感情と条件を、弁解なく一つずつ認める。",
      passageFlowHint: "関係の段階を観測し、次の一手を一つに絞る。",
    };
  }
  if (/親|家族|両親/u.test(msg)) {
    return {
      irohaCenterHint: "親子の距離と責任の境界を、いまの一段で観測する。",
      roleAcceptanceHint: "いま受け取れる関わりと、受け取れない関わりを分ける。",
      passageFlowHint: "役割の受け渡しを、一度だけ言語化する。",
    };
  }
  if (/役目|意味|見えない/u.test(msg)) {
    return {
      irohaCenterHint: "人生の役目を一語に縮められない迷いを、いま担っている事実に置く。",
      roleAcceptanceHint: "いま引き受けている役と、手放してよい役を観測する。",
      passageFlowHint: "循環の中で役が変わることを、観測として置く。",
    };
  }
  return {
    irohaCenterHint: "迷いの中心を一文で固定し、次に観測する軸を一つに絞る。",
    roleAcceptanceHint: "いま受け止める現実を一つだけ言語化する。",
    passageFlowHint: "生死・役目の巡りを、断定せず一段だけ観測する。",
  };
}

export function resolveIrohaLifeCounselingKernelV1(
  message: string,
  routeReason: string,
): IrohaLifeCounselingKernelBundleV1 | null {
  const msg = String(message || "").replace(/\s+/gu, " ").trim();
  if (!shouldActivate(msg, routeReason)) return null;
  const h = hintsForMessage(msg);
  return {
    card: CARD,
    layer: "life_understanding_mapping",
    ...h,
  };
}
