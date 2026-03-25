# TENMON_CHAT_REFACTOR_OS_V1

## Cursor カード名（参照）

`TENMON_CHAT_REFACTOR_OS_INTEGRATION_AND_SEAL_CURSOR_AUTO_V1`

## 目的

**Chat Architecture Observer → Refactor Planner → Card Generator → Refactor Governor** を一周し、**worldclass / runtime acceptance** の参照を束ね、**統合 manifest** と **最終 verdict / seal 候補**を出す。`chat.ts` 自己修復改善 OS の統合ランナー。

## 実装

| 種別 | パス |
|------|------|
| OS Runner | `api/automation/chat_refactor_os_runner_v1.py` |
| VPS | `api/scripts/chat_refactor_os_run_v1.sh`（`TENMON_CHAT_REFACTOR_OS_INTEGRATION_AND_SEAL_VPS_V1`） |
| 旧カード名ランナー | `tenmon_chat_refactor_autonomous_runner_v1.py`（`BRANDING_AUTONOMOUS`） |

## 実行順

1. architecture observe  
2. refactor plan  
3. card generate  
4. governance decide  
5. acceptance / seal handoff（任意: `--run-acceptance-seal` または環境変数で参照のみ）

## ポリシー

- **auto_apply** は **low risk のみ**（Governor `policy.auto_apply_allowed` と整合）
- **medium / high** は **カード生成まで**（runner は自動適用しない）
- **worldclass / runtime**: 環境変数 `CHAT_REFACTOR_OS_WORLDCLASS_JSON` / `CHAT_REFACTOR_OS_RUNTIME_MATRIX_JSON` で既存成果物を manifest に束ねる（ファイルが存在する場合）
- **FAIL**: `evidence_bundle.json` + governance 系パス + `fail_next` を残し **exit ≠ 0**
- **PASS**: `maintained` / `sealed_candidate` を `integrated_final_verdict.json` と `final_verdict.json` に記載

## 成果物（`--out-dir`）

| ファイル | 説明 |
|----------|------|
| `chat_refactor_os_manifest.json` | ステップ・パス・acceptance 参照 |
| `governance_verdict.json` | Governor 出力（副次） |
| `card_manifest.json` | Generator マニフェストのコピー |
| `integrated_final_verdict.json` | 集約（`maintained`, `sealed_candidate`） |
| `final_verdict.json` | OS 層の最終サマリ（Planner 由来は `planner_final_verdict.json` に退避） |
| `evidence_bundle.json` | **FAIL 時のみ** |

## VPS_VALIDATION_OUTPUTS

- `TENMON_CHAT_REFACTOR_OS_INTEGRATION_AND_SEAL_VPS_V1`
- `chat_refactor_os_manifest.json`
- `governance_verdict.json`
- `card_manifest.json`
- `integrated_final_verdict.json`

## FAIL_NEXT_CARD

`TENMON_CHAT_REFACTOR_OS_INTEGRATION_AND_SEAL_RETRY_CURSOR_AUTO_V1`

## サンプル一周（chat.ts 非読）

```bash
CHAT_REFACTOR_OS_DEMO=1 CHAT_REFACTOR_OS_NO_WRITE_REPO=1 \
  python3 api/automation/chat_refactor_os_runner_v1.py --out-dir /tmp/cr_os_demo --demo --stdout-json
```

## DO_NOT_TOUCH

- `dist/**`, DB schema, kokuzo 正文, systemd env  
- `chat.ts` 実装本体、`/api/chat` 契約、`res.json` 単一出口契約
