# TENMON_SEAL_GOVERNOR_V1

## 目的

観測・採点・カード生成が揃っても、**PASS（全ゲート達成）以外を採用しない**最終門として Seal Governor を置き、自己改善 OS の暴走を防ぐ。

## モジュール

| ファイル | 役割 |
|----------|------|
| `api/automation/seal_governor_v1.py` | 6 ゲート + 構造整合 + `adoption_sealed` |
| `api/automation/tenmon_self_improvement_seal_governor_v1.py` | 旧: ファイル整合のみ（親 OS パイプライン互換） |

## 束ねる軸（`final_verdict.json` + runtime matrix）

| ゲート | 条件 |
|--------|------|
| static | `chat_ts_static_100` |
| runtime | `chat_ts_runtime_100` **かつ** runtime matrix 全 probe OK |
| surface | `surface_clean` |
| route | `route_authority_clean` |
| longform | `longform_quality_clean` |
| density | `density_lock` |

**`adoption_sealed`:** 上記すべて **かつ** `chat_ts_overall_100` **かつ** 必須成果物が揃い runtime matrix が空でない。

## FAIL 時

- `evidence_bundle.json`（`adoption_sealed == false` のときのみ残す）
- `blocker_classification`（blocker 文字列を surface / longform / density / runtime_route / other に分類）
- `--enforce-exit` で **exit 1**

## CLI

```bash
python3 api/automation/seal_governor_v1.py \
  --seal-dir "$(readlink -f /var/log/tenmon/card)" \
  --out-dir /tmp/gov_out \
  --enforce-exit
```

## 編集境界

- `dist/**`, DB, kokuzo 正文, systemd env, `/api/chat` 契約, `chat.ts` / route 無差別修正, low-level runtime 本体は変更しない。

## 統合

フルパイプラインは **`self_improvement_os_runner_v1.py`** + **`self_improvement_os_run_v1.sh`**（憲章: `TENMON_SELF_IMPROVEMENT_OS_V1.md`）。
