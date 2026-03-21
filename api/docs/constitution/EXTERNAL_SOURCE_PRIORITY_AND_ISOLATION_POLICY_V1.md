# EXTERNAL_SOURCE_PRIORITY_AND_ISOLATION_POLICY_V1

**カード:** `EXTERNAL_SOURCE_PRIORITY_AND_ISOLATION_POLICY_V1`  
**MODE:** `DOCS_FIRST`（runtime は `EXTERNAL_SOURCE_AND_KOKUZO_RUNTIME_MICROPACK_V1` で検証）  
**整合:** `EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1.md` / `USER_MEMORY_ISOLATION_GUARD_V1.md` / `SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md`（quarantine）

---

## 1. Source priority（固定順・上から優先）

1. **憲法・Governor・no-touch** — 最優先で侵害しない。  
2. **verified / canon / KHS 中枢** — 天聞正本・verified law・典拠実在。  
3. **user-scoped external（connector 正規経路）** — 単一 `user_id` / session 境界内のみ。  
4. **proposed / external_map / 未検証** — 本番応答へ **直結禁止**、**quarantine または exclude**。  
5. **BAD source / 汚染 OCR / generic drift** — **本番 seal 路線禁止**・**quarantine_hold** または **exclude 固定**。

---

## 2. Isolation（隔離・非混線）

- **USER_SCOPE_REQUIRED** — 外部コネクタは **当該ユーザーのスコープ**のみ（宣言は `EXTERNAL_CONNECTOR_SCOPE_DECLARATIONS_V1.md`）。  
- **cross-user 禁止** — 他ユーザーのトークン・キャッシュ・コネクタ状態を参照しない。  
- **cross-source 混線禁止** — ソース A のメタをソース B の正本として扱わない。  
- **device local と shared 正本**を混同しない（`DEVICE_LOCAL_CACHE_SCHEMA_V1` / `USER_SHARED_MEMORY_SCHEMA_V1`）。

---

## 3. Connector 実行順

**policy（本書）を参照固定した後**に、Notion → GDocs → Dropbox → iCloud → NotebookLM の **宣言スコープ**（`EXTERNAL_CONNECTOR_SCOPE_DECLARATIONS_V1.md`）に従い実装・runtime 検査する。

---

## 4. Quarantine 語（必須キーワード）

`quarantine` / `exclude` / `BAD` / `generic drift` / `汚染` — runtime micropack の **MC1** で本文存在を機械確認する。

---

## 5. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 束 C 用 priority・isolation・connector 順・quarantine 語の単一参照源 |
