# SELF_BUILD_GOVERNOR_V1

**最上位索引:** `SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md`（自動構築 OS の **単一入口**。no-touch / acceptance / rollback / quarantine / 外部ツール / 自律バジェット / micro-card 方針を束ねる。本書はその **Governor 柱**として従来どおり正規定義である）  
**phase:** post-chat-refactor-final-seal（chat refactor final seal: `fac4832` 以降を前提とする自己構築フェーズ）  
**MODE 宣言:** 本書は **憲法・手続き** のみを固定する。**runtime 改修は別カードで行う。**  
**no-touch:** `api/src/db/kokuzo_schema.sql`（憲法どおり運用し、カード・PR に混ぜない）

---

## 1. Self Build Governor（正中の役割）

**Self Build Governor** は、リポジトリに対する変更・検証・封印の **序列（いつ・何を・どこまでやるか）** を裁定する仮想当局である。

- **単一の正規パス:** 要望・障害・改善は **必ずカード** に落とし、**1 変更 = 1 検証** を守る。
- **seal の門番:** **acceptance PASS 以外は seal 禁止**。PASS が出るまで「完成」とみなさない。
- **混線禁止:** **docs-only と runtime を同一 commit / 同一 staged に混ぜない**。
- **観測物の排除:** 未追跡の観測ログ・大型分析資料・stub を **意図的に add しない**（必要なら `.gitignore` や別保管をカードで扱う）。

Governor はコード上の単一モジュール名ではなく、**上記ルールに従う運用プロセス**を指す。実装カード（自動 runner 等）はこの憲法に従属する。

---

## 2. 修復 / 拡張 の判定

| 種別 | 定義 | Governor の扱い |
|------|------|----------------|
| **修復（repair）** | 既存契約・挙動の **回帰**、acceptance 失敗、明確な bug、route/contract の意図しない破壊 | **最優先でカード化**。差分は最小。原因特定のための forensic を先に取りうる。 |
| **拡張（expansion）** | 新機能・新経路・新 API・UI 増設 | **単独カード列**とし、acceptance を先に定義してから実装。既存 PATCH 系と同様に「目的・対象ファイル・検証」を明文化する。 |
| **整備（docs / 憲法）** | 手続き・優先順位・分類器の明文化のみ | **docs-only カード**。runtime と混ぜない。 |

**判定の原則:** 「いま壊しているか？」が Yes なら **拡張より修復**。曖昧なら **FAIL 扱いで止め、カードで分解**する（後続 `SELF_BUILD_FAILURE_CLASSIFIER_V1` で型付け）。

---

## 3. 停止条件（auto-stop の骨格）

次のいずれかで **作業を止め、seal しない**（詳細・網羅は `SELF_BUILD_STOP_CONDITIONS_V1`）。

- **build** 失敗  
- **service** が期待状態でない（inactive 等）  
- **health** 失敗  
- **acceptance**（PATCH29 等、カード定義の検証）失敗  
- **no-touch**（`kokuzo_schema.sql` 等）の汚染・誤 stage  
- **runtime / docs の混在** commit または同一 staged  
- **routeReason / responsePlan / contract / 本文骨格** の意図しない破壊が検知されたとき  
- **rollback 不能**（履歴・差分が追えず安全に戻せない）と判断したとき  

停止後は **restore 優先**（次節）。停止を無視して差分を足し続けない。

---

## 4. restore 条件（骨格）

FAIL 時は **restore → forensic → retry**（詳細は `SELF_BUILD_RESTORE_POLICY_V1`）。

- **restore 優先:** まず既知の良好な HEAD へ戻す、または問題のある変更だけを取り除く。  
- **壊れた差分に継ぎ足さない:** 失敗した状態の上に「とりあえずパッチ」を重ねない。  
- **forensic 最小セット:** `git status`、`git diff`、`該当ログの末尾`、**失敗した acceptance の一行要約** 程度から始める。  
- **retry 条件:** 原因が特定され、**新しいカード** に acceptance が書けたときのみ再実行。  

---

## 5. card generator 規則（必須項目）

一切の作業要請は、次の **必須項目** を満たす **カード** として起票する（詳細テンプレは `SELF_BUILD_CARD_GENERATOR_V1`）。

| 項目 | 説明 |
|------|------|
| **カード名** | 一意な識別子（例: `SELF_BUILD_GOVERNOR_V1`） |
| **MODE** | `DOCS_ONLY` / `MIN_DIFF_PATCH` / `RESEAL` 等 |
| **対象ファイル** | 触ってよいパス上限（例: 最大 N ファイル） |
| **目的** | 何を達成するか一文〜短段落 |
| **acceptance** | build / health / スクリプト名 等、PASS の定義 |
| **rollback** | 失敗時にどう戻すか（例: `git restore` / revert 方針） |
| **next if pass** | 通過後の **次カード候補は 1 つだけ** |

**禁止:** カードなしの「口頭だけの本番反映」、acceptance なしの seal。

---

## 6. Founder 要望入口との接続方針

- **入口:** Founder からの要望は **専用の入力口**（UI または API）に集約する（実装は `FOUNDER_REQUEST_BOX_V1` 以降のカード）。  
- **変換義務:** 自然文のまま **runtime に直結させない**。必ず **カード草案または型付き要望** に変換してから Governor 序列に乗せる。  
- **優先順位:** Governor は `SELF_BUILD_PRIORITY_JUDGE_V1` の順位（要約: **build/health/acceptance を壊すもの最優先**）で並べる。  
- **可視性:** Founder には最終的に **反映済み / 保留 / 却下（理由）** を返す（`FOUNDER_RESULT_FEEDBACK_V1`）。  

---

## 7. 既存 TENMON 最上位原則との整合

本憲法は次と **矛盾してはならない**。

- 最小 diff / 1 変更 = 1 検証  
- acceptance PASS 以外 seal 禁止  
- docs-only と runtime 分離  
- routeReason / responsePlan / contract / 本文骨格を不要に変えない  
- no-touch の維持  

---

## 8. 次カード束（自己構築フェーズの列車）

本書は **憲法の柱** のみを固定する。以下は **別ドキュメント／別カード** で具体化する。

| 順 | カード名 | 役割 |
|----|-----------|------|
| 次 | **SELF_BUILD_STOP_CONDITIONS_V1** | 停止条件の完全列挙と運用文言 |
|  | SELF_BUILD_RESTORE_POLICY_V1 | restore / forensic / retry |
|  | SELF_BUILD_CARD_GENERATOR_V1 | カード必須項目のテンプレ固定 |
|  | SELF_BUILD_PRIORITY_JUDGE_V1 | 優先順位裁定 |
|  | SELF_BUILD_FAILURE_CLASSIFIER_V1 | FAIL の型分類 |
|  | FOUNDER_REQUEST_BOX_V1 以降 | 入力口・schema・自動化 |

**次カード候補（1 つだけ）:** `SELF_BUILD_STOP_CONDITIONS_V1`

---

## 9. 変更履歴（ドキュメント）

| 版 | 内容 |
|----|------|
| V1 | 初版: Governor・修復/拡張・停止/restore 骨格・カード規則・Founder 接続を固定 |
