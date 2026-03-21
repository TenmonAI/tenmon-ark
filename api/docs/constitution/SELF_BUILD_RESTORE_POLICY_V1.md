# SELF_BUILD_RESTORE_POLICY_V1

**上位文書:** `SELF_BUILD_GOVERNOR_V1.md` §4、`SELF_BUILD_STOP_CONDITIONS_V1.md`（停止後の正規パス）。  
**MODE:** 憲法・手続きのみ（**runtime 改修なし**）。  
**no-touch:** `api/src/db/kokuzo_schema.sql` は restore 時も **意図せず残さない**（汚染なら別カードで扱う）。

---

## 1. 正規パス（要約）

```
stop（S1〜S9） → restore（優先） → forensic（最小） → retry（条件を満たすときのみ）
```

---

## 2. restore 優先

- **最初の一手は restore** とする。原因究明より先に、**既知良好な状態**へ戻すか、**問題のある変更だけ**を取り除く。  
- 典型: `git restore <paths>`、`git reset`（共有ブランチでは **force 禁止** 原則）、`git revert`（既に push 済みのとき）。  
- **良好 HEAD** を決めたうえで、その点に合わせて作業ツリーを揃える（次節）。

---

## 3. 壊れた差分に継ぎ足さない

- acceptance や build が FAIL のまま、**同じブランチに「ついで修正」を重ねない**。  
- 例外: **単一カード内**で、**同じ失敗の直接の原因**に限定した **最小 1 パッチ**（いわゆる同一ターンの hotfix）は可。それ以外は **restore 後に新カード**。

---

## 4. forensic 最小採取物

停止直後、**まず次だけ**取る（ログの全ダンプや未追跡ファイルの大量 add はしない）。

| # | 採取物 | 目的 |
|---|--------|------|
| F1 | `git status --short` | 汚染・混在の有無 |
| F2 | `git diff` / `git diff --cached` | 意図しない差分の範囲 |
| F3 | 失敗コマンドの **最後 30 行**（build / acceptance） | エラー種別 |
| F4 | **カード名** と **期待 acceptance 1 行** | 文脈の固定 |

不足なら **カードで追加採取を定義**してから足す。

---

## 5. 良好 HEAD の決め方

1. **直近の seal / PASS 記録**があるコミット（例: chat refactor final seal `fac4832` 等、カードに書かれた SHA）。  
2. なければ **main（または運用ブランチ）上の最終 green**。  
3. ローカルのみの変更なら **`HEAD~n`** で **acceptance が最後に通った**と分かるコミット。  
4. 判断できない場合は **S9（rollback 不能）** 扱いで **止め、責任者裁定**（`SELF_BUILD_STOP_CONDITIONS_V1`）。

---

## 6. rollback 不可能時の扱い

- **push 済み**で revert が衝突する、**誰のどのコミットか不明**、**作業ツリーが追跡不能** など:  
  - **新規変更を増やさない**。  
  - **ブランチ保護・バックアップ**を確認し、**Founder / 責任者**にエスカレーション。  
  - 憲法上は **seal しない**。復旧手順は **別カード**（infra / ops）で書く。

---

## 7. retry 条件

次を **すべて**満たすときだけ retry（再パッチ・再 runner）。

1. restore により **良好 HEAD または同等のクリーン状態**に戻っている。  
2. **失敗原因**が F1〜F4 レベルで **仮説が言語化**されている。  
3. **新しいカード**に **acceptance** と **rollback** が書かれている。  
4. **no-touch / docs-runtime 混在**が解消されている。

---

## 8. 次カード

**SELF_BUILD_CARD_GENERATOR_V1**（要望を必ずカードへ落とす規則）。

**次カード候補（1 つだけ）:** `SELF_BUILD_CARD_GENERATOR_V1`

---

## 9. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | restore / forensic / retry / 良好 HEAD / S9 扱いを固定 |
