# AUTO_PATCH_PROMPT_BUILDER_V1

**MODE:** 憲法・手続き（**DOCS_ONLY**。プロンプト生成の **規則** のみ固定。runtime 改修なし）。  
**上位文書:** `REQUEST_TO_CARD_DRAFT_V1.md`、`REQUEST_PRIORITY_ENGINE_V1.md`、`REQUEST_PROBE_BINDER_V1.md`、`SELF_BUILD_GOVERNOR_V1.md`。  
**後段接続:** **`PATCH_PLAN_GENERATOR_V1`**（いきなりコードではなく plan 優先の規則／実装）。

---

## 1. 目的

`REQUEST_PRIORITY_ENGINE_V1` の **`selected_now`** に対応する **カード草案**と **`REQUEST_PROBE_BINDER_V1`** の **probe bundle** を入力として、**Cursor / GPT に渡すプロンプト**を **機械的に組み立てる**ための規則を固定する。  
人間／Agent は本規則に従い **4 ブロック**（§4）を埋め、**コピペ 1 回**で実装指示と検証指示を揃える。

---

## 2. 入力

| 入力 | 必須 | 説明 |
|------|------|------|
| **card draft** | ✓ | `REQUEST_TO_CARD_DRAFT_V1` の 7 項目（card name / MODE / target files / purpose / acceptance / rollback / next if pass）。 |
| **priority result** | ✓ | 少なくとも **`selected_now`**（対象草案 1 件）。`queued` / `deferred` / `rejected` があれば **文脈**として冒頭に 1 行要約。 |
| **probe bundle** | ✓ | `REQUEST_PROBE_BINDER_V1` の **required / optional**、**acceptance script candidate**、**jq 観測候補**。 |

---

## 3. 出力（4 ブロック）

| 出力キー | 用途 |
|----------|------|
| **implementation prompt** | 実装・編集の指示（**最小 diff**、対象ファイル上限、**routeReason / contract 維持**、MODE 遵守）。 |
| **acceptance prompt** | 検証手順（build / health / スクリプト / jq）。**required のみ PASS 判定**（Binder 整合）。 |
| **rollback reminder** | カード草案の **rollback** 欄を **そのまま再掲**＋ `git status` / `restore` の一言。 |
| **no-touch reminder** | **no-touch**（`api/src/db/kokuzo_schema.sql`）と **観測物・大型資料を add しない** を毎回明示。 |

---

## 4. テンプレート（組み立て順）

以下を **上から順に連結**し、1 つのメッセージまたは 4 セクションにする。

### 4.1 implementation prompt（固定見出し例）

```text
【カード】{card name}
【MODE】{MODE}
【優先】selected_now のみ実装。queued/deferred は触れない。
【目的】{purpose}
【対象ファイル（最大 N）】{target files candidate}
【原則】最小 diff / 1変更=1検証 / docs-only と runtime を混ぜない / routeReason・responsePlan・contract・本文骨格を不要に変えない
【実装依頼】上記に従いパッチを生成すること。
```

- **DOCS_ONLY** のときは「**runtime のコード変更禁止**」を 1 行追加。  
- **MIN_DIFF_PATCH** のときは「**指定外パスに手を広げない**」を追加。

### 4.2 acceptance prompt

```text
【検証・必須】{probe bundle の required を箇条書き}
【任意】{optional があれば箇条書き}
【スクリプト候補】{acceptance script candidate}
【jq 観測】{jq 観測候補コードブロック}
【PASS 条件】required がすべて緑。FAIL 時は seal 禁止（Governor）。
```

### 4.3 rollback reminder

```text
【rollback】{card draft の rollback 欄をそのまま}
【失敗時】壊れた差分に継ぎ足さない → SELF_BUILD_RESTORE_POLICY_V1
```

### 4.4 no-touch reminder

```text
【no-touch】api/src/db/kokuzo_schema.sql を変更・stage・commit に含めない
【add 禁止の例】未追跡の probe 大量 json、ABSTRACT_CENTER_*.txt、大型分析ディレクトリ、意図しない CARD_*.md 等
```

---

## 5. 品質ルール

- **probe bundle に無い検証**を acceptance prompt に **勝手に増やさない**（カード acceptance 欄で明示されたものは可）。  
- **priority result** で `selected_now` が **null** のときは **実装 prompt を生成しない**（キュー空・却下のみの状態）。  
- **Canon rejected** の草案は **4 ブロックとも生成しない**（Binder と一致）。

---

## 6. 次カード

**PATCH_PLAN_GENERATOR_V1** … 実装プロンプトの前段で **patch plan**（ファイル別意図・リスク・順序）を先に出す規則／実装。

**次カード候補（1 つだけ）:** `PATCH_PLAN_GENERATOR_V1`

---

## 7. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 入力・4 出力ブロック・テンプレ・品質ルールを固定 |
