# CONVERSATION_DENSITY_LEDGER_V1

**MODE:** `DOCS_ONLY`（runtime 改修なし）  
**上位文書:** `SELF_BUILD_GOVERNOR_V1.md`、`CONVERSATION_DEGRADATION_METRICS_V1.md`  
**関連実装:** `FINAL_DENSITY_CONTRACT_AND_GENERAL_SOURCEPACK_V1`（`densityContract`・最小 source pack）  
**no-touch:** `api/src/db/kokuzo_schema.sql`  
**目的:** 会話密度の変化を数値で追い、`FINAL_DENSITY_CONTRACT` の効果を監査可能にする。

---

## 1. 監視対象（固定名・密度 ledger）

ledger / audit 接続時も **次の識別子をそのまま**使う。

| # | 指標名 |
|---|--------|
| 1 | `source_stack_empty_rate` |
| 2 | `laws_used_zero_rate` |
| 3 | `evidence_ids_zero_rate` |
| 4 | `center_key_null_rate` |
| 5 | `density_contract_present_rate` |
| 6 | `one_step_explicit_rate` |
| 7 | `bridge_phrase_rate` |
| 8 | `second_turn_thinning_rate` |

**推奨追加（合成スコア・0〜1）:**

| 指標名 | 意味 |
|--------|------|
| `general_route_density_score` | `NATURAL_GENERAL_LLM_TOP` 等 general 系での密度合成 |
| `define_route_density_score` | `answerMode == define` または define 系 route の合成 |
| `research_route_density_score` | 比較・研究系 route / 研究的トーンの合成 |

合成式は §7 で固定（重みは運用で調整可だが **キー名は変更しない**）。

---

## 2. 観測単位

- **単発応答:** `/api/chat` の 1 レスポンス JSON（`decisionFrame.ku` + `response`）。
- **同一 thread 2 ターン目:** 同一 `threadId` の連続 2 ターンをペアとみなす。
- **PATCH29 probe bundle:** `/var/log/tenmon/card_CHAT_SAFE_REFACTOR_PATCH29_FINAL_ACCEPTANCE_SWEEP_V1/<ts>/probe.*.json` 等。

集計窓（将来）: `window_1d` / `window_7d`（`CONVERSATION_DEGRADATION_METRICS_V1` と同様）。

---

## 3. 指標定義（分子 / 分母 / 算式）

### 3.1 `source_stack_empty_rate`

- **意味:** `sourceStackSummary` が観測上「空」に近い応答の割合（密度契約後も **本文だけ厚い**状態を検知）。
- **空の定義（初期）:**  
  `sourceStackSummary == null` **または**  
  `primaryMeaning` と `responseAxis` がともに空（空白トリム後 0 文字）。
- **分子:** 上記を満たす応答数  
- **分母:** 対象応答総数  
- **式:** `empty_source_stack / total_responses`

### 3.2 `laws_used_zero_rate`

- **意味:** `lawsUsed` が 0 件の割合（KHS 非ヒット・契約束のみ等を含む）。
- **分子:** `(decisionFrame.ku.lawsUsed // []) | length == 0` の件数  
- **分母:** 対象応答総数  
- **式:** `laws_zero / total_responses`

### 3.3 `evidence_ids_zero_rate`

- **意味:** `evidenceIds` が 0 件の割合。
- **分子:** `(decisionFrame.ku.evidenceIds // []) | length == 0` の件数  
- **分母:** 対象応答総数  
- **式:** `evidence_zero / total_responses`

### 3.4 `center_key_null_rate`

- **意味:** 中心キーが欠落している割合。
- **分子:** `centerKey` と `threadCenterKey` がともに null / 空文字に相当する件数（実装では両方 trim 空）  
- **分母:** 対象応答総数  
- **式:** `center_null / total_responses`

### 3.5 `density_contract_present_rate`

- **意味:** `FINAL_DENSITY_CONTRACT_AND_GENERAL_SOURCEPACK_V1` により `responsePlan.densityContract` が付いた応答の割合。
- **分子:** `decisionFrame.ku.responsePlan.densityContract` がオブジェクトとして存在する件数  
- **分母:** 対象応答総数（または **密度対象 route のみ**に限定した部分集合でも可。ledger では `denominator_scope` を併記）  
- **式:** `density_contract_present / total_responses`

### 3.6 `one_step_explicit_rate`

- **意味:** 次の一手・次軸が型または本文で明示されている割合。  
- **分子:** `answerFrame == "one_step"` **または** `response` に `次の一手` または `次軸` または `次は` を含む件数  
- **分母:** 対象応答総数  
- **式:** `one_step_explicit / total_responses`  
- **注:** `CONVERSATION_DEGRADATION_METRICS_V1` の `one_step_explicit_rate` と **定義を揃える**（二重計測時は同一式）。

### 3.7 `bridge_phrase_rate`

- **意味:** 薄い橋文の出現率。  
- **分子:** `response` が橋文パターンに一致する件数  
- **分母:** 対象応答総数  
- **橋文パターン例（初期）:**  
  - `（.*）を土台に、いまの話を見ていきましょう`  
  - `受け取っています`  
- **式:** `bridge_count / total_responses`  
- **注:** 劣化指標側と **パターン集合を共有**する。

### 3.8 `second_turn_thinning_rate`

- **意味:** 2 ターン目で内容密度が薄化した率。  
- **分子:** turn2 の内容語数（または `response` 長）が turn1 比で閾値以下に落ちた thread 数  
- **分母:** turn2 が存在する thread 数  
- **式:** `thin_turn2 / threads_with_turn2`  
- **注:** 閾値は運用定数（ledger メタに `thinning_threshold` を記録）。

---

## 4. 合成スコア（推奨追加）

### 4.1 `general_route_density_score`（0〜1）

- **対象:** `routeReason` が `NATURAL_GENERAL_LLM_TOP` 等（general 族。束では PATCH29 の general 相当を含めない場合は `filter.general == true` メタで限定）。
- **初期合成（例）:**  
  `1 - 0.35 * norm(source_stack_empty) - 0.25 * norm(laws_zero) - 0.2 * norm(center_null) + 0.2 * norm(density_contract_present)`  
  ここで `norm(x)` は 0/1 またはバケット化した 0〜1。  
- **固定:** **キー名**と **項の意味**のみ本カードで固定。係数は `ledger_meta.weights` で上書き可。

### 4.2 `define_route_density_score`（0〜1）

- **対象:** `answerMode == "define"` または define 系 `routeReason`。
- **初期合成:** general と同型で、分母集合のみ define に限定。

### 4.3 `research_route_density_score`（0〜1）

- **対象:** 比較・研究的 route / メッセージに「研究的に」等が含まれる束。  
- **初期合成:** `compare_research_shallow_rate`（劣化指標）の **補集合**を一部に含める等、研究密度の欠落を減点。

---

## 5. 実ログから機械算出（jq 例）

**PATCH29 束**（`probe.*.json`）に対し、例えば **`density_contract_present_rate` の分子カウント**（単ファイル）:

```bash
jq 'select(.decisionFrame.ku.responsePlan.densityContract != null) | 1' probe.structure.json
```

**束全体**で「`lawsUsed` が空の件数 / ファイル数」（概念例）:

```bash
for f in probe.*.json; do
  jq -r "[.decisionFrame.ku.lawsUsed // [] | length == 0] | if .[0] then 1 else 0 end" "$f"
done | awk '{s+=$1;n++} END{print (n?s/n:0)}'
```

**1 応答の観測スナップショット（推奨 jq 形）:**

```jq
{
  rr: .decisionFrame.ku.routeReason,
  am: .decisionFrame.ku.answerMode,
  laws: (.decisionFrame.ku.lawsUsed // [] | length),
  evi: (.decisionFrame.ku.evidenceIds // [] | length),
  ssEmpty: (
    (.decisionFrame.ku.sourceStackSummary == null)
    or (
      ((.decisionFrame.ku.sourceStackSummary.primaryMeaning // "") | strings | gsub("^\\s+|\\s+$";"")) == ""
      and ((.decisionFrame.ku.sourceStackSummary.responseAxis // "") | strings | gsub("^\\s+|\\s+$";"")) == ""
    )
  ),
  centerNull: (
    ((.decisionFrame.ku.centerKey // "") | strings | gsub("^\\s+|\\s+$";"")) == ""
    and ((.decisionFrame.ku.threadCenterKey // "") | strings | gsub("^\\s+|\\s+$";"")) == ""
  ),
  dcPresent: (.decisionFrame.ku.responsePlan.densityContract != null)
}
```

本カード時点で **最低 1 指標**は上記 jq から **機械算出可能**（例: `density_contract_present_rate`、`laws_used_zero_rate`）。

---

## 6. 将来 audit / ledger 接続用 JSON スキーマ（固定）

`conversation_density_ledger_v1`（1 レコード例）:

```json
{
  "schema": "CONVERSATION_DENSITY_LEDGER_V1",
  "window": "1d | 7d",
  "denominator_scope": "all_chat | patch29_bundle | route_filter",
  "sample_size": 0,
  "source_stack_empty_rate": 0,
  "laws_used_zero_rate": 0,
  "evidence_ids_zero_rate": 0,
  "center_key_null_rate": 0,
  "density_contract_present_rate": 0,
  "one_step_explicit_rate": 0,
  "bridge_phrase_rate": 0,
  "second_turn_thinning_rate": 0,
  "general_route_density_score": null,
  "define_route_density_score": null,
  "research_route_density_score": null,
  "observed_at": "ISO8601",
  "source_bundle": "patch29_acceptance_probe | custom",
  "ledger_meta": {
    "thinning_threshold": null,
    "weights": {}
  }
}
```

---

## 7. 運用ルール

- 本指標は **品質・密度監査**であり、`routeReason` 契約を直接上書きしない。  
- `FINAL_DENSITY_CONTRACT` 適用後は **`density_contract_present_rate`** を **効果確認の主指標の一つ**とする。  
- `build` / `health` 可用性監視と混同しない。

---

## 8. 受入条件（本カード）

- 指標名・算式が明確。  
- `densityContract` を含む **`density_contract_present_rate`** が定義されている。  
- **少なくとも 1 指標**は実ログ（PATCH29 probe 等）から **jq で算出可能**。  
- **docs-only** で完結。

---

## 9. 次カード候補（1 つのみ）

`WISDOM_REDUCER_METRICS_AUTORUN_V1`

---

## 10. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 密度 ledger 指標・jq 例・JSON スキーマを固定 |
