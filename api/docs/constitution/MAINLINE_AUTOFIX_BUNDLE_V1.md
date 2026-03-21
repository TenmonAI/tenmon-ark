# MAINLINE_AUTOFIX_BUNDLE_V1

**MODE:** `AUTONOMOUS_BUNDLE`（内部は **micro-card 自動生成**）  
**上位カード本文:** `DOCS_FIRST` → 必要時のみ `MIN_DIFF_PATCH`（**本ファイルは束の scope・micro-card 契約を固定**。コード変更は **micro-card ごとの別コミット**）  
**上位憲法:** `SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md`  
**パイプライン位置:** `AcceptanceRollbackResultV1` 通過後、**主線（束 A）**の最初の **実働束**  

---

## 0. 目的と境界

| 項目 | 内容 |
|------|------|
| **目的** | 会話主線の **低〜中リスク残差**を、散発カードではなく **1 束 + micro-card 列**で順に潰す。 |
| **禁止** | **high-risk 主幹改修**、**will / meaning / beauty / worldview の思想変更**、`api/src/db/kokuzo_schema.sql` **主幹**、**dist 手編集**、**no-touch 侵害**、**backup/restore 核**。 |
| **mixed** | **docs/runtime** は Planner で **分割済み**の micro-card のみ実行（`artifactLayer` 遵守）。 |

---

## 1. 統合対象（少なくとも含む）

- `FINAL_MAINLINE_STABILITY_SWEEP_V1`（スクリプト: `api/scripts/final_mainline_stability_sweep_v1.sh`）  
- `HUMAN_READABLE_LAW_LAYER_V1` の **runtime 最終確認**（`humanReadableLawLayerV1.ts` / `finalize.ts` 経路）  
- `TASK_RETURN_LAW_TRANSLATOR_V1` の **残差除去**（表層・根拠束表記）  
- `WILL_CORE_RUNTIME_PROBE_V1`（`api/scripts/will_core_runtime_probe_v1.sh`）  
- `BEAUTY_COMPILER_PREEMPT_V1` 主線・`FINALIZE_BEAUTY_WRAPPER_THINNING_V1` の **残差確認**  
- `CONVERSATION_DENSITY_LEDGER_RUNTIME_V1` の **実測**（insert 1 件以上）  
- **define/general の null-drop** 再発防止の **観測**  
- **bridge phrase / ask-overuse / law key 露出 / thin response** の **軽微補修**（意味不変・route 不変）  

---

## 2. micro-card 最低 7 件（1 micro-card = 1 責務 = 1 acceptance）

各 micro-card は **`TenmonSelfBuildTaskEnvelopeV1`** に射影し、**`acceptancePlan` / `rollbackPlan` / `evidenceBundlePath`（または `expectedEvidence`）** を **必須**とする。`parentCard` は本カード名、`microCardGroup` は `MAINLINE_AUTOFIX_BUNDLE_V1:<wave>`。

| ID | 責務 | 主な acceptance（例） |
|----|------|------------------------|
| **mainline_probe_pack** | 主線スイープ一括 | `final_mainline_stability_sweep_v1.sh` **全体 PASS** |
| **human_readable_law_runtime_check** | KHSL / 内部キー表層 | 代表プローブの **本文に `KHSL:LAW:` なし**、ku 表層の人間可読性 |
| **task_return_surface_cleanup** | TASK_RETURN 残差 | タスク系プローブで **機械臭・law: 表記**の残差が減少（ベースライン比較） |
| **will_probe_residual_check** | WILL_CORE | `will_core_runtime_probe_v1.sh` **PASS** |
| **beauty_surface_residual_check** | BEAUTY + finalize thin | BEAUTY プローブ **routeReason 一致**、thin 経路の意図した短文維持 |
| **density_ledger_runtime_check** | 密度 ledger | **insert ≥1**（`TENMON_DATA_DIR` 一致・同一プロセス） |
| **null_drop_regression_check** | null-drop / empty | **responsePlan 欠落なし**、**empty drop なし**（PATCH29 + 追加ショートプローブ） |

**FAIL した micro-card:** **rollback → forensic → retry**（`SELF_BUILD_RESTORE_POLICY_V1`）。**PASS のみ**を次束へ持ち越す。

---

## 3. 集約 acceptance（束レベル最低ライン）

次を **すべて満たす**（多くは `mainline_probe_pack` に内包）。

| # | 条件 |
|---|------|
| 1 | **build** PASS |
| 2 | **health** PASS |
| 3 | **PATCH29**（8 route + `responsePlan`）PASS |
| 4 | **will probe** PASS |
| 5 | **beauty probe** PASS |
| 6 | **language essence probe** PASS |
| 7 | **task / followup / HRL surface** PASS（`final_mainline_stability_sweep` 準拠） |
| 8 | **density ledger** 当該スレッドで **1 件以上 insert** |
| 9 | **responsePlan** が主線 route で **欠落しない**（期待表と整合） |
| 10 | **law key 生露出なし**（`KHSL:LAW:` 等） |
| 11 | **empty drop なし** |
| 12 | **bridge phrase 率・ask-overuse** が **悪化していない**（ベースラインは束開始時の sweep ログまたは直近 seal を参照） |

**運用:** (11)(12) は **メトリクス未整備時**は **同一スクリプトの 2 回差分**または **Reviewer 明示**で代替可（カードに記録）。

---

## 4. bundle 完了条件

- 上記 **micro-card 7 件がすべて PASS**（または **スコープ外として Founder 承認の deferred** が 0 件）。  
- **FAIL micro-card 残なし**（残る場合は束 **未完了**）。  
- **route / responsePlan / prose** の整合が維持されている（PATCH29 + WILL + 代表 NL）。  
- **人間可読性**が改善し、**機械臭残差**が減少（主観 + プローブ本文チェック）。  

完了後、`AcceptanceRollbackResultV1` を **再生成**し **Judge** へ渡す。

---

## 5. 対象ファイル方針

1. **本書（docs）**で scope 固定。  
2. **各 micro-card** で `targetFiles` を **最小化**（通常 1〜3）。  
3. 主線コードは **`chat.ts` / `finalize.ts` / `humanReadableLawLayerV1.ts` / `conversationDensityLedgerRuntimeV1.ts`** 等に **限定**（カードごとに列挙）。  
4. **Runtime 証跡束:** `MAINLINE_AUTOFIX_RUNTIME_MICROPACK_V1.md` と `api/scripts/mainline_autofix_runtime_micropack_v1.sh`（7 micro-card 固定順・`evidenceBundlePath`）。  

---

## 6. 次カード（唯一）

**`MEMORY_AND_PERSONA_AUTOBUNDLE_V1`** — 束 B（記憶・ペルソナ）。**実体:** `MEMORY_AND_PERSONA_AUTOBUNDLE_V1.md`。  
**その次（索引憲法 §11）:** **`EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1`**

---

## 7. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 主線 autofix 束・micro-card 7・acceptance・完了条件・MEMORY 次カード |
| V1.1 | `MAINLINE_AUTOFIX_RUNTIME_MICROPACK_V1` への参照（runtime-pass 手順） |
| V1.2 | §6 次カードに束 B 実体パスと `EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1` 予告を追記 |
