# TENMON_PWA_REAL_BROWSER_LASTMILE_AUDIT_CURSOR_AUTO_V1

## 目的

実PWA `https://tenmon-ark.com/pwa/` を単一真実源として、thread identity / URL / restore / new chat / continuity の lived 断裂点を **実ブラウザ（Playwright）** で採取し、frontend last-mile の真 blocker を JSON 化する。

## D

- frontend last-mile 専用（backend 改修禁止）
- 観測優先（このカードでは patch しない）
- 実ブラウザ必須（Playwright）
- 最小侵襲 / 1変更=1検証
- build → deploy/restart → audit → browser probe
- FAIL時は blocker JSON と next card を必ず生成
- PASS以外 seal 禁止

## 対象（参照）

- `web/src/components/gpt/GptShell.tsx`
- `web/src/components/gpt/ChatLayout.tsx`
- `web/src/hooks/useChat.ts`
- `web/src/api/chat.ts`
- `web/src/types/chat.ts`

## 対象（生成）

- `api/automation/tenmon_pwa_real_browser_lastmile_audit_v1.py`
- `api/scripts/tenmon_pwa_real_browser_lastmile_audit_v1.sh`
- `api/automation/pwa_real_browser_lastmile_audit_report.json`
- `api/automation/pwa_real_browser_lastmile_blockers.json`
- `api/automation/pwa_real_browser_lastmile_probe_trace.json`
- `api/automation/generated_cursor_apply/TENMON_PWA_REAL_BROWSER_LASTMILE_AUTOFIX_CURSOR_AUTO_V1.md`

## blocker taxonomy

- `url_sync_missing`
- `response_threadid_unused`
- `refresh_restore_fail`
- `newchat_reload_residue`
- `thread_switch_event_missing`
- `chatlayout_not_bound`
- `selector_or_dom_drift`
- `auth_gate_unresolved`

## 監査の範囲

- URL `threadId` の有無
- `/api/chat` 応答で `threadId` が観測されるか
- refresh 後に同一 `threadId` を保持するか
- New Chat 後に reload せず切替されるか（performance navigation で判定）
- old thread URL 復帰時に old thread へ戻れるか
- 認証ゲート未解決時は bypass せず blocker 化

## 実行

```bash
bash api/scripts/tenmon_pwa_real_browser_lastmile_audit_v1.sh --stdout-json
```

## 備考

- Playwright 未導入時は shell runner が最小導入（`pip install playwright` + `playwright install chromium`）を試みる。
- `CHAT_TS_PROBE_BASE_URL` は gate 取得先、`TENMON_PWA_URL` は probe URL を上書き可能。
