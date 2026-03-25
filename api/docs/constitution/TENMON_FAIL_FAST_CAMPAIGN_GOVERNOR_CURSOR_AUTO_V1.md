# TENMON_FAIL_FAST_CAMPAIGN_GOVERNOR_CURSOR_AUTO_V1

## 目的

最終列を受け、どこで止めるか・どこまで claim するか・追加カードなしで終了できるかを fail-fast で裁定する。
「これ以上は追加しない」ための停止 governor。

## D

- 新規改善カードを勝手に増やさない
- PASS なら停止
- FAIL でも next は 1枚以下
- env fail / product fail / claim fail を混同しない
- 最後の council 出口として働く

## 入力

| ファイル | 用途 |
|----------|------|
| `tenmon_latest_state_rejudge_and_seal_refresh_verdict.json` | env/product 現況 |
| `tenmon_stale_evidence_invalidation_verdict.json` | stale 残件 |
| `tenmon_final_operable_seal.json` | operable sealed 状態 |
| `tenmon_final_worldclass_claim_gate.json` | claim resolved / forbidden |
| `tenmon_system_verdict.json` | current state documented 補助 |

## 判定

- `campaign_stop=true`
  - operable sealed true かつ claim gate resolved
  - または claim forbidden だが現況が十分文書化され、より高信頼の次手がない
- `campaign_stop=false`
  - operable seal false で blocker を 1つに絞れる
  - claim gate verdict が未解決

## 出力

`api/automation/tenmon_fail_fast_campaign_governor_verdict.json`
`api/automation/tenmon_fail_fast_campaign_governor_report.md`

JSON 必須項目:

- `card`
- `generated_at`
- `pass`
- `campaign_stop`
- `current_finish_band`
- `operable_state`
- `worldclass_claim_state`
- `one_next_card_max`
- `reason`
- `final_operator_message`

ルール:

- `one_next_card_max` は `null` か 1枚のみ
- `campaign_stop=true` なら追加カードなし
- `campaign_stop=false` なら 1枚だけ返す
- 追加候補は以下のみ
  - `TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1`
  - `TENMON_FINAL_WORLDCLASS_CLAIM_GATE_CURSOR_AUTO_V1`
  - `TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1`

## 実行

```bash
cd /opt/tenmon-ark-repo/api
bash scripts/tenmon_fail_fast_campaign_governor_v1.sh --stdout-json
```

- **exit 0**: `pass == true`（campaign stop）
- **exit 1**: `pass == false`（one next card）

---

*Version: 3*
