/**
 * TENMON_DANSHARI_LIFE_ORDER_KERNEL_CURSOR_AUTO_V1
 * 断捨離を生活実装 layer（KHS root に従属・代替禁止）。moral lecture ではなく structural repair のメタ。
 */

export type DanshariLifeAxisV1 =
  | "priority_order"
  | "release_unneeded"
  | "boundary_reset"
  | "relation_sorting"
  | "information_detox"
  | "life_space_recovery";

export type DanshariLifeOrderKernelBundleV1 = {
  card: "TENMON_DANSHARI_LIFE_ORDER_KERNEL_CURSOR_AUTO_V1";
  layer: "life_implementation";
  danshariAxis: DanshariLifeAxisV1;
  releaseTargetHint: string;
  priorityRepairHint: string;
  boundaryResetHint: string;
  /** finalize / bridge 用の一行（残す・離す・優先・境界を含みうる） */
  lifeOrderSurfaceHint: string;
};

const CARD = "TENMON_DANSHARI_LIFE_ORDER_KERNEL_CURSOR_AUTO_V1" as const;

function axisHints(ax: DanshariLifeAxisV1): Pick<
  DanshariLifeOrderKernelBundleV1,
  "releaseTargetHint" | "priorityRepairHint" | "boundaryResetHint" | "lifeOrderSurfaceHint"
> {
  switch (ax) {
    case "priority_order":
      return {
        releaseTargetHint: "いま不要な依頼・義務を一段だけ手放す対象を一つに絞る。",
        priorityRepairHint: "先に残す一つだけを決め、残りは後回しの棚に置く。",
        boundaryResetHint: "「今日はここまで」を線として引き直す。",
        lifeOrderSurfaceHint:
          "優先を一つに絞り、残す仕事と後回しにする仕事を分ける。境界は今日の終わりの線として引き直す。",
      };
    case "release_unneeded":
      return {
        releaseTargetHint: "手元に残す条件を一文で定義し、それに合わないものを離す。",
        priorityRepairHint: "離す順番を一つだけ先に実行する。",
        boundaryResetHint: "持ち込みを止める入口を一つだけ決める。",
        lifeOrderSurfaceHint:
          "残すものの条件を一文で決め、それ以外は一段だけ離す。根性ではなく構造で手放す。",
      };
    case "boundary_reset":
      return {
        releaseTargetHint: "越境している負担を一つだけ特定する。",
        priorityRepairHint: "先に守るべき時間・体力を一つだけ確保する。",
        boundaryResetHint: "境界線をどこに引くかを一つだけ言語化する。",
        lifeOrderSurfaceHint:
          "境界を一段だけ引き直し、越境を止める。残すエネルギーと離す相手を分ける。",
      };
    case "relation_sorting":
      return {
        releaseTargetHint: "距離を取る関係と維持する関係を観測する。",
        priorityRepairHint: "次に取る対話・行動を一つだけに固定する。",
        boundaryResetHint: "関係の線を引き直すタイミングを一つ決める。",
        lifeOrderSurfaceHint:
          "人間関係の距離を観測し、切るか・離すか・様子見かを一つに絞る。修復は次の一手を一段だけ。",
      };
    case "information_detox":
      return {
        releaseTargetHint: "入力源を一つ減らす（通知・購読・検索のいずれか）。",
        priorityRepairHint: "判断に使う軸を一つだけ置き、他は保留にする。",
        boundaryResetHint: "情報の受け取り枠を時間で区切る。",
        lifeOrderSurfaceHint:
          "情報を一段減らし、判断の軸を一つにする。優先して読む源を残し、あとは後回しにする。",
      };
    case "life_space_recovery":
      return {
        releaseTargetHint: "空間または注意のどちらか一方から一段だけ片付ける。",
        priorityRepairHint: "片付けの順番を一列に並べ、先頭だけ実行する。",
        boundaryResetHint: "生活動線の詰まりを一か所だけ外す。",
        lifeOrderSurfaceHint:
          "家と頭のどちらか一方から順番を一列にし、残す場所と捨てる物の境界を一段だけ引く。",
      };
  }
}

function pickAxis(msg: string): DanshariLifeAxisV1 {
  const m = msg;
  if (/人間関係|切るべき|距離|別れる|縁を|付き合い/u.test(m)) return "relation_sorting";
  if (/情報|SNS|ニュース|通知|入ってくる|判断できない/u.test(m)) return "information_detox";
  if (/やることが多|多すぎ|散らか|後回し|優先|タスク|忙し/u.test(m)) return "priority_order";
  if (/片付|片づけ|家|部屋|頭の中|生活が/u.test(m)) return "life_space_recovery";
  if (/境界|線を引|引き直し|越境|断る|疲弊/u.test(m)) return "boundary_reset";
  if (/手放|不要|捨てる|離す|減らす/u.test(m)) return "release_unneeded";
  if (/断捨離とは|断捨離って|ダンシャリ/u.test(m)) return "life_space_recovery";
  return "priority_order";
}

function shouldActivate(message: string, routeReason: string): boolean {
  const rr = String(routeReason || "").trim();
  if (/^(K1_TRACE_EMPTY_GATED_V1|SCRIPTURE_LOCAL_RESOLVER_V4|TENMON_SCRIPTURE_CANON_V1|TRUTH_GATE_RETURN_V2)$/u.test(rr)) {
    return false;
  }
  const msg = String(message || "").replace(/\s+/gu, " ").trim();
  if (msg.length < 4) return false;
  return /断捨離|ダンシャリ|手放し|優先|片付|片づけ|境界|人間関係|距離|切るべき|情報.*多|やること.*多|散らか|判断できない|生活|疲弊|越境|不要|捨てる|離す|後回し/u.test(
    msg,
  );
}

export function resolveDanshariLifeOrderKernelV1(
  message: string,
  routeReason: string,
): DanshariLifeOrderKernelBundleV1 | null {
  const msg = String(message || "").replace(/\s+/gu, " ").trim();
  if (!shouldActivate(msg, routeReason)) return null;
  const danshariAxis = pickAxis(msg);
  const h = axisHints(danshariAxis);
  return {
    card: CARD,
    layer: "life_implementation",
    danshariAxis,
    ...h,
  };
}
