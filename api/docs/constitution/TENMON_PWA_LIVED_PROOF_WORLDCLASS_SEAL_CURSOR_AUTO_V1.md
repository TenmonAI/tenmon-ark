# TENMON_PWA_LIVED_PROOF_WORLDCLASS_SEAL_CURSOR_AUTO_V1

## 目的

**PWA lived proof**（実 API）と**会話品質 / worldclass scorecard**を**統合再判定**し、worldclass seal に近づける。**観測・lived proof・scorecard 統合のみ**。stale success 禁止。product core は変更しない。成功の捏造はしない。

## 実装

- `api/automation/tenmon_pwa_lived_proof_worldclass_seal_v1.py` — オーケストレータ（single-source 出力）
- 呼び出し先（変更なし・再利用）:
  - `api/automation/tenmon_pwa_lived_completion_seal_v1.py` — threadId / refresh / new chat / continuity / meta・重複・bleed 系
  - `api/automation/tenmon_worldclass_dialogue_acceptance_priority_loop_v1.py` — analyzer → generator → **scorecard** まで
  - `api/automation/tenmon_worldclass_acceptance_scorecard_v1.py`（ループ内で実行）

## 実行順

1. `tenmon_pwa_lived_completion_seal_v1.py <REPO> <out_subdir> <BASE>`（既定 `TENMON_PWA_SEAL_API_BASE`）
2. `tenmon_worldclass_dialogue_acceptance_priority_loop_v1.py`

## 出力（single-source）

- `api/automation/pwa_worldclass_seal_summary.json`

### 最低項目

| キー | 意味 |
|------|------|
| `lived_proof_ready` | `pwa_lived_completion_readiness.json` の `final_ready`（`env_failure` 時は false） |
| `dialogue_worldclass_band` | dialogue loop / scorecard / conversation summary からの band（観測） |
| `worldclass_score` | scorecard `score_percent` のみ（無ければ `null`） |
| `seal_ready` | 下記 **厳格** 条件の AND |
| `blocked_reasons` | 人間可読のブロック理由列 |
| `next_best_card` | dialogue loop `outputs.next_best_card` 優先、無ければ scorecard |

### `seal_ready`（厳格・evidence ベース）

次を**すべて**満たすときのみ `true`:

- `lived_proof_ready === true`
- scorecard `worldclass_ready === true` かつ `sealed_operable_ready === true`
- conversation `stale_sources_present` が true でない
- scorecard `generated_at` が lived readiness の `generated_at` **より古くない**（lived 後に更新された scorecard を要求）
- scorecard `must_fix_before_claim` に **pwa_lived 系**の行が含まれない
- dialogue priority loop の **exit code が 0**

## 環境変数

| 変数 | 意味 |
|------|------|
| `TENMON_REPO_ROOT` | リポジトリルート |
| `TENMON_PWA_SEAL_API_BASE` | lived seal 用 API base（既定 `http://127.0.0.1:3000`） |
| `TENMON_LOOP_PROBE_BASE` | dialogue loop 側の health 証跡（任意） |

## 終了コード

- `seal_ready === true` → **0**
- それ以外 → **1**（retry カード用）

## nextOnPass

`TENMON_AUTONOMY_CONSTITUTION_SEAL_V1`

## nextOnFail

停止。worldclass seal retry 1 枚のみ生成。
