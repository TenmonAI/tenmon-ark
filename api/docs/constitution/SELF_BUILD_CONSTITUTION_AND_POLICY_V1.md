# SELF_BUILD_CONSTITUTION_AND_POLICY_V1

**MODE:** `DOCS_FIRST` → 必要時のみ `MIN_DIFF_PATCH`（本書は **docs のみ** を改訂する。runtime 改修は別カード）  
**版:** V1  
**目的:** 自己構築 OS における **最上位の単一入口（索引憲法）** を固定する。監査を減らさず、下位憲法・手続き書を **一本の方針** に束ねる。

---

## 0. 憲法の一意性（正規入口）

| 役割 | 文書 |
|------|------|
| **最上位索引・方針の束ね** | **本書 `SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md`（このファイル）** |
| **Governor の正规定義** | `SELF_BUILD_GOVERNOR_V1.md` |
| **停止・復旧・優先・分類・封印裁定** | 下記 §11 のモジュール表を参照 |

**矛盾の解消規則:** 下位文書同士または本書と下位で解釈が食い違う場合は、(1) **no-touch / acceptance / rollback / quarantine** の厳格さは **弱めない**、(2) **意味の衝突** は **Governor を正** とし、本書または下位を **追随修正** する。

---

## 1. no-touch（非侵害）

次を **意図せず変更・stage・commit・自動パッチ対象に含めない**。

| 領域 | 例 |
|------|-----|
| **DDL 固定** | `api/src/db/kokuzo_schema.sql`（憲法上の代表 no-touch。他カードで明示された no-touch も同列） |
| **生成物** | `dist/`、ビルド成果物の手編集 |
| **観測の原本** | forensic log 束、未追跡観測物の意図的 add、大型バイナリ／原本 PDF／canonical 原資料 |
| **隔離物** | §6 の **quarantine** に置かれた差分・ブランチ（本番・seal 路線に混入禁止） |

**侵害時:** `SELF_BUILD_STOP_CONDITIONS_V1` の **S5** 相当として **即 stop** → `SELF_BUILD_RESTORE_POLICY_V1`。

---

## 2. acceptance gate（受入ゲート）

- **seal 前必須:** カードに記載の **build / health / acceptance**（例: PATCH29、`FINAL_MAINLINE_STABILITY_SWEEP_V1`、個別 probe）が **すべて PASS**。  
- **単一事実:** `SEAL_OR_REJECT_JUDGE_V1` に従い、autorun / スクリプト結果を **唯一の事実** とする（口頭のみの合格は無効）。  
- **不足時:** `seal_candidate` とせず、`retry_required` または `deferred`。

---

## 3. rollback trigger（ロールバック契機）

次のいずれかで **restore 優先**（詳細手順は `SELF_BUILD_RESTORE_POLICY_V1`）。

| 区分 | 契機（例） |
|------|------------|
| **ビルド・稼働** | build FAIL、health FAIL、service 期待不一致 |
| **契約** | acceptance FAIL、`routeReason` / `responsePlan` の意図しない欠落・破壊（S7/S8） |
| **データ・境界** | cross-user memory 混線、connector 汚染、restore 不能（S9） |
| **手続** | no-touch 汚染、docs/runtime 混在 commit、quarantine 対象の本番混入 |

**禁止:** 上記状態で **seal** すること、**壊れた差分への継ぎ足し**（RESTORE_POLICY）。

---

## 4. quarantine policy（隔離政策）

**quarantine** とは、**本番・主線 seal には乗せない**保留領域のこと。

| 対象 | 扱い |
|------|------|
| **未検証の自動生成物** | 専用ブランチ／作業ツリー。merge 禁止まで明示。 |
| **Canon `deferred` / `rejected`** | `SEAL_OR_REJECT_JUDGE_V1` 従い seal 対象外。 |
| **観測・実験** | リポジトリに残す場合は **追跡方針をカードで別定義**（既定は add しない）。 |

**本番混入ゼロ:** quarantine ラベル付き差分は **CI / 人手の gate** を通さない限り main に入れない。

---

## 5. external tool use policy（外部ツール）

Cursor / shell / browser / GPT / Gemini / Cloud Code 等を用いるときの **最低限**:

1. **憲法遵守:** no-touch・quarantine・docs/runtime 分離を **ツール経由でも侵害しない**。  
2. **証跡:** 自動実行は **ログ終了コード・要約**を forensic 可能な形で残す（全ログの無差別 commit はしない）。  
3. **秘密:** API キー・個人データを **プロンプトやログに埋め込まない**（既存 secrets 運用に従う）。  
4. **優先:** 外部ツールの提案は **カード／micro-card** に落とすまでは **本番適用しない**（Governor）。

---

## 6. autonomous change budget（自律変更バジェット）

`LOW_RISK_AUTO_APPLY_SCOPE_V1` を **予算上限**として読む。

| 項目 | 目安 |
|------|------|
| **1 サイクルあたりの自動適用** | `auto_apply_allowed` は **ファイル数・カード数に上限**（例: 同一 runner 内 **≤3 ファイル**、**1 上位カード = 1 検証**）。 |
| **累積** | 同一セッションで **連続自動 seal 禁止**。PASS ごとに **人間または責任者の確認ポイント**を挟める。 |
| **超過時** | **stop** → 新カードで範囲と acceptance を再定義。 |

**思想:** 監査を減らさない。**自動化は「回数」ではなく「境界の明確さ」で制限**する。

---

## 7. docs / runtime separation（分離）

- **同一 commit / 同一 staged** に、憲法・手続き **docs-only** と **runtime** を **混ぜない**（Governor・S6）。  
- **例外:** 明示カードで「索引 1 行のみ」等の **最小接続**を許容し、本文で対象パスを列挙する。  
- **実装:** runtime 側は **本書へのパスをコメント 1 行**等に留める（思想変更は別カード）。

---

## 8. commit / seal rules（コミット・封印）

- **seal:** `SEAL_OR_REJECT_JUDGE_V1` の **`seal_candidate`** に相当し、かつ **人間／責任者の最終確認**をスキップしない（運用）。  
- **reject / retry / deferred:** 同裁定表に従う。  
- **1 変更 = 1 検証:** `SELF_BUILD_GOVERNOR_V1`・`SELF_BUILD_CARD_GENERATOR_V1` に従う。

---

## 9. micro-card auto generation policy（マイクロカード）

**micro-card:** 上位カード（10 カード圧縮 OS 等）の **内部**で自動生成される **最小作業単位**。正規の **カード必須項目**（名称 / MODE / 対象 / 目的 / acceptance / rollback / next）は **省略してよいが、実行時には機械可読なタスク型に射影**する（**正規 schema:** `SELF_BUILD_OBSERVE_AND_TASK_SCHEMA_V1.md` の **Task Envelope**）。

| 許容 | 禁止 |
|------|------|
| docs-only / forensic / acceptance sweep / wording / law humanization の **軽微修正** | chat 主幹・finalize 思想変更・DB schema 主幹・backup/restore 核・quarantine 解除の **自動単独決定** |
| 既存 acceptance で機械判定できるもの | no-touch 領域への自動パッチ |
| **個別カードの削除に代わらない**（上位カード内に **格納**する） | 監査ステップの省略 |

---

## 10. モジュール索引（既存 governor 群との関係）

本書は **下表を廃止せず、参照関係を固定**する。

| モジュール | ファイル | 役割 |
|-----------|----------|------|
| Governor | `SELF_BUILD_GOVERNOR_V1.md` | 序列・修復/拡張・カード規則 |
| Stop | `SELF_BUILD_STOP_CONDITIONS_V1.md` | S1〜S9 |
| Restore | `SELF_BUILD_RESTORE_POLICY_V1.md` | restore / forensic / retry |
| Card テンプレ | `SELF_BUILD_CARD_GENERATOR_V1.md` | 必須項目 |
| Priority | `SELF_BUILD_PRIORITY_JUDGE_V1.md` | 優先順位 |
| Failure 型 | `SELF_BUILD_FAILURE_CLASSIFIER_V1.md` | FAIL 分類 |
| Seal 裁定 | `SEAL_OR_REJECT_JUDGE_V1.md` | seal_candidate 等 |
| 低リスク範囲 | `LOW_RISK_AUTO_APPLY_SCOPE_V1.md` | auto_apply 三段階 |
| Task envelope | `SELF_BUILD_OBSERVE_AND_TASK_SCHEMA_V1.md` | 観測〜rollback の共通タスク型 |
| Decision / Planner | `SELF_BUILD_DECISION_AND_PATCH_PLANNER_V1.md` | Envelope → `DecisionPlanV1`（実装前の決定層） |
| Execution Bridge | `SELF_BUILD_EXECUTION_BRIDGE_V1.md` | `DecisionPlanV1` → `ExecutionDispatchV1`（実行器への dispatch） |
| Acceptance / Rollback 前段 | `SELF_BUILD_ACCEPTANCE_AND_ROLLBACK_V1.md` | dispatch 後 → `AcceptanceRollbackResultV1`（Judge への候補） |
| **MAINLINE_AUTOFIX_BUNDLE_V1** | `MAINLINE_AUTOFIX_BUNDLE_V1.md` | 主線 autofix 束（micro-card 7・`FINAL_MAINLINE_STABILITY_SWEEP_V1` 等の統合） |
| **MEMORY_AND_PERSONA_AUTOBUNDLE_V1** | `MEMORY_AND_PERSONA_AUTOBUNDLE_V1.md` | 束 B：記憶・ペルソナ・命名・継承・整合・縦断安定 |
| **EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1** | `EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1.md` | 束 C：外部ソース優先・隔離・connector・KOKUZO 橋・guardian |

---

## 11. 次カード（唯一）

**`SELF_EVOLUTION_AUTOBUNDLE_V1`** — 自己進化を同パイプラインで束ねる **束 D**。  
**前段:** **`EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1`**（`EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1.md`）／束 B **`MEMORY_AND_PERSONA_AUTOBUNDLE_V1`**／主線 **`MAINLINE_AUTOFIX_BUNDLE_V1`**

---

## 12. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 最上位索引憲法として no-touch / gate / rollback / quarantine / 外部ツール / バジェット / 分離 / seal / micro-card を一本化 |
| V1.1 | Task envelope モジュール索引・次カードを `SELF_BUILD_DECISION_AND_PATCH_PLANNER_V1` に更新 |
| V1.2 | Decision/Planner モジュール追加・次カードを `SELF_BUILD_EXECUTION_BRIDGE_V1` に更新 |
| V1.3 | Execution Bridge モジュール追加・次カードを `SELF_BUILD_ACCEPTANCE_AND_ROLLBACK_V1` に更新 |
| V1.4 | Acceptance/Rollback 前段モジュール追加・次カードを `MAINLINE_AUTOFIX_BUNDLE_V1` に更新 |
| V1.5 | §10 に `MAINLINE_AUTOFIX_BUNDLE_V1` 行追加。§11 次カードを `MEMORY_AND_PERSONA_AUTOBUNDLE_V1` に更新。 |
| V1.6 | §10 に `MEMORY_AND_PERSONA_AUTOBUNDLE_V1` 行追加。§11 次カードを `EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1` に更新。 |
| V1.7 | §10 に `EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1` 行追加。§11 次カードを `SELF_EVOLUTION_AUTOBUNDLE_V1` に更新。 |
