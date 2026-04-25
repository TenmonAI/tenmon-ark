# CONSTITUTION_MEMORY_DISTILL_APPLY_V1 — Phase 1 PRE スナップショット

**カード**: `CARD-CONSTITUTION-MEMORY-DISTILL-APPLY-V1 [Phase 1 PRE]`
**実施日時**: 2026-04-25 (Sat) 18:40 JST
**目的**: migration 適用前の DB 状態 + API 状態を完全記録し、Phase 2 (TENMON 手動 SSH) 適用後の Phase 3 で正確な diff を取れるようにする
**前提 commit**: `9dd75456` (`feat(memory): CONSTITUTION-MEMORY-DISTILL-V1 - seed script and migration for KOTODAMA_CONSTITUTION_V1 12 articles to memory_units (no DB write)`)

---

## 1. DB 件数 (PRE)

| テーブル / 条件 | 件数 |
|---|---:|
| `memory_units` (総件数) | **253,014** |
| `memory_units WHERE scope_id='kotodama_constitution_v1'` | **0** (未適用、期待通り) |
| `memory_units WHERE memory_type='scripture_distill'` | 305 |
| `thread_center_memory` | 9,178 |
| `persona_knowledge_bindings` | 105 |
| `persona_profiles` | 2 |
| `thread_persona_links` | 112,975 |

### 取得 SQL (READ-ONLY)

```sql
SELECT 'memory_units', COUNT(*) FROM memory_units;
SELECT 'memory_units WHERE scope_id=kotodama_constitution_v1', COUNT(*)
  FROM memory_units WHERE scope_id='kotodama_constitution_v1';
SELECT 'memory_units WHERE memory_type=scripture_distill', COUNT(*)
  FROM memory_units WHERE memory_type='scripture_distill';
SELECT 'thread_center_memory', COUNT(*) FROM thread_center_memory;
SELECT 'persona_knowledge_bindings', COUNT(*) FROM persona_knowledge_bindings;
SELECT 'persona_profiles', COUNT(*) FROM persona_profiles;
SELECT 'thread_persona_links', COUNT(*) FROM thread_persona_links;
```

---

## 2. 適用対象ファイル sha256

| ファイル | sha256 |
|---|---|
| `api/migrations/2026042500_kotodama_constitution_distill_v1.sql` | `44839ca9cddeb82cf708ddfb2f2aed94ab94e0d684559dba9a597dedaed9f483` |
| `api/scripts/seed_kotodama_constitution_v1.mjs` | `7996b967829874866a85089e2c9f2435a5ff24af474e3ee7dcc43227748fd541` |
| `docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt` (source) | `3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab` |

→ Phase 2 / Phase 3 で同じ sha256 が維持されることを確認すること (改竄検知)。

---

## 3. chat 応答 (PRE)

### 第 4 条応答 (PROMOTION-GATE 結果維持確認)

```json
{
  "len": 151,
  "head": "言灵憲法 V1 第 4 条は、以下の通りである。\n\n「ヰ・ヱを欠損扱いにしない。ヰ・ヱは現代簡略表に吸収して消してはならない。見かけ上同じ「イ」「エ」に見えても、ア行・ヤ行・ワ行などにおける位相差は保持する。「同字形に見えるから統合する」の",
  "tail": "収して消してはならない。見かけ上同じ「イ」「エ」に見えても、ア行・ヤ行・ワ行などにおける位相差は保持する。「同字形に見えるから統合する」のではなく、「五十連上の位置が異なるなら別存在として保持する」。"
}
```

→ **151 chars** (Acceptance #6 144+ chars 達成、ヰ・ヱ 本文ベース応答維持)。
→ 第 4 条本文の主要キーフレーズ「ヰ・ヱを欠損扱いにしない」「五十連上の位置が異なるなら別存在として保持する」が応答に含まれる。

### T1 / T4 (退行検知用)

| 入力 | response 文字数 |
|---|---:|
| `こんにちは` | **39** |
| `カタカムナと言霊秘書の関係を詳しく解説してください` | **966** |

---

## 4. acceptance / enforcer (PRE)

### `acceptance.verdict` × 3 連続

| 試行 | verdict |
|---:|---|
| 1 | **PASS** |
| 2 | **PASS** |
| 3 | **PASS** |

→ 3 連続 PASS、3-tap 安定確認 (CRIT=0 / HIGH=0)。

### `enforcer.verdict`

```json
{
  "verdict": "clean",
  "violations": 0
}
```

---

## 5. PID (PRE)

| サービス | PID | 状態 |
|---|---:|---|
| `tenmon-ark-api.service` | **1063225** | active (since `Sat 2026-04-25 17:52:45 JST`) |
| `nginx.service` | 891111 | active |
| `tenmon-runtime-watchdog.service` | **2539152** | active |

→ `tenmon-ark-api PID 1063225` / `tenmon-runtime-watchdog PID 2539152` を Phase 2 / Phase 3 で不変であることを確認すること (Acceptance #10 / #11)。

---

## 6. git HEAD

```
9dd75456 feat(memory): CONSTITUTION-MEMORY-DISTILL-V1 - seed script and migration for KOTODAMA_CONSTITUTION_V1 12 articles to memory_units (no DB write)
```

---

## 7. Phase 2 (TENMON 手動 SSH) 適用手順

本 PRE snapshot 取得後、TENMON が以下を別 ONE_STEP で手動実行:

```bash
cd /opt/tenmon-ark-repo

sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite \
  < api/migrations/2026042500_kotodama_constitution_distill_v1.sql

sqlite3 -readonly /opt/tenmon-ark-data/kokuzo.sqlite \
  "SELECT COUNT(*) FROM memory_units WHERE scope_id='kotodama_constitution_v1';"
# 期待: 12
```

### Phase 3 で確認すべき差分

| 項目 | PRE | POST 期待 | 差分 |
|---|---:|---:|---:|
| `memory_units` 総件数 | 253,014 | 253,026 | **+12** |
| `scope_id='kotodama_constitution_v1'` | 0 | 12 | **+12** |
| `memory_type='scripture_distill'` | 305 | 317 | **+12** |
| `thread_center_memory` | 9,178 | 9,178 | 0 (不変) |
| `persona_knowledge_bindings` | 105 | 105 | 0 (不変) |
| `persona_profiles` | 2 | 2 | 0 (不変) |
| `thread_persona_links` | 112,975 | 112,975 | 0 (不変) |
| `tenmon-ark-api` PID | 1063225 | 1063225 | 不変 (restart 不要) |
| 第 4 条 chat 応答 | 151 chars | 144+ chars | 維持 |
| acceptance verdict | PASS×3 | PASS | 不変 |
| enforcer verdict | clean | clean | 不変 |

---

## 8. Acceptance チェック (PRE 段階)

| # | 項目 | 結果 |
|---:|---|---|
| 1 | レポートのみ追加 (1 ファイル) | ✅ 本ファイルのみ |
| 2 | DB write ゼロ | ✅ READ-ONLY のみ実行 |
| 3 | `scope_id='kotodama_constitution_v1'` = 0 件 | ✅ 0 |
| 4 | memory_units 総件数記録 | ✅ 253,014 |
| 5 | thread_center_memory / persona_knowledge_bindings / persona_profiles / thread_persona_links 件数記録 | ✅ 9,178 / 105 / 2 / 112,975 |
| 6 | 第 4 条応答 144+ chars 維持 | ✅ 151 |
| 7 | T1 / T4 退行なし | ✅ 39 / 966 |
| 8 | acceptance verdict = PASS × 3 | ✅ PASS / PASS / PASS |
| 9 | enforcer verdict = clean | ✅ clean (violations: 0) |
| 10 | tenmon-ark-api PID 1063225 不変 | ✅ 1063225 |
| 11 | tenmon-runtime-watchdog PID 2539152 不変 | ✅ 2539152 |

---

## 9. SEAL

```
PHASE: 1 (PRE only)
APPLY: NOT YET (TENMON 手動 SSH at Phase 2)
DB_WRITE: ZERO
RESTART: ZERO
HEAD: 9dd75456
TIMESTAMP: 2026-04-25T18:40+09:00 (JST)
```
