/** TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_V1: 欠落復元用の最小定数（本カードは build green のみ） */
import { buildTenmonKatakamunaReintegrationBindV1 } from "./tenmonKatakamunaReintegrationBindV1.js";

export const STRUCTURAL_COMPATIBILITY_AND_ROOT_SEPARATION_CARD_V1 =
  "STRUCTURAL_COMPATIBILITY_AND_ROOT_SEPARATION_V1" as const;

/**
 * ku 由来の struct に、カタカムナ再統合バインドを非破壊マージ（truth kernel の struct 分岐 policy 用）。
 */
export function mergeStructuralCompatibilityWithKatakamunaReintegrationV1(
  existing: Record<string, unknown> | null | undefined,
  args: { rawMessage: string; routeReason: string; centerKey: string | null | undefined },
): Record<string, unknown> | null {
  const bind = buildTenmonKatakamunaReintegrationBindV1(args);
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing) ? { ...existing } : null;
  if (!bind.active) return base;
  return { ...(base ?? {}), tenmonKatakamunaReintegrationBindV1: bind };
}
