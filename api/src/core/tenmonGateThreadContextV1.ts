/**
 * THREADCORE_REQUIRED_COVERAGE_V1
 * チャットハンドラ内の loadThreadCore 結果を、モジュール層の __tenmonGeneralGateResultMaybe ラッパーから参照する。
 * AsyncLocalStorage でリクエスト文脈を分離（enterWith は使わない）。
 *
 * Stage2 carry: 表面の 3 点（前回の芯／差分／次の一手）は `threadCoreLinkSurfaceV1` + `threadCoreCarryProjectionV1` が
 * ゲート出口で `ku.threadCore` / `threadCoreLinkSurfaceV1` に投影する。
 */
import { AsyncLocalStorage } from "node:async_hooks";
import type { ThreadCore } from "./threadCore.js";

export type TenmonGateThreadContextStoreV1 = {
  threadCore: ThreadCore | null;
};

export const tenmonGateThreadContextV1 = new AsyncLocalStorage<TenmonGateThreadContextStoreV1>();

export function getTenmonGateThreadContextV1(): TenmonGateThreadContextStoreV1 | undefined {
  return tenmonGateThreadContextV1.getStore();
}
