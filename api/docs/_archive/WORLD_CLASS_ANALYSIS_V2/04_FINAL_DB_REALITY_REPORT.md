# 04_FINAL_DB_REALITY_REPORT — 完成版 DB 実体レポート

**根拠**: ULTIMATE 04_DB_REALITY_AND_MEMORY_REPORT、07_count_*.txt（report_TENMON_ULTIMATE_REARCHITECT_REPORT_V1/20260317T004538Z）。憶測禁止。

---

## kokuzo.sqlite の実在評価

- **監査時実測**: 7 テーブルすべてで **"Error: in prepare, no such table: <table_name> (1)"**。
  - 07_count_kokuzo_pages.txt: no such table: kokuzo_pages
  - 07_count_khs_laws.txt: no such table: khs_laws
  - 07_count_khs_units.txt: no such table: khs_units
  - 07_count_scripture_learning_ledger.txt: no such table: scripture_learning_ledger
  - 07_count_thread_center_memory.txt: no such table: thread_center_memory
  - 07_count_synapse_log.txt: no such table: synapse_log
  - 07_count_book_continuation_memory.txt: no such table: book_continuation_memory
- **解釈**: (1) 監査で参照した DB ファイルに migration が未適用である、(2) または runtime が参照する DB パスが監査時と異なる（別ファイルを指している）、のいずれかまたは両方。0 件ではなく **テーブル不在**。

---

## 0 件問題の原因候補整理

| 候補 | 説明 | 切り分け方法 |
|------|------|--------------|
| runtime DB 不一致 | アプリの getDb("kokuzo") が指すファイルと、監査で sqlite3 したファイルが違う。 | 実行時 getDbPath("kokuzo") を 1 回ログ出力し、監査時のパスと比較。 |
| migration 未実行 | kokuzo_schema.sql が対象 DB に適用されていない。 | 対象 DB で .tables または schema を確認。 |
| seed 未投入 | migration は適用済みだが INSERT が一度も実行されていない。 | COUNT が 0 か確認。テーブル存在なら seed/ingest 経路の有無を確認。 |
| write path 未発火 | コード上 upsert/save はあるが、条件が満たされず実行されていない。 | 該当経路に一時ログを入れ、1 回リクエストで発火するか確認。 |
| ingest 未接続 | ingest 経路が別 DB や別スキーマに書いている。 | ingest コードの DB 参照を確認。 |

---

## 切り分け（runtime DB 不一致 / migration 未実行 / seed 未投入 / write path 未発火 / ingest 未接続）

- **現時点で確定しているのは「監査時に対象とした DB ファイル上では 7 テーブルが存在しない」ことのみ。** 0 件かどうかは、テーブルが存在してから COUNT で測る。
- **推奨手順**: (1) 実行時 getDbPath("kokuzo") の絶対パスを 1 回ログで取得。(2) そのパスの DB で `sqlite3 <path> ".tables"` または schema を確認。(3) テーブルが無ければ kokuzo_schema.sql をその DB に適用。(4) 適用後、thread_center_memory または book_continuation_memory のいずれかに 1 件 insert する path（既存 API の 1 回呼びまたは seed スクリプト）を実行し、COUNT ≥ 1 を確認。

---

## KHS / kokuzo / ledger / continuity / synapse / book memory の実装実体評価

| 層 | スキーマ | コード上の参照 | 実体評価 |
|----|----------|----------------|----------|
| KHS | khs_laws, khs_units, kokuzo_pages | knowledgeBinder, sourceGraph, kotodamaOneSoundLawIndex, kokuzo/search.ts 等 | テーブル不在のため実体 0。器（schema）は kokuzo_schema.sql に存在。 |
| kokuzo | kokuzo_pages | kokuzo/search.ts, ingest 等 | 同上。 |
| ledger | scripture_learning_ledger | （コード内で ledger 書きの有無は要 grep） | テーブル不在。 |
| continuity | thread_center_memory | threadCoreStore, saveThreadCore, upsertThreadCenter 等 | テーブル不在。threadCoreStore は 43 continuity_hits（chat 内）。 |
| synapse | synapse_log | chat_parts/synapse.ts は placeholder only。 | テーブル不在。 |
| book memory | book_continuation_memory | bookContinuationMemory, upsertBookContinuation, CARD_BOOK_CONTINUATION_MEMORY_V1 | テーブル不在。bookContinuationMemory は 23 placeholder_hits（chat 内）。 |

---

## 器だけで中身が空の層

- **すべての 7 テーブル**が、監査時 DB では「器（テーブル）自体が無い」状態。したがって「器はあるが中身が 0 件」ではなく、「監査対象 DB には器が無い」。
- コード上は thread_center_memory, book_continuation_memory, khs_laws, khs_units, kokuzo_pages, scripture_learning_ledger, synapse_log を参照する経路が存在するが、それらがどの DB ファイルに作用しているかは実行時パスの確認が必要。

---

## DB reality check の最小カード化案

- **cardId**: CARD_DB_REALITY_CHECK_AND_SEED_V1
- **目的**: (1) 実行時 getDb("kokuzo") が指す DB ファイルの絶対パスを特定する。(2) その DB に 7 テーブルが存在するか確認し、無ければ kokuzo_schema.sql を適用する。(3) **実運用経路**（API または既存 write 関数）からその DB に write が発火した証拠を採取し、少なくとも 1 テーブルで COUNT ≥ 1 を確認する。
- **対象**: api/src/db（接続・migration）、必要なら seed スクリプト。アプリ本体は一時ログ（write 通過・パス記録）のみ。
- **acceptance**（「1件増えた」だけでなく「実運用経路からその DB に書かれた」まで含む）:
  - getDb("kokuzo") または実 runtime path が参照している DB 絶対パスを 1 回記録する。
  - その実 path に対して write が発火した証拠を採取する: **API call 時刻**、**write 関数通過ログ**、**COUNT before / after**。
  - 指定テーブルで COUNT ≥ 1 であること。
  - 既通過主権の probe（使い方を教えて / 方向性1000字 / カタカムナ / 言霊 / 人生とは？ / ヒの言霊）が従来どおりであること。
- **封印条件**: acceptance 未達の場合は commit しない。

**次の1枚**: [05_FINAL_WORLD_CLASS_GAP_REPORT.md](./05_FINAL_WORLD_CLASS_GAP_REPORT.md)
