/**
 * TENMON_KOJIKI_MYTHOGENESIS_MAPPER_CURSOR_AUTO_V1
 * 古事記神代を物語列挙ではなく生成アルゴリズムとして phase map（KHS root 優先・本文捏造なし）。
 *
 * 神代要素 → phase（順序固定）:
 * 天之御中主 → origin_center
 * 高御産巣日 / 神産巣日 → dual_separation
 * 伊邪那岐 / 伊邪那美 → paired_binding
 * 天浮橋 → bridge_phase
 * 淤能碁呂 → island_formation
 * 大八島 → multiplicity_expansion
 * 一天四海 / 人体 / 呼吸 → breath_social_projection
 */

export const MYTHOGENESIS_PHASE_KEYS_V1 = [
  "origin_center",
  "dual_separation",
  "paired_binding",
  "bridge_phase",
  "island_formation",
  "multiplicity_expansion",
  "breath_social_projection",
] as const;

export type MythogenesisPhaseKeyV1 = (typeof MYTHOGENESIS_PHASE_KEYS_V1)[number];

/** @deprecated MYTHOGENESIS_PHASE_KEYS_V1 を使用 */
export const KOJIKI_MYTHOGENESIS_PHASE_ORDER_V1 = MYTHOGENESIS_PHASE_KEYS_V1;

const PHASES: readonly string[] = MYTHOGENESIS_PHASE_KEYS_V1 as unknown as string[];

export type MythogenesisPhaseBundleV1 = {
  card: "TENMON_KOJIKI_MYTHOGENESIS_MAPPER_CURSOR_AUTO_V1";
  version: 1;
  /** 主 phase（英語キー）— thoughtCoreSummary.mythogenesisPhase には本バンドル全体が入る */
  primaryPhaseKey: MythogenesisPhaseKeyV1;
  /** 到達した phase 列（生成順） */
  phaseChainKeys: string[];
  mythogenesisCenterClaim: string;
  mythogenesisProjectionHint: string;
  kojikiSubordinateToKhs: true;
  khsRootFirst: true;
  readingMode: "generation_map_not_mythology";
};

function centerClaimForPhase(key: MythogenesisPhaseKeyV1): string {
  const m: Record<string, string> = {
    origin_center: "root:KHS;phase:origin_center—中心の生起（説話ではなく生成相の原点）。",
    dual_separation: "root:KHS;phase:dual_separation—産み分けの峻別（対の前提）。",
    paired_binding: "root:KHS;phase:paired_binding—対の結び（生成の駆動）。",
    bridge_phase: "root:KHS;phase:bridge_phase—橋は接続の位相（渡りではなく写像）。",
    island_formation: "root:KHS;phase:island_formation—島は形成の節（一点の立ち上がり）。",
    multiplicity_expansion: "root:KHS;phase:multiplicity_expansion—多島は多層展開（列挙ではなく重ね）。",
    breath_social_projection: "root:KHS;phase:breath_social_projection—呼吸・四海は身体と世の対応写像。",
  };
  return m[key] ?? m.origin_center;
}

function projectionHintForPhase(key: MythogenesisPhaseKeyV1): string {
  const m: Record<string, string> = {
    origin_center: "天之御中主を中心座標の初発として読む（KHS root 優先・典拠は写像）。",
    dual_separation: "高御産巣日・神産巣日を分離の前提として読む（解説ではなく位相）。",
    paired_binding: "伊邪那岐・伊邪那美を対の生成結合として読む（物語ではなくアルゴリズム）。",
    bridge_phase: "天浮橋を橋渡しの位相として読む（情景説明に落とさない）。",
    island_formation: "淤能碁呂を島形成の節として読む（地名羅列にしない）。",
    multiplicity_expansion: "大八島を多層展開として読む（島名暗記にしない）。",
    breath_social_projection: "一天四海・人体・呼吸を身体—世の対応として読む（比喩説明にしない）。",
  };
  return m[key] ?? m.origin_center;
}

/** automation / seal 用 */
export function getKojikiMythogenesisMapperSealPayloadV1(): {
  card: "TENMON_KOJIKI_MYTHOGENESIS_MAPPER_CURSOR_AUTO_V1";
  mythogenesis_mapper_ready: true;
  kojiki_generation_phase_ready: true;
  phases: readonly MythogenesisPhaseKeyV1[];
} {
  return {
    card: "TENMON_KOJIKI_MYTHOGENESIS_MAPPER_CURSOR_AUTO_V1",
    mythogenesis_mapper_ready: true,
    kojiki_generation_phase_ready: true,
    phases: MYTHOGENESIS_PHASE_KEYS_V1,
  };
}

function phaseHitMask(msg: string): boolean[] {
  const m = msg;
  return [
    // acceptance: 古事記の天地開闢とは
    /天之御中|天御中|御中主|天地開闢|開闢|混沌|かんねん|初発|神世の初め/u.test(m),
    /高御産|神産巣|産巣日|タカミマス|カミムスビ|産みの神/u.test(m),
    // acceptance: 伊邪那岐伊邪那美とは
    /伊邪那岐|伊邪那美|いざなぎ|いざなみ|イザナギ|イザナミ/u.test(m),
    /天浮橋|あめのうきはし|天うきはし/u.test(m),
    // acceptance: 淤能碁呂島とは
    /淤能碁呂|淤能碁呂島|おのごろ|オノゴロ|淤能/u.test(m),
    // acceptance: 大八島とは
    /大八島|大八洲|おおやしま|オオヤシマ/u.test(m),
    // acceptance: 古事記生成と人の呼吸の関係は（「生成」単独マッチは広すぎるため入れない）
    /一天四海|四海|人体|呼吸|からだ|息|身の上/u.test(m),
  ];
}

function shouldApplyMapper(msg: string): boolean {
  if (/古事記|神代|神話|神産み|神世|国産み|かみうみ|くにうみ/u.test(msg)) return true;
  if (phaseHitMask(msg).some(Boolean)) return true;
  if (/呼吸/u.test(msg) && /古事記|神代|生成|人の|人と/u.test(msg)) return true;
  return false;
}

/**
 * thoughtCoreSummary.mythogenesisPhase 用。該当なしは null（fail-closed）。
 */
export function projectMythogenesisPhaseV1(message: string, _routeReason?: string): MythogenesisPhaseBundleV1 | null {
  const msg = String(message || "").replace(/\s+/gu, " ").trim();
  if (!msg || !shouldApplyMapper(msg)) return null;

  const mask = phaseHitMask(msg);
  const hits = mask.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);

  let maxIdx = hits.length > 0 ? Math.max(...hits) : -1;
  if (maxIdx < 0) {
    if (/古事記|神代|神話|神産み/u.test(msg)) maxIdx = PHASES.length - 1;
    else return null;
  }

  const phaseChainKeys = PHASES.slice(0, maxIdx + 1);
  const primaryPhaseKey = (PHASES[maxIdx] ?? PHASES[0]) as MythogenesisPhaseKeyV1;

  return {
    card: "TENMON_KOJIKI_MYTHOGENESIS_MAPPER_CURSOR_AUTO_V1",
    version: 1,
    primaryPhaseKey,
    phaseChainKeys,
    mythogenesisCenterClaim: centerClaimForPhase(primaryPhaseKey),
    mythogenesisProjectionHint: projectionHintForPhase(primaryPhaseKey),
    kojikiSubordinateToKhs: true,
    khsRootFirst: true,
    readingMode: "generation_map_not_mythology",
  };
}
