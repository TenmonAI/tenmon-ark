# TENMON_PWA_FINAL_AUTOLOOP_COMPLETION_CURSOR_AUTO_V1

## 目的

既存 5 枚 + 後段 2 枚の成果物を統合し、実 PWA `https://tenmon-ark.com/pwa/` を基準に最大 3 ループで

- 監査
- 最小修復
- 再監査

を自動反復し、surface completion を seal 可能状態に収束させる。

## D

- frontend last-mile 完成専用
- backend 大改修禁止
- 最大 3 ループ
- 各ループの修復は 1〜2 点のみ
- 実ブラウザ lived probe 必須
- build → deploy/restart → audit → browser probe
- PASS なら即停止
- FAIL なら next retry card を自動生成
- seal は `final_ready: true` のときのみ
- 「100%接続」は lived gate 全 PASS 時のみ宣言可能

## 対象

- `api/automation/tenmon_pwa_final_autoloop_completion_v1.py`
- `api/scripts/tenmon_pwa_final_autoloop_completion_v1.sh`
- `api/docs/constitution/TENMON_PWA_FINAL_AUTOLOOP_COMPLETION_CURSOR_AUTO_V1.md`
- 必要最小の frontend mainline
  - `web/src/hooks/useChat.ts`
  - `web/src/components/gpt/GptShell.tsx`
  - `web/src/components/gpt/ChatLayout.tsx`
  - `web/src/api/chat.ts`
  - `web/src/types/chat.ts`

## 入出力

### 前提入力（優先）

- `api/automation/pwa_real_browser_lastmile_blockers.json`
- `api/automation/pwa_real_browser_lastmile_postfix_readiness.json`
- `api/automation/pwa_lived_completion_readiness.json`
- `api/automation/pwa_lived_completion_blockers.json`
- `api/automation/final_pwa_completion_readiness.json`
- `api/automation/pwa_probe_gap_report.json`

無い場合は既存 artifacts から補完し、欠損は空として扱う。

### 出力

- `api/automation/pwa_final_autoloop_state.json`
- `api/automation/pwa_final_completion_readiness.json`
- `api/automation/pwa_final_completion_blockers.json`
- `api/automation/pwa_final_completion_seal.md`
- `api/automation/generated_cursor_apply/TENMON_PWA_FINAL_AUTOLOOP_COMPLETION_RETRY_CURSOR_AUTO_V1.md`

## ループ方針（最大 3）

- LOOP1: URL / response.threadId / hydrate restore
- LOOP2: new chat / thread-switch / old thread restore
- LOOP3: naming residue / cosmetic duplicate / continuity residue

各ループは blocker 優先度に基づき、1〜2 修復点のみ選択する。

## final_ready 判定

以下ゲートを評価する:

- `threadid_surface_pass`
- `url_sync_pass`
- `refresh_restore_pass`
- `newchat_pass`
- `continuity_pass`
- `duplicate_or_bleed_pass`
- `audit_build_pass`

判定規則:

- 上記すべて PASS なら `final_ready: true`
- cosmetic 残差のみなら `final_ready: true` かつ `cosmetic_residual_only: true`
- 主要 blocker が 1 つでも残る場合は FAIL

## 実行

```bash
bash api/scripts/tenmon_pwa_final_autoloop_completion_v1.sh --stdout-json
```

