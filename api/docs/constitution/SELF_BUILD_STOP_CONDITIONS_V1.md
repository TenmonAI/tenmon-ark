# SELF_BUILD_STOP_CONDITIONS_V1

**上位文書:** `SELF_BUILD_GOVERNOR_V1.md` §3（骨格）を **具体化** する。本書と Governor が矛盾する場合は **Governor を正** とし、本書を追随して修正する。  
**MODE:** 憲法・手続きのみ（**runtime 改修なし**）。  
**no-touch:** `api/src/db/kokuzo_schema.sql` を **意図せず変更・stage・commit に含めない** ことは停止判定の対象である。

---

## 1. auto-stop の定義

**auto-stop** とは、次の **必須停止条件** のいずれかが満たされたとき、**その場で作業を止め、seal しない** 状態に移ることである。

- 追加パッチを当て続けない（**壊れた差分への継ぎ足し禁止**は `SELF_BUILD_RESTORE_POLICY_V1`）。  
- 停止後の正規パスは **restore → forensic → retry**（詳細は **次カード** `SELF_BUILD_RESTORE_POLICY_V1`）。

---

## 2. 必須停止条件（一覧）

| ID | 条件 | 検知・例 | 備考 |
|----|------|-----------|------|
| **S1** | **build fail** | `npm run build` / `tsc` 等が非ゼロ終了 | カード定義の build コマンドに従う。 |
| **S2** | **service inactive** | `systemctl is-active` が期待と不一致、プロセスが落ちている、bind に失敗 | 環境によりコマンドはカードで明示。 |
| **S3** | **health fail** | `GET /health` が非 200・タイムアウト・期待 JSON と不一致 | runner 内の health ループ失敗も含む。 |
| **S4** | **acceptance fail** | PATCH29 等、カードに書かれた **acceptance スクリプト** が FAIL | 「期待 routeReason 不一致」「8 route 未達」など。 |
| **S5** | **no-touch 汚染** | no-touch パスが **意図せず** `git diff --cached` または **commit に含まれる** | 代表: `api/src/db/kokuzo_schema.sql`。誤 add も汚染。 |
| **S6** | **runtime / docs 混在** | **同一 commit** または **同一時点の staged** に、docs-only カードの対象外の runtime と憲法/docs が混ざる | Governor の「混線禁止」と同義。意図的な 2-commit 分離は可。 |
| **S7** | **routeReason 破壊** | カードで **維持とされた** `routeReason` が、acceptance または回帰検知で **意図せず欠落・置換・分岐消失** | 「不要に変えない」原則違反。 |
| **S8** | **contract 破壊** | `decisionFrame.ku` の **answerLength / answerMode / answerFrame**、カードで固定された **responsePlan 骨格**、または **本文骨格**（不要に削る・別経路にすり替える）が意図せず起きる | 文言の改善は可。**契約・骨格の破壊**で stop（Governor §7 整合）。 |
| **S9** | **rollback 不可能状態** | どのコミットに戻せば安全か特定できない、作業ツリーが追跡不能、共有ブランチで force が必要なほど壊れている 等 | **判断は人間／責任者**。疑わしければ stop。 |

---

## 3. 条件ごとの運用メモ

### S1〜S4（ビルド〜受入）

- いずれも **seal 禁止**。ログの **最後のエラー行** を forensic の種にする。  
- runner が **build を二重実行** していても、**1 回でも FAIL なら全体 FAIL** とみなす。

### S5（no-touch）

- `git diff --cached --name-only` で no-touch が含まれる → **即 stop**。  
- 意図的変更が必要なら **別カード** で no-touch 解除方針を Founder / 憲法で先に決める（通常は **拒否**）。

### S6（runtime / docs）

- **DOCS_ONLY** カードでは **runtime ファイルが staged に 1 行でも** あれば stop。  
- **MIN_DIFF_PATCH** で `*.md` だけが混ざっていれば stop（原則 **分離 commit**）。

### S7〜S8（route / contract）

- **PATCH29 の期待表** やカード記載の **routeReason 一覧** と不一致 → stop。  
- `responsePlan` が **欠落**、または **routeReason と無関係な別物** にすり替わり → stop。

### S9（rollback）

- 「revert できるが **どれを revert すべきか** わからない」も **事実上の S9** として stop してよい。  
- 続行する前に **良好な HEAD を 1 つ決めて restore**（次カード）。

---

## 4. stop 後にやってはいけないこと

- acceptance FAIL のまま **seal commit** する。  
- no-touch を含んだまま **push する**。  
- 「とりあえず」 **別件の大きな feature** を同じブランチに混ぜる。  

---

## 5. 次カードへの接続

停止のあとは **`SELF_BUILD_RESTORE_POLICY_V1`** で restore / forensic / retry を固定する。

**次カード候補（1 つだけ）:** `SELF_BUILD_RESTORE_POLICY_V1`

---

## 6. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 必須 9 条件の列挙と Governor 整合 |
