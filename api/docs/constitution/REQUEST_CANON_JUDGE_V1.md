# REQUEST_CANON_JUDGE_V1

**MODE:** 憲法・手続き（**本カードは DOCS_ONLY**。runtime 実装は任意・後追い可）。  
**上位文書:** `SELF_BUILD_GOVERNOR_V1.md`、`SELF_BUILD_STOP_CONDITIONS_V1.md`、`SELF_BUILD_CARD_GENERATOR_V1.md`、`SELF_BUILD_PRIORITY_JUDGE_V1.md`、`SELF_BUILD_FAILURE_CLASSIFIER_V1.md`。  
**接続（入力）:** `FOUNDER_REQUEST_BOX_V1`（`/api/founder/requests` 等）で受けた要望＋`REQUEST_TRIAGE_SCHEMA_V1`（`bug | quality | feature | research | rejected`）。  
**接続（出力）:** 本裁定の結果を **`REQUEST_TO_CARD_DRAFT_V1`** に渡し、**カード草案**（MODE / 対象 / acceptance / rollback / next）を生成する。**要望を実装へ直行させない**（必ず本 judge を通す）。

**no-touch:** `api/src/db/kokuzo_schema.sql` を侵害する要望は **rejected** または **accepted_docs（手続きで別カード化）** のいずれかで扱い、**無断で変更しない**。

---

## 1. 目的（Canon Judge）

Founder 要望が **憲法・主線・優先順**に合致するかを **実装前** に裁定し、**出力分類**へ落とす。  
合致しないものは **rejected** とし、合致するものだけ **accepted_*** として次工程へ進める。

---

## 2. 主線（mainline）の参照点

次を **主線** とみなす（要望はこれを壊さないことを前提に裁定する）。

- **chat refactor final seal** 以降の runtime 契約: `routeReason` / `responsePlan` / contract / 本文骨格を **不要に変えない**（Governor §7）。  
- **sealed runtime set** 記載の対象ファイル・runner（`PATCH29` 等）との整合。  
- **自己構築フェーズ**の憲法群（`SELF_BUILD_*`）に従うこと。

主線に反する要望は **deferred**（主線カードで先に整理）か **rejected**（採用しない）とする。

---

## 3. 必須判定項目（7 軸）

裁定時、次を **明示的に Yes/No/要検討** で埋める（記録はカードまたは Founder 要望メタに残す）。

| # | 項目 | 問い |
|---|------|------|
| **C1** | **憲法適合性** | `SELF_BUILD_GOVERNOR_V1` の原則（最小 diff、1 変更=1 検証、seal 規則、docs/runtime 分離、観測物不 add）に合うか。 |
| **C2** | **主線適合性** | §2 の主線・契約を **意図せず破壊**しないか。 |
| **C3** | **no-touch 侵害の有無** | `kokuzo_schema.sql` 等 no-touch を **変更・混入**させるか。侵害なら実装へ進めない。 |
| **C4** | **docs-only で済むか** | 手続き・憲法・handoff の更新だけで充足できるか。 |
| **C5** | **runtime が必要か** | コード・設定・サービス変更が必要か。 |
| **C6** | **Founder 価値の高低** | `SELF_BUILD_PRIORITY_JUDGE_V1` の **順位 3** に相当する戦略的価値があるか（高/中/低）。 |
| **C7** | **rejected にすべきか** | 憲法違反・主線破壊・スコープ外・悪意・再現不能な願望のみ、等。 |

**注意:** C4 と C5 は同時に Yes になり得る（「一部 docs + 一部 runtime」）。その場合は **2 カードに分割**し、**混在 commit 禁止**（Governor）。

---

## 4. 出力分類（4 値）

| 分類 | 条件（目安） | 次工程 |
|------|----------------|--------|
| **accepted_runtime** | C1✓ C2✓、C3✗（侵害なし）、**C5=必要**、C7✗ | `REQUEST_TO_CARD_DRAFT_V1` → **MODE `MIN_DIFF_PATCH`** 系カード案（acceptance に build/health 等）。 |
| **accepted_docs** | C1✓ C2✓、C3✗、**C4=Yes** で C5=不要（または runtime は別カードに分離済み）、C7✗ | `REQUEST_TO_CARD_DRAFT_V1` → **MODE `DOCS_ONLY`** カード案。 |
| **deferred** | 原則合致だが **依存未満**・**優先順が下**・**主線タスクが先**（`SELF_BUILD_PRIORITY_JUDGE_V1`）、情報不足 | 保留理由を記録。**次に取る主線カード**を 1 つ決め、`next if pass` に繋ぐ。 |
| **rejected** | C7=Yes、または C1/C2/C3 で **合致しない**（no-touch 強制変更、契約破壊目的、憲法違反） | **実装しない**。理由を Founder に返す（`FOUNDER_RESULT_FEEDBACK_V1` 想定）。triage `rejected` と混同しない（triage は入力ラベル、本出力は **裁定結果**）。 |

**triage category との関係:** `bug` は多く **accepted_runtime**、`research` は **deferred** になりやすい、等は **目安** であり、**Canon が上書き**する（例: bug でも主線破壊なら **rejected**）。

---

## 5. 裁定の順序（推奨）

1. **C3 no-touch** … 侵害なら即 **rejected**（例外は Founder / 憲法改正プロセスを **docs-only カード**で先に起票）。  
2. **C1 憲法** … 違反なら **rejected** または **deferred**（憲法側を先に直す）。  
3. **C2 主線** … 破壊的なら **rejected** または **deferred**。  
4. **C7** … 明確な却下理由があれば **rejected**。  
5. **C4 / C5** … docs-only と runtime を分離して **accepted_docs** / **accepted_runtime**。  
6. **C6** … `SELF_BUILD_PRIORITY_JUDGE_V1` に従い **deferred** するかどうか最終調整。

---

## 6. Governor 群との矛盾禁止

- **STOP / RESTORE:** 裁定結果が **accepted_*** でも、実装中に S1〜S9 が出たら **stop**（`SELF_BUILD_STOP_CONDITIONS_V1`）。  
- **CARD_GENERATOR:** 実装へ進む場合は **必須 7 項目**のカードを経由する。  
- **FAILURE_CLASSIFIER:** 実装後の FAIL は型分類し、**restore 優先**（`SELF_BUILD_RESTORE_POLICY_V1`）。

---

## 7. 次カード

**REQUEST_TO_CARD_DRAFT_V1** … 本書の **出力分類**と **7 軸の記録**を入力として、カード草案（名前 / MODE / 対象ファイル候補 / acceptance / rollback / next）を生成する。

**次カード候補（1 つだけ）:** `REQUEST_TO_CARD_DRAFT_V1`

---

## 8. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 7 軸・4 分類・主線定義・Founder loop 接続を固定 |
