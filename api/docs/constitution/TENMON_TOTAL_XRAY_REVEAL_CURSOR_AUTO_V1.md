# TENMON_TOTAL_XRAY_REVEAL_CURSOR_AUTO_V1

## 目的

TENMON-ARK（TENMON-ARK）の **会話・学習・自己改善・自己修復・虚空蔵・NAS/backup・automation・認知内部表現・憲法ガバナンス・remote admin・feature/cursor autobuild** などを横断し、**実装 / 接続 / 実行 / 成果物** を一束で可視化する読み取り専用レントゲン監査。

## 非改変範囲（本カード）

- `dist/**`、DB schema、`kokuzo_pages` 正文、systemd env 内容
- `/api/chat` 契約、`chat.ts` / route / learning **本体の修正は行わない**
- backup / NAS **実データ**の変更は行わない

## 正本スクリプト

| 種別 | パス |
|------|------|
| Python | `api/automation/tenmon_total_xray_reveal_v1.py` |
| Schema | `api/automation/tenmon_total_xray_schema_v1.json` |
| Shell（軽量・read-only 寄り） | `api/scripts/tenmon_total_xray_reveal_v1.sh` |
| Shell（VPS・build/restart/health/runtime 込み） | `api/scripts/tenmon_total_xray_reveal_vps_v1.sh` |

## 実行例

```bash
# 既定出力: api/automation/out/tenmon_total_xray_reveal_v1/
./api/scripts/tenmon_total_xray_reveal_v1.sh

# 出力先を明示
TENMON_TOTAL_XRAY_OUT_DIR=/var/log/tenmon/xray_$(date +%Y%m%d_%H%M%S) ./api/scripts/tenmon_total_xray_reveal_v1.sh
```

環境ヒント（任意）:

- `CHAT_TS_PROBE_BASE_URL` — 設定時、会話系 `running` 判定に worldclass runtime を利用
- `TENMON_BACKUP_ROOT` / `NAS_MOUNT_PATH` — NAS/backup `connected` ヒント
- `TENMON_SEAL_DIR` — seal ログ探索の代替ルート

## 成果物（必須）

出力ディレクトリに以下が生成される:

1. `total_xray_reveal.json` — 全集約
2. `total_xray_reveal.md` — 人間可読サマリ
3. `subsystem_readiness_matrix.json`
4. `crouching_functions.json` — **うずくまっている機能**（file はあるが出力・統合が弱い）
5. `missing_runners.json`
6. `output_contract_mismatches.json`
7. `integrated_master_verdict.json`
8. `next_priority_cards.json`（最大 5 枚 + `manual_gate_subsystems` は別キー）
9. `TENMON_TOTAL_XRAY_REVEAL_VPS_V1` — VPS マーカー

## 12 系統 ID

`total_xray_reveal.json` の `subsystems` キー:

1. `conversation_system`
2. `chat_architecture`
3. `self_improvement_os`
4. `chat_refactor_os`
5. `kokuzo_learning_os`
6. `storage_backup_nas`
7. `acceptance_runtime`
8. `cursor_autobuild`
9. `feature_autobuild`
10. `remote_admin`
11. `internal_cognition`
12. `constitution_governance`

各系統は `exists` / `implemented` / `connected` / `running` / `producing_outputs` / `completedness_score` / `risk_level` / `system_status` / `blockers` / `evidence_paths` を持つ。

## `system_status` 語彙

`absent` / `file_only` / `partial_impl` / `runner_only` / `outputless` / `connected_not_running` / `running_not_integrated` / `integrated_partial` / `integrated_ready`

（ヒューリスティクスにより最も近いラベルを付与）

## VPS カード

- **VPS**: `TENMON_TOTAL_XRAY_REVEAL_VPS_V1`
- **FAIL_NEXT**: `TENMON_TOTAL_XRAY_REVEAL_RETRY_CURSOR_AUTO_V1`

## 限界事項

- 本監査は **ファイル系・粗いヒューリスティクス** に基づく。本番の真の「稼働」は VPS runtime / journal / seal と併用すること。
- `/var/log/tenmon` 等は権限により読めない環境がある（その場合 `output_contract_mismatches` に記録）。
