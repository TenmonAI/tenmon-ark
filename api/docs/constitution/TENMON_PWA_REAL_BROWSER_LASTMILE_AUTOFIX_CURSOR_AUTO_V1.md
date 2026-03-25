# TENMON_PWA_REAL_BROWSER_LASTMILE_AUTOFIX_CURSOR_AUTO_V1

## 目的

直前の `api/automation/pwa_real_browser_lastmile_blockers.json` を入力とし、**frontend mainline**（`useChat.ts` / `GptShell.tsx` / `ChatLayout.tsx` / `api/chat.ts` / `types/chat.ts`）に限定した **最小 diff** で URL 正典化・命名統一・new chat binding・restore を収束させる。backend は変更しない。

## D

- frontend only（backend 禁止）
- blocker 駆動
- 最小 diff
- **1 ループあたり修復点は最大 2 系統**
- UI 意味変更禁止（表示文言・操作意図は変えない）
- reload 依存除去
- build → deploy/restart → `/api/audit.build` → browser reprobe
- **PASS（blocker 空）以外 seal 禁止**
- 修復不能 blocker は `retry` に送る（報告 JSON に明示）

## 対象（ソース）

- `web/src/hooks/useChat.ts`
- `web/src/components/gpt/GptShell.tsx`
- `web/src/components/gpt/ChatLayout.tsx`
- `web/src/api/chat.ts`
- `web/src/types/chat.ts`

## 対象（自動化）

- `api/automation/tenmon_pwa_real_browser_lastmile_autofix_v1.py`
- `api/scripts/tenmon_pwa_real_browser_lastmile_autofix_v1.sh`
- `api/automation/pwa_real_browser_lastmile_autofix_report.json`
- `api/automation/pwa_real_browser_lastmile_postfix_readiness.json`
- `api/automation/generated_cursor_apply/TENMON_PWA_FINAL_AUTOLOOP_COMPLETION_CURSOR_AUTO_V1.md`

## blocker → patch 方針（参照）

| blocker | 方針 |
|--------|------|
| `url_sync_missing` | `readThreadIdFromUrl` / `writeThreadIdToUrl` / URL 優先の active thread 解決 |
| `response_threadid_unused` | `types/chat.ts` の `threadId?` と `useChat` / `postChat` の `{ message, threadId }` 統一 |
| `refresh_restore_fail` | 初回 hydrate: `URL > localStorage > 新規`；`popstate` / `hashchange` / thread switch で追従 |
| `newchat_reload_residue` | `GptShell` の `reload` 除去、`tenmon:thread-switch` + URL 更新 |
| `thread_switch_event_missing` | `tenmon:thread-switch` の dispatch / listen |
| `chatlayout_not_bound` | `ChatLayout` で `useChat` と `data-*` による binding 可観測化 |
| `naming_residue` | `sessionId` 廃止、`threadId` 正典へ |
| `selector_or_dom_drift` / `auth_gate_unresolved` / `gate_*` | 自動修復対象外 → retry |

## 実行

```bash
bash api/scripts/tenmon_pwa_real_browser_lastmile_autofix_v1.sh --stdout-json
```

## 備考

- 入力 `pwa_real_browser_lastmile_blockers.json` が無い場合は空配列として扱い、**reprobe のみ**とする。
- 再 probe は既存 `tenmon_pwa_real_browser_lastmile_audit_v1.py` を subprocess で実行する。
