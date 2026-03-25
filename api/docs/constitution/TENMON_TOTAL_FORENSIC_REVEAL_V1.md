# TENMON_TOTAL_FORENSIC_REVEAL_V1

## 目的

TENMON-ARK の **全層現状**を一度に観測し、`integrated_forensic_verdict.json` と **次に切る focused PDCA 1〜3**（`next_priority_cards.json`）へ落とす VPS 総合フォレンジックカード。

- **観測のみ**（`chat.ts` / route / seal スクリプト本体 / worldclass 本体 / kokuzo 学習本体は改変しない）
- **dist は書かない** — ビルド相当は `npm run check`（`tsc --noEmit`）の結果を `typecheck_report.json` に記録

## 実行

```bash
export ROOT=/opt/tenmon-ark-repo
# API が起動している前提で /health / /api/audit / /api|/chat が応答すること
bash api/scripts/tenmon_total_forensic_reveal_v1.sh
```

### 環境変数

| 変数 | 説明 |
|------|------|
| `TENMON_TOTAL_FORENSIC_OUT_DIR` | 出力先（省略時 `api/automation/out/tenmon_total_forensic_reveal_v1/<TS>/`） |
| `CHAT_TS_PROBE_BASE_URL` | 既定 `http://127.0.0.1:3000` |
| `TENMON_ORCHESTRATOR_SEAL_DIR` | seal の `final_verdict.json` を読むパス |
| `TENMON_FORENSIC_KOKUZO_VERDICT` | `integrated_learning_verdict.json` のパス |
| `TENMON_ORCHESTRATOR_KOKUZO_OUT_DIR` | orchestrator 用 kokuzo ディレクトリ |

## 成果物（出力ディレクトリ）

| ファイル | 内容 |
|----------|------|
| `TENMON_TOTAL_FORENSIC_REVEAL_V1` | VPS マーカー |
| `typecheck_report.json` / `typecheck.log` | `npm run check` |
| `health_probe.json` / `audit_probe.json` | curl 観測 |
| `runtime_matrix.json` | `/api/chat` 10 本プローブ（seal と同型の別実装） |
| `worldclass_report.json` | `tenmon_chat_ts_worldclass_completion_report_v1.py` の stdout |
| `seal_verdict.json` | 最新 seal の `final_verdict.json` コピーまたは missing |
| `orchestrator_report.json` | `full_orchestrator` の queue + manifest |
| `kokuzo_learning_report.json` | kokuzo 統合 verdict のコピーまたは missing |
| `chat_static_deep_metrics.json` | `chat.ts` 行数・密度ヒューリスティクス |
| `integrated_forensic_verdict.json` | 全層束ね |
| `next_priority_cards.json` | 次 1〜3 カード候補 |

## 失敗時

各ステップは可能な限り継続し、エラーは各 JSON / `.stderr` に残す。再試行は `TENMON_TOTAL_FORENSIC_REVEAL_RETRY_CURSOR_AUTO_V1`。

## 関連スクリプト

- `api/automation/tenmon_total_forensic_collect_v1.py` — 採取
- `api/automation/tenmon_total_forensic_integrate_v1.py` — 統合 verdict
- `api/automation/full_orchestrator_v1.py` — 優先順
