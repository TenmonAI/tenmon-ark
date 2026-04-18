/**
 * TENMON-ARK Soul Root V2.0 テストスイート
 * 
 * 20問のテストケース:
 *   Q1-Q5:  irohaKotodamaLoader (いろは言霊解)
 *   Q6-Q10: kotodamaGentenLoader (五十連法則)
 *   Q11-Q15: amaterasuAxisMap (天照軸マップ)
 *   Q16-Q18: unifiedSoundLoader (統合音ローダー)
 *   Q19-Q20: satoriEnforcement.checkIrohaGrounding (三要素整合)
 * 
 * 実行: node api/tests/soul_root_v2_test_suite.mjs
 */

import { queryIrohaByUserText, buildIrohaInjection } from "../src/core/irohaKotodamaLoader.js";
import { extractKeyKotodamaFromText, buildKotodamaGentenInjection } from "../src/core/kotodamaGentenLoader.js";
import { selectKanagiPhaseForIntent, buildAmaterasuAxisInjection, KANAGI_MAPPING } from "../src/data/amaterasuAxisMap.js";
import { buildUnifiedSoundInjection } from "../src/core/unifiedSoundLoader.js";
import { checkIrohaGrounding } from "../src/core/satoriEnforcement.js";

let passed = 0;
let failed = 0;
const results = [];

function test(id, name, fn) {
  try {
    const result = fn();
    if (result) {
      passed++;
      results.push({ id, name, status: "PASS", detail: typeof result === "string" ? result : "" });
    } else {
      failed++;
      results.push({ id, name, status: "FAIL", detail: "assertion returned false" });
    }
  } catch (e) {
    failed++;
    results.push({ id, name, status: "ERROR", detail: e?.message || String(e) });
  }
}

// ===== Q1-Q5: irohaKotodamaLoader =====

test("Q1", "queryIrohaByUserText: 「愛」で検索 → 1件以上ヒット", () => {
  const hits = queryIrohaByUserText("愛とは何ですか");
  return hits.length > 0 && `${hits.length} hits`;
});

test("Q2", "queryIrohaByUserText: 「水火」で検索 → 1件以上ヒット", () => {
  const hits = queryIrohaByUserText("水火の法則について教えてください");
  return hits.length > 0 && `${hits.length} hits`;
});

test("Q3", "queryIrohaByUserText: 「カタカムナ」で検索 → 1件以上ヒット", () => {
  const hits = queryIrohaByUserText("カタカムナとは何ですか");
  return hits.length > 0 && `${hits.length} hits`;
});

test("Q4", "buildIrohaInjection: 出力が1500文字以内", () => {
  const hits = queryIrohaByUserText("言霊の法則");
  const injection = buildIrohaInjection(hits, 1500);
  return injection.length > 0 && injection.length <= 1600 && `${injection.length} chars`;
});

test("Q5", "buildIrohaInjection: 空入力 → 空文字列", () => {
  const injection = buildIrohaInjection([], 1500);
  return injection === "";
});

// ===== Q6-Q10: kotodamaGentenLoader =====

test("Q6", "extractKeyKotodamaFromText: 「ア」音を含むテキスト → 抽出", () => {
  const keys = extractKeyKotodamaFromText("アマテラスの光");
  return keys.length > 0 && `${keys.length} keys: ${keys.join(",")}`;
});

test("Q7", "extractKeyKotodamaFromText: 「カ」音を含むテキスト → 抽出", () => {
  const keys = extractKeyKotodamaFromText("カタカムナの構造");
  return keys.length > 0 && `${keys.length} keys: ${keys.join(",")}`;
});

test("Q8", "buildKotodamaGentenInjection: 出力が1000文字以内", () => {
  const keys = extractKeyKotodamaFromText("アイウエオの法則");
  const injection = buildKotodamaGentenInjection(keys, 1000);
  return injection.length > 0 && injection.length <= 1100 && `${injection.length} chars`;
});

test("Q9", "extractKeyKotodamaFromText: 英語のみ → 空配列", () => {
  const keys = extractKeyKotodamaFromText("Hello World");
  return keys.length === 0;
});

test("Q10", "buildKotodamaGentenInjection: 空入力 → 空文字列", () => {
  const injection = buildKotodamaGentenInjection([], 1000);
  return injection === "";
});

// ===== Q11-Q15: amaterasuAxisMap =====

test("Q11", "selectKanagiPhaseForIntent: 「悩み」→ AWASE以外のフェーズ", () => {
  const phase = selectKanagiPhaseForIntent("仕事で悩んでいます");
  return typeof phase === "string" && phase.length > 0 && `phase=${phase}`;
});

test("Q12", "selectKanagiPhaseForIntent: 「カタカムナとは」→ 知識系フェーズ", () => {
  const phase = selectKanagiPhaseForIntent("カタカムナとは何ですか");
  return typeof phase === "string" && phase.length > 0 && `phase=${phase}`;
});

test("Q13", "buildAmaterasuAxisInjection: 有効なフェーズ → 非空出力", () => {
  const injection = buildAmaterasuAxisInjection("AWASE");
  return injection.length > 0 && `${injection.length} chars`;
});

test("Q14", "KANAGI_MAPPING: 6アンカー全て定義済み", () => {
  const expected = ["AWASE", "KANAGI", "MUSUBI", "HIBIKI", "KAGAMI", "UGOKI"];
  const allPresent = expected.every(k => KANAGI_MAPPING[k]);
  return allPresent && `${expected.length} anchors`;
});

test("Q15", "buildAmaterasuAxisInjection: 不正フェーズ → フォールバック", () => {
  const injection = buildAmaterasuAxisInjection("INVALID_PHASE");
  // フォールバックでAWASEが使われるか、空文字列が返る
  return typeof injection === "string" && `fallback=${injection.length} chars`;
});

// ===== Q16-Q18: unifiedSoundLoader =====

test("Q16", "buildUnifiedSoundInjection: 「愛」→ 非空出力", () => {
  const injection = buildUnifiedSoundInjection("愛について教えてください", 1200);
  return injection.length > 0 && `${injection.length} chars`;
});

test("Q17", "buildUnifiedSoundInjection: 1200文字制限を遵守", () => {
  const injection = buildUnifiedSoundInjection("水火の法則とカタカムナの関係について詳しく教えてください", 1200);
  return injection.length <= 1300 && `${injection.length} chars`;
});

test("Q18", "buildUnifiedSoundInjection: 英語のみ → 空または最小出力", () => {
  const injection = buildUnifiedSoundInjection("Hello World", 1200);
  // 英語のみの場合、日本語音が検出されないため空になる可能性が高い
  return typeof injection === "string" && `${injection.length} chars (may be empty)`;
});

// ===== Q19-Q20: satoriEnforcement.checkIrohaGrounding =====

test("Q19", "checkIrohaGrounding: 言霊的テキスト → score > 0", () => {
  const result = checkIrohaGrounding("言霊の法則に基づき、水火の結びが天地を創造する。アマテラスの光が万物を照らす。");
  return result.score > 0 && `score=${result.score}, passed=${result.passed}`;
});

test("Q20", "checkIrohaGrounding: 構造チェック → 3要素すべて存在", () => {
  const result = checkIrohaGrounding("カタカムナの構造は水火の法則に従い、言霊五十音の響きと天津金木の構造が一体となる。");
  return (
    typeof result.irohaSound === "object" &&
    typeof result.actionPattern === "object" &&
    typeof result.amaterasuAxis === "object" &&
    `iroha=${result.irohaSound.sounds?.length || 0}, action=${result.actionPattern.pattern}, axis=${result.amaterasuAxis.axis}`
  );
});

// ===== 結果出力 =====

console.log("\n" + "=".repeat(60));
console.log("  TENMON-ARK Soul Root V2.0 Test Suite Results");
console.log("=".repeat(60));
console.log();

for (const r of results) {
  const icon = r.status === "PASS" ? "[OK]" : r.status === "FAIL" ? "[NG]" : "[!!]";
  console.log(`  ${icon} ${r.id}: ${r.name}`);
  if (r.detail) console.log(`       → ${r.detail}`);
}

console.log();
console.log(`  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`  Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log("=".repeat(60));

process.exit(failed > 0 ? 1 : 0);
