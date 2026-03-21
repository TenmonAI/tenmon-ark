# SEAL_OR_REJECT_JUDGE_V1

**MODE:** 憲法・手続き（**DOCS_ONLY**。裁定規則の固定。runtime は `BUILD_ACCEPTANCE_AUTORUN_V1` が **事実上の PASS/FAIL 入力**）。  
**上位文書:** `SELF_BUILD_GOVERNOR_V1.md`、`SELF_BUILD_STOP_CONDITIONS_V1.md`、`SELF_BUILD_RESTORE_POLICY_V1.md`、`BUILD_ACCEPTANCE_AUTORUN_V1`（スクリプト）。  
**後段:** **`FOUNDER_RESULT_FEEDBACK_V1`**（Founder 向け状態返却）。

---

## 1. 目的

`BUILD_ACCEPTANCE_AUTORUN_V1`（またはカード定義の同等検証）の結果を **唯一の事実**とし、**seal してよいか**／**再試行か**／**却下か**／**保留か**を **裁定**する規則を固定する。

---

## 2. 入力

| 入力 | 説明 |
|------|------|
| **autorun 結果** | `PASS` / `FAIL`（ログ末尾または終了コード）。 |
| **カード草案** | acceptance 欄に書かれた **required** がすべて満たされたか。 |
| **staged / commit 意図** | no-touch 混入なし、docs/runtime 分離。 |
| **Canon / Priority** | `rejected` / `deferred` のまま **seal 対象にしない**。 |

---

## 3. 出力（4 値）

| キー | 意味 | 条件（目安） |
|------|------|----------------|
| **seal_candidate** | **commit してよい候補** | autorun **PASS**、**S5〜S9 に該当なし**、カード acceptance 充足、**混在なし**。 |
| **retry_required** | **restore → forensic → retry** | autorun **FAIL**、または途中で **stop**。**壊れた差分に継ぎ足さない**（RESTORE_POLICY）。 |
| **rejected** | **実装・seal しない** | Canon **rejected**、憲法違反、no-touch 侵害確定、**rollback 不能で続行不可**。 |
| **deferred** | **いま seal しない** | Canon **deferred**、依存未解消、**queued** の先頭が別カード、Founder 明示の保留。 |

**排他:** 同一カードについて **`seal_candidate=true` のときは `retry_required` は false**（再実行は別カード）。

---

## 4. 判定フロー（要約）

1. **Canon `rejected`** → **`rejected`**（autorun 無視）。  
2. **Canon `deferred`** → **`deferred`**（autorun PASS でも seal しない）。  
3. **staged に no-touch / 混在** → **`retry_required`**（restore 優先）。  
4. **autorun FAIL** → **`retry_required`**。  
5. **autorun PASS** かつ上記なし → **`seal_candidate`**。  
6. **戦略的に後回し**（Priority Engine で明示）→ **`deferred`**。

---

## 5. seal の門番（再掲）

- **acceptance PASS 以外 seal 禁止**（Governor）。  
- **`seal_candidate` であっても** 人間／責任者の **最終確認**をスキップしない（運用）。

---

## 6. Founder 連携

裁定結果は **`FOUNDER_RESULT_FEEDBACK_V1`** で **受理 / 保留 / 却下 / 実装候補 / 追加情報依頼** にマッピングして返す（API は当該カード）。

| 本出力 | Founder 表示（例） |
|--------|-------------------|
| seal_candidate | **受理**（または実装完了・反映済み） |
| deferred | **保留** |
| rejected | **却下** |
| retry_required（初回） | **追加情報依頼** または **保留**（メッセージで区別） |
| seal_candidate（実装前段） | **実装候補**（カード起票済み） |

---

## 7. 次カード

**FOUNDER_RESULT_FEEDBACK_V1**（最小 API / 記録）。

**次カード候補（1 つだけ）:** `FOUNDER_RESULT_FEEDBACK_V1`

---

## 8. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 4 出力・フロー・Founder マッピングを固定 |
