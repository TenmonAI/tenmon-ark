# USER_MEMORY_ISOLATION_GUARD_V1

**MODE:** `DOCS_ONLY`（runtime 改修なし）  
**上位文書:** `SELF_BUILD_GOVERNOR_V1.md`  
**整合:** `USER_SHARED_MEMORY_SCHEMA_V1.md` / `DEVICE_LOCAL_CACHE_SCHEMA_V1.md` / `USER_DEVICE_MEMORY_SYNC_POLICY_V1.md`  
**no-touch:** `api/src/db/kokuzo_schema.sql`（**越境検知の物理実装・DDL は別カード**）

---

## 1. 目的

**個人ログイン（user）間**で、記憶・設定・コネクタ・export/import が **混線・不正共有**しない境界を固定する。  
「便利のための共有」は **別 user への横取り**として扱い、**禁止がデフォルト**。

---

## 2. 必須原則

| 原則 | 内容 |
|------|------|
| **user_id 単位隔離** | すべての共有データは **認可済み `user_id`** にスコープする。クエリ・同期・バッチは **常に user キーから開始**。 |
| **connector token の user binding** | Notion / 外部 API / Webhook 等の **トークン・秘密は user スコープの vault** に紐づけ、**他 user のコネクタ設定を参照しない**。 |
| **cross-user import 禁止** | 別ユーザーの export バンドル・URL・共有リンクを **import して自分の正本に取り込む**操作は禁止（誤用・悪用の防止）。 |
| **export / import は明示承認** | ユーザーが **意図を明示**（UI または型付き API）し、**監査ログ**が残ること。サイレント import は禁止。 |
| **audit 必須** | export/import、コネクタ接続変更、同期失敗・衝突解決は **監査可能なイベント**として記録する（実装は別カード）。 |
| **層の越境禁止** | **shared memory**・**device local cache**・**source connector** の **論理境界を越えて** 正本を混ぜない（`DEVICE_LOCAL_CACHE` を shared 正本にしない等）。 |
| **admin / support の可視範囲の最小化** | 運用支援が必要な場合も **必要最小限のメタデータ**に限定し、**平文での記憶・トークン流出**を設計上禁止。 |

---

## 3. 禁止パターン（例）

- 別 `user_id` の `shared_memory_facts` を **同一レスポンス合成**に混ぜる。  
- 別 user の **connector token** を流用する。  
- **export** ファイルを **別アカウント**へ import する「持ち込み」運用（明示承認なし）。  
- **audit なし**の export/import。

---

## 4. 関連文書との矛盾禁止

- **USER_SHARED_MEMORY_SCHEMA_V1:** ユーザー分離は **第一キー**。  
- **DEVICE_LOCAL_CACHE_SCHEMA_V1:** ローカルは **正本ではない**；越境は **shared へ誤コミット**しない。  
- **USER_DEVICE_MEMORY_SYNC_POLICY_V1:** 同期は **user スコープ**で開始；区分は **always_sync / sync_on_commit / local_only** を維持。

---

## 5. 受入条件（本カード）

- 他ユーザー **混線防止条件**が明確。  
- 上記 3 文書と **矛盾しない**。  
- **docs-only** で完結。

---

## 6. 次カード候補（1 つのみ）

`USER_DEVICE_MEMORY_SYNC_ENGINE_V1`

---

## 7. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 越境禁止・監査・コネクタ binding を固定 |
