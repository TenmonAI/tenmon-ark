# LOW_RISK_AUTO_APPLY_SCOPE_V1

**MODE:** `DOCS_ONLY`（runtime 改修なし）  
**上位文書:** `SELF_BUILD_GOVERNOR_V1.md` / `SELF_BUILD_STOP_CONDITIONS_V1.md` / `SELF_BUILD_RESTORE_POLICY_V1.md`

---

## 1. 目的

自己進化・自己修復・自己監査の変更のうち、**低リスク範囲のみ自動適用可能**とする境界を固定する。  
完全自動化は行わず、まず「自動適用してよい範囲」と「必ず人間判断が必要な範囲」を明確化する。

---

## 2. 分類（固定ラベル）

すべての候補変更を次のいずれかに分類する。

- `auto_apply_allowed`
- `auto_apply_review_required`
- `auto_apply_forbidden`

---

## 3. auto_apply_allowed（自動適用可）

### 3.1 対象

- docs-only 更新（憲法・手順・指標定義）
- 小さな bridge / wording 修正（意味不変）
- regex の局所追加（既存分岐の補助、順序非変更）
- helper 内の限定修正（呼び出し契約不変）
- 既存 acceptance が明確で、判定が機械化済みのもの

### 3.2 条件

以下を**全て満たす**場合のみ allowed:

1. 変更ファイル数が少数（目安: 1〜3）
2. `routeReason / responsePlan / contract` の仕様を変えない
3. `no-touch` を含まない
4. acceptance が既存スクリプトで判定可能
5. FAIL 時に即 restore 可能（差分が局所）

---

## 4. auto_apply_review_required（人間レビュー必須）

### 4.1 対象

- route 順序変更
- thread continuity 変更
- projector / final reducer 変更
- Founder API 変更
- 返答の最終出口（共通整形）の仕様変更

### 4.2 扱い

- 自動適用はしない
- 人間承認後に適用可能
- 承認時も `1変更=1検証` を維持

---

## 5. auto_apply_forbidden（自動適用禁止）

### 5.1 対象

- DB schema 変更（特に `api/src/db/kokuzo_schema.sql`）
- no-touch 領域
- backup / restore 核
- systemd / secrets / infra 主幹
- 広域 diff（高影響・多ファイル）
- acceptance 不明なもの

### 5.2 扱い

- 自動適用禁止
- 必ずカード分離 + 人間承認

---

## 6. 判定条件（実行前ゲート）

変更候補ごとに次をチェックする。

1. **分類確定**: allowed / review_required / forbidden
2. **受入基準の有無**: build/health/acceptance が明示されているか
3. **影響範囲**: ルート契約・DB・infra への波及有無
4. **復旧容易性**: restore が即時可能か

`forbidden` に1つでも該当すれば即停止。  
`review_required` は承認待ち。  
`allowed` のみ自動適用可。

---

## 7. 必須 acceptance（自動適用時）

`auto_apply_allowed` でも最低限次を要求:

- docs-only: 文書整合（Governor 群との矛盾なし）
- runtime 伴う軽微修正（将来運用時）:
  - `build PASS`
  - `health PASS`
  - 対象カードで定義された acceptance script PASS

※ acceptance 未定義は `forbidden` 扱い。

---

## 8. stop 条件

次を検知した時点で停止:

- acceptance FAIL
- route 契約破壊の疑い
- 想定外の広域 diff
- no-touch 汚染
- rollback 不能

停止後は `restore -> forensic -> retry` の順序に従う。

---

## 9. rollback 条件

以下のいずれかで rollback 実施:

- allowed 変更でも acceptance が1つでも FAIL
- 影響が review_required / forbidden に逸脱
- 失敗原因が単発でなく連鎖し始めた

rollback 後、原因を最小 forensic で採取して再カード化する。

---

## 10. 人間承認が必要な境界

次は常に承認必須:

- `auto_apply_review_required`
- `auto_apply_forbidden`
- `allowed` でも 2回連続 FAIL した案件
- 監査・復旧・認証・外部公開に関わる案件

---

## 11. 整合宣言

本定義は次と矛盾しない:

- `SELF_BUILD_GOVERNOR_V1`
- `SELF_BUILD_STOP_CONDITIONS_V1`
- `SELF_BUILD_RESTORE_POLICY_V1`

---

## 12. 次カード候補

`LOW_RISK_AUTO_APPLY_V1`

