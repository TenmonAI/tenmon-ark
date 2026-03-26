# TENMON_DIALOGUE_COMPLETION_NO_MIDRUN_VPS_AUTOBUNDLE_CURSOR_AUTO_V1

## 目的

watch loop 証跡・K1・SUBCONCEPT・GENERAL を **1 本の autobundle** で固定順検証する（VPS 手入力なし）。各段の後に `npm run build` と HTTP ゲート、プローブごとに `POST /api/chat`。

## 実行

```bash
export TENMON_REPO_ROOT=/path/to/tenmon-ark-repo
# 任意: API ベース
export TENMON_AUTOBUNDLE_API_BASE=http://127.0.0.1:3000
# CI 等: systemctl を飛ばす
export TENMON_AUTOBUNDLE_SKIP_SYSTEMD_RESTART=1
# 3 プローブすべて routeReason=K1_TRACE_EMPTY_GATED_V1 を厳密要求する場合
export TENMON_AUTOBUNDLE_STRICT_K1_PROBES=1

python3 api/automation/tenmon_dialogue_completion_no_midrun_vps_autobundle_v1.py
```

## 出力

- `api/automation/tenmon_dialogue_no_midrun_vps_autobundle_summary.json`
- `api/automation/tenmon_dialogue_no_midrun_vps_autobundle_report.md`

## 関連実装（repo）

- `api/scripts/tenmon_cursor_watch_loop.sh` — real/dry 分岐（承認済み high-risk のみ real）
- `api/src/routes/chat.ts` — K1 補完幅 140〜260 字、GENERAL/水火/自己視点、`TENMON_SUBCONCEPT_CANON_V1` 空本文フォールバック
- `api/src/routes/chat_refactor/finalize.ts` — SUBCONCEPT 空本文フォールバック、テンプレ strip 拡張

## next

- **nextOnPass**: `TENMON_DIALOGUE_COMPLETION_NO_MIDRUN_VPS_AUTOBUNDLE_CURSOR_AUTO_V1`（親カード仕様に従う）
- **nextOnFail**: 停止。retry 1 枚のみ生成。
