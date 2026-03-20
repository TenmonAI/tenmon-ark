# DEVICE_LOCAL_CACHE_SCHEMA_V1

**MODE:** `DOCS_ONLY`（runtime 改修なし）  
**カード:** `DEVICE_LOCAL_CACHE_SCHEMA_V1`  
**上位文書:** `SELF_BUILD_GOVERNOR_V1.md`  
**前提:** **`USER_SHARED_MEMORY_SCHEMA_V1.md`**（共有正本）と **対をなす** 論理層。  
**no-touch:** `api/src/db/kokuzo_schema.sql`（本書は論理契約のみ。IndexedDB/SQLite/ファイルパス等の **実装は別カード**）

---

## 1. 目的

**単一デバイス上**にのみ存在してよいデータ（キャッシュ・重い中間表現・未同期ドラフト等）の **論理スキーマ**を固定する。  
**共有正本（user shared memory）** と **ローカル専用層** を混同しない。

---

## 2. 識別子

| 項目 | 内容 |
|------|------|
| **`user_id`** | 親スコープ。ローカル領域も **必ず user に紐づくストレージパーティション**に載せる（別 user のディレクトリと共有しない）。 |
| **`device_id`** | **user 内**でのみ一意。`(user_id, device_id)` で端末を指す。ローカル行の主キー候補。 |

---

## 3. 論理スキーマ（最低項目）

実装時のストレージ名は任意だが、**意味は次を欠かない**。

### 3.1 `device_id`

- 当該端末の安定 id（初回生成して端末に保持）。

### 3.2 `local_cache`

- 会話・検索・UI 用の **軽量キャッシュ**（TTL 付き可）。**正本ではない**。

### 3.3 `temp_summaries`

- 長文の **一時要約**・チャンク要約。共有に昇格する前の **仮** 置き場。

### 3.4 `temp_embeddings`

- **埋め込みベクトル**・近似索引用データ。**必ず local_only**（共有スキーマに生ベクトルを詰めない方針と整合）。

### 3.5 `pending_sync_queue`

- サーバへ送る **未送信の差分**（facts・設定・ログポインタ等）のキュー。項目型は **`USER_DEVICE_MEMORY_SYNC_POLICY_V1`** で規定。

### 3.6 `local_file_handles` / `local_source_pointers`

- **端末上のパス**・iCloud / ローカルフォルダ・sandbox 内ファイルへの **参照**（ハンドル or URI）。  
- **共有正本ではない**。同期時は **内容ハッシュ・メタデータ** などに変換してから user スコープへ送る（ポリシー側）。

### 3.7 `unsynced_draft_memory`

- **sync 前**のドラフト（長文プロンプト案・未確定の事実メモ等）。**端末に残してよい**。

### 3.8 `sync_status_marker`

- 直近同期時刻・キュー深さ・衝突フラグ・オフライン状態等の **デバイス側メタ**。サーバの **`USER_DEVICE_MEMORY_SYNC_ENGINE_V1`** と整合するキー名は別紙で揃える。

---

## 4. 共有（shared）とローカル（local）の境界（固定）

| **shared に置くもの**（正本・`USER_SHARED_MEMORY_SCHEMA_V1`） | **local に置くもの**（本書） |
|---------------------------------------------------------------|------------------------------|
| naming / persona / style（確定値） | 端末上の一時スタイル上書き（任意） |
| shared memory facts（確定・同期済み） | temp summaries / unsynced drafts |
| source connector settings（user vault 参照） | local file paths / iCloud 実体参照 |
| growth log pointer（サーバ側ポインタ） | heavy caches / embeddings |
| — | temp OCR / text extraction 中間 |
| — | pending sync queue |
| — | 重い学習・埋め込み生成の作業領域 |

---

## 5. 必須ルール

1. **local cache は shared memory の正本ではない。** 会話合成は **同期済み shared** を優先する。  
2. **local のみ**で人格・共有事実を **確定**しない（確定は shared へコミット後）。  
3. **device 消失**しても、**shared は壊れない**（正本は user スコープの共有層）。  
4. **sync 前のドラフト**は local に残してよい。  
5. **デバイスごとに許容する重い知識処理**は **local に閉じる**（VPS 負荷抑制）。

---

## 6. `USER_SHARED_MEMORY_SCHEMA_V1` との整合

- 本書は **3.4 `response_style_profile`** の「端末一時上書き」や **3.6 `shared_memory_facts`** の「未同期差分」の **置き場** を定義する。  
- **矛盾禁止:** shared に **embeddings** や **生ローカルパス** を正本として書かない。

---

## 7. 受入条件（本カード）

- local / shared の境界が本文で明確。  
- embeddings・temp cache・pending sync が **local 側**に整理されている。  
- `USER_SHARED_MEMORY_SCHEMA_V1` と矛盾しない。  
- **docs-only** で完結。

---

## 8. 次カード候補（1 つのみ）

`USER_DEVICE_MEMORY_SYNC_POLICY_V1`

---

## 9. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | デバイスローカル論理スキーマと shared 境界を固定 |
