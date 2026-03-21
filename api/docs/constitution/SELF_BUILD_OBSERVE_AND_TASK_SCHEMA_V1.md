# SELF_BUILD_OBSERVE_AND_TASK_SCHEMA_V1

**MODE:** `DOCS_FIRST` → 必要時のみ `MIN_DIFF_PATCH`（本書は **schema 定義**。**runtime の型実装は別カード**）  
**上位憲法:** `SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md`（**矛盾時は上位を正**し、本書を追随修正）  
**版:** V1  
**目的:** **観測 → classify → plan → execute → acceptance → rollback** の全行程で、自己構築 OS が **同一の task envelope** を読み書きできるようにする。

---

## 0. スキーマの一意性

| 項目 | 値 |
|------|-----|
| **正規 task 型名** | `TenmonSelfBuildTaskEnvelopeV1`（論理名。JSON ではルートオブジェクト `$schemaHint`: `SELF_BUILD_TASK_ENVELOPE_V1` を推奨） |
| **正規本文書** | **本ファイルのみ**（examples は §12 を参照。別ファイルに分割しない） |

---

## 1. taskType（分類・必須扱い）

`taskType` は次の **いずれか 1 つ**（大文字アンダースコア推奨）。

| taskType | 意味 | 典型の acceptanceGates |
|----------|------|------------------------|
| **FORENSIC** | 観測・ログ採取・差分の事実固定 | 手動または `FORENSIC_*` スクリプト、成果物パス |
| **DOCS_ONLY** | 憲法・手順・schema のみ | `npm run build` のみ可、health 任意 |
| **MIN_DIFF_PATCH** | 限定ファイルの最小コード差分 | build + health + カード定義の probe |
| **RUNTIME** | API / chat 経路・runner の実行時変更 | build + health + PATCH29 等 |
| **ACCEPTANCE_SWEEP** | 複数ルート／束の一括検証 | `FINAL_MAINLINE_STABILITY_SWEEP_V1` 等 |
| **AUTONOMOUS_BUNDLE** | 上位カード内 micro-card 群の束 | 束ごとの集約 gate + 子 taskId 列 |
| **QUARANTINE_EXPERIMENT** | 本番・seal 外の実験 | merge 禁止フラグ、quarantinePolicy 必須 |

---

## 2. フィールド定義（必須項目）

すべて **キーは下表どおり**（省略不可。未知キーは **無視してよい**と明記する runner のみ許容）。

| キー | 型（論理） | 必須 | 説明 |
|------|------------|------|------|
| **taskId** | `string` (UUID または `card-ts-slug`) | ✓ | タスクの一意 ID。micro-card は親と接頭辞共有可。 |
| **taskType** | `enum` §1 | ✓ | 分類。 |
| **artifactLayer** | `enum` | ✓ | `docs` \| `runtime` \| `mixed_forbidden`（§3）。 |
| **mode** | `string` | ✓ | カード MODE と整合（例: `DOCS_ONLY`, `MIN_DIFF_PATCH`, `FORENSIC`, `RESEAL`）。 |
| **targetArea** | `string` | ✓ | 粗い領域（例: `constitution`, `chat_mainline`, `scripts_acceptance`, `memory`, `kokuzo_connector`）。 |
| **targetFiles** | `string[]` | ✓ | 触ってよいパスの **明示リスト**（空は「未定義＝実行禁止」）。Governor の上限に従う。 |
| **riskLevel** | `enum` | ✓ | `low` \| `medium` \| `high` \| `forbidden`。`LOW_RISK_AUTO_APPLY_SCOPE_V1` と対応づける。 |
| **noTouch** | `object` | ✓ | `{ "paths": string[], "compliant": boolean }` — `paths` は **侵害してはならない**パス列（例: `api/src/db/kokuzo_schema.sql`）。`compliant` は計画時点での遵守宣言。 |
| **expectedEvidence** | `object[]` | ✓ | 期待する証跡。要素例: `{ "kind": "log"\|"json"\|"sqlite_row"\|"diff", "pathOrRef": string, "required": boolean }`。 |
| **acceptanceGates** | `object[]` | ✓ | **順序あり**。要素: `{ "id": string, "kind": "build"\|"health"\|"script"\|"manual", "ref": string }`。`script` の `ref` はリポジトリ内スクリプトパスまたはカード記載コマンド。 |
| **rollbackPlan** | `object` | ✓ | `{ "summary": string, "restoreScope": "paths"\|"commit"\|"branch", "hint": string }`。 |
| **quarantinePolicy** | `enum` | ✓ | `inherit`（上位憲法どおり）\| `isolate`（専用ブランチ・merge 禁止）\| `forbid_merge`（PR 禁止明示）。 |
| **sourceOfTruth** | `string` | ✓ | 裁定の根拠文書または入力（例: `SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md`、Founder 要望 ID、forensic ログパス）。 |
| **generatedBy** | `enum` | ✓ | `human` \| `agent` \| `runner` \| `planner` \| `classifier` \| `self_learning` |
| **requestedBy** | `enum` | ✓ | `founder` \| `system` \| `operator` \| `classifier` |
| **parentCard** | `string` \| `null` | ✓ | 上位カード名（micro-card 時は親）。ルートタスクは `null` 可。 |
| **microCardGroup** | `string` \| `null` | ✓ | 上位束のグループ ID（例: `MAINLINE_AUTOFIX_BUNDLE_V1:wave3`）。単独タスクは `null`。 |
| **status** | `enum` | ✓ | `draft` \| `queued` \| `running` \| `blocked` \| `pass` \| `fail` \| `rollback` \| `sealed` |
| **nextCardCandidate** | `string` | ✓ | **1 つだけ**（Governor 整合）。未確定は `"TBD"` 可だが seal 前に確定必須。 |

---

## 3. docs / runtime 混在禁止（envelope 上の表現）

**artifactLayer**（§2 表の必須キー）:

| 値 | 意味 |
|----|------|
| **docs** | `targetFiles` は `*.md` / `docs/**` のみ（または憲法が許す docs パスのみ）。 |
| **runtime** | `targetFiles` はコード・設定・スクリプト（非 docs 主）。 |
| **mixed_forbidden** | **1 タスク内で docs と runtime を同時に変更しない**ことを宣言するプレースホルダ。実際に両方要る場合は **task を分割**し、別 `taskId` にする。 |

> **seal 規則:** `artifactLayer: "mixed_forbidden"` のまま **pass / sealed** にしてはならない。Planner は **2 以上の envelope** に分割する（次カード `SELF_BUILD_DECISION_AND_PATCH_PLANNER_V1`）。

---

## 4. JSON 例（最小・DOCS_ONLY）

```json
{
  "$schemaHint": "SELF_BUILD_TASK_ENVELOPE_V1",
  "taskId": "docs-20260321-constitution-index",
  "taskType": "DOCS_ONLY",
  "mode": "DOCS_ONLY",
  "artifactLayer": "docs",
  "targetArea": "constitution",
  "targetFiles": ["api/docs/constitution/EXAMPLE.md"],
  "riskLevel": "low",
  "noTouch": {
    "paths": ["api/src/db/kokuzo_schema.sql", "dist/"],
    "compliant": true
  },
  "expectedEvidence": [
    { "kind": "log", "pathOrRef": "npm run build exit 0", "required": true }
  ],
  "acceptanceGates": [
    { "id": "g1", "kind": "build", "ref": "npm run build" }
  ],
  "rollbackPlan": {
    "summary": "git restore paths",
    "restoreScope": "paths",
    "hint": "SELF_BUILD_RESTORE_POLICY_V1"
  },
  "quarantinePolicy": "inherit",
  "sourceOfTruth": "SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md",
  "generatedBy": "human",
  "requestedBy": "operator",
  "parentCard": null,
  "microCardGroup": null,
  "status": "draft",
  "nextCardCandidate": "SELF_BUILD_DECISION_AND_PATCH_PLANNER_V1"
}
```

---

## 5. Founder request の射影

Founder 自然文は **そのまま envelope に入れない**。変換規則:

| Founder 入力 | envelope への埋め方 |
|--------------|---------------------|
| 要望本文 | `sourceOfTruth` に **要望 ID + 要約** または `FOUNDER_REQUEST_BOX_V1` の参照 |
| **requestedBy** | 常に `founder`（システム代理なら `operator` + メタ注記） |
| **taskType** | Priority Judge + 内容から決定（未確定は `draft` + `blocked`） |
| **targetFiles** | 空なら **実行禁止**（Planner が補完するまで `queued` にしない） |

---

## 6. SELF_BUILD_FAILURE_CLASSIFIER の射影

| classifier 型（既存） | 推奨 taskType | riskLevel（目安） |
|-------------------------|---------------|-------------------|
| bug | MIN_DIFF_PATCH または RUNTIME | medium |
| residual | AUTONOMOUS_BUNDLE または MIN_DIFF_PATCH | medium |
| route drift | RUNTIME + ACCEPTANCE_SWEEP | high |
| responsePlan missing | RUNTIME | high |
| projector drift | RUNTIME | high |
| connector failure | RUNTIME（+ infra タスク分割） | high |
| infra failure | RUNTIME（ops 分離） | high |
| rejected | **タスク実行せず** status `blocked`、quarantinePolicy `forbid_merge` | forbidden |

**generatedBy:** `classifier`、**expectedEvidence:** 元の FAIL ログを `expectedEvidence` に必須で付与。

---

## 7. self-learning / low-risk auto apply の射影

| ソース | generatedBy | riskLevel | taskType |
|--------|---------------|-----------|----------|
| self-learning ルール提案 | `self_learning` | `low` 以外は人間レビュー待ち | MIN_DIFF_PATCH |
| LOW_RISK auto_apply_allowed | `runner` | `low` | MIN_DIFF_PATCH または DOCS_ONLY |
| auto_apply_review_required | `agent` | `medium` | RUNTIME 等（承認ゲートを acceptanceGates に明示） |
| auto_apply_forbidden | — | `forbidden` | **envelope 生成のみ禁止** または QUARANTINE_EXPERIMENT |

---

## 8. micro-card（上位カード内）

- **parentCard:** 上位カード名（必須）  
- **microCardGroup:** 同一波の micro タスクを束ねる ID  
- **taskId:** 親接頭辞 + 短 slug（例: `MAINLINE_AUTOFIX_V1:m1-typo`）  
- **acceptanceGates:** 親より **狭い** gate 可（集約 PASS は親の `ACCEPTANCE_SWEEP` で定義）  
- 上位 **AUTONOMOUS_BUNDLE** 型タスクは **子 taskId の配列**を `expectedEvidence` または拡張フィールド `childTaskIds`（任意・runner が許す場合）に保持してよい。

---

## 9. ライフサイクル（観測〜rollback）

```
observe → envelope 作成/更新 (status: draft)
       → classify (taskType, riskLevel, artifactLayer)
       → plan → **DecisionPlanV1**（`SELF_BUILD_DECISION_AND_PATCH_PLANNER_V1.md`）
       → execute（`SELF_BUILD_EXECUTION_BRIDGE_V1`）(status: running)
       → acceptanceGates 順評価
       → pass | fail → rollbackPlan / RESTORE_POLICY
       → sealed（人間確認後、SEAL_OR_REJECT_JUDGE 整合）
```

---

## 10. 次カード（唯一）

**`SELF_BUILD_DECISION_AND_PATCH_PLANNER_V1`** — Envelope を **`DecisionPlanV1`** に変換する（続く実行は **`SELF_BUILD_EXECUTION_BRIDGE_V1`**）。

---

## 11. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | Task envelope 必須キー、taskType 7 種、Founder/classifier/self-learning 射影、docs-runtime、次カード接続 |
| V1.1 | ライフサイクルに DecisionPlanV1 / Execution Bridge を明示 |
