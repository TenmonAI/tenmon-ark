# MEMORY_INHERITANCE_PROFILE_SCHEMA_V1

**MODE:** `DOCS_ONLY`（runtime 改修なし）  
**カード:** `MEMORY_INHERITANCE_PROFILE_SCHEMA_V1`  
**上位文書:** `SELF_BUILD_GOVERNOR_V1.md`  
**親スロット:** `USER_SHARED_MEMORY_SCHEMA_V1.md` §3.5 `memory_inheritance_profile`（本書はその **拡張・固定スキーマ**）  
**整合:** `DEVICE_LOCAL_CACHE_SCHEMA_V1.md` / `USER_DEVICE_MEMORY_SYNC_POLICY_V1.md` / `USER_MEMORY_ISOLATION_GUARD_V1.md`  
**no-touch:** `api/src/db/kokuzo_schema.sql`（**物理 DDL・保存先は別カード**。本書は **論理契約・フィールド意味**のみ）

---

## 1. 目的

旧 **カスタム GPT**（または同等の長文システムプロンプト）から TENMON-ARK へ移行する際、次を **保存・分解・監査可能な形**で固定する。

- AI 呼称 / ユーザー呼称  
- 口調  
- 人格核  
- 禁止事項  
- 返答フォーマット  
- 継承記憶（事実・好み・前提の箇条書き）  
- 取り込み元の **生プロンプト**（監査・再分解用）と **構造化後**の正

**runtime 合成**では **構造化フィールドのみ**を契約入力とし、**生プロンプトをそのままシステム文に流し込まない**（§3）。

---

## 2. スコープ識別子（必須）

| 項目 | 内容 |
|------|------|
| **`user_id`** | **第一キー**。本プロファイルの **すべての行・JSON オブジェクト**は認可済み `user_id` に紐づく。 |
| **`profile_id`**（任意だが推奨） | 同一 user の **複数ソース**（別 GPT・別エクスポート）を区別する内部 id。 |

**他 `user_id` への共有・複製・参照は禁止**（`USER_MEMORY_ISOLATION_GUARD_V1`）。

---

## 3. 必須ルール（カード要件）

| # | ルール | 内容 |
|---|--------|------|
| 1 | **生プロンプトを runtime に直結しない** | `inheritance_prompt_raw` は **監査・再パース・差分表示**用。**LLM system 結合・応答合成の唯一の入力にしてはならない**。 |
| 2 | **structured に分解して保持** | 下記 **最低項目**を満たす `inheritance_prompt_structured`（または同値の列集合）を **正**とする。runtime は原則ここだけを読む。 |
| 3 | **`user_id` 単位** | 保存・クエリ・同期は **常に user スコープ**から開始する。 |
| 4 | **device local と混同しない** | 取り込み **作業中ドラフト**・未分解テキストは `DEVICE_LOCAL_CACHE_SCHEMA_V1` の `unsynced_draft_memory` 等に置いてよいが、**確定した継承プロファイルの正本**は **user shared** 側（本スキーマ）に載せる。ローカルキャッシュを shared 正本とみなさない。 |
| 5 | **他ユーザーと共有しない** | export/import・コピーは **同一 user の意図ある操作**と監査の下でのみ（Guard と整合）。 |

---

## 4. 論理スキーマ（最低項目）

実装時の JSON キー名・DB 列名は任意だが、**意味として次を欠かない**。

### 4.1 `user_id`

- §2 参照。省略不可。

### 4.2 `ai_naming`

- **AI の呼ばれ方**（例: 名前・二人称・敬称の希望）。  
- 型: 短文字列または小さなオブジェクト `{ display_name, honorifics_note }` 等。

### 4.3 `user_naming`

- **ユーザー側の呼び方**（例: ユーザーが AI に呼ばれたい名前・ニックネーム）。  
- 型: 短文字列または `{ preferred_name, notes }`。

### 4.4 `tone_profile`

- **口調**（敬体/常体、圧、間、比喩の度合い等）の **構造化**表現。  
- 長文のまま保存しない。**列挙タグ + 短い説明**を推奨。

### 4.5 `persona_core`

- **人格核**（役割・価値観・優先順位の要約）。**正典・憲法と衝突する場合は Governor 側で裁定**するが、保存値は user スコープ。

### 4.6 `forbidden_moves`

- **禁止事項**（やってはいけない応答・話題・操作）の **リスト**（文字列配列または `{ pattern, severity, note }[]`）。

### 4.7 `response_format_profile`

- **返答フォーマット**（段落・見出し・箇条書き可否・締めの型など）の **構造化**表現。  
- 「GPT 指示のコピペ全文」ではなく、**ARK が解釈可能な型**に落とす。

### 4.8 `inherited_memory_facts`

- 継承元から抽出した **事実・好み・前提** の **バージョン可能なリスト**（`USER_SHARED_MEMORY_SCHEMA_V1` の `shared_memory_facts` と **マージ方針**は別途ポリシーでよいが、**意味の重複**に注意）。  
- 各要素に **出典**（`source: custom_gpt_import` 等）を付与可能にする。

### 4.9 `inheritance_prompt_raw`

- 取り込んだ **生テキスト全文**（監査・再分解用）。  
- **§3.1 により runtime 直結禁止**。暗号化・ACL は実装カード側。

### 4.10 `inheritance_prompt_structured`

- 分解済み **正**表現。上記 `ai_naming` … `inherited_memory_facts` と **重複**してよいが、**単一の真実源（SSOT）** を実装で決める（推奨: 個別フィールドを SSOT とし、本フィールドはスナップショット JSON）。

### 4.11 `confidence`

- 分解パイプラインの **信頼度**（例: `0.0`–`1.0`）または `{ overall, per_field }`。  
- 低い場合は **人間レビュー必須**フラグと併用可（実装別紙）。

### 4.12 `source`

- 取り込み元メタ（例: `custom_gpt`, `export_v1`, `manual_paste`）と **バージョン文字列**。

### 4.13 `updated_at`

- 最終更新時刻（ISO 8601 推奨）。**同期・衝突解決**に使う（`USER_DEVICE_MEMORY_SYNC_POLICY_V1`）。

---

## 5. 同期・キャッシュとの関係（矛盾禁止）

| 話題 | 本スキーマでの位置づけ |
|------|-------------------------|
| **確定・分解済みプロファイル** | **user shared 正本**。区分は `USER_DEVICE_MEMORY_SYNC_POLICY_V1` の **memory inheritance profile（確定分解済み）→ `always_sync`** に従う。 |
| **未確定の長文貼り付け** | `DEVICE_LOCAL_CACHE_SCHEMA_V1` の **`unsynced_draft_memory`** 等。**確定後**に分解して shared へ昇格（通常 **`sync_on_commit`**）。 |
| **embeddings / 中間キャッシュ** | **local_only**。継承プロファイルにベクトルを混ぜない。 |

---

## 6. 関連文書との整合チェックリスト

- [x] `USER_SHARED_MEMORY_SCHEMA_V1` §3.5 と **上位/下位関係が明確**  
- [x] `USER_MEMORY_ISOLATION_GUARD_V1` の **user 単位隔離**と一致  
- [x] `DEVICE_LOCAL_CACHE_SCHEMA_V1` と **正本/ドラフトの境界**が明確  
- [x] `USER_DEVICE_MEMORY_SYNC_POLICY_V1` の **always_sync / sync_on_commit / local_only** と衝突しない  

---

## 7. 受入条件（本カード）

- 上記 **最低項目**が **意味レベルで明確**。  
- **生プロンプト直結禁止**・**structured 正**・**user_id**・**local 混同禁止**・**他ユーザー非共有**が明文化されている。  
- **docs-only** で完結し、**no-touch**（`kokuzo_schema.sql`）を侵さない。

---

## 8. 次カード候補（1 つのみ）

`CUSTOM_GPT_MEMORY_IMPORT_BOX_V1`

---

## 9. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 旧カスタム GPT 継承用フィールド・境界・同期整合を固定 |
