/**
 * TENMON_BOOK_LEARNING_ACCEPTANCE_AND_REUSE_BENCH — stdout は JSON のみ推奨（DB 初期化ログは stderr 混在のため自動化側で抽出）。
 */
import { getTenmonBookLearningAcceptanceReuseBenchPayloadV1 } from "../src/core/tenmonBookLearningAcceptanceReuseBenchV1.js";

console.log(JSON.stringify(getTenmonBookLearningAcceptanceReuseBenchPayloadV1(), null, 2));
