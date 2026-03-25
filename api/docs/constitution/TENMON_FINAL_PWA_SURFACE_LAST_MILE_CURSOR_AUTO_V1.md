# TENMON_FINAL_PWA_SURFACE_LAST_MILE_CURSOR_AUTO_V1

## 目的

実PWA lived experience を単一真実源とし、会話表面の **重複・center carry bleed・R22/continuity 定型二重** を観測→分類→最小diff修復→再観測→判定まで一連で扱う。

## 成果物（repo）

| 種別 | パス |
|------|------|
| Runner | `api/automation/tenmon_final_pwa_surface_last_mile_v1.py` |
| Shell | `api/scripts/tenmon_final_pwa_surface_last_mile_v1.sh` |
| Trace / レポート | `api/automation/final_pwa_surface_*.json` |
| Next PDCA | `api/automation/generated_cursor_apply/TENMON_FINAL_PWA_SURFACE_LAST_MILE_NEXT_PDCA_AUTO_V1.md` |
| VPS マーカー | `api/automation/TENMON_FINAL_PWA_SURFACE_LAST_MILE_VPS_V1` |

## ログ束（VPS）

`/var/log/tenmon/card_TENMON_FINAL_PWA_SURFACE_LAST_MILE_V1/<TS>/`

- `run.log`
- `gate_status.json`
- `final_pwa_surface_trace.json`（コピー）
- `final_pwa_surface_readiness.json`（コピー）
- `final_pwa_surface_acceptance_verdict.json`（コピー）

## 契約

- **dist 直編集禁止** — 変更は `api/src/**` からビルドへ。
- **最小 diff** — 会話ルート追加より投影・finalize・composer の出口で収束。
- **1 変更 = 1 検証** — 本カードは `tenmon_final_pwa_surface_last_mile_v1.sh` 一発で gate + probe + verdict を残す。

## `final_ready`

次をすべて満たすときのみ `true`：

- `health_ok` / `audit_ok` / `audit_build_ok`（`gate_status.json`）
- `surface_duplicate_clean`
- `surface_bleed_clean`
- `surface_lastmile_clean`（route 定数の表面漏れ等）

## Bleed 分類（観測）

- **A**: thread center 保持が表面の立脚ラベルへ不要投影
- **B**: canonical と比較して projected/finalize だけ聖典語彙へ寄る
- **C**: 本文は妥当だが closing / helper tail が重複

## 修復ルール（実装メモ）

- コード側は `R22_*` / `CONTINUITY` / compare preempt 系で **見出しを `【天聞の所見】` 単層**に寄せ、`次の一手として…` の二重付与を抑止（`finalize.ts` / `humanReadableLawLayerV1.ts` / `tenmonConversationSurfaceV2.ts`）。
- composer 出口で **内部 route 定数行**を除去（`stripInternalRouteTokensFromSurfaceV1`）。

## 自動修復ループ（最大 3）

本リポジトリの runner は **観測・判定・次カード生成**までを自動化する。コード変更を含む PDCA ループは、FAIL 時に `generated_cursor_apply` の MD を起点に **別コミット**で行う（dist 直編集・原因未断定の大 patch は禁止）。
