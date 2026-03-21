# SELF_BUILD_DECISION_AND_PATCH_PLANNER_V1

**MODE:** `DOCS_FIRST` → 必要時のみ `MIN_DIFF_PATCH`（本書は **決定層の schema のみ**。**実装コードの生成・適用は別カード `SELF_BUILD_EXECUTION_BRIDGE_V1`**）  
**上位:** `SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md`  
**入力 schema:** `SELF_BUILD_OBSERVE_AND_TASK_SCHEMA_V1.md`（`TenmonSelfBuildTaskEnvelopeV1`）  
**版:** V1  
**目的:** Task Envelope を **実装前に** 解釈し、**次カード・patch 範囲・micro-card 列・受入/rollback/隔離の継承**を **`DecisionPlanV1` として一意に固定**する。

---

## 0. 地位（実装ではない）

| 項目 | 内容 |
|------|------|
| **Planner の役割** | **決定のみ**。ファイル編集・コミット・runner 起動は **Execution Bridge** 以降。 |
| **1 カード = 1 責務** | 上位カードの **内部**で micro-card を **複数生成してよい**が、各 micro は **別 `taskId`** の Envelope（または Planner が生成する **子計画スロット**）に落とす。 |
| **自動実行** | **`low` risk のみ**が自動実行**候補**。`medium` / `high` / `forbidden` は **自動適用禁止**（人間レビューまたは `review_required`）。 |

---

## 1. 入出力（一意）

| 方向 | 型名 | 説明 |
|------|------|------|
| **入力** | `TenmonSelfBuildTaskEnvelopeV1` | `SELF_BUILD_OBSERVE_AND_TASK_SCHEMA_V1` のルートオブジェクト。 |
| **出力** | **`DecisionPlanV1`** | 本書 §2 で定義。**正規出力はこの型のみ**（`$schemaHint`: `SELF_BUILD_DECISION_PLAN_V1` 推奨）。 |

---

## 2. DecisionPlanV1 — フィールド（必須）

| キー | 型（論理） | 必須 | 説明 |
|------|------------|------|------|
| **planId** | `string` | ✓ | 本計画の一意 ID（例: `plan-20260321-a7f3`）。 |
| **selectedTaskId** | `string` | ✓ | 入力 Envelope の **taskId**（分割時は **親**または **先頭実行子**を明示）。 |
| **selectedCardName** | `string` | ✓ | 責務上の **1 上位カード名**（Governor の 1 カード = 1 責務と整合）。 |
| **decisionReason** | `string` | ✓ | なぜこの分割・この順序か（短文化）。 |
| **patchScope** | `enum` | ✓ | §4 の **最低分類**のいずれか 1 つ。 |
| **targetFiles** | `string[]` | ✓ | 当計画で変更が許されるパス。**Envelope の targetFiles と整合**し、縮小のみ可（拡大は別 Envelope 要）。 |
| **estimatedRisk** | `enum` | ✓ | `low` \| `medium` \| `high` \| `forbidden`（入力 `riskLevel` を **上回らない**。矛盾時は **入力を正**）。 |
| **executionMode** | `enum` | ✓ | `auto_low_risk_only` \| `manual` \| `review_required` \| `forbid_execute`（`forbidden` → `forbid_execute`）。 |
| **acceptancePlan** | `object[]` | ✓ | Envelope の **acceptanceGates** を **継承・順序保持**したコピー。要素: `{ "id", "kind", "ref" }`（Envelope と同形）。**省略・薄め禁止**。 |
| **rollbackPlan** | `object` | ✓ | Envelope の **rollbackPlan** を **継承**（shallow copy 可）。`summary` / `restoreScope` / `hint` 必須。 |
| **quarantineNeeded** | `boolean` | ✓ | `true` のとき **本番 seal 路線に乗せない**（`quarantinePolicy` が `isolate` / `forbid_merge` のとき真）。 |
| **generatedMicroCards** | `object[]` | ✓ | **子 Envelope 草案**の配列（空可）。各要素は **TenmonSelfBuildTaskEnvelopeV1 の部分木**でよいが、`parentCard` / `microCardGroup` は **入力から継承**（§5）。 |
| **sealCondition** | `string` | ✓ | **seal 可能**の条件（例: 「全 acceptancePlan PASS + no-touch 汚染なし」）。`SEAL_OR_REJECT_JUDGE_V1` と整合。 |
| **rejectCondition** | `string` | ✓ | **却下・実行中止**の条件（例: 「no-touch 混入・mixed 未分割のまま」）。 |
| **nextCardCandidate** | `string` | ✓ | **1 つだけ**。通常は **`SELF_BUILD_EXECUTION_BRIDGE_V1`**。 |
| **operatorHint** | `string` | ✓ | 人間・Agent 向けの **次の一手**（コマンド例は **引用のみ**、実行は Bridge）。 |

---

## 3. `artifactLayer: mixed_forbidden` の分割ルール（必須）

入力 Envelope の **artifactLayer** が **`mixed_forbidden`** のとき、Planner は **単一の `DecisionPlanV1` に「実行可能な targetFiles」を置かない**。代わりに:

1. **2 つ以上の論理ステップ**に分離する:  
   - **ステップ A:** `artifactLayer: "docs"` の **子 Envelope**（`generatedMicroCards` に格納）  
   - **ステップ B:** `artifactLayer: "runtime"` の **子 Envelope**（同様）  
2. **親 `DecisionPlanV1`:**  
   - **patchScope:** `docs-only plan` と `runtime patch plan` の **順序付きバンドル**として `decisionReason` に列挙するか、**先頭子の taskId** を `selectedTaskId` にし、残りを `generatedMicroCards` に並べる。  
3. **acceptancePlan / rollbackPlan / noTouch.paths** は **各子 Envelope にコピー**し、**子ごとに gate を満たす**こと。  
4. **seal 前:** 同一 commit に **docs と runtime を混ぜない**（`SELF_BUILD_CONSTITUTION_AND_POLICY_V1` §7）。

> **自動分解:** 上記は **Planner の必須動作**として明記する（人手が「気づいて分割」するのではなく、**schema 上 mixed_forbidden は常に 2+ 子へ展開**）。

---

## 4. 最低分類（patchScope）

`patchScope` は次の **いずれか 1 語**（表記固定推奨）。

| 値 | 意味 |
|----|------|
| **docs_only_plan** | 憲法・手順・schema のみ。 |
| **forensic_plan** | 観測・証跡固定のみ（コード変更なしまたはログのみ）。 |
| **low_risk_patch_plan** | `LOW_RISK_AUTO_APPLY_SCOPE_V1` の **allowed** に収まる変更。 |
| **runtime_patch_plan** | コード・runner・API 経路。 |
| **acceptance_sweep_plan** | 複数 probe / sweep のみ（変更なしまたはスクリプト追加のみ）。 |
| **quarantine_experiment_plan** | 隔離ブランチ・merge 禁止の実験。 |

複合時は **親 plan の `decisionReason` に列挙**し、**子は別 Envelope + 別 `patchScope`**。

---

## 5. micro-card の継承

`generatedMicroCards[]` 内の各オブジェクトは、少なくとも次を **入力 Envelope から継承**する:

| 継承元（入力） | 継承先（子） |
|----------------|--------------|
| `parentCard` | 同じ文字列（未設定なら `selectedCardName` を親として代入） |
| `microCardGroup` | 同じ文字列（未設定なら `planId` をグループ ID として代入可） |
| `noTouch.paths` | **完全一致コピー**（子で縮小不可・拡大不可） |
| `quarantinePolicy` | 同等または **より厳しい**のみ |
| `acceptanceGates` | 子用に **部分集合**または **同一**（ゲートを削除してはならない） |

---

## 6. executionMode と risk

| estimatedRisk | executionMode（典型） |
|---------------|----------------------|
| `low` | `auto_low_risk_only` 可（Bridge が許す場合のみ） |
| `medium` | `review_required` |
| `high` | `manual` |
| `forbidden` | `forbid_execute` |

---

## 7. JSON 例（mixed 分割後の親 Plan・骨格）

```json
{
  "$schemaHint": "SELF_BUILD_DECISION_PLAN_V1",
  "planId": "plan-20260321-split-01",
  "selectedTaskId": "parent-mixed-01",
  "selectedCardName": "EXAMPLE_BUNDLE_V1",
  "decisionReason": "artifactLayer was mixed_forbidden; split into docs child then runtime child",
  "patchScope": "docs_only_plan",
  "targetFiles": [],
  "estimatedRisk": "low",
  "executionMode": "manual",
  "acceptancePlan": [
    { "id": "g1", "kind": "build", "ref": "npm run build" }
  ],
  "rollbackPlan": { "summary": "per-child restore", "restoreScope": "paths", "hint": "SELF_BUILD_RESTORE_POLICY_V1" },
  "quarantineNeeded": false,
  "generatedMicroCards": [
    { "taskId": "child-docs-01", "artifactLayer": "docs", "parentCard": "EXAMPLE_BUNDLE_V1", "microCardGroup": "plan-20260321-split-01" },
    { "taskId": "child-runtime-01", "artifactLayer": "runtime", "parentCard": "EXAMPLE_BUNDLE_V1", "microCardGroup": "plan-20260321-split-01" }
  ],
  "sealCondition": "Each child envelope passes its acceptancePlan; no no-touch violation; no mixed commit",
  "rejectCondition": "Any child fails or mixed files staged together",
  "nextCardCandidate": "SELF_BUILD_EXECUTION_BRIDGE_V1",
  "operatorHint": "Execute child-docs-01 plan first via Bridge; seal or restore before child-runtime-01"
}
```

（`targetFiles` は子確定後 **非空**に。親がバンドルのみのときは空可だが **acceptancePlan は必ず継承**する。）

---

## 8. 次カード（唯一）

**`SELF_BUILD_EXECUTION_BRIDGE_V1`** — `DecisionPlanV1` → **`ExecutionDispatchV1`** へ変換し、**実行器へ dispatch**する（本書は **`DecisionPlanV1` の生成まで**）。  
**続き:** 実行後の **acceptance 集約・rollback・seal/reject** は **`SELF_BUILD_ACCEPTANCE_AND_ROLLBACK_V1`**。

---

## 9. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | DecisionPlanV1 入力出力・mixed 分割・micro 継承・patchScope 最低分類・Execution Bridge 接続 |
| V1.1 | §8 に Bridge 出力名と Acceptance/Rollback 次段を明示 |
