# AUTO_BUILD_HUMAN_GATE_UI_V1

## 目的

既存の **AUTO_BUILD_*** スタックに、**human gate 承認の記録フロー**を最小追加する。正典・thought guide・persona constitution の**意味内容は自動確定しない**（`requiresHumanJudgement` / `human_gate`）。

## 成果物

| ファイル | 役割 |
|----------|------|
| `api/automation/human_gate_schema_v1.json` | レコード JSON Schema |
| `api/automation/human_gate_store_v1.py` | 永続化（pending / approved / rejected / held） |
| `api/automation/human_gate_cli_v1.py` | CLI: `list`, `approve`, `reject`, `hold`, `info` |
| `api/automation/_human_gate/.gitignore` | ローカル JSON をコミットしない |

## ストア場所

1. `TENMON_HUMAN_GATE_ROOT`（任意）
2. `/var/log/tenmon/human_gate/`（書き込み可のとき）
3. フォールバック: `api/automation/_human_gate/`

## Runner 連携

- 人間ゲート対象カードで **初回**（`--gate-request-id` なし）: `create_pending_gate` → `gateRequestId` を返し **`human_judgement_required`** で停止。
- **承認後**: 同じ ID で `python3 ... auto_build_runner_v1.py ... --gate-request-id <id>` → PATCH は **`human_gate_approved_bypass`** で通過し、以降のフェーズへ進む（`dry-run` / `execute-checks` は従来どおり）。

## Supervisor 連携

- `human_judgement_required` で **`gateRequestId` が欠ける場合のみ**（異常時）、`supervisor_fallback` として pending を補完作成。
- `--gate-request-id` を Runner に透過。

## CLI 例

```bash
export TENMON_HUMAN_GATE_ROOT=/path/to/repo/api/automation/_human_gate   # 任意

python3 api/automation/human_gate_cli_v1.py info
python3 api/automation/human_gate_cli_v1.py list
python3 api/automation/human_gate_cli_v1.py list --all --json
python3 api/automation/human_gate_cli_v1.py approve <request_id> --by "Alice" --note "LGTM"
python3 api/automation/human_gate_cli_v1.py reject <request_id> --by "Bob" --note "needs revision"
python3 api/automation/human_gate_cli_v1.py hold <request_id> --by "Carol" --note "waiting legal"
```

## 禁止

- `chat.ts` / `client/**` / `kokuzo_schema.sql` / `dist/**` への変更は本カード外。

## 検証

- `python3 -m json.tool api/automation/human_gate_schema_v1.json`
- Runner 初回 → `_human_gate/*.json`（または `/var/log/...`）に pending
- `approve` 後、`--gate-request-id` で Runner が `ok: true` まで進む
- `cd api && npm run build` PASS
