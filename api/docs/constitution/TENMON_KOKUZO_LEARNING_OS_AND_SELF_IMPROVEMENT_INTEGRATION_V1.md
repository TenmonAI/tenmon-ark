# TENMON_KOKUZO_LEARNING_OS_AND_SELF_IMPROVEMENT_INTEGRATION_V1

## 目的

虚空蔵 **learning** ループ（健全性ゲート → Seed → candidate → render）と **improvement** ループ（ledger / residual / card autogen / governor / runtime seal 合成）を分離しつつ **1 周**で接続する内部 OS。

## 実行

```bash
# api ディレクトリで API が起動していること（/health, /api/audit, /api/chat プローブ）
export ROOT=/opt/tenmon-ark-repo   # 任意
bash api/scripts/kokuzo_learning_improvement_os_integrated_v1.sh
```

- **既定**: `CHAT_TS_RUNTIME_SKIP_SYSTEMD_RESTART=1` 相当（systemd 再起動なし）。本番へ高リスク自動適用しない。
- systemd 再起動を許可する場合は `KOKUZO_ALLOW_SYSTEMD_RESTART=1` を付与（`--allow-systemd-restart`）。

## 成果物（`automation/out/tenmon_kokuzo_learning_improvement_os_v1/`）

| ファイル | 説明 |
|----------|------|
| `TENMON_KOKUZO_LEARNING_OS_AND_SELF_IMPROVEMENT_INTEGRATION_VPS_V1` | VPS マーカー |
| `learning_improvement_os_manifest.json` | サブシステムとパス一覧 |
| `integrated_learning_verdict.json` | learning + improvement の統合 verdict |
| `next_card_dispatch.json` | FAIL 時の次カード（RETRY）ディスパッチ |
| `final_verdict.json` | 最終 integrated 判定 |
| `integration_seal/` | runtime / worldclass seal 成果物 |
| `learning/` | KG0〜KG2B の出力 |
| `_learning_improvement_os/` | governor / residual / compose / ledger / autogen |

## FAIL 時

- `evidence_bundle.json` が生成される
- `next_card_dispatch.json` の `fail_next_cursor_card` → `TENMON_KOKUZO_LEARNING_OS_AND_SELF_IMPROVEMENT_INTEGRATION_RETRY_CURSOR_AUTO_V1`
- プロセス **exit ≠ 0**

## PASS 時

- `maintained_sealed_candidate` / `integrated_verdict_ok` が true
- 既存の `integrated_final_verdict.json`（`_learning_improvement_os/`）と整合

## systemd timer

後段で `CHAT_TS_RUNTIME_SKIP_SYSTEMD_RESTART` 等の gate を付けて timer 化可能（本カードではスクリプトのみ）。
