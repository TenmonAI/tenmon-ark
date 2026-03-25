# TENMON_FORENSIC_SINGLE_SOURCE_NORMALIZE_CURSOR_AUTO_V1

## 目的

deep / micro / worldclass / seal / orchestrator / self-improvement / kokuzo-learning などの **監査出力を single source に正規化**し、同一対象で `chat_ts_overall_100` が true/false 両方出る揺れを **`forensic_source_conflicts.json` に可視化**する。

## 入力エンジン

- `master_verdict_unifier_v1.unify_sources`（live seal 優先・handoff_not_executed の demotion 済み）
- `forensic_contract_registry_v1.json`（方針・軸・blocker 定義）

## 出力（既定 `api/automation/out/forensic_single_source_normalize_v1/`）

| ファイル | 内容 |
|----------|------|
| `forensic_single_source_verdict.json` | 軸ごとの `boolean_value` + **`normalized`**（pass/fail/incomplete/unknown） |
| `forensic_source_conflicts.json` | cross_tier 不一致・demotion・**audit_build_404** |
| `canonical_runtime_source.json` | **repo_sha**・probe_family・live 優先フラグ・BASE 設定有無 |

## 正規化ルール（要約）

- **live** 証跡がある束では canonical を live 側に寄せる（既存 unifier と整合）。
- **handoff_not_executed** や standalone handoff の false は **fail ではなく incomplete** に落とせる（`normalized`）。
- **BASE URL 未設定**（`CHAT_TS_PROBE_BASE_URL` / `TENMON_API_BASE` とも無）かつ live でない false → **incomplete**。
- **audit_build 404** は `runtime.audit_build` をスキャンし **専用 blocker** として conflicts に記録（全体軸の真偽とは別行）。

## 実行

```bash
cd api/automation
python3 forensic_single_source_normalizer_v1.py --stdout-json
# または
bash ../scripts/forensic_single_source_normalize_v1.sh
```

## VPS マーカー

`TENMON_FORENSIC_SINGLE_SOURCE_NORMALIZE_VPS_V1`（`api/automation/` および out ディレクトリに生成）

## FAIL_NEXT

`TENMON_FORENSIC_SINGLE_SOURCE_NORMALIZE_RETRY_CURSOR_AUTO_V1`

## DO_NOT_TOUCH

`dist/**`、`chat.ts` 本体ロジック、DB schema、kokuzo_pages 正文、systemd env、`/api/chat` 契約。
