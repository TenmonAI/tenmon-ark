# CHAT_SAFE_REFACTOR_PATCH24_COMPARE_CONTRACT_RESTORE_V1 — Report

## Goal
strict compare の live reply 経路で、`decisionFrame.ku` に  
`answerLength: "medium"`, `answerMode: "analysis"`, `answerFrame: "statement_plus_one_question"`, `responsePlan: object` を最終出力まで保持する。

## Diff (PATCH24 該当のみ)

### 1. 早期 strict compare (L1896–L1936)
- `__bodyStrictCompareEarly` を定数化し、`ku` に以下を追加:
  - `routeClass: "analysis"`
  - `answerLength: "medium"`
  - `answerMode: "analysis"`
  - `answerFrame: "statement_plus_one_question"`
  - `responsePlan: buildResponsePlan({...})`（固定パラメータ）

### 2. reply() 内部 (L2907 付近)
- `[PATCH24_COMPARE_CONTRACT_RESTORE_V1]` ガードを追加。
- `decisionFrame.ku.routeReason === "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1"` のときのみ:
  - `ku.routeClass ??= "analysis"`
  - `ku.answerLength ??= "medium"`
  - `ku.answerMode ??= "analysis"`
  - `ku.answerFrame ??= "statement_plus_one_question"`
  - `if (!ku.responsePlan) ku.responsePlan = buildResponsePlan({...})`

### 3. res.json ラッパー内 (L4069 付近)
- `return __origJson(obj)` 直前に同条件のガードを追加（ラッパー上書き対策）。

## Build result
```
> tenmon-ark-api@1.0.0 build
> tsc && node scripts/copy-assets.mjs
[copy-assets] copied ... (schema files)
```
**Exit code: 0**

## Ready result
```bash
for i in 1 2 3 4 5 6 7 8 9 10; do curl -fsS http://127.0.0.1:3000/health && break || sleep 1; done
```
**Output:** `{"status":"ok"}`  
**Exit code: 0**

## probe.compare.json (要約)

- **request:** `{"message":"言霊とカタカムナの違いは？","threadId":"patch24-compare","mode":"NATURAL"}`
- **decisionFrame.ku 抜粋:**
```json
{
  "routeReason": "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1",
  "routeClass": "analysis",
  "answerLength": "medium",
  "answerMode": "analysis",
  "answerFrame": "statement_plus_one_question",
  "responsePlan": { "routeReason": "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1", ... }
}
```
- 本文は変更なし（原典系の扱い… の固定文）。

## Acceptance summary

| 項目 | 期待 | 結果 |
|------|------|------|
| routeReason | RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1 | ✅ |
| routeClass | analysis | ✅ |
| answerLength | medium | ✅ |
| answerMode | analysis | ✅ |
| answerFrame | statement_plus_one_question | ✅ |
| responsePlan | object | ✅ |
| responsePlan.routeReason | RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1 | ✅ |

**判定: 全項目満たす。**

## Non‑negotiable 確認
- compare strict 本文: 変更なし（文言は変数化のみ）
- routeReason: `"RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1"` のまま
- mode: `"STRICT"` / intent: `"compare"` 不変
- compare 以外の分岐: 未変更（reply 内ガードは strict compare 時のみ）
- 最小 diff・1変更1検証を実施
