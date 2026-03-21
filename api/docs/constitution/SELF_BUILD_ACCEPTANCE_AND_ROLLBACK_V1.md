# SELF_BUILD_ACCEPTANCE_AND_ROLLBACK_V1

**MODE:** `DOCS_FIRST` → 必要時のみ `MIN_DIFF_PATCH`（本書は **裁定前段の schema**。**seal / reject / retry / deferred の最終確定は `SEAL_OR_REJECT_JUDGE_V1`**）  
**上位:** `SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md`  
**入力:** `SELF_BUILD_EXECUTION_BRIDGE_V1.md` の **`ExecutionDispatchV1`**（**実行完了後**の観測・ログ・exit code を添える）  
**版:** V1  
**目的:** dispatch 実行後の **acceptance 集約・rollback 判定・quarantine 継続/昇格停止・seal/reject への委譲条件**を **`AcceptanceRollbackResultV1` として一意に固定**する。

---

## 0. 地位（Bridge との分界）

| 層 | 担当 |
|----|------|
| **Execution Bridge** | `ExecutionDispatchV1` の生成・実行器への **dispatch まで** |
| **本書（Acceptance / Rollback 前段）** | 実行結果の **整理**、`AcceptanceRollbackResultV1` の生成、**停止・rollback トリガ**の適用 |
| **SEAL_OR_REJECT_JUDGE_V1** | `sealCandidate` / `rejectCandidate` / `deferredCandidate` を **入力**とし、**最終裁定**（4 値）を出す |

**禁止:** 本書だけで **commit / seal を確定**する（Judge を飛ばさない）。

---

## 1. 入出力（一意）

| 方向 | 型名 |
|------|------|
| **入力** | `ExecutionDispatchV1` + **実行メトリクス**（build/health/gate ごとの exit・ログパス。運用で JSON に埋め込む） |
| **出力** | **`AcceptanceRollbackResultV1`**（`$schemaHint: SELF_BUILD_ACCEPTANCE_ROLLBACK_RESULT_V1`） |

---

## 2. AcceptanceRollbackResultV1 — フィールド（必須）

| キー | 型 | 必須 | 説明 |
|------|-----|------|------|
| **resultId** | `string` | ✓ | 本結果の一意 ID。 |
| **dispatchId** | `string` | ✓ | 入力 `dispatchId`。 |
| **buildResult** | `enum` | ✓ | `pass` \| `fail` \| `skipped`（skipped はカード明示時のみ）。 |
| **healthResult** | `enum` | ✓ | `pass` \| `fail` \| `skipped`。 |
| **acceptanceResults[]** | `object[]` | ✓ | §3。**少なくとも dispatch の acceptance に対応する 1 要素以上**（該当なしは空可だが **evidence 未成立時は別ルール**）。 |
| **rollbackTriggered** | `boolean` | ✓ | §5 のいずれかで真。 |
| **rollbackReason** | `string` | ✓ | 空可としない。トリガ無しは `"none"`。 |
| **rollbackActionRef** | `string` | ✓ | `rollbackHook` または RESTORE_POLICY への参照 + 具体コマンド要約。 |
| **quarantineStatus** | `enum` | ✓ | `not_applicable` \| `hold` \| `promote_blocked` \| `cleared`（§6）。 |
| **sealCandidate** | `boolean` | ✓ | **Judge への入力**。§7 で偽に落とす条件あり。 |
| **rejectCandidate** | `boolean` | ✓ | Judge 入力。§5 で真になりうる。 |
| **deferredCandidate** | `boolean` | ✓ | Judge 入力（人間レビュー待ち等）。 |
| **evidenceBundleVerified** | `boolean` | ✓ | `evidenceBundlePath` が **実在し**、最低限のログが格納されている。 |
| **noTouchViolation** | `boolean` | ✓ | no-touch 侵害検知。 |
| **mixedViolation** | `boolean` | ✓ | docs/runtime **同一 commit / staged 混在** 等。 |
| **pathClassification** | `enum` | ✓ | §4（**最低分類**）。 |
| **nextCardCandidate** | `string` | ✓ | 通常 **`SELF_EVOLUTION_AUTOBUNDLE_V1`**（束 D）。束 C は **`EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1.md`**。束 B **`MEMORY_AND_PERSONA_AUTOBUNDLE_V1.md`**。主線 **`MAINLINE_AUTOFIX_BUNDLE_V1.md`**。未適用時は `TBD`。 |
| **operatorSummary** | `string` | ✓ | 人手向け 1〜5 行要約。 |

---

## 3. acceptanceResults[]（最低項目）

各要素は次を **すべて**含む。

| キー | 説明 |
|------|------|
| **gateId** | Plan / dispatch 側の gate id に対応。 |
| **gateKind** | `build` \| `health` \| `script` \| `manual` 等。 |
| **gateRef** | スクリプトパスまたはコマンド参照。 |
| **status** | `pass` \| `fail` \| `skipped`。 |
| **evidenceRef** | `evidenceBundlePath` 配下の相対パスまたは URI。 |
| **notes** | 失敗理由 1 行など。 |

---

## 4. pathClassification（最低分類）

| 値 | 条件（要約） |
|----|----------------|
| **success_path** | build/health pass、**evidenceBundleVerified**、acceptance 全 pass、侵害なし、**quarantine で seal 阻害なし**。 |
| **rollback_path** | §5 の rollback トリガのいずれか。**rollbackTriggered=true**。 |
| **quarantine_hold_path** | dispatch の **quarantineNeeded** または **quarantineTarget** により **本番 seal 路線を止める**状態が継続。 |
| **deferred_review_path** | `requiresHumanApproval` かつ機械 gate は pass、**人間裁定待ち**。`deferredCandidate=true` になりやすい。 |
| **reject_path** | no-touch / mixed / 憲法違反確定。**rejectCandidate=true**、rollback 併発可。 |

**排他優先（推奨）:** `reject_path` > `rollback_path` > `quarantine_hold_path` > `deferred_review_path` > `success_path`。

---

## 5. rollback トリガ（いずれかで rollbackTriggered=true）

| トリガ | rollbackReason 例 |
|--------|-------------------|
| build FAIL | `build_fail` |
| health FAIL | `health_fail` |
| **route mismatch**（acceptance 定義の期待 route 不一致） | `route_mismatch` |
| **responsePlan 欠落**（契約検知） | `response_plan_missing` |
| **empty drop**（本文・ku 骨格の空落ち） | `empty_drop` |
| **cross-user memory 混線** | `memory_cross_user` |
| **restore 不可**（S9 相当） | `restore_impossible` |
| **no-touch 侵害** | `no_touch_violation` |
| **mixed 違反** | `mixed_violation` |
| **evidenceBundlePath 未生成・未検証**（`evidenceBundleVerified=false`） | `evidence_missing` → **acceptance 未成立** |
| **low-risk 自動適用でも gate 1 つでも fail** | `acceptance_fail` |

**即時:** no-touch 侵害・mixed 違反は **`rejectCandidate=true`** を **推奨**（Judge に委譲）。

---

## 6. quarantine（継続 / 昇格停止）

| quarantineStatus | 意味 |
|------------------|------|
| **not_applicable** | dispatch が隔離不要。 |
| **hold** | **quarantineNeeded=true** 相当が継続。本番 merge / **seal 主線に載せない**。 |
| **promote_blocked** | 昇格（本番路線）を **明示禁止**（カードまたは Founder 指示）。 |
| **cleared** | 隔離解除 **候補**（Judge が最終）。 |

**規則:** dispatch 元 Plan で **quarantineNeeded=true** のとき、**sealCandidate は true にしてはならない**（偽固定）。

---

## 7. sealCandidate / rejectCandidate / deferredCandidate（Judge 入力）

本書は **候補フラグのみ**を立てる。**最終裁定は `SEAL_OR_REJECT_JUDGE_V1`**。

| 規則 | sealCandidate |
|------|----------------|
| §5 トリガのいずれか | **false** |
| evidenceBundleVerified=false | **false** |
| noTouchViolation または mixedViolation | **false**（rejectCandidate 真推奨） |
| quarantineStatus が `hold` または `promote_blocked` | **false** |
| 上記なし・全 gate pass | **true**（Judge が `seal_candidate` になりうる） |

**deferred:** 人間承認残・Canon deferred 等 → `deferredCandidate=true`、`sealCandidate=false`。

---

## 8. JSON 例（骨格）

```json
{
  "$schemaHint": "SELF_BUILD_ACCEPTANCE_ROLLBACK_RESULT_V1",
  "resultId": "arr-20260321-01",
  "dispatchId": "disp-20260321-01",
  "buildResult": "pass",
  "healthResult": "pass",
  "acceptanceResults": [
    {
      "gateId": "g1",
      "gateKind": "script",
      "gateRef": "api/scripts/patch29_probe_8_sweep.sh",
      "status": "pass",
      "evidenceRef": "patch29/summary.txt",
      "notes": ""
    }
  ],
  "rollbackTriggered": false,
  "rollbackReason": "none",
  "rollbackActionRef": "SELF_BUILD_RESTORE_POLICY_V1",
  "quarantineStatus": "not_applicable",
  "sealCandidate": true,
  "rejectCandidate": false,
  "deferredCandidate": false,
  "evidenceBundleVerified": true,
  "noTouchViolation": false,
  "mixedViolation": false,
  "pathClassification": "success_path",
  "nextCardCandidate": "SELF_EVOLUTION_AUTOBUNDLE_V1",
  "operatorSummary": "All gates pass; hand to SEAL_OR_REJECT_JUDGE_V1"
}
```

---

## 9. SEAL_OR_REJECT_JUDGE_V1 への接続

本結果を **そのまま（または要約 JSON として）** Judge に渡す。

- **sealCandidate** → Judge の `seal_candidate` 判定の **入力**  
- **rejectCandidate** → `rejected` 系の **入力**  
- **deferredCandidate** → `deferred` の **入力**  
- **rollbackTriggered** → 通常 **`retry_required`** 側の材料（RESTORE_POLICY と併用）

---

## 10. 次カード（唯一）

**`SELF_EVOLUTION_AUTOBUNDLE_V1`** — 自己進化束。  
**束 C の実体:** **`EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1.md`**  
**束 B:** **`MEMORY_AND_PERSONA_AUTOBUNDLE_V1.md`**  
**主線束:** **`MAINLINE_AUTOFIX_BUNDLE_V1.md`**

---

## 11. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | AcceptanceRollbackResultV1・分類・トリガ・quarantine・Judge 接続・MAINLINE 次カード |
| V1.1 | §2 `nextCardCandidate` 既定を `MEMORY_AND_PERSONA_AUTOBUNDLE_V1` に更新。§10・JSON 例を追随。主線束は `MAINLINE_AUTOFIX_BUNDLE_V1.md` を参照。 |
| V1.2 | §2 `nextCardCandidate` 既定を `EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1` に更新。§10・JSON 例を追随。束 B は `MEMORY_AND_PERSONA_AUTOBUNDLE_V1.md`。 |
| V1.3 | §2 `nextCardCandidate` 既定を `SELF_EVOLUTION_AUTOBUNDLE_V1` に更新。§10・JSON 例を追随。束 C は `EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1.md`。 |
