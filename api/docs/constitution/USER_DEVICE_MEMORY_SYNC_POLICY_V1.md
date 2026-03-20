# USER_DEVICE_MEMORY_SYNC_POLICY_V1

**MODE:** `DOCS_ONLY`（runtime 改修なし）  
**上位文書:** `SELF_BUILD_GOVERNOR_V1.md`  
**前提:** `USER_SHARED_MEMORY_SCHEMA_V1.md` / `DEVICE_LOCAL_CACHE_SCHEMA_V1.md`  
**no-touch:** `api/src/db/kokuzo_schema.sql`（同期の **物理 DDL** は別カード）

---

## 1. 目的

同一 `user_id` の複数 `device_id` 間で、**何をいつ共有するか**を固定する。  
区分名は実装・ログ・監査で **そのまま**使う: **`always_sync`** / **`sync_on_commit`** / **`local_only`**。

---

## 2. 区分の定義

| 区分 | 意味 | 典型タイミング |
|------|------|----------------|
| **always_sync** | 端末で変更したら **速やかに** 共有正本へ反映（競合は別紙の latest-wins 等） | ログイン直後の pull でも取得したい **呼称・人格・継承設定** |
| **sync_on_commit** | ユーザーが **確定・コミット**したときだけサーバへ（キュー可） | 要約シード、ドラフトから確定した facts、編集済みメモ |
| **local_only** | **共有正本に載せない**（端末内のみ） | embeddings、重いキャッシュ、未確定ドラフト、OCR 中間 |

---

## 3. データ種別の割当（固定）

| データ種別 | 区分 | 備考 |
|------------|------|------|
| **naming profile** | **always_sync** | 複数端末で同じ呼び方を優先 |
| **persona profile** | **always_sync** | 人格核の一貫性 |
| **response style profile** | **always_sync**（端末一時上書きは local） | 正本は shared；端末だけの試しは `DEVICE_LOCAL_CACHE` |
| **memory inheritance profile**（確定分解済み） | **always_sync** | 継承の「採用済み」ブロック |
| **shared memory facts**（確定） | **always_sync** または **sync_on_commit** | **初回入力・編集完了**は sync_on_commit；サーバ正本への即時反映が必要なら always_sync に寄せる |
| **要約・seed（未確定→確定）** | **sync_on_commit** | 確定前は local |
| **temp summaries / drafts** | **local_only** → 確定後 **sync_on_commit** | |
| **embeddings / temp cache** | **local_only** | 共有スキーマにベクトルを載せない |
| **pending sync queue** | メタ | 区分ごとにキュー分割可能 |

**必須（カード要件）:**  
- **呼称・人格・継承設定**は **always_sync** 方針（遅延があっても最終的に全端末で整合）。  
- **embeddings / temp cache** は **local_only**。  
- **summaries / seeds** は **sync_on_commit**（確定をトリガに同期）。

---

## 4. 他ユーザーとの混線

すべての同期は **`user_id` スコープ**で開始する。`USER_MEMORY_ISOLATION_GUARD_V1` と矛盾させない。

---

## 5. 受入条件（本カード）

- **always_sync / sync_on_commit / local_only** の意味と割当が明確。  
- **USER_SHARED_MEMORY_SCHEMA_V1** / **DEVICE_LOCAL_CACHE_SCHEMA_V1** と矛盾しない。  
- **docs-only** で完結。

---

## 6. 次カード候補（1 つのみ）

`USER_MEMORY_ISOLATION_GUARD_V1`

---

## 7. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 同期区分とデータ種別の割当を固定 |
