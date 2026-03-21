# PATCH_PLAN_GENERATOR_V1

**MODE:** 憲法・手続き（**DOCS_ONLY**。runtime 改修なし）。  
**上位文書:** `AUTO_PATCH_PROMPT_BUILDER_V1.md`、`REQUEST_TO_CARD_DRAFT_V1.md`、`REQUEST_PROBE_BINDER_V1.md`、`SELF_BUILD_GOVERNOR_V1.md`。  
**位置づけ:** **実装プロンプト（コード生成）の直前**に必ず挟む。**いきなりパッチを書かない**。

---

## 1. 目的

`selected_now` のカード草案に対し、**編集前**に **patch plan**（計画）を 1 枚出し、**対象・根拠・意図・リスク・検証・戻し**を揃えてから手を動かす規則を固定する。

---

## 2. 入力

- **カード草案**（7 項目）  
- **`AUTO_PATCH_PROMPT_BUILDER_V1` の implementation 要約**（あれば）  
- **probe bundle** の **required**（acceptance との **リンク**に使う）

---

## 3. 出力（必須 6 項目）

| 出力 | 内容 |
|------|------|
| **target files** | 触るパスの **確定リスト**（最大ファイル数はカード遵守）。**no-touch 外**のみ。 |
| **anchors** | 各ファイル内の **手がかり**（関数名、コメントタグ `CARD_*`、`routeReason` 文字列、grep 可能な一意文字列）。編集位置の特定用。 |
| **intended diff** | **何をどう変えるか**を箇条書き（追加/削除/条件分岐の意図）。**具体コードは書かなくてよい**（plan 段階）。 |
| **risk** | 契約破壊、route ずれ、他ルートへの副作用、docs/runtime 混在、**観測物の誤 add** 等。 |
| **acceptance linkage** | **probe bundle の required** と **1:1 または n:1** で対応づけ（「この変更後にこの jq／この script を実行」）。 |
| **rollback linkage** | カード **rollback** 欄への参照＋ **対象ファイルが plan の target と一致**することの確認。 |

---

## 4. 手順（正規）

1. **target files** をカードの `target files candidate` から **絞り込み**（不要なら空にしない—カード修正）。  
2. **anchors** をリポジトリ検索で **実在確認**してから書く。  
3. **intended diff** で **最小 diff** を言語化（「広げない」）。  
4. **risk** を列挙し、**高リスクなら plan を分割**（別カードまたは DOCS 先行）。  
5. **acceptance linkage** を `REQUEST_PROBE_BINDER_V1` の束に **明示的に結線**。  
6. **rollback linkage** で **restore 範囲 = target files**。

---

## 5. 禁止

- plan なしで **本番相当ブランチに直接コード生成**させる（緊急時でも **事後に plan を遡及記録**）。  
- **no-touch** を target に含める plan。  
- acceptance linkage が **probe required と無関係**なまま seal する。

---

## 6. 次工程

plan 承認後に **`AUTO_PATCH_PROMPT_BUILDER_V1`** の **implementation** を実行するか、同一ターンで **plan + 実装**を続けるかは運用で決めるが、**plan ブロックは常に先**。

---

## 7. 次カード

**BUILD_ACCEPTANCE_AUTORUN_V1** … plan／パッチ後の **build・health・acceptance 束**の自動実行。

**次カード候補（1 つだけ）:** `BUILD_ACCEPTANCE_AUTORUN_V1`

---

## 8. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 6 出力・手順・禁止・Autorun 接続を固定 |
