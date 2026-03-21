# CONVERSATION_DEGRADATION_METRICS_V1

**MODE:** `DOCS_ONLY`（runtime 改修なし）  
**上位文書:** `SELF_BUILD_GOVERNOR_V1.md`、`REQUEST_PROBE_BINDER_V1.md`  
**目的:** 会話品質の劣化を、故障監視とは別系統で継続観測できるようにする。

---

## 1. 監視対象（固定名）

本カードで固定する指標名（ledger/audit 接続時も同名を使う）:

1. `generic_fallback_rate`
2. `center_continuity_rate`
3. `evidence_visibility_rate`
4. `one_step_explicit_rate`
5. `second_turn_thinning_rate`
6. `bridge_phrase_rate`
7. `compare_research_shallow_rate`

---

## 2. 観測単位

- **会話単位:** 同一 `threadId` の連続 turn
- **応答単位:** `/api/chat` の1レスポンス
- **束単位:** acceptance の probe 束（例: PATCH29）

集計窓:

- `window_1d`（日次）
- `window_7d`（週次）

---

## 3. 指標定義（算式）

### 3.1 `generic_fallback_rate`

- **意味:** 内容に対する固有回答が弱く、汎用返しへ寄る率。
- **分子:** `response` が汎用 fallback パターンに一致した件数
- **分母:** 対象応答総数
- **fallback パターン例（初期）:**
  - `受け取っています。そのまま続けてください`
  - `一言で`
  - `どちらですか`（内容語が薄い場合）
- **式:** `fallback_count / total_responses`

### 3.2 `center_continuity_rate`

- **意味:** follow-up 時に中心（center）が保持される率。
- **分子:** follow-up 応答で `decisionFrame.ku.centerKey` か `threadCenterKey` が非空の件数
- **分母:** follow-up と判定された件数
- **式:** `continuity_kept / followup_total`

### 3.3 `evidence_visibility_rate`

- **意味:** 根拠束（law/evidence/source）が応答可視化される率。
- **分子:** `lawsUsed` or `evidenceIds` が1件以上、または `sourceStackSummary` がある件数
- **分母:** 対象応答総数
- **式:** `evidence_visible / total_responses`

### 3.4 `one_step_explicit_rate`

- **意味:** 次の一手が明示される率。
- **分子:** `answerFrame == one_step` または本文に `次の一手` / `次は` を含む件数
- **分母:** 対象応答総数
- **式:** `one_step_explicit / total_responses`

### 3.5 `second_turn_thinning_rate`

- **意味:** 2ターン目で内容密度が薄化する率。
- **分子:** 同一 thread の turn2 で、turn1 比で内容語数が閾値以下に低下した件数
- **分母:** turn2 が存在する thread 数
- **式:** `thin_turn2 / threads_with_turn2`

### 3.6 `bridge_phrase_rate`

- **意味:** 不要な橋文（中身の薄い接続句）の出現率。
- **分子:** 橋文パターン一致件数
- **分母:** 対象応答総数
- **橋文パターン例（初期）:**
  - `（.*）を土台に、いまの話を見ていきましょう`
  - `受け取っています。`
- **式:** `bridge_phrase_count / total_responses`

### 3.7 `compare_research_shallow_rate`

- **意味:** compare/research 問いで、軸・相違・接点・混同回避・次軸の5要素が欠落する率。
- **分子:** compare/research 応答で5要素を満たさない件数
- **分母:** compare/research 応答総数
- **式:** `shallow_compare_research / compare_research_total`

---

## 4. 実ログから機械算出可能な最低1指標

本カード時点で、次は**実ログから機械算出可能**:

- `generic_fallback_rate`

対象データ:

- `/var/log/tenmon/card_CHAT_SAFE_REFACTOR_PATCH29_FINAL_ACCEPTANCE_SWEEP_V1/<ts>/probe.*.json`

簡易算出例（概念）:

1. `probe.*.json` の `response` を抽出
2. fallback パターン正規表現で一致件数をカウント
3. `count / total` を出す

---

## 5. 監査出力スキーマ（将来 ledger 接続用）

`conversation_degradation_metrics_v1`（JSON）:

- `window`: `1d | 7d`
- `sample_size`: number
- `generic_fallback_rate`: number
- `center_continuity_rate`: number
- `evidence_visibility_rate`: number
- `one_step_explicit_rate`: number
- `second_turn_thinning_rate`: number
- `bridge_phrase_rate`: number
- `compare_research_shallow_rate`: number
- `observed_at`: ISO8601
- `source_bundle`: string（例: `patch29_acceptance_probe`）

---

## 6. 運用ルール

- この指標は **品質監査**であり、routeReason 契約を直接上書きしない。
- `build/health` の可用性監視と混同しない（別レイヤ）。
- 閾値違反時は即 seal ではなく、カード起票で修復列へ流す。

---

## 7. 受入条件（本カード）

- 指標定義が明確であること
- 少なくとも1指標（`generic_fallback_rate`）が実ログから算出可能であること
- runtime 改修を含まないこと

---

## 8. 次カード候補

`THREAD_CENTER_TO_DIALOGUE_CONTRACT_V1`

