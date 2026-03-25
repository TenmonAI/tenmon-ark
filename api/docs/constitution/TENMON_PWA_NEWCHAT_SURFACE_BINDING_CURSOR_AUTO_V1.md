# TENMON_PWA_NEWCHAT_SURFACE_BINDING_CURSOR_AUTO_V1

## 目的

**New Chat / reset** を `reload` に依存せず、`URL`・`state`・`localStorage`・`messages` を同一 success path で切り替える。

## D

- **reload 禁止**（本カード経路の New Chat / reset）
- 最小 diff / **frontend only**
- 既存 sidebar / page 構成維持
- 1 変更 = 1 検証
- PASS 以外は封印禁止

## 契約

| 項目 | 内容 |
|------|------|
| イベント | `tenmon:thread-switch` — `detail: { threadId: string }` |
| 補助 | `tenmon:threads-updated`（スレッド一覧等の再描画用） |
| URL + storage | `persistThreadIdToStorageAndUrl(threadId)`（replaceState + `TENMON_THREAD_ID:*`） |

## 対象ファイル

- `web/src/hooks/useChat.ts`（`TENMON_THREAD_SWITCH_EVENT` 受信・`resetThread`）
- `web/src/components/gpt/GptShell.tsx`（Sidebar New Chat）
- `web/src/components/gpt/Sidebar.tsx`（スレッド選択 / 削除後の切替 — **関数名に `reload` を使わない**）
- `web/src/pages/ChatPage.tsx`（レガシー UI 経路の reset は `resetThread` のみ）

## 手動 lived（runner は静的 + gate）

1. 会話を数ターン送る  
2. **New Chat**（Sidebar）→ **reload なし**で URL の `threadId` が変わり messages が空  
3. URL を旧 `threadId` に戻す（またはスレッド一覧から旧を選ぶ）→ 旧履歴が復元  

## 実行

```bash
bash api/scripts/tenmon_pwa_newchat_surface_binding_v1.sh --stdout-json
```
