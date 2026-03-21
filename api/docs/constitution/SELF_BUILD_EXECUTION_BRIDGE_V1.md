# SELF_BUILD_EXECUTION_BRIDGE_V1

**MODE:** `DOCS_FIRST` → 必要時のみ `MIN_DIFF_PATCH`（本書は **dispatch 契約**。**commit / seal / reject の裁定は `SELF_BUILD_ACCEPTANCE_AND_ROLLBACK_V1`**）  
**上位:** `SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md`  
**入力:** `SELF_BUILD_DECISION_AND_PATCH_PLANNER_V1.md` の **`DecisionPlanV1`**  
**版:** V1  
**目的:** `DecisionPlanV1` を **実行器ごとの安全な指示**に変換し、**自動と人力の境界**・**証拠束**・**acceptance / rollback 呼び出し**を固定する。

---

## 0. 層の分離（必須）

| 層 | やること | やらないこと |
|----|----------|--------------|
| **Bridge（本書）** | `ExecutionDispatchV1` を生成し、**どの器に何を渡すか**を固定 | **実装内容の確定**、**commit / seal の決定** |
| **実行器** | dispatch に従いパッチ適用・コマンド実行・観測 | 憲法違反の独自判断 |
| **Acceptance / Rollback 束** | `acceptanceHook` / `rollbackHook` の結果で **seal_candidate 等** | dispatch の再定義 |

**禁止:** Bridge が **同一ターンで**「実装方針」と「seal 可否」を両方確定する。

---

## 1. 入出力（一意）

| 方向 | 型名 | 説明 |
|------|------|------|
| **入力** | `DecisionPlanV1` | Planner 出力（`$schemaHint: SELF_BUILD_DECISION_PLAN_V1`）。 |
| **出力** | **`ExecutionDispatchV1`** | 本書 §2。**正規 dispatch はこの型のみ**（`$schemaHint: SELF_BUILD_EXECUTION_DISPATCH_V1` 推奨）。 |

---

## 2. ExecutionDispatchV1 — フィールド（必須）

| キー | 型（論理） | 必須 | 説明 |
|------|------------|------|------|
| **dispatchId** | `string` | ✓ | dispatch の一意 ID。 |
| **planId** | `string` | ✓ | 入力 `DecisionPlanV1.planId`。 |
| **executionTarget** | `enum` | ✓ | §3 の **最低分類**のいずれか。 |
| **executionMode** | `enum` | ✓ | 入力 `DecisionPlanV1.executionMode` を **継承**（`auto_low_risk_only` \| `manual` \| `review_required` \| `forbid_execute`）。 |
| **allowedTools[]** | `string[]` | ✓ | 許可する実行器ラベル（例: `cursor`, `shell`, `browser`, `gpt`, `gemini`, `cloud_code`）。**空は「実行禁止」**。 |
| **blockedTools[]** | `string[]` | ✓ | 明示禁止（例: 計画が `forbid_execute` なら `["*"]` 相当を文書化）。 |
| **targetFiles** | `string[]` | ✓ | 入力の **targetFiles** を継承。**no-touch パスが 1 つでも含まれる dispatch は生成禁止**（§6）。 |
| **patchApplicationStyle** | `enum` | ✓ | §4。 |
| **acceptanceHook** | `string` | ✓ | 受入の呼び出し方法（**スクリプトパス**、または **カード記載コマンドへの参照 ID**）。**空禁止**。 |
| **rollbackHook** | `string` | ✓ | 失敗時の restore 手順参照（例: `SELF_BUILD_RESTORE_POLICY_V1` + 具体 `git restore` パス）。**空禁止**。 |
| **evidenceBundlePath** | `string` | ✓ | 当実行の **ログ・json・diff 要約**を格納する **ディレクトリまたはプレフィックスパス**（毎回必須。未作成なら「作成してから実行」）。 |
| **quarantineTarget** | `string` \| `null` | ✓ | 隔離ブランチ名や作業ツリー識別子。不要なら `null`。`quarantineNeeded===true` のとき **非 null 推奨**。 |
| **requiresHumanApproval** | `boolean` | ✓ | §5 の基準で決定。 |
| **operatorMessage** | `string` | ✓ | 入力 `operatorHint` を **具体化**した短い指示（人間・Agent 共用）。 |

---

## 3. executionTarget（最低分類）

| 値 | 主な器 | 用途 |
|----|--------|------|
| **cursor_patch** | Cursor | **パッチ反映の主力**（`patchApplicationStyle` に従う）。 |
| **shell_build_acceptance** | shell | **限定:** `build` / `health` / **acceptance スクリプト** / `restore` / **audit** のみ。 |
| **browser_observe** | browser | **原則観測**（UI・network・console）。本番改変の主手段にしない。 |
| **llm_compare_only** | GPT / Gemini / Cloud Code | **比較・草案・補助のみ**。**最終承認権ではない**。 |
| **docs_write** | Cursor またはエディタ | 憲法・手順・schema のみ。 |
| **quarantine_experiment** | 上記の組合せ | **隔離**下での試行。merge 禁止を `operatorMessage` に明記。 |

---

## 4. patchApplicationStyle

| 値 | 意味 |
|----|------|
| **docs_only** | `*.md` / docs パスのみ。 |
| **min_diff_patch** | 限定ファイル・最小差分。 |
| **low_risk_runtime** | `LOW_RISK_AUTO_APPLY_SCOPE_V1` の allowed に収まる runtime 変更。 |
| **forbidden** | **適用しない**（dispatch は **観測・ドキュメントのみ**に落とすか、`forbid_execute`）。 |

---

## 5. requiresHumanApproval（true にする基準）

次の **いずれか**に該当すれば **`true`**（自動単独実行不可）。

| 条件 |
|------|
| `estimatedRisk` が **high** または **forbidden**（入力 Plan から継承） |
| **will / meaning / beauty / worldview** の **主幹**変更が含まれる（カード宣言または path パターンで判定） |
| **DB schema**（特に `api/src/db/kokuzo_schema.sql` および憲法 no-touch）に触れる可能性 |
| **backup / restore 主幹** |
| **external source 本番接続** |
| **quarantine 解除**（隔離→本番路線への合流） |
| `executionMode` が **`manual`** または **`review_required`** |

---

## 6. 自動実行可能条件（すべて満たすときのみ `auto` 系）

1. **low risk**（Plan の `estimatedRisk === "low"`）。  
2. **no-touch 非侵害**（`targetFiles` と `noTouch.paths` の交差なし。Envelope 由来）。  
3. **mixed_forbidden 未解消のままではない**（Planner により **docs/runtime 分離済み**）。  
4. **acceptancePlan / rollbackPlan** が Plan に存在し、dispatch の **acceptanceHook / rollbackHook** に写像済み。  
5. **quarantineNeeded** が false、または **quarantineTarget** が明示され **本番ブランチと分離**されている。  
6. **patchApplicationStyle** が `forbidden` でない。  
7. **executionMode** が `auto_low_risk_only`。

---

## 7. 外部実行器ポリシー（再掲）

| 器 | 役割 |
|----|------|
| **Cursor** | パッチ主力。**high-risk は `requiresHumanApproval===true`**。 |
| **shell** | §3 の **限定コマンド群**のみ。 |
| **browser** | **観測**が原則。 |
| **GPT / Gemini / Cloud Code** | **比較・提案・補助**（`llm_compare_only`）。承認・seal は行わない。 |

---

## 8. no-touch・mixed（dispatch 生成ゲート）

- **no-touch を跨ぐ dispatch**（`targetFiles` に no-touch が含まれる）は **生成禁止**。  
- **mixed_forbidden** の Plan は **Planner で分割済み**の **単一 artifactLayer** の子に対してのみ dispatch を出す。  
- **証拠:** **`evidenceBundlePath` は毎回必須**。実行前にディレクトリ確保を `operatorMessage` に含めてよい。

---

## 9. JSON 例（最小）

```json
{
  "$schemaHint": "SELF_BUILD_EXECUTION_DISPATCH_V1",
  "dispatchId": "disp-20260321-01",
  "planId": "plan-20260321-split-01",
  "executionTarget": "shell_build_acceptance",
  "executionMode": "manual",
  "allowedTools": ["shell"],
  "blockedTools": ["browser", "gpt"],
  "targetFiles": ["api/src/routes/chat.ts"],
  "patchApplicationStyle": "min_diff_patch",
  "acceptanceHook": "api/scripts/patch29_probe_8_sweep.sh",
  "rollbackHook": "SELF_BUILD_RESTORE_POLICY_V1 + git restore listed paths",
  "evidenceBundlePath": "/tmp/tenmon_dispatch/disp-20260321-01",
  "quarantineTarget": null,
  "requiresHumanApproval": true,
  "operatorMessage": "Run acceptanceHook after patch; store stdout under evidenceBundlePath"
}
```

---

## 10. 次カード（唯一）

**`SELF_BUILD_ACCEPTANCE_AND_ROLLBACK_V1`** — dispatch 実行後の **`AcceptanceRollbackResultV1`** 生成・**裁定前段**まで（続く束は同書 §10）。

---

## 11. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | ExecutionDispatchV1・実行器政策・自動条件・次カード接続 |
| V1.1 | §10 に Acceptance 出力型名を追記 |
