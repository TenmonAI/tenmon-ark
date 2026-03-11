# OPS_APPLY_ENGINE_SELECT_V1 — apply engine 選定・運用方針

## 現在の裁定（正式）

- **health lane**: **enabled**。対象カード `OPS_HEALTHCHECK_V1` のみ実行（build / restart / audit / representative probes / freeze log）。timer および service はこの前提で成功を維持する。
- **apply lane**: **unwired / skip-disabled official**。`TENMON_AI_APPLY_CMD` および `TENMON_APPLY_ENGINE` は未設定。apply カードは queue で `enabled: false`。runner は apply を実行せず skip 扱いとし、**fail にしない**。この状態を正常運用とする。

## TENMON_AI_APPLY_CMD 未設定時の扱い

- **未設定でも正常運用である**。health-only が正式ルール。service は failed にならず、freeze log は health 実行ごとに出力される。
- 設定ファイル: `automation/systemd/tenmon-auto-runner.env`。変数はコメントアウトのままとする。

## 次に apply engine を選ぶ条件

- **必須**: **headless patch engine** を利用する。VPS 上で無人実行可能なパッチ適用器であること。
- **対象外**: **cursor remote-cli** は apply engine 候補としない（選定対象外）。
- 上記を満たす engine 候補が決まった段階で、比較・選定カードに進む。

## freeze 後の運用手順（短い）

1. **timer / service**: そのまま有効。health-only で 1 周ごとに build / restart / audit / probe / freeze が実行される。
2. **確認**: `/var/log/tenmon/OPS_HEALTHCHECK_V1_AUTO_FREEZE_V1.txt` および state: `/var/log/tenmon/auto_state.json`。
3. **監視**: 必要に応じて `api/scripts/post_release_soak.sh` で POST_RELEASE_SOAK_<TS>.md を生成。
4. **apply を有効にする場合**: 別カードで engine 選定後に `tenmon-auto-runner.env` に `TENMON_AI_APPLY_CMD` または `TENMON_APPLY_ENGINE` を設定し、queue の apply カードを `enabled: true` にする（現時点では行わない）。

## 参照

- queue: `automation/queue/tenmon_auto_queue.json`（health 有効・apply 無効）
- env: `automation/systemd/tenmon-auto-runner.env`
- runner: `automation/tenmon_auto_runner.py`（`_apply_wired()` / find_next_card で health-only を保証）
- 運用概要: `docs/automation/README.md`

---

*OPS_APPLY_ENGINE_SELECT_V1 | health-only official / apply unwired*
