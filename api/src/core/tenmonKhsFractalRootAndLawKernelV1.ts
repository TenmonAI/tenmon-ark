/**
 * TENMON_KHS_FRACTAL_ROOT_AND_LAW_KERNEL_CURSOR_AUTO_V1
 * KHS root constitution と fractal law kernel を一箇所で束ね、trace カード参照を fail-closed に付与する。
 * routeReason / decisionFrame は変更しない（binder から message + rr のみ渡す）。
 */

import { buildFractalRootAxisBundleV1, type FractalRootAxisBundleV1 } from "./tenmonKhsFractalRootV1.js";
import { projectFractalLawKernelFromKhsV1, type FractalLawKernelBundleV1 } from "./tenmonFractalLawKernelV1.js";

export const TENMON_KHS_FRACTAL_ROOT_AND_LAW_KERNEL_CARD_V1 =
  "TENMON_KHS_FRACTAL_ROOT_AND_LAW_KERNEL_CURSOR_AUTO_V1" as const;

export const TENMON_KHS_FRACTAL_ROOT_AND_LAW_KERNEL_TRACE_CARD_V1 =
  "TENMON_KHS_FRACTAL_ROOT_AND_LAW_KERNEL_TRACE_CURSOR_AUTO_V1" as const;

export type KhsFractalRootAndLawKernelTraceV1 = {
  /** 極短メッセージ等で root 観測が先に必要 */
  rootAxisObservationNeeded: boolean;
  /** 極短メッセージ等で law 観測が先に必要 */
  lawAxisObservationNeeded: boolean;
  /** 統合トレース（broad rewrite 禁止・1 原因で止める） */
  nextCardIfFail: string | null;
  khsRootTraceCard: "TENMON_KHS_ROOT_TRACE_CURSOR_AUTO_V1" | null;
  fractalLawAxisTraceCard: "TENMON_FRACTAL_LAW_AXIS_TRACE_CURSOR_AUTO_V1" | null;
};

export type KhsFractalRootAndLawKernelBundleV1 = {
  card: typeof TENMON_KHS_FRACTAL_ROOT_AND_LAW_KERNEL_CARD_V1;
  version: 1;
  fractalRootAxis: FractalRootAxisBundleV1;
  fractalLawKernel: FractalLawKernelBundleV1;
  trace: KhsFractalRootAndLawKernelTraceV1;
};

/**
 * root + law を一度に解決。メッセージ極短は fail-closed で trace 参照のみ（回答生成はしない）。
 */
export function resolveKhsFractalRootAndLawKernelV1(
  message: string,
  routeReason?: string,
): KhsFractalRootAndLawKernelBundleV1 {
  const msg = String(message || "").replace(/\s+/gu, " ").trim();
  const rr = String(routeReason || "").trim();

  const fractalRootAxis = buildFractalRootAxisBundleV1(msg, rr);
  const fractalLawKernel = projectFractalLawKernelFromKhsV1(msg, rr);

  const short = msg.length < 2;
  const trace: KhsFractalRootAndLawKernelTraceV1 = short
    ? {
        rootAxisObservationNeeded: true,
        lawAxisObservationNeeded: true,
        nextCardIfFail: TENMON_KHS_FRACTAL_ROOT_AND_LAW_KERNEL_TRACE_CARD_V1,
        khsRootTraceCard: "TENMON_KHS_ROOT_TRACE_CURSOR_AUTO_V1",
        fractalLawAxisTraceCard: "TENMON_FRACTAL_LAW_AXIS_TRACE_CURSOR_AUTO_V1",
      }
    : {
        rootAxisObservationNeeded: false,
        lawAxisObservationNeeded: false,
        nextCardIfFail: null,
        khsRootTraceCard: null,
        fractalLawAxisTraceCard: null,
      };

  return {
    card: TENMON_KHS_FRACTAL_ROOT_AND_LAW_KERNEL_CARD_V1,
    version: 1,
    fractalRootAxis,
    fractalLawKernel,
    trace,
  };
}
