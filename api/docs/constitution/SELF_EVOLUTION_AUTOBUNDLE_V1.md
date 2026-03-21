# SELF_EVOLUTION_AUTOBUNDLE_V1

**MODE:** `AUTONOMOUS_BUNDLE`（内部は **micro-card 自動生成**）  
**上位カード本文:** `DOCS_FIRST` → 必要時のみ `MIN_DIFF_PATCH`（**本ファイルは束の scope・micro-card 契約を固定**。runtime 改修は **micro-card ごとに分割コミット**）  
**上位憲法:** `SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md`  
**パイプライン位置:** **第 4 実働束（束 D）** — `EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1`（束 C）runtime 完了後に、**自己学習・seed 利用・進化 ledger・最適化**を散発カードではなく **1 束 + micro-card 列**で安全側から束ねる。  

---

## 0. 目的と境界

| 項目 | 内容 |
|------|------|
| **目的** | **self-learning の runtime 実効**、**seed / cluster / apply_log / training の利用率観測**、**evolution ledger の定義と実証**、**meta optimizer の入口**までを、**記録止まりにしない**形で束化する。 |
| **効果の定義** | **学習記録があるだけでは PASS にしない**。**次回生成**において **`routeReason` / `sourcePack`（または `sourceStackSummary.sourceKinds`）/ `densityContract`（密度）/ `responsePlan`・本文プローズ（prose 代理指標）** の **いずれかが、ベースライン対して意図した方向に変化**していること（A/B または before/after を証跡に残す）。 |
| **禁止** | **will / meaning / beauty 主幹思想変更**、**schema 主幹 / dist 手編集 / no-touch 侵害**、**quarantine 候補の本番昇格**。 |
| **継承** | `SELF_BUILD_RESTORE_POLICY_V1` / `SEAL_OR_REJECT_JUDGE_V1`（昇格判定）· 束 C の **user scope / isolation** 前提を壊さない。 |

---

## 1. 統合対象（少なくとも含む）

| ラベル | 役割（要約） | 実装・正本の目安（参照用） |
|--------|----------------|----------------------------|
| **SELF_LEARNING_TO_RULE_FEEDBACK_V1** | kanagi 観測 → 機械可読バンドル → ledger | `api/src/core/selfLearningRuleFeedbackV1.ts`（`buildSelfLearningRuleFeedbackV1` / `tryHydratePriorRuleFeedbackV1`） |
| **SELF_LEARNING_RULE_BINDER_V1** | `priorSelfLearningRuleFeedbackV1` を density / source 束に **非破壊反映** | `applySelfLearningRuleBinderV1`（同一ファイル） |
| **SEED_LEARNING_EFFECT_AUDIT_V1** | seed / cluster の **利用・スコア変化**の観測 | `khs_seed_clusters`・`chat.ts`（KG1/KG2 付近）· `api/src/engines/learning/trainerEngine.ts` |
| **EVOLUTION_LEDGER_V1** | 「進化」の **append-only 記録**と **次ターンへの還流** | `kanagi_growth_ledger`（`kanagiGrowthLedger.ts`）· `SELF_LEARNING_RFB_LEDGER_MARKER` |
| **META_OPTIMIZER_V1** | 複数 ledger / 指標から **次の改善候補**を **構造化出力**（本番 route 変更は governor 下） | **本束で契約固定**（専用 probe API または **読み取り専用**スクリプトを micro-card 6 で実装） |
| **INTELLIGENCE_OS_MASTER_AUDIT_V1** | 系全体の **増幅点 / 残差**の **監査スナップショット** | **本束で契約固定**（audit JSON のスキーマと必須キーを micro-card 7 で検証） |

（個別カードの詳細仕様は **別 MD / 実装コメント**が正本。本書は **索引・実行順・acceptance** を担当。）

---

## 2. 不変ルール（最上位）

1. **1 micro-card = 1 責務 = 1 acceptance** — 複合判定は **束レベル集約**に書き分け、micro の `envelope.json` は **1 行の acceptancePlan** に収める。  
2. **FAIL** → **rollback → forensic → retry**（`SELF_BUILD_RESTORE_POLICY_V1`）。**PASS のみ**次へ。  
3. **記録のみ禁止** — DB INSERT や ledger 行の存在だけでは **PASS にしない**（§0「効果の定義」）。  
4. **quarantine / proposed** は **本番 mainline に直結させない** — 観測は **read-only** または **staging フラグ**に限定。  
5. **micro-card ごと**に `acceptancePlan` / `rollbackPlan` / `evidenceBundlePath`（または `expectedEvidence`）を **必須**。`parentCard` は **`SELF_EVOLUTION_AUTOBUNDLE_V1`**。  
6. **mainline 保護** — 学習系変更後も **既存 mainline プローブ**（束 B/C で定義した baseline）が **回帰しない**こと（束レベル acceptance）。  

---

## 3. micro-card 最低 7 件（実行順 1→7 固定）

| # | ID | 責務 | 主な acceptance（例） |
|---|----|------|------------------------|
| 1 | **self_learning_runtime_feedback_check** | self-learning が **runtime で可視**であること | 代表ターンの `ku` に **`kanagiSelf` 等の観測入力**があり、`buildSelfLearningRuleFeedbackV1` 相当の **機械可読フィールド**（`ruleHintCodes` 等）が **空でない**、または **ledger 書き込み条件**が満たされるターンで **`unresolved_class = SELF_LEARNING_RFB_V1` の行**が **1 件以上** |
| 2 | **rule_binder_runtime_effect_check** | **RULE_BINDER** が **ku に効く**こと | **`priorSelfLearningRuleFeedbackV1`** が存在する状態で `applySelfLearningRuleBinderV1` 後、`densityContract` / `sourceStackSummary.sourceKinds` / `thoughtCoreSummary.priorGrowthAxisHints` の **いずれかが prior なし時と差分**（証跡に before/after JSON） |
| 3 | **seed_learning_effect_probe** | **seed / cluster** の **実利用** | `khs_seed_clusters`（または同等）に **参照可能な行**があり、**usageScore または lastAppliedAt 等**が **ベースラインから更新**されている、または **TRUTH/KHS 経路**で **seed が選択されたログ**が証跡に残る |
| 4 | **apply_log_to_usage_effect_probe** | **apply_log → training/集計** の **実効** | `khs_apply_log` に **1 件以上**、かつ **trainerEngine / 集計クエリ**で **seed/cluster 側へ伝播**した結果（スコア・カウント）が **証跡で示される** |
| 5 | **evolution_ledger_definition_and_runtime_check** | **evolution ledger** の **定義整合 + runtime 1 件以上** | `kanagi_growth_ledger` に **INSERT 成功**が **1 件以上**（`SELF_LEARNING_RFB` 行を含めてよい）· 併せて **`conversation_density_ledger_runtime_v1`**（`CONVERSATION_DENSITY_LEDGER_RUNTIME_V1`）が **有効時は 1 行以上**または **metrics_json のスキーマ**が期待通り |
| 6 | **meta_optimizer_probe** | **meta optimizer 入口** | **読み取り専用**の probe が **次改善候補**を **構造化 JSON** で返す（例: `{ "candidates": [ { "axis", "confidence", "suggestedTweak" } ], "sources": ["kanagi_growth_ledger", "density_ledger", ...] }`）。**候補配列が空でない**こと |
| 7 | **intelligence_os_master_audit_probe** | **INTELLIGENCE_OS マスタ監査** | 監査スナップショットに **`amplificationPoints` / `residuals`（または同義キー）** が **配列またはオブジェクト**で存在し、**mainline を壊さない**旨の **回帰フラグ**が含まれる |

---

## 4. 集約 acceptance（束レベル最低ライン）

| # | 条件 |
|---|------|
| 1 | **build** PASS |
| 2 | **health** PASS |
| 3 | **self-learning** が runtime で **観測可能**（MC1） |
| 4 | **`priorSelfLearningRuleFeedbackV1`** が **ku で観測可能**（hydrate 経路、MC1〜2） |
| 5 | **seed / cluster / apply_log / training** の **少なくとも一部**が **次回応答へ反映**（MC3〜4 + §0 効果定義） |
| 6 | **evolution ledger** が **1 件以上**（MC5） |
| 7 | **meta optimizer probe** が **次改善候補を返す**（MC6） |
| 8 | **intelligence audit probe** が **増幅点/残差**を返す（MC7） |
| 9 | **学習により mainline を壊さない**（baseline 回帰なし） |

---

## 5. bundle 完了条件

- 上記 **7 micro-card すべて PASS**（`deferred` なし）。  
- **rollback 未解決**なし。  
- **`evidenceBundlePath` 一式**保存（各 micro の `envelope.json` + 束ルート `MICROPACK_MANIFEST.json` を推奨）。  
- 本束を **runtime 完了**とみなし、**`SELF_BUILD_SUPERVISOR_LOOP_V1` に安全に進行**できる。  

**Runtime 証跡束（実装済み）:** `SELF_EVOLUTION_RUNTIME_MICROPACK_V1` — 手順・証跡形式は `SELF_EVOLUTION_RUNTIME_MICROPACK_V1.md`、実行スクリプトは `api/scripts/self_evolution_runtime_micropack_v1.sh`（**7 順固定**・各 micro / 親 `envelope.json` + `MICROPACK_MANIFEST.json`）。  

---

## 6. 対象ファイル方針

1. **本書（docs）**で scope・acceptance 固定。  
2. **各 micro-card** で `targetFiles` を **1〜3** に縮小（例: `selfLearningRuleFeedbackV1.ts` · `kanagiGrowthLedger.ts` · `chat.ts` の KG ブロック · `trainerEngine.ts` · density ledger モジュール · **新設 audit/probe ルート**）。  
3. **no-touch / schema 主幹**は変更しない（runtime は **CREATE TABLE IF NOT EXISTS** や **読み取り専用 API** を優先）。  

---

## 7. 次カード（唯一）

**`SELF_BUILD_SUPERVISOR_LOOP_V1`** — 自己構築スーパーバイザの **observe→decide→dispatch→acceptance** ループ（runtime: `SELF_BUILD_SUPERVISOR_LOOP_V1.md` / `GET|POST /api/audit/supervisor/self-build-loop-v1`）。  

---

## 8. 変更履歴

| 版 / 日付 | 内容 |
|-----------|------|
| V1 | 束 D 定義・7 micro-card・統合 6 ラベル・完了条件・次カード固定 |
| 2026-03-13 | 初版作成（実装参照: `selfLearningRuleFeedbackV1` / `kanagiGrowthLedger` / KHS apply_log・seed_clusters・density ledger） |
| 2026-03-21 | `SELF_EVOLUTION_RUNTIME_MICROPACK_V1` runtime 手順・スクリプトを docs に接続（束 D docs-pass → runtime-pass 運用） |
