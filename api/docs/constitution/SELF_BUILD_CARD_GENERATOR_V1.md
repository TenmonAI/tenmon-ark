# SELF_BUILD_CARD_GENERATOR_V1

**上位文書:** `SELF_BUILD_GOVERNOR_V1.md` §5。  
**MODE:** 憲法・手続きのみ（**runtime 改修なし**）。

---

## 1. 目的

**要望・障害・品質不満**を、実装や口頭対応に直行させず、**必ずカード**へ変換してから Governor 序列に載せる。

---

## 2. 必須カード項目（欠落禁止）

| 項目 | 内容 |
|------|------|
| **カード名** | 一意識別子（`SNAKE_CASE` + `_V1` 推奨） |
| **MODE** | `DOCS_ONLY` / `MIN_DIFF_PATCH` / `RESEAL` 等 |
| **対象ファイル** | 触ってよいパスと **最大ファイル数** |
| **目的** | 達成状態の一文〜短段落 |
| **acceptance** | PASS 条件（build / health / スクリプト名・期待出力） |
| **rollback** | FAIL 時の戻し方（`git restore` 範囲、revert 方針） |
| **next if pass** | 通過後の **次カード候補は 1 つだけ** |

---

## 3. 変換ルール

- **障害報告** → MODE は原則 `MIN_DIFF_PATCH` または修復専用カード。acceptance に **再発防止の検知**を含めうる。  
- **憲法・手続き** → `DOCS_ONLY`。runtime と同一カードにしない。  
- **Founder 自然文** → `FOUNDER_REQUEST_BOX_V1` 等で受けたあと、**本テンプレに埋めて**から実装カードへ（飛ばさない）。

---

## 4. 禁止

- acceptance なしの「とりあえず直す」  
- rollback なしの本番反映  
- **next if pass** を複数列挙して序列を曖昧にすること  

---

## 5. 次カード

**SELF_BUILD_PRIORITY_JUDGE_V1**（優先順位裁定）。

**次カード候補（1 つだけ）:** `SELF_BUILD_PRIORITY_JUDGE_V1`

---

## 6. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 必須 7 項目と変換ルールを固定 |
