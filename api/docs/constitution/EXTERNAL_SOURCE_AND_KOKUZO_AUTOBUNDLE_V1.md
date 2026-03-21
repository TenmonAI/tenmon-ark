# EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1

**MODE:** `AUTONOMOUS_BUNDLE`（内部は **micro-card 自動生成**）  
**上位カード本文:** `DOCS_FIRST` → 必要時のみ `MIN_DIFF_PATCH`（**本ファイルは束の scope・micro-card 契約を固定**。runtime 改修は **micro-card ごとに分割コミット**）  
**上位憲法:** `SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md`  
**パイプライン位置:** **束 B** 完了後の **第 3 実働束（束 C）** — 外部知識ソース接続と **KOKUZO 側入口**を安全側から束ねる。  

---

## 0. 目的と境界

| 項目 | 内容 |
|------|------|
| **目的** | **source priority / isolation**、主要 **connector 入口**、**KOTODAMA_RULE_INDEX / STRUCTURAL_CROSSWALK / ARK_SCRIPTURE_GUIDE**、**KOKUZO seed bridge / guardian integrity** を散発カードではなく **1 束 + micro-card 列**で処理する。 |
| **順序** | **source priority を先に固定**し、**connector 本体・実行経路はその後**（本束の micro-card 順に反映）。 |
| **禁止** | **will / meaning / beauty 主幹思想変更**、**schema 主幹 / dist 手編集 / no-touch 侵害**、**cross-user / cross-source 混線**、**BAD source・汚染 OCR・generic drift source** の **本番直取り込み**（**quarantine または exclude** 必須）。 |
| **KOKUZO seed** | 保存物ではなく **思考素材へ上げる**経路を束内で扱うが、**本番混入は quarantine 経由**（`SELF_BUILD_CONSTITUTION_AND_POLICY_V1` §4・`SEAL_OR_REJECT_JUDGE_V1` 整合）。 |
| **継承** | **user scope / isolation guard**（`USER_MEMORY_ISOLATION_GUARD_V1` 等）、**人格核・memory inheritance** を外部ソースで **壊さない**（束レベル acceptance で確認）。 |

---

## 1. 統合対象（少なくとも含む）

| ラベル | 役割（要約） |
|--------|----------------|
| **EXTERNAL_SOURCE_PRIORITY_AND_ISOLATION_POLICY_V1** | 優先順位・隔離・quarantine 境界の **単一文書ソース** |
| **NOTION_MEMORY_SOURCE_PANEL_V1** | Notion 系メモリソース UI/API 入口 |
| **GOOGLE_DOCS_LOCAL_CONNECTOR_V1** | Google Docs ローカル接続スコープ |
| **DROPBOX_LOCAL_CONNECTOR_V1** | Dropbox ローカル接続スコープ |
| **ICLOUD_LOCAL_FOLDER_BRIDGE_V1** | iCloud ローカルフォルダ橋渡し |
| **NOTEBOOKLM_SOURCE_IMPORT_SCOPE_V1** | NotebookLM 取り込み **許容スコープ** |
| **EXTERNAL_KNOWLEDGE_BINDER_V1** | 外部知識を binder / ku 契約に載せる層 |
| **KOTODAMA_RULE_INDEX_V1** | 言霊ルール索引の runtime 整合 |
| **STRUCTURAL_CROSSWALK_V1** | 構造横断参照（正本・系譜） |
| **ARK_SCRIPTURE_GUIDE_V1** | 聖典ガイド経路 |
| **KOKUZO_SEED_LEARNING_BRIDGE_V1** | kokuzo seed → 学習・思考素材橋 |
| **KOKUZO_GUARDIAN_SPIRITUAL_INTEGRITY_V1** | guardian 整合・汚染検知 |

（各カードの **正本**は個別ドキュメント／実装パス。本束は **索引と acceptance の束ね**を担当。）

---

## 2. 不変ルール（最上位）

1. **source priority 先行** — policy / governor 準拠後に connector を開く。  
2. **external source は user scope 必須** — 他ユーザーのコネクタ状態・トークン・キャッシュを **参照しない**。  
3. **cross-user / cross-source 混線禁止** — 違反は **rollback + forensic**、必要なら **quarantine**。  
4. **BAD / 汚染 OCR / generic drift** — **本番 seal 路線に乗せない**（exclude または **quarantine_hold**）。  
5. **micro-card ごと**に `acceptancePlan` / `rollbackPlan` / `evidenceBundlePath`（または `expectedEvidence`）を **必須**。`parentCard` は本カード名、`microCardGroup` は `EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1:<wave>`。  
6. **FAIL** → **rollback → forensic → retry**（`SELF_BUILD_RESTORE_POLICY_V1`）。**PASS のみ**次へ。  

---

## 3. micro-card 最低 12 件（1 micro-card = 1 責務 = 1 acceptance）

| # | ID | 責務 | 主な acceptance（例） |
|---|----|------|------------------------|
| 1 | **external_source_priority_policy_bind** | policy 束ね | `EXTERNAL_SOURCE_PRIORITY_AND_ISOLATION_POLICY_V1` の **優先順位・隔離・quarantine 規則**がリポジトリ上で **単一参照源**として参照可能（docs 整合スクリプトまたは checklist **PASS**） |
| 2 | **notion_source_panel_runtime_check** | Notion 入口 | 代表 API/設定が **user scope**・**未認証時の挙動**が契約通り（**非混線**） |
| 3 | **gdocs_local_connector_scope_check** | GDocs ローカル | スコープ宣言と **実装パスの一致**・**越境パスなし** |
| 4 | **dropbox_local_connector_scope_check** | Dropbox ローカル | 同上 |
| 5 | **icloud_local_bridge_scope_check** | iCloud 橋 | 同上 |
| 6 | **notebooklm_source_scope_check** | NotebookLM | **NOTEBOOKLM_SOURCE_IMPORT_SCOPE_V1** 準拠・**汎用ドリフトソース除外**の確認 |
| 7 | **external_knowledge_binder_probe** | binder | 外部根拠が **binderSummary / sourcePack** で **意図した分類**・**KHSL 生露出なし** |
| 8 | **kotodama_rule_index_runtime_probe** | 言霊索引 | **KOTODAMA_RULE_INDEX** 参照経路の **代表プローブ PASS** |
| 9 | **structural_crosswalk_probe** | 横断構造 | **STRUCTURAL_CROSSWALK** 期待参照（系譜・正本キー）**PASS** |
| 10 | **ark_scripture_guide_probe** | 聖典ガイド | **ARK_SCRIPTURE_GUIDE** 経路の **代表プローブ PASS** |
| 11 | **kokuzo_seed_bridge_probe** | seed 橋 | seed が **思考素材層**へ上がり、**本番既定応答に直結しない**（フラグ・route 契約） |
| 12 | **kokuzo_guardian_integrity_probe** | guardian | **integrity / 汚染検知**の **代表チェック PASS**（ログまたは専用 health サブゲート） |

**実行順:** 上表 **1 → 12 固定**（policy → connector 群 → binder → 索引/横断/聖典 → kokuzo）。  

---

## 4. 集約 acceptance（束レベル最低ライン）

| # | 条件 |
|---|------|
| 1 | **build** PASS |
| 2 | **health** PASS |
| 3 | **source priority / isolation policy** が **固定参照**されている |
| 4 | **external source scope** で **非混線**（user / source 境界） |
| 5 | **connector 入口**が **user scope** を守る |
| 6 | **bad source quarantine**（または exclude）が **有効**であることが検証できる |
| 7 | **KOTODAMA_RULE_INDEX** probe PASS |
| 8 | **STRUCTURAL_CROSSWALK** probe PASS |
| 9 | **ARK_SCRIPTURE_GUIDE** probe PASS |
| 10 | **KOKUZO seed bridge** probe PASS |
| 11 | **guardian integrity** probe PASS |
| 12 | **external source** が **人格核**と **memory inheritance** を **壊さない**（束 B の baseline プローブとの **回帰なし**） |

---

## 5. bundle 完了条件

- 上記 **12 micro-card すべて PASS**（Founder `deferred` なし）。  
- **rollback 未解決**なし。  
- **`evidenceBundlePath` 一式**保存。  
- 本束を **runtime 完了**とみなし、**`SELF_EVOLUTION_AUTOBUNDLE_V1` に安全に進行**できる。  

**Runtime 証跡束:** `EXTERNAL_SOURCE_AND_KOKUZO_RUNTIME_MICROPACK_V1` — 実装は `api/scripts/external_source_kokuzo_runtime_micropack_v1.sh`、正本は `EXTERNAL_SOURCE_AND_KOKUZO_RUNTIME_MICROPACK_V1.md`。**12 順固定**・各 micro の `envelope.json`・ルート `MICROPACK_MANIFEST.json` を証跡として保存する。  

---

## 6. 対象ファイル方針

1. **本書（docs）**で scope・acceptance 固定。  
2. **各 micro-card** で `targetFiles` を **1〜3** に縮小（connector ルート・kokuzo ルート・binder モジュール等を **カードごと列挙**）。  
3. **no-touch / schema 主幹**は変更しない。  

---

## 7. 次カード（唯一）

**`SELF_EVOLUTION_AUTOBUNDLE_V1`** — 自己進化束（束 D 相当）。  

---

## 8. 変更履歴

| 版 / 日付 | 内容 |
|-----------|------|
| V1 | 束 C 定義・12 micro-card・統合対象・完了条件・次カード SELF_EVOLUTION |
| 2026-03-13 | runtime micropack スクリプト・政策/コネクタ宣言・`EXTERNAL_SOURCE_AND_KOKUZO_RUNTIME_MICROPACK_V1.md` を追加（runtime-pass 手順を具体化） |
