# CHAT_REFACTOR_STUB_DEBRIS_POLICY_BUNDLE_V1

基準: sealed baseline 09824dc / PATCH29 acceptance PASS 最上位 gate。  
コード変更なし。stub・残骸・keep/drop・docs-only を1文書に統合する。

---

## 1. stub（未使用スタブ）

| パス | 説明 | 方針 |
|------|------|------|
| `api/src/routes/chat_refactor/define.ts` | define/scripture 責務の切り出し先。どの .ts/.js からも import されていない。 | **keep as stub** — 将来の再編用に残す。add/commit しない（未追跡のまま）。 |
| `api/src/routes/chat_refactor/entry.ts` | entry 責務（body 解釈・message/threadId 等）の切り出し先。未 import。 | **keep as stub** |
| `api/src/routes/chat_refactor/general.ts` | general 責務（grounding 選択・general shrink 周辺）の切り出し先。未 import。 | **keep as stub** |

- runtime 対象外。削除すると将来の define/entry/general 再編で参照先が消えるため、**drop しない**。
- この系列では **add/commit しない**（観測物・補助資料と同様に未追跡のまま運用）。

---

## 2. 残骸（debris）

- **定義:** 未追跡のうち、stub 以外で runtime に不要かつ「補助資料」にも属さないもの。
- **該当:** 現状は stub の 3 ファイル以外に残骸として明示する未追跡はない（補助資料・観測物で分類済み）。
- **方針:** 新たに残骸と判断したファイルは、このセクションに追記し、**add/commit しない**。

---

## 3. keep / drop 方針

| 種別 | keep | drop（この系列では add/commit しない） |
|------|------|----------------------------------------|
| **no-touch** | 変更を加えない。 | 封印列に含めない。 |
| **観測物** | 運用・デバッグ用に working tree に存在可。 | probe*.json, ABSTRACT_CENTER_*.txt, WORLD_CLASS_ANALYSIS_*, FINAL_REPORT_V1, RECONCILE_AUDIT_V1 は commit しない。 |
| **補助資料** | 参照用に保持。 | このカードでは一括 add しない。必要なら別カードで選択的に commit。 |
| **stub** | define/entry/general をファイルとして残す。 | この系列では add/commit しない。 |
| **runtime 対象** | chat.ts, majorRoutes.ts, finalize.ts, patch29_final_acceptance_sweep_v1.sh。 | — |

- **drop の意味:** 「この封印系列の git 履歴に含めない」であり、ファイル削除ではない。
- **keep の意味:** 「削除しない／触らない／必要なら残す」を文書で明示。

---

## 4. docs-only（文書のみ）

- 以下のみ **文書として** add/commit 対象とする（コード変更は行わない）:
  - 封印・no-touch・runtime set・残タスクマップ・stub/debris 方針をまとめた **.md**（本ファイルを含む）。
- 文書カードで add するときは **該当 .md のみ** add し、コード・観測物・stub は add しない。
- 本ファイル（CHAT_REFACTOR_STUB_DEBRIS_POLICY_BUNDLE_V1.md）は **docs-only として commit 可**。

---

## 5. まとめ

| 対象 | 扱い |
|------|------|
| stub (define/entry/general.ts) | keep as stub、add/commit しない。 |
| 残骸 | 現状は stub 以外に明示なし。add/commit しない。 |
| keep | no-touch・観測物・補助資料・stub は「触らない／commit しない」で保持。 |
| drop | 上記を封印列に含めない（履歴に載せない）。 |
| docs-only | 方針・封印・マップをまとめた .md のみ commit 対象。 |
