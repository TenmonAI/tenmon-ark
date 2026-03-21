# MEMORY_AND_PERSONA_AUTOBUNDLE_V1

**MODE:** `AUTONOMOUS_BUNDLE`（内部は **micro-card 自動生成**）  
**上位カード本文:** `DOCS_FIRST` → 必要時のみ `MIN_DIFF_PATCH`（**本ファイルは束の scope・micro-card 契約を固定**。runtime 改修は **micro-card ごとに分割コミット**）  
**上位憲法:** `SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md`  
**パイプライン位置:** **束 A（主線）**の runtime 完了後、自己構築 OS の **第 2 実働束（束 B）**  

---

## 0. 目的と境界

| 項目 | 内容 |
|------|------|
| **目的** | **記憶継承・人格継承・呼称・口調・継承メモリ・runtime 注入・整合監査**を散発カードではなく **1 束 + micro-card 列**でまとめ、**長期人格安定の最低限確認**まで含める。 |
| **禁止** | **will / meaning / beauty 主幹思想変更**、`api/src/db/kokuzo_schema.sql` **主幹**、**dist 手編集**、**no-touch 侵害**、**raw inheritance prompt をそのまま runtime に流す**こと。 |
| **正本** | **structured fields を正**とする。**user_id 単位**で保持し、**他ユーザーへ共有しない**。 |
| **mixed** | docs/runtime は Planner で **分割済み** micro-card のみ（`artifactLayer` 遵守）。 |

---

## 1. 統合対象（少なくとも含む）

| 束内ラベル | 内容 |
|------------|------|
| **USER_NAMING_AND_PERSONA_BINDER_V1** | 呼称・命名フローと persona / binder への **runtime 結線** |
| **MEMORY_INHERITANCE_RUNTIME_V1** | 継承プロファイルの **runtime 可視化・注入経路**（構造化データ優先） |
| **MEMORY_CONSISTENCY_AUDIT_V1** | 記憶層の **一貫性・欠損・矛盾**の機械可能な監査 |
| **LONGITUDINAL_PERSONA_STABILITY_AUDIT_V1** | **束内で必須** — 複数ターン・複数 thread にわたり **人格核（意図・境界・口調の骨格）が意図せず崩れない**ことの **最低 probe** |

**既存スキーマ・政策（参照必須・本文は各ファイルが正）:**

- `MEMORY_INHERITANCE_PROFILE_SCHEMA_V1.md`  
- `CUSTOM_GPT_MEMORY_IMPORT_BOX_V1`（実装・ルート: `api/src/routes/customGptMemoryImportBoxV1.ts` 等）  
- `MEMORY_INHERITANCE_RENDERER_V1`（レンダラ実装パスは micro-card で列挙）  
- `USER_SHARED_MEMORY_SCHEMA_V1.md`  
- `DEVICE_LOCAL_CACHE_SCHEMA_V1.md`  
- `USER_DEVICE_MEMORY_SYNC_POLICY_V1.md`  
- `USER_MEMORY_ISOLATION_GUARD_V1.md`  
- `USER_DEVICE_MEMORY_SYNC_ENGINE_V1`（同期エンジン実装パスは micro-card で列挙）  

---

## 2. 不変ルール（最上位）

1. **raw inheritance prompt をそのまま runtime に流さない** — 分解・検証・structured への射影を経由する。  
2. **structured fields を正** — UI / API / LLM 注入は **スキーマ準拠フィールド**をソースにする。  
3. **user_id 単位保持** — セッション・thread を跨いでも **所有者スコープ**を逸脱しない。  
4. **device local cache と shared memory を混同しない** — 正本・ドラフト・未同期キューの境界は `DEVICE_LOCAL_CACHE_SCHEMA_V1` / `USER_SHARED_MEMORY_SCHEMA_V1` に従う。  
5. **cross-user 非混線** — `USER_MEMORY_ISOLATION_GUARD_V1` に反する経路は **束外**または **reject**。  

---

## 3. micro-card 最低 7 件（1 micro-card = 1 責務 = 1 acceptance）

各 micro-card は **`TenmonSelfBuildTaskEnvelopeV1`** に射影し、**`acceptancePlan` / `rollbackPlan` / `evidenceBundlePath`（または `expectedEvidence`）** を **必須**。`parentCard` は本カード名、`microCardGroup` は `MEMORY_AND_PERSONA_AUTOBUNDLE_V1:<wave>`。

| # | ID | 責務 | 主な acceptance（例） |
|---|----|------|------------------------|
| 1 | **user_naming_runtime_bind** | 呼称・命名 | 命名 3 ターン後 **`ku.naming.step=SAVED`** かつ **`persona.user_naming` 行**が存在（`reply()` 非経由 route では `ku.userNaming` が付かない場合あり） |
| 2 | **persona_core_runtime_bind** | 人格核の runtime 結線 | constitution / persona 要約が **意図した経路**で注入され、**主幹思想と矛盾する上書きがない**（機械検査＋サンプル応答） |
| 3 | **inheritance_prompt_structured_runtime_bind** | 継承プロンプト → 構造化 | **raw 全文直注入なし**、`MEMORY_INHERITANCE_PROFILE_SCHEMA_V1` 準拠フィールドが **runtime で観測可能** |
| 4 | **inherited_memory_fact_runtime_bind** | 継承ファクトの可視化 | 代表ファクト（スキーマで定義されたキー）が **応答または ku メタ**で参照可能・欠落なし |
| 5 | **memory_consistency_runtime_audit** | 整合監査 | `MEMORY_CONSISTENCY_AUDIT_V1` 相当の **スクリプトまたは checklist** が **PASS**（矛盾・孤立参照・層越境フラグなし） |
| 6 | **longitudinal_persona_stability_probe** | 縦断安定 | **複数 thread** または **連続ターン**で **人格核スナップショット**が閾値内（束内定義した baseline 比） |
| 7 | **sync_isolation_non_interference_check** | 同期・隔離 | **cross-user leakage zero**、**local / shared 分離**維持、sync エンジンが **意図しない越境書込み**をしない |

**FAIL:** **rollback → forensic → retry**（`SELF_BUILD_RESTORE_POLICY_V1`）。**PASS のみ**次 micro-card へ。

---

## 4. 集約 acceptance（束レベル最低ライン）

| # | 条件 |
|---|------|
| 1 | **build** PASS |
| 2 | **health** PASS |
| 3 | **naming bind** PASS |
| 4 | **persona core bind** PASS |
| 5 | **inheritance structured fields** runtime visible |
| 6 | **inherited memory facts** runtime visible |
| 7 | **cross-user leakage** zero |
| 8 | **device local / shared separation** preserved |
| 9 | **multi-thread** で人格核が **意図した範囲で**崩れない（longitudinal probe） |
| 10 | **memory consistency audit** PASS |
| 11 | **longitudinal stability** 最低 probe PASS |

---

## 5. bundle 完了条件

- 上記 **7 micro-card すべて PASS**（Founder `deferred` 承認なし）。  
- **rollback 未解決**なし。  
- **`evidenceBundlePath` 一式**保存。  
- 本束を **runtime 完了**とみなし、**次束（external source / KOKUZO）へ安全に進行**できる。  

**Runtime 証跡束:** `MEMORY_AND_PERSONA_RUNTIME_MICROPACK_V1.md` / `api/scripts/memory_persona_runtime_micropack_v1.sh`（7 micro-card 固定順・`evidenceBundlePath`）。  

---

## 6. 対象ファイル方針

1. **本書（docs）**で scope・acceptance 固定。  
2. **各 micro-card** で `targetFiles` を **1〜3** に縮小（例: `chat.ts` 命名、`persona` DB、`customGptMemoryImportBoxV1.ts`、sync エンジンモジュール）。  
3. **no-touch / schema 主幹**は変更しない。  

---

## 7. 次カード（唯一）

**`EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1`** — 束 C。**実体:** `EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1.md`。  
**その次（索引憲法 §11）:** **`SELF_EVOLUTION_AUTOBUNDLE_V1`**

---

## 8. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 束 B 定義・7 micro-card・統合対象・完了条件・次カード EXTERNAL |
| V1.1 | `MEMORY_AND_PERSONA_RUNTIME_MICROPACK_V1` 参照・MC1 受入れを DB + `ku.naming` に明確化 |
| V1.2 | §7 に束 C 実体パスと `SELF_EVOLUTION_AUTOBUNDLE_V1` 予告を追記 |
