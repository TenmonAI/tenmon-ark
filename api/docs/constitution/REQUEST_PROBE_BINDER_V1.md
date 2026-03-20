# REQUEST_PROBE_BINDER_V1

**MODE:** 憲法・手続き（**DOCS_ONLY**。runtime 改修なし）。  
**上位文書:** `REQUEST_TO_CARD_DRAFT_V1.md`、`REQUEST_PRIORITY_ENGINE_V1.md`、`REQUEST_TRIAGE_SCHEMA_V1.md`、`REQUEST_CANON_JUDGE_V1.md`。  
**後段接続:** 本書の **probe bundle** は **`BUILD_ACCEPTANCE_AUTORUN_V1`**（build / restart / health / 束の実行）に **そのまま渡す**想定。実装は後追い可。

---

## 1. 目的

Founder 経路で生成された **カード草案**に対し、**どの acceptance 用 probe・チェック**を紐づけるかを固定する。  
**`REQUEST_PRIORITY_ENGINE_V1` の `selected_now`** を主対象とし、同じ規則を **`queued`** 昇格時にも再利用する。

---

## 2. 入力

| 入力 | 説明 |
|------|------|
| **カード草案** | `REQUEST_TO_CARD_DRAFT_V1` の 7 項目（特に **MODE**、**target files candidate**、**acceptance** 欄）。 |
| **優先エンジン結果** | `selected_now`（**本束の主対象**）、`queued` / `deferred` / `rejected`。 |
| **triage category** | `bug \| quality \| feature \| research \| rejected`（**束のベースライン**）。 |
| **canon judge result** | `rejected` なら **probe なし**（§6）。`deferred` は §7。 |

---

## 3. 出力（論理スキーマ）

| フィールド | 説明 |
|------------|------|
| **probe bundle** | 本カード用に実行する **チェックの束**（順序付きリスト）。 |
| **required checks** | **FAIL ならカード FAIL**（必須）。 |
| **optional checks** | 参考・拡張。緑でも黄でもカード PASS は **required のみ**で判定（カード側で上書き可）。 |
| **acceptance script candidate** | 例: `api/scripts/patch29_final_acceptance_sweep_v1.sh`、`chat_refactor_runner_v1.sh <CARD>`。草案の **acceptance** 欄と **一致**させる。 |
| **jq / diff 観測候補** | API 応答やログから抜く **フィールドパス**（下記テンプレ）。 |

---

## 4. triage 別・最低束（ベースライン）

| triage | required（最低限） | optional |
|--------|-------------------|----------|
| **bug** | **再現用 probe**（カードに書いた再現手順 1 回）+ `npm run build` + `GET /health` + 草案で指定の **acceptance script** | 該当ルートの jq 観測、diff stat |
| **quality** | `build` + `health` + **チャット／API の jq 比較**（`responseHead` / `routeReason` / `responsePlan.routeReason`） | `answerLength`、`response` 先頭 N 文字の目視基準 |
| **feature** | `build` + `health` + **新 API または UI の到達確認**（POST/GET 1 本）+ 草案の acceptance script（あれば） | E2E、追加 probe |
| **docs-only** | **文書整合レビュー**（憲法・参照リンク・Governor 矛盾なし）+ `npm run build`（docs 隣接影響の確認） | `GET /health`（任意） |
| **rejected**（Canon／triage） | **probe なし** | — |

**Canon が `rejected`:** triage に関わらず **§6** 優先。  
**`research` triage の扱い:** 原則 `docs-only` 束へマップ。Canon が `deferred/rejected` の場合はそれを優先。

---

## 5. 草案の「系」別・上乗せ（必須束の例）

`target files candidate` または **purpose** から、次の **タグ**を推定し **required に追加**する。

| タグ | required に足す観測 | jq 観測候補（例） |
|------|---------------------|-------------------|
| **route 系** | 期待する分岐で 1 回以上 API 呼び出し | `routeReason`, `routeClass`, `responsePlan.routeReason`, `answerFrame` |
| **projector / semantic 系** | 同上 + 応答先頭の一貫性 | `responseHead`（先頭 160 文字）、`lawsUsed`, `evidenceIds`, `sourceStackSummary`（存在時） |
| **explicit 系** | 明示字数要求の probe 1 本 | `explicitLengthRequested` 相当、`answerLength`、`response.length`、**内容中心**（メタ指南に沈んでいないかの目視基準） |
| **founder UI 系**（`/api/founder/*`） | `POST .../requests` 保存成功 + `GET .../request-box` 200 | レスポンス `ok`, `id`, `category` |
| **docs-only カード** | **文書整合**（参照リンク、Governor との矛盾なし）+ `npm run build`（型が docs 隣接で壊れない確認） | `git diff --stat` の対象ファイルのみ |

**jq テンプレ（チャット系・再利用可）:**

```jq
{
  rr: .decisionFrame.ku.routeReason,
  rc: .decisionFrame.ku.routeClass,
  rp: (.decisionFrame.ku.responsePlan.routeReason // null),
  frame: .decisionFrame.ku.answerFrame,
  resp: .response
}
```

（必要に応じ `center`, `answerLength` を追加）

---

## 6. `selected_now` に対する束の返し方

1. **`rejected`:** **probe bundle = 空**。`BUILD_ACCEPTANCE_AUTORUN_V1` は **走らせない**（実装対象外）。  
2. **`deferred`:** 原則 **束なし**、または **docs review のみ**（research と同様）。ブロッカー解消後に **Canon → Draft → Engine → 本 Binder** を再実行。  
3. **`accepted_runtime` / `accepted_docs`:**  
   - §4 の **triage ベース束** ∪ §5 の **系タグ上乗せ** ∪ 草案 **acceptance** 欄に明示されたコマンド。  
   - **`required`** に `build` と `health` を入れるかは **MODE** により切替:  
     - **DOCS_ONLY:** `build` は推奨 required、`health` は **任意**（カードが明示した場合のみ required）。  
     - **MIN_DIFF_PATCH / RESEAL:** `build` + `health` **required** + acceptance script（あれば）**required**。

4. **`queued`:** `selected_now` と **同じアルゴリズム**で束を **事前計算**してよいが、**実行は `selected_now` が完了してから**（Autorun の単列実行と整合）。

---

## 7. `BUILD_ACCEPTANCE_AUTORUN_V1` への接続

- 入力: **`probe bundle`** + **`required` / `optional` フラグ** + **`acceptance script candidate`**。  
- Autorun は **required を順に実行**し、1 つでも FAIL なら **即停止**（`SELF_BUILD_STOP_CONDITIONS_V1` 整合）。  
- optional はログに出すのみ、または **黄警告**（カード acceptance で定義）。

---

## 8. 次カード

**AUTO_PATCH_PROMPT_BUILDER_V1** … 束と草案を **Cursor / GPT 向けプロンプト**に畳み込む（実装・docs は当該カード）。

**次カード候補（1 つだけ）:** `AUTO_PATCH_PROMPT_BUILDER_V1`

---

## 9. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | triage・系別・selected_now 束・Autorun 接続を固定 |
