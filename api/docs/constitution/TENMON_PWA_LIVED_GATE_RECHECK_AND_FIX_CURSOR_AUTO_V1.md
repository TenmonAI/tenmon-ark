# TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_CURSOR_AUTO_V1

## 目的

復旧した Playwright 実行環境を用い、実 PWA lived gate を **再監査 → blocker 更新（stale 排除）→ 必要時のみ autofix（plan + reprobe）→ build → 再監査** を最大 **3 ループ**（各ループ **1〜2 修復系統**）で繰り返し、PWA completion を seal 直前まで持ち上げる。

## D

- **frontend のみ**（backend / `api/src/routes/chat.ts` 禁止）
- **blocker-driven**（lived rerun を単一真実源）
- **最大 3 ループ**、各ループ **1〜2 系統**のみ
- 実ブラウザ lived probe 必須
- `repo_root` / `outdir` 契約は `tenmon_pwa_real_browser_lastmile_audit_v1.py` に従う
- auth / selector drift は bypass せず blocker 化
- **env failure**（preflight unusable / `runtime_env_probe_failed`）は **product major と混同しない** → `final_verdict.pass=false`、seal は出さない
- **`gate_audit_build_fail`**: `gate_status` のフラグと `audit_build_body`（実 JSON）が矛盾する場合は **実応答を優先**（`tenmon_pwa_real_browser_lastmile_audit_v1.py` の `effective_audit_build_ok_from_gate` と runner 側 `eff_audit_build_ok`）
- **true blocker が 0 のときのみ** `TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1.md` を emit（**かつ** `env_blocker=false`）

## 修復優先順（分類）

1. `url_sync_missing`
2. `refresh_restore_fail`
3. `newchat_reload_residue`
4. `continuity_fail`
5. `duplicate_or_bleed_fail`

（major は上記 5 + 運用上の監査 taxonomy に限定してカウント）

## RUNNER フロー（`tenmon_pwa_lived_gate_recheck_and_fix_v1.sh`）

各ループ:

1. **preflight**（`pwa_playwright_preflight.json` 更新）
2. **gate** + **lived audit**
3. **major blocker 分類**（`pwa_real_browser_lastmile_blockers.json`）
4. major が 0 → **after** 成果物を保存して終了
5. 最終ループでない → **autofix**（静的計画 + reprobe）→ **api + web build** → **restart** → **audit.build** 取得 → 次ループ

終了後:

6. **diff_before_after.json**（before/after blocker の added/removed）
7. **pwa_lived_completion_readiness.after.json** / **pwa_final_completion_readiness.after.json**（**automation 本線**へ同期 = stale 排除）
8. run 開始時の **pwa_lived_completion_readiness.before.json** / **pwa_final_completion_readiness.before.json**（ログ DIR、任意で artifacts にパス）
9. **final_verdict.json**（`major_product_pass` / `env_blocker` / `pass`）→ pass なら seal カード MD、fail なら retry MD と `exit != 0`

## 生成物（ログ DIR 必須）

- `lived_audit_stdout.before.json` / `lived_audit_stdout.after.json`
- `pwa_real_browser_lastmile_blockers.before.json` / `.after.json`
- `pwa_playwright_preflight.loopN.json`（各ループ preflight 読込の写し）
- `pwa_lived_completion_readiness.before.json` / `pwa_final_completion_readiness.before.json`（任意・存在時のみ）
- `pwa_lived_completion_readiness.after.json`
- `pwa_final_completion_readiness.after.json`
- `diff_before_after.json`
- `final_verdict.json`
- `preflight_stdout.loopN.json` / `lived_audit_stdout.loopN.json` / `autofix_stdout.loopN.json`（監査用）

## 実行

```bash
bash api/scripts/tenmon_pwa_lived_gate_recheck_and_fix_v1.sh --stdout-json
```

事前: `tenmon_pwa_runtime_env_and_playwright_restore_v1.sh` で driver 選択可能なこと。

## PATCHABLE（手元 mainline）

- `web/src/hooks/useChat.ts`
- `web/src/components/gpt/GptShell.tsx`
- `web/src/components/gpt/ChatLayout.tsx`
- `web/src/api/chat.ts`
- `web/src/types/chat.ts`

本 runner は **自動パッチを適用しない**。autofix は plan + reprobe のみ。実コード修正は別コミット後に再実行する。
