# TENMON_PWA_THREAD_URL_CONSTITUTION_CURSOR_AUTO_V1

## 目的

PWA 会話の **thread identity** を localStorage 中心から **URL 正典**へ移す。backend は変更しない。frontend の last-mile のみ **最小 diff**。

## D（憲法）

- 憶測禁止・frontend 主戦場・backend 大改修禁止
- 最小 diff / 1 変更 = 1 検証
- **dist 直編集禁止**
- build → deploy → restart → audit → lived probe
- PASS 以外は封印禁止
- **正典順（解決の優先順位）**  
  `URL の threadId` **>** `backend response.threadId` **>** `localStorage` **>** `新規生成（pwa-${Date.now().toString(36)}）`
- reload 依存を減らす（`history.replaceState` で URL 同期）
- FAIL 時は next card を `generated_cursor_apply` に自動生成

## 実装の要点

| 項目 | 内容 |
|------|------|
| URL 読取 | `readThreadIdFromUrl()` — `?threadId=` および hash 内 `?threadId=` |
| URL 書込 | `writeThreadIdToUrl(threadId)` — replaceState |
| 解決 | `resolveCanonicalThreadId(url, backend, storage)` |
| 同期 | `persistThreadIdToStorageAndUrl(id)` — **localStorage + URL**（reload 不要） |
| send 後 | `resolveCanonicalThreadId(URL, backend.threadId, localStorage)` で再解決 → 反映。thread 切替時は旧 thread の optimistic user を永続から除去して **単一ソース**に揃える |
| New Chat | `GptShell` も `persistThreadIdToStorageAndUrl` を使用（同一経路） |
| API | `POST { message, threadId }` のみ（`sessionId` は付けない） |

## 対象ファイル

- `web/src/hooks/useChat.ts`
- `web/src/api/chat.ts`
- `web/src/types/chat.ts`
- `web/src/components/gpt/GptShell.tsx`（New Chat 経路の同期）

## 検証（runner）

```bash
bash api/scripts/tenmon_pwa_thread_url_constitution_v1.sh --stdout-json
```

手動 lived: `?threadId=...` で起動 → 同一 ID が画面・リクエストに載る → refresh 後も URL + storage で復元 → audit 正常。

## 関連

- 実行手順固定: `TENMON_FINAL_PWA_SURFACE_LAST_MILE_EXECUTION_CURSOR_AUTO_V1.md`（別カード）と同様の gate 運用可
