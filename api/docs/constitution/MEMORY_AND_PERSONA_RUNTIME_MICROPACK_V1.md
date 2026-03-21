# MEMORY_AND_PERSONA_RUNTIME_MICROPACK_V1

**MODE:** `AUTONOMOUS_BUNDLE` → **FORENSIC / MIN_DIFF_PATCH**（**micro-card 単位**・コード変更は **1 micro-card あたり最大 3 ファイル**・low-risk のみ）  
**上位束:** `MEMORY_AND_PERSONA_AUTOBUNDLE_V1.md`  
**目的:** 同束の **7 micro-card** を実ランタイムで **固定順**に実行し、`evidenceBundlePath` を確定して **docs-pass → runtime-pass** に引き上げる。

---

## 0. 実行入口

| 項目 | 内容 |
|------|------|
| **スクリプト** | `api/scripts/memory_persona_runtime_micropack_v1.sh` |
| **用法** | `cd api && BASE=http://127.0.0.1:3000 ./scripts/memory_persona_runtime_micropack_v1.sh [EVIDENCE_ROOT]` |
| **DB** | `TENMON_DATA_DIR`（既定 `/opt/tenmon-ark-data`）の `kokuzo.sqlite` / `persona.sqlite` |
| **認証** | MC1–2 / MC6: `x-tenmon-local-test: 1` + `x-tenmon-local-user`（メール形式）。MC3–5 / MC7: `auth_session` 用に **kokuzo にテストセッションを一時 INSERT**（本番では専用スタブ環境で実行） |

各 micro-card ディレクトリに **`envelope.json`** を生成する。

---

## 1. micro-card 順序（固定）

| # | ID | 検証概要 |
|---|----|-----------|
| 1 | `user_naming_runtime_bind` | `ku.naming` SAVED + `persona.sqlite` の `user_naming` 行 |
| 2 | `persona_core_runtime_bind` | 構造系プローブで `personaConstitutionSummary` / `TENMON_CORE_V1` |
| 3 | `inheritance_prompt_structured_runtime_bind` | `POST .../custom-gpt-import/v1/save` → structured + **`runtime_chat_injection: false`** |
| 4 | `inherited_memory_fact_runtime_bind` | `GET .../status` で `inherited_memory_facts` が非空 |
| 5 | `memory_consistency_runtime_audit` | `persona.sqlite` の `user_shared_profile_slice` 全行 JSON 妥当性 |
| 6 | `longitudinal_persona_stability_probe` | 2 thread で `identityCore` 一致 |
| 7 | `sync_isolation_non_interference_check` | `FORBIDDEN_KEY`（`crossUserImport`）+ 2 userId で相互非漏洩 |

---

## 2. 禁止・継承

`MEMORY_AND_PERSONA_AUTOBUNDLE_V1.md` の不変ルール（raw 直注入禁止・structured 正・user_id・local/shared・非混線・no-touch）を継承。

---

## 3. 完了条件・次カード

- 7 micro-card **すべて PASS**・**evidence 一式**・rollback 未解決なし。  
- 次束 docs: **`EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1.md`** → runtime 後は **`SELF_EVOLUTION_AUTOBUNDLE_V1`**

---

## 4. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 初版・スクリプトパス・7 順固定 |
| V1.1 | MC1 受入れ（DB + ku.naming）・FORBIDDEN 検査の curl を `-sS` に |
| V1.2 | 完了後の次束に束 C 実体ファイル名と束 D 名を追記 |
