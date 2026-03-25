# TENMON_ENV_FAIL_PRODUCT_FAIL_SPLITTER_CURSOR_AUTO_V1

## 目的

**env fail** と **product fail** を最終判定前に分離し、**false negative** を防ぐ。

## D

- **env failure** は **product failure** と別 bucket（`pwa_playwright_preflight.env_failure`）
- **lib 欠損 / playwright 起動不可 / health contract split** は **env/gate** 側（`gate:*` トークン + `infra_gate` の primary_blockers）
- **continuity 実ドロップ**等は **product** 側（`chat:*` / `continuity_fail` 等 + `conversation_backend` 等）
- **mixed verdict 禁止** — postfix で env と product が同時に立ったら `mixed=true`

## 入力

| ファイル | 用途 |
|----------|------|
| `pwa_playwright_preflight.json` | `env_failure` |
| `pwa_final_completion_blockers.json` | `blockers` / `postfix_blockers` をトークン分類 |
| `tenmon_current_state_blockers_by_system.json` | サブシステム別 primary_blockers を env/product に寄せた補助 |

## 出力

`api/automation/tenmon_env_fail_product_fail_splitter_verdict.json`

- **`env_blockers` / `product_blockers`**: 上記トークン集合による分類
- **`unclassified_postfix_blockers`**: どちらにも当てはまらない postfix
- **`by_system`**: `infra_gate` → `infra_gate_env_signals`、`conversation_backend` / `pwa_lived_proof` / `repo_hygiene` → `product_side_signals`
- **`recommended_next_card`**: `env_failure` なら runtime restore、そうでなければ `product_blockers` があれば continuity hold

## 実行

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/tenmon_env_fail_product_fail_splitter_v1.py --stdout-json
```

- **exit 0**（観測・分離のみ）

---

*Version: 1*
