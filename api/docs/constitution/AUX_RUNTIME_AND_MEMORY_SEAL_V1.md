# AUX_RUNTIME_AND_MEMORY_SEAL_V1

## 目的

会話主線（`chat.ts` / `gates_impl` 非接触）を維持したまま、**監査・memory・training DB スキーマ**の未封印差分を単独バッチでコミットする。

## 本バッチに含めるパス（最大 6、本実行は 5）

| ファイル | 役割 |
|----------|------|
| `api/src/routes/audit.ts` | mainline forensic / supreme 監査ルート等 |
| `api/src/routes/memory.ts` | memory ルーター（custom-gpt import マウント等） |
| `api/src/db/training_schema.sql` | training / ledger 系テーブル（`kokuzo_schema` ではない） |
| `api/src/routes/customGptMemoryImportBoxV1.ts` | 認証ユーザー単位の共有スライス書き込み |
| `api/src/routes/memoryInheritanceRendererV1.ts` | memory 継承レンダリング補助 |

## 明示除外

- `chat.ts`, `gates_impl.ts`, `kokuzo_schema.sql`, `client/**`, `dist/**`

## 境界

- `customGptMemoryImportBoxV1`: `getAuthUserIdForSyncV1` により **userId スコープ**（他ユーザー混線防止）。
- `memory/read|clear`: 既存 `getSessionId(req)` による **セッション境界**を維持。

## 次カード

`CLIENT_SEPARATE_SEAL_V1`
