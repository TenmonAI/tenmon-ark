# SELF_BUILD_PRIORITY_JUDGE_V1

**上位文書:** `SELF_BUILD_GOVERNOR_V1.md`、`SELF_BUILD_CARD_GENERATOR_V1.md`。  
**MODE:** 憲法・手続きのみ（**runtime 改修なし**）。

---

## 1. 目的

複数カード・複数要望が並んだときの **優先順位裁定核** を固定する（実装は人間／Agent が本順に並べ替える）。

---

## 2. 優先順（上ほど先）

| 順位 | 対象 | 例 |
|------|------|-----|
| **1** | **build / health / acceptance を壊すもの** | PATCH29 失敗、本番ビルド壊れ、契約破壊 |
| **2** | **runtime residual** | 未解消のルート残差、明確な回帰 |
| **3** | **Founder 価値が高いもの** | 憲法で明示された主線・戦略合意に直結 |
| **4** | **docs-only** | 手続き・憲法・handoff の明文化 |
| **5** | **beauty / wording** | 表現・整形のみ、挙動変更なし |

---

## 3. 裁定ルール

- 同順位内では **カード起票時刻**または **Founder 指定**があればそれを優先。  
- **1 と 2** が未解決の間、**5 だけ**を進めない（stop 条件と整合）。  
- 迷ったら **docs-only（4）より修復（1〜2）**。

---

## 4. 次カード

**SELF_BUILD_FAILURE_CLASSIFIER_V1**（FAIL の型分類）。

**次カード候補（1 つだけ）:** `SELF_BUILD_FAILURE_CLASSIFIER_V1`

---

## 5. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 優先順 5 段を固定 |
