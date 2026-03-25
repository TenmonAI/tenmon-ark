# TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1

## 目的

PWA lived main blockers が閉じた状態を前提に、**final seal** と **regression guard** を同時生成し、PWA completion を封印可能な状態に固定する。本カードは **product 修復ではなく**、最終 verdict 統合と regression 封印専用である。

## 判定ソースの優先順位（固定）

単一真実源は **`api/automation/pwa_final_seal_and_regression_guard_verdict.json`**。入力の解釈は次の順で固定する。

1. **lived recheck 実行結果** — `TENMON_LIVED_RECHECK_FINAL_VERDICT` で指定したパス、または `api/automation/pwa_lived_gate_recheck_final_verdict.json`。スナップショット内 `lived_recheck_verdict` にも反映する。
2. **final autoloop 実行結果** — `api/automation/pwa_final_completion_readiness.json` / `pwa_final_completion_blockers.json`（autoloop 実行後に更新される）。
3. **handoff / stale レポート** — `api/automation/final_pwa_completion_readiness.json`（参考・補助。stale 混入に注意）。

lived 系は env failure 等で **stale false** を含み得るため、seal 前に上記優先順位を崩さないこと。

## 事前スナップショット契約

`api/scripts/tenmon_pwa_final_seal_and_regression_guard_v1.sh` は **final autoloop より前**に、当時の readiness/blockers と recheck を **`api/automation/pwa_seal_lived_snapshot.json`** に保存する。統合スクリプト `tenmon_pwa_final_seal_verdict_integrate_v1.py` はこのスナップショットと autoloop 後の JSON を突き合わせ、lived と autoloop の矛盾や major blocker を検出する。

## ルール

- seal は **`final_ready=true` かつ統合 `unified_pass=true` のときのみ**（`tenmon_pwa_final_seal_verdict_integrate_v1.py` の `pass`）。
- **PASS 時のみ** `pwa_final_regression_guard.json` を書き込み、`pwa_final_completion_seal.md` に regression 節を **1 回だけ**追記する（二重追記禁止）。
- **FAIL 時** — `pwa_final_completion_seal.md` へ追記しない。retry 用 MD を補強する。終了コード `exit != 0`。
- autoloop プロセスが非ゼロ終了した場合、JSON 上 `final_ready` が残っていても **統合 verdict は FAIL**（環境変数 `TENMON_AUTOLOOP_EXIT`）。
- cosmetic residual は `cosmetic_residual_only` で分離管理。
- frontend / backend の大規模変更禁止（本カードは runner・成果物のみ）。

## 対象（参照）

- `api/scripts/tenmon_pwa_final_seal_and_regression_guard_v1.sh`
- `api/automation/tenmon_pwa_final_seal_verdict_integrate_v1.py`
- `api/automation/tenmon_pwa_final_autoloop_completion_v1.py`
- `api/scripts/tenmon_pwa_final_autoloop_completion_v1.sh`
- `api/automation/pwa_seal_lived_snapshot.json`（runner が生成）
- `api/automation/pwa_final_autoloop_state.json`
- `api/automation/pwa_final_completion_readiness.json`
- `api/automation/pwa_final_completion_blockers.json`
- `api/automation/pwa_final_completion_seal.md`
- `api/automation/generated_cursor_apply/TENMON_PWA_FINAL_AUTOLOOP_COMPLETION_RETRY_CURSOR_AUTO_V1.md`

## 生成物

- `api/automation/pwa_final_seal_and_regression_guard_verdict.json`（**単一 verdict**、PASS/FAIL いずれも更新）
  - `unified_fingerprint_sha256` — lived / autoloop exit / recheck / 参照ファイル指紋から導出する統合 SHA256
  - `tenmon_autoloop_exit` — `TENMON_AUTOLOOP_EXIT` を数値化（未設定は `null`）
  - `lived_recheck_verdict` / `pwa_final_autoloop_state` — トレース用に埋め込み
- `api/automation/pwa_final_regression_guard.json`（**PASS 時のみ**更新、`unified_fingerprint_sha256` を含む）
- `api/automation/pwa_final_completion_seal.md`（**PASS 時のみ** regression 節を追記）
- ログ: `/var/log/tenmon/card_TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1/<TS>/final_verdict.json`

## 実行

```bash
bash api/scripts/tenmon_pwa_final_seal_and_regression_guard_v1.sh --stdout-json
```

事前に lived gate recheck を実行し、必要なら `TENMON_LIVED_RECHECK_FINAL_VERDICT` を設定してから実行すること。
