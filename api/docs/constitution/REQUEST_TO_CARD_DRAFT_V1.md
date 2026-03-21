# REQUEST_TO_CARD_DRAFT_V1

**MODE:** 憲法・手続き（**DOCS_ONLY**。runtime 実装は後追い可）。  
**上位文書:** `REQUEST_CANON_JUDGE_V1.md`（入力の **7 軸**・**4 分類**）、`SELF_BUILD_CARD_GENERATOR_V1.md`（**必須 7 項目**）。  
**矛盾禁止:** 本書の草案は **CARD_GENERATOR の 7 項目を欠かない**（**rejected** は §5 の例外）。Canon の **4 分類**と **1 変更=1 検証**・**docs/runtime 分離**を壊さない。

---

## 1. 目的

`REQUEST_CANON_JUDGE_V1` の裁定を入力として、Founder 要望を **実装可能なカード草案**（または裁定に応じた **正規出口**）へ変換する **規則** を固定する。  
**要望テキストをコードに直結させない**（必ず草案 → 人間／Agent のレビュー → 別途実行）。

---

## 2. 入力（必須セット）

| 入力 | 内容 |
|------|------|
| **founder request payload** | `FOUNDER_REQUEST_BOX_V1` 相当: `text`（本文）、`meta` 等 |
| **triage category** | `REQUEST_TRIAGE_SCHEMA_V1`: `bug \| quality \| feature \| research \| rejected`（**参考**。Canon が優先） |
| **canon judge result** | `accepted_runtime \| accepted_docs \| deferred \| rejected` |
| **7 軸スナップショット** | Canon の **C1〜C7** の記録（Yes/No/要検討）。草案の **目的・acceptance・rollback** の根拠とする |

---

## 3. 出力（必須 7 項目）— `SELF_BUILD_CARD_GENERATOR_V1` との対応

草案 1 枚あたり、次を **すべて** 埋める（表記名はカード本文で使う）。

| キー | 説明 |
|------|------|
| **card name** | `UPPER_SNAKE_CASE` + `_V1` 推奨。意味が被らないよう要約語 + 連番可。 |
| **MODE** | `DOCS_ONLY` / `MIN_DIFF_PATCH` / `RESEAL` 等 |
| **target files candidate** | 触る可能性のあるパス（**最大ファイル数**を明記）。未確定なら「候補: … / 確定は実装前レビュー」。 |
| **purpose** | Canon 結果と要望一文を要約した **達成状態** |
| **acceptance** | PASS 条件（例: `npm run build`、health、`patch29_final_acceptance_sweep_v1.sh` 等）。**DOCS_ONLY** は「文書整合・矛盾なし」等を具体化。 |
| **rollback** | `git restore --staged -- <paths>` / `git revert` 方針。対象ファイルと一致させる。 |
| **next if pass** | **1 つだけ**。通常は `REQUEST_PRIORITY_ENGINE_V1`（優先エンジンで実行順確定）または Canon 再実行。 |

---

## 4. 4 分類ごとの草案生成方針

### 4.1 `accepted_runtime`

- **MODE:** `MIN_DIFF_PATCH`（必要に応じ `RESEAL`）。  
- **target files:** `SEALED_RUNTIME_SET_CURRENT_V1.md` 等の runtime 集合から選び、**no-touch 外**のみ。`chat.ts` 等は要望に即して列挙。  
- **acceptance:** **build PASS**、**health PASS**、カードで指定する **acceptance スクリプト PASS**（例: PATCH29）。  
- **rollback:** 変更対象パスの restore。  
- **C4+C5 両立**（docs も要る）の場合: **カードを 2 枚に分割**（先 **DOCS_ONLY**、後 **MIN_DIFF_PATCH**）。**同一 commit に混ぜない**。

### 4.2 `accepted_docs`

- **MODE:** `DOCS_ONLY`。  
- **target files:** `api/docs/constitution/*.md`、handoff、sealed set 等。  
- **acceptance:** 憲法間の矛盾なし、参照リンク妥当、（任意）`npm run build` で型壊しなし。  
- **rollback:** 当該 md の restore。  
- **runtime ファイルを候補に含めない**。

### 4.3 `deferred`

- **実装カード（MIN_DIFF）を即時は作らない**（依存・優先が未充足のため）。  
- 代わりに **保留管理用**の草案 **1 枚**を推奨: **MODE `DOCS_ONLY`**、**purpose** に保留理由・**ブロッキングしている主線カード名**、**acceptance** に「ブロッカー完了後に Canon を再実行」等。  
- **next if pass:** ブロッカー側の **次の 1 カード**（`SELF_BUILD_PRIORITY_JUDGE_V1` に従う）を明示。  
- 7 項目は **すべて** 埋める（「実装」ではなく **序列の記録**としてのカード）。

### 4.4 `rejected`

- **実装用カード（MIN_DIFF / RESEAL）は生成しない**（コード変更の入口を開けない）。  
- **必須 7 項目:** `SELF_BUILD_CARD_GENERATOR_V1` による **実装カードテンプレには当てはめない**。代わりに次の **却下出口** を正とする。  
  - **founder 向け:** 却下理由（C1/C2/C3/C7 のどれか）を短文化 → **`FOUNDER_RESULT_FEEDBACK_V1`** へ渡す。  
  - **任意:** 監査用に **DOCS_ONLY** の「却下記録」草案を別途作ってよいが、**必須ではない**。  
- triage の `rejected` ラベルと混同しない（Canon の **rejected** が最終）。

---

## 5. 命名・品質ルール

- **card name** は要望の **動詞+対象**（例: `FIX_CHAT_EXPLICIT_PADDING_V1`）を英大文字で。  
- **target files candidate** に **no-touch**（`api/src/db/kokuzo_schema.sql`）が入る草案は **無効**（Canon で止める）。  
- **acceptance** は **機械可読**に近づける（コマンド名・期待文字列）。  
- **next if pass** は **複数列挙禁止**（Governor 整合）。

---

## 6. ワークフロー（要約）

```
payload + triage → REQUEST_CANON_JUDGE_V1（7軸・4分類）
  → 本書（カード草案 or 正規出口）
    → REQUEST_PRIORITY_ENGINE_V1（実行順・後回しの確定）
```

---

## 7. 次カード

**REQUEST_PRIORITY_ENGINE_V1** … 草案複数があるとき **いま実行する 1 つ**と **後回し**を決める。

**次カード候補（1 つだけ）:** `REQUEST_PRIORITY_ENGINE_V1`

---

## 8. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | Canon 4 分類別の草案規則・rejected 出口・7 項目整合を固定 |
