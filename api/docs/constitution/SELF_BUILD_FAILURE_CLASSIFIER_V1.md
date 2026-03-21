# SELF_BUILD_FAILURE_CLASSIFIER_V1

**上位文書:** `SELF_BUILD_STOP_CONDITIONS_V1.md`、`SELF_BUILD_RESTORE_POLICY_V1.md`。  
**MODE:** 憲法・手続きのみ（**runtime 改修なし**）。

---

## 1. 目的

**FAIL** を曖昧な「ダメ」で終わらせず、**型**に落とし **次の一手**（restore / 新カード / 却下）を選べるようにする。

---

## 2. 分類一覧

| 型 | 意味 | 典型の次一手 |
|----|------|----------------|
| **bug** | 実装誤り・未定義動作 | 最小パッチカード、再現手順を acceptance に |
| **residual** | 意図的に残していた未完了が顕在化 | 専用 residual カード、スコープ明確化 |
| **route drift** | `routeReason` や分岐が期待からズレ | ルート系カード、PATCH29 期待表の更新検討 |
| **responsePlan missing** | `responsePlan` 欠落・骨格崩壊 | contract 修復カード |
| **projector drift** | 投影・semantic 層の出力が契約と不一致 | projector / chat 経路の限定修正 |
| **connector failure** | 外部 API・DB 接続・認証など | infra / 設定カード、S2/S3 と併記 |
| **infra failure** | ホスト・service・リソース | 復旧は ops、コード変更は最小 |
| **rejected** | 憲法・優先順位・Canon に合わない | 却下理由を Founder に返す（後続フィードバック） |

---

## 3. 運用

- 1 つの FAIL に **主型 1 つ**を付ける。複合なら **先に直す順**で主型を決める。  
- 型が **rejected** のときは **restore 不要**な場合もあるが、**変更を持ち込まない**。

---

## 4. 次カード（実装フェーズ）

**FOUNDER_REQUEST_BOX_V1**（要望の最小入力口）。

**次カード候補（1 つだけ）:** `FOUNDER_REQUEST_BOX_V1`

---

## 5. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 8 分類を固定 |
