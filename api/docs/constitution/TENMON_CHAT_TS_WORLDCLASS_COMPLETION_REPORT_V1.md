# TENMON_CHAT_TS_WORLDCLASS_COMPLETION_REPORT_V1

## 目的

`api/src/routes/chat.ts` を中心とした会話主線の **完成判定** を、観測ベースで JSON/MD に出力する。憶測禁止・1変更=1検証・`dist/**` 直編集禁止に従う。

## 実行

```bash
cd /opt/tenmon-ark-repo/api
npm run build
python3 automation/tenmon_chat_ts_worldclass_completion_report_v1.py --stdout-json
# MD 同時出力:
python3 automation/tenmon_chat_ts_worldclass_completion_report_v1.py --stdout-json --write-md docs/constitution/TENMON_CHAT_TS_WORLDCLASS_COMPLETION_REPORT_LAST_RUN.md
```

任意: **ランタイム acceptance（CHAT_TS_RUNTIME_ACCEPTANCE_AND_WORLDCLASS_SEAL_V1 と同一マトリクス）**  
文言は **`api/automation/chat_ts_probe_canon_v1.json`**（`CHAT_TS_PROBE_CANON_V1`）に統一されている。

```bash
export CHAT_TS_PROBE_BASE_URL=http://127.0.0.1:3000
# 省略時は POST /chat と /api/chat を順に試して 200 の URL を自動採用
export CHAT_TS_PROBE_CHAT_URL=http://127.0.0.1:3000/api/chat
python3 automation/tenmon_chat_ts_worldclass_completion_report_v1.py --stdout-json --write-next-pdca
```

- `runtime` に `health` / `audit` / `audit_build` / 各 `general_1` … `longform_1` の観測が入る。
- `verdict.runtime_probe_blockers` が空かつ静的条件を満たせば `chat_ts_runtime_100` / `chat_ts_overall_100` が true。
- `--write-next-pdca`: 未達時に `api/automation/generated_cursor_apply/CHAT_TS_RUNTIME_NEXT_PDCA_AUTO_V1.md` を更新。

VPS 一括: `api/scripts/chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh`（ログは `SEAL_LOG_DIR` または `/var/log/tenmon/card_*`）。

## 静的メトリクス定義（スクリプト実装と一致）

| キー | 意味 |
|------|------|
| `line_count` | `chat.ts` 行数 |
| `natural_general_hit_count` | `routeReason: "..."` / `__routeReason*=` から抽出した hits のうち NATURAL_GENERAL 系 |
| `orig_json_bind_count` | `const|let x = res.json(` + `__TENMON_NATIVE_RES_JSON = (res as any).json.bind(res)` |
| `res_json_reassign_count` | `(res as any).json =` の出現数 |
| `helper_tail_string_count` | 代表パターン（補助/一貫の手がかり/いまの答えは/次の一手として、/generic preamble） |
| `finalize_reducer_count` | `applyFinalAnswerConstitutionAndWisdomReducerV1(` の呼び出し数 |
| `response_projector_count` | `responseProjector` / `cleanLlmFrameV1` / `normalizeDisplayLabel` |
| `reply_definition_count` | `const __reply =` |
| `threadCore_count` / `threadCenter_count` / `responsePlan_count` / `seed_count` / `synapse_count` | トークン密度（観測用） |

## 判定

- `chat_ts_static_100`: 上記閾値（カード CHAT_TS_WORLDCLASS_AUTOFINAL_PDCA_SINGLECARD_V1 の数値条件）をすべて満たす
- `chat_ts_runtime_100`: 会話 probe マトリクスがスクリプトに実装され、かつ成功（現状は未実装のため通常 false）
- `chat_ts_overall_100`: 上記両方 true
- `advisory_warnings`: 数値閾値外の改善候補（synapse 密度など）
- `runtime_observation_mode`: `live`（`CHAT_TS_PROBE_BASE_URL` あり） / `handoff_not_executed`（runtime 行列未実行）
- `completion_criteria_ref`: seal merge + **CHAT_TS_COMPLETION_SUPPLEMENT** との整合用ラベル

**注意:** `handoff_not_executed` のとき、**seal** の `runtime_matrix` と `chat_ts_runtime_100` を正とする（`CHAT_TS_COMPLETION_SUPPLEMENT_V1`）。

## POSTLOCK 観測片（任意）

`CHAT_TS_POSTLOCK_MAINTENANCE` 用に **report 単体**のスナップショットを JSON で出す:

```bash
python3 automation/tenmon_chat_ts_worldclass_completion_report_v1.py \
  --stdout-json \
  --write-postlock-report-slice automation/postlock_report_slice_last.json
```

内部関数: `build_postlock_report_slice_v1(rep)`（seal の `final_verdict` とは別源）。

## 関連カード

- `CHAT_TS_WORLDCLASS_AUTOFINAL_PDCA_SINGLECARD_V1`
- `CHAT_TS_RESPONSIBILITY_SEPARATION_PDCA_V1`
- `TENMON_CONVERSATION_COMPLETION_STAGE1_SURFACE_AND_BLEED_PDCA_V1`
- `CHAT_TS_POSTLOCK_MAINTENANCE_CURSOR_AUTO_V1`
