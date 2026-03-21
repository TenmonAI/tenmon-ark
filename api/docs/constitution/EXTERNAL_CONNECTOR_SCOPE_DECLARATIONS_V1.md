# EXTERNAL_CONNECTOR_SCOPE_DECLARATIONS_V1

**目的:** 外部コネクタの **user scope / 非混線 / quarantine** を **宣言のみ**先に固定（実装は各カード・micro-card で 1〜3 ファイルに縮小）。  
**検証:** `EXTERNAL_SOURCE_AND_KOKUZO_RUNTIME_MICROPACK_V1` の MC2〜6。

---

## NOTION_MEMORY_SOURCE_PANEL_V1

- **USER_SCOPE_REQUIRED:** `true` — Notion パネル・トークンは **当該ユーザーのみ**。  
- **CROSS_USER_FORBIDDEN:** `true`  
- **UNAUTHENTICATED_BEHAVIOR:** 読み取り API は **401/空リスト**、**他 user の page id を推測利用しない**。  
- **BAD_SOURCE_QUARANTINE:** `true` — 改ざん・OCR 汚染・権限外ページは **quarantine**。

## GOOGLE_DOCS_LOCAL_CONNECTOR_V1

- **USER_SCOPE_REQUIRED:** `true`  
- **LOCAL_ONLY_PATH:** ユーザーのみがアクセス可能なローカル同期パスに限定。  
- **CROSS_SOURCE_FORBIDDEN:** `true` — Docs メタを別ソースの verified 正本にしない。  
- **BAD_SOURCE_QUARANTINE:** `true`

## DROPBOX_LOCAL_CONNECTOR_V1

- **USER_SCOPE_REQUIRED:** `true`  
- **LOCAL_ONLY_PATH:** Dropbox ローカル同期領域に限定。  
- **CROSS_USER_FORBIDDEN:** `true`  
- **BAD_SOURCE_QUARANTINE:** `true`

## ICLOUD_LOCAL_FOLDER_BRIDGE_V1

- **USER_SCOPE_REQUIRED:** `true`  
- **LOCAL_ONLY_PATH:** iCloud Drive のユーザー領域に限定。  
- **CROSS_USER_FORBIDDEN:** `true`  
- **BAD_SOURCE_QUARANTINE:** `true`

## NOTEBOOKLM_SOURCE_IMPORT_SCOPE_V1

- **IMPORT_SCOPE_LIMITED:** `true` — 取り込みは **宣言したノートブック／エクスポート範囲**のみ。  
- **GENERIC_DRIFT_EXCLUDE:** `true` — 汎用スピリチュアル要約を **正本に昇格させない**。  
- **QUARANTINE_UNVERIFIED:** `true` — 未検証チャンクは **quarantine** または破棄。

---

## 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 5 コネクタ宣言・MC2〜6 用キーワード |
