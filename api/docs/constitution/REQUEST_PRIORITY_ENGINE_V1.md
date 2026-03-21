# REQUEST_PRIORITY_ENGINE_V1

**MODE:** 憲法・手続き（**DOCS_ONLY**。runtime 改修なし）。  
**上位文書:** `SELF_BUILD_PRIORITY_JUDGE_V1.md`（**5 段優先**）、`REQUEST_TO_CARD_DRAFT_V1.md`（**カード草案**）、`REQUEST_CANON_JUDGE_V1.md`（**4 分類**）。  
**矛盾禁止:** `SELF_BUILD_PRIORITY_JUDGE_V1` の順序と衝突してはならない。本書は **複数草案から「今 1 つ」**を選ぶ **手続き** を追加定義する。

---

## 1. 目的

`REQUEST_TO_CARD_DRAFT_V1` で得られた **複数のカード草案**に対し、**いま実行する 1 つ**（`selected_now`）と、残りの **待ち行列**（`queued`）／**保留**（`deferred`）／**却下集合**（`rejected`）を決める **優先エンジン**規則を固定する。

---

## 2. 入力

| 入力 | 必須 | 説明 |
|------|------|------|
| **カード草案** | ✓ | `REQUEST_TO_CARD_DRAFT_V1` 出力（7 項目＋Canon 4 分類のメタ）。 |
| **Canon 4 分類** | ✓ | 各草案に紐づく `accepted_runtime \| accepted_docs \| deferred \| rejected`。 |
| **5 段優先** | ✓ | `SELF_BUILD_PRIORITY_JUDGE_V1` §2 を **そのまま** 比較キーに使う。 |
| **triage category** | 任意 | `bug \| quality \| feature \| research \| rejected` — **タイブレーク補助**のみ（Canon・5 段が上位）。 |

---

## 3. 優先ティアの割当（草案 → P1〜P5）

各草案を、次の **どれか 1 つのティア**に割り当ててから並べる（迷うときは **高いリスク側**に寄せる）。

| ティア | `SELF_BUILD_PRIORITY_JUDGE` | 割当の目安 |
|--------|----------------------------|------------|
| **P1** | 1 段目 | acceptance / build / health を **既に壊している**、または草案の purpose が **緑への回復**（PATCH29、契約修復等）。 |
| **P2** | 2 段目 | **residual / 回帰**、未解消ルート、明確な挙動後退（Founder 価値より **常に前**）。 |
| **P3** | 3 段目 | Founder 価値が高い **accepted_runtime / accepted_docs**（機能・主線寄与）。 |
| **P4** | 4 段目 | **docs-only** かつ **修復（P1/P2）ではない** 草案。 |
| **P5** | 5 段目 | **beauty / wording** のみ、挙動変更なし。 |

**固定ルール:**

- **P1 > P2 > P3 > P4 > P5**（`SELF_BUILD_PRIORITY_JUDGE_V1` と一致）。  
- **docs-only（P4）は修復（P1/P2）より後**（同じティア内でも P1/P2 を先に消化）。  
- **beauty / wording（P5）は最後**；P1〜P4 がキューに 1 件でも残る間は **selected_now に P5 を選ばない**。

**triage の扱い（参考）:** `bug` は P1/P2 になりやすい、`feature` は P3、`research` は P4 または `deferred` になりやすい — **Canon が優先**。

---

## 4. Canon 4 分類との合成（投入前フィルタ）

1. **`rejected`（Canon）**  
   - 該当草案は **実装キューに入れない**。  
   - 出力の **`rejected`** バケットに **そのまま継承**（理由は Canon 記録）。  
   - `selected_now` / `queued` には **含めない**。

2. **`deferred`（Canon）**  
   - **実装キューに入れない**（ブロッカー解消・Canon 再実行まで）。  
   - 出力の **`deferred`** バケットへ。  
   - 例外: Founder が **明示的に優先指定**した場合でも、**憲法違反・no-touch 侵害**なら選ばない。

3. **`accepted_runtime` / `accepted_docs`**  
   - **P1〜P5 に割当**し、後述のソート対象とする。

---

## 5. ソートと「今やる 1 つだけ」

### 5.1 比較関数（同一ティア内）

1. **Founder 明示の優先指定** がある草案を先頭に（**憲法・no-touch に反しない範囲**）。  
2. なければ **起票時刻（昇順）** — 先に届いたものを先。  
3. 同時刻なら **card name** 辞書順（再現性）。

### 5.2 出力の作り方

1. `rejected`（Canon）をすべて **`rejected`** に集める。  
2. `deferred`（Canon）をすべて **`deferred`** に集める。  
3. 残りをティア順にソートし **1 本のリスト `L`** を作る。  
4. **`selected_now`:** `L` の **先頭 0 または 1 件**（`L` が空なら **null / なし**）。  
5. **`queued`:** `L` の **2 件目以降**（同じティア順・同じ比較関数で並んだまま）。  

**厳守:** 1 回のエンジン実行で **`selected_now` は高々 1 つ**（並列実装カードを同一ターンに選ばない）。

---

## 6. 出力スキーマ（論理）

```text
selected_now:  カード草案 1 件 | null
queued:        カード草案[]（順序付き）
deferred:      Canon deferred の草案[] + 依存メモ
rejected:      Canon rejected の草案[]（実装対象外）
```

- **`queued`** 内の草案はすべて **accepted_*** であること。  
- 実行完了後は **同エンジンを再実行**し、次の `selected_now` を選ぶ（`REQUEST_PROBE_BINDER_V1` で probe を紐づけたうえで走らせうる）。

---

## 7. `REQUEST_TO_CARD_DRAFT_V1` からの接続

- 草案の **`next if pass`** に `REQUEST_PRIORITY_ENGINE_V1` を書いてある場合、**当該カード PASS 後**にキュー全体を再評価する。  
- 複数草案が同時に存在するタイミング（バッチ取り込み）で **必ず本エンジンを通す**。

---

## 8. 次カード

**REQUEST_PROBE_BINDER_V1** … `selected_now` の **MODE / triage / 目的**に応じて **acceptance probe** を自動紐づけする。

**次カード候補（1 つだけ）:** `REQUEST_PROBE_BINDER_V1`

---

## 9. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | P1〜P5 割当・Canon 合成・selected_now=1・queued/deferred/rejected を固定 |
