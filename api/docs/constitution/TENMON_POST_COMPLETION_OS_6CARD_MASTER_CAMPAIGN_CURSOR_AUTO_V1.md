# TENMON_POST_COMPLETION_OS_6CARD_MASTER_CAMPAIGN_CURSOR_AUTO_V1

## 目的

`TENMON_TOTAL_COMPLETION_8CARD_MASTER_CAMPAIGN_CURSOR_AUTO_V1` によって PWA / conversation / final seal が **completion 領域**へ到達した後、**自己監査・自己修復・自己構築・ learning / self-improvement integration** を completion ではなく **accepted-complete / sealed-operable** へ押し上げる。

本カードは **親カード**。  
実装本体は **子カード 6 枚**。  
親カードは **順序・依存・停止条件・PASS 条件のみ**を固定する。親カード自身は **product patch を当てない**。

---

## D（憲法）

- **最小 diff**
- **1 変更 = 1 検証**
- **dist 直編集禁止**
- **repo → build → deploy/restart → audit → acceptance**
- cause 未断定 patch 禁止
- **acceptance PASS 以外封印禁止**
- **env failure と product failure を混同しない**
- **dangerous patch は execution gate を通さない**
- **rollback plan なき自己修復は禁止**
- 本 campaign は **OS 層 completion 専用**
- 子カードの **順序を崩さない**
- 自己修復は **safe patch loop** のみ
- 自己構築は **結果回収と verdict 反映**まで含める

---

## 現在の Evidence（固定・運用時は更新）

- overall band: **`code_complete_lived_unproven`** から、completion 主線の choke point は特定済み
- unfinished forensic により、以下 subsystem は **code-present だが accepted-complete ではない** と判定済み
  - self audit OS
  - self repair OS
  - self build OS
  - remote admin / cursor bridge runtime proof
  - learning / self-improvement integration
- priority evidence 例:
  - `learning_integrated_verdict_not_ok`
  - `learning_chain_not_ok`
  - remote admin / cursor bridge は **code presence** 多いが **runtime proof** 未確定
  - self-build / audit / repair 系は資産多数だが **単一 verdict に未封印**

---

## 子カード固定順（6 枚）

### Phase 1: self-audit closure

| 順 | カード名 |
|----|----------|
| 1 | `TENMON_SELF_AUDIT_OS_SINGLE_VERDICT_CURSOR_AUTO_V1` |
| 2 | `TENMON_SELF_AUDIT_OS_REGRESSION_MEMORY_CURSOR_AUTO_V1` |

### Phase 2: self-repair closure

| 順 | カード名 |
|----|----------|
| 3 | `TENMON_SELF_REPAIR_OS_SAFE_PATCH_LOOP_CURSOR_AUTO_V1` |
| 4 | `TENMON_SELF_REPAIR_OS_ACCEPTANCE_SEAL_CURSOR_AUTO_V1` |

### Phase 3: self-build / learning closure

| 順 | カード名 |
|----|----------|
| 5 | `TENMON_SELF_BUILD_OS_CURSOR_EXECUTION_CHAIN_CURSOR_AUTO_V1` |
| 6 | `TENMON_LEARNING_SELF_IMPROVEMENT_INTEGRATED_SEAL_CURSOR_AUTO_V1` |

---

## 実行規則

- 各子カードは **単独で Cursor キュー投入可能な完成文面**で運用する。
- **PASS したカードのみ**次へ進む。
- **FAIL** したら Evidence を採取し、そのカードの **retry 版**を生成する（次カードに進まない）。
- **self-audit が単一 verdict 化される前に** self-repair を強めない。
- **rollback / dangerous patch blocker 未整備のまま** self-repair を実行しない。
- self-build は **card generation だけで終わらせず**、**result ingest / verdict update** まで通す。
- learning integration は **subsystem 存在ではなく `integrated verdict`** で判定する。

---

## 停止条件（OS campaign completion 到達の定義）

次の **すべて**を満たしたとき **OS campaign completion 到達**とみなす。

- self-audit verdict が **単一 JSON** に統合される
- regression memory が **前回比較**を保持し、**悪化時に止められる**
- self-repair が **dangerous patch を拒否**し、**safe patch loop** だけを通す
- self-repair の採用が **acceptance / seal** まで閉じる
- self-build が **Cursor execution chain** と **result ingest** を持つ
- learning / self-improvement が **integrated verdict** で **`ok=true`** になる
- campaign 全体の **system verdict** が **sealed-operable** になる

---

## FAIL 時の扱い

- FAIL 時は **そのカードで停止**。
- ログ: `/var/log/tenmon/card_<CARD>/<TS>/run.log`
- 必須採取:
  - `git status --short`
  - build stdout/stderr
  - systemd status
  - `/api/audit`
  - `/api/audit.build`
  - 該当 **subsystem verdict JSON**
- **次カードへ進む前に** retry カードを切る。

---

## FAIL_NEXT_CARD

`TENMON_POST_COMPLETION_OS_6CARD_MASTER_CAMPAIGN_RETRY_CURSOR_AUTO_V1`

（retry 用の生成物・手順は `api/automation/generated_cursor_apply/TENMON_POST_COMPLETION_OS_6CARD_MASTER_CAMPAIGN_RETRY_CURSOR_AUTO_V1.md` を参照）

---

## PASS 条件（本親カード）

- 本 campaign の **6 枚順序・依存・停止条件**が固定される。
- OS 層 completion の **最短ルート**として運用できる。
- Cursor へ **親カード → 子カード順**でそのまま投入可能。

---

## 前提（着手タイミング）

- **completion 主線（PWA 8 枚）完了後**に着手する（`TENMON_TOTAL_COMPLETION_8CARD_MASTER_CAMPAIGN_CURSOR_AUTO_V1` の停止条件を満たした後）。

---

## 参照

- 先行 campaign: `api/docs/constitution/TENMON_TOTAL_COMPLETION_8CARD_MASTER_CAMPAIGN_CURSOR_AUTO_V1.md`
- 子カード（上表の 6 枚・憲法・実装は各カード側）

---

*Version: 1 — Parent orchestration only; no product patch in this card.*
