# TENMON_PWA_THREAD_NAMING_UNIFICATION_CURSOR_AUTO_V1

## 目的

frontend の `sessionId / threadId` 命名分裂を解消し、会話運用の正典名を `threadId` に統一する。

## D

- frontend only
- 最小diff
- 互換は transport 境界だけに残す（本カード対象の chat mainline では `sessionId` 非使用）
- UI意味変更禁止
- 1変更=1検証
- PASS以外は封印禁止

## 対象

- `web/src/hooks/useChat.ts`
- `web/src/api/chat.ts`
- `web/src/types/chat.ts`
- `web/src/pages/ChatPage.tsx`
- `api/automation/tenmon_pwa_thread_naming_unification_v1.py`
- `api/scripts/tenmon_pwa_thread_naming_unification_v1.sh`

## 実装方針

1. `ChatRequest = { message, threadId }`
2. `postChat()` は `req.threadId` を送信
3. `useChat()` の公開名は `threadId` に統一
4. `ChatPage` 表示・ログも `threadId`
5. `rg -n '\bsessionId\b' web/src` の残存は理由付きでレポート

## 残存 `sessionId` の扱い

- `web/src/pages/TrainingPage.tsx`
- `web/src/pages/TrainPage.tsx`

上記は chat mainline ではなく training ドメイン API (`session_id`) 用。命名統一の対象外として残す。

## 実行

```bash
bash api/scripts/tenmon_pwa_thread_naming_unification_v1.sh --stdout-json
```
