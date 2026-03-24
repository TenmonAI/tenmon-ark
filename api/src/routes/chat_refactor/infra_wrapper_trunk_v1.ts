/**
 * CHAT_TRUNK_INFRA_WRAPPER_SPLIT_V1_FINAL — response / threadCore mirror glue.
 * NATURAL_GENERAL shrink system-diagnosis 等で `saveThreadCore` 後に res へ core を載せる経路を集約。
 */
import type { ThreadCore } from "../../core/threadCore.js";

export function attachThreadCoreMirrorToResV1(res: unknown, core: ThreadCore): void {
  try {
    (res as any).__TENMON_THREAD_CORE = core;
  } catch {
    /* ignore */
  }
}
