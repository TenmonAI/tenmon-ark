# 04_DB_REALITY_AND_MEMORY_REPORT — DB 実態と記憶レポート

**根拠**: 確定観測「DB (/opt/tenmon-ark-repo/kokuzo.sqlite) は以下が 0 件」/ コード上の write 呼び出しのみ。憶測は可能性の列挙に留める。

---

## kokuzo.sqlite の実在評価

- **パス**: 確定観測では `/opt/tenmon-ark-repo/kokuzo.sqlite` が参照されている。
- **テーブル**: kokuzo_pages, khs_laws, khs_units, scripture_learning_ledger, thread_center_memory, synapse_log, book_continuation_memory が言及されている。
- **実測**: 上記いずれも **COUNT = 0**。

---

## なぜ count 0 なのか（可能性の整理）

| 可能性 | 内容 | 確認方法 |
|--------|------|----------|
| runtime DB 不一致 | 実行時に別の DB ファイルを開いている（getDb("kokuzo") の実パス） | getDb / getDbPath の実装と、実行環境の cwd / 環境変数を確認。 |
| seed 未投入 | スキーマはあるが一度も insert していない | マイグレーション・seed スクリプトの有無。手動で 1 件 insert して count が増えるか。 |
| ingest 未接続 | ページ/法の ingest パイプラインが動いていない | kokuzo_pages / khs_laws を書きにいくコードが実行されているか。 |
| write path 未発火 | saveThreadCore / upsertThreadCenter / writeScriptureLearningLedger 等が呼ばれているが、失敗しているか別 DB に書いている | ログまたは breakpoint で、該当関数実行後の DB ファイルと COUNT。 |

※「可能性」であり、実測で一つずつ潰す必要がある。

---

## KHS / kokuzo / ledger / continuity / book memory の現状

| 対象 | コード上の役割 | 実測 |
|------|----------------|------|
| khs_laws / khs_units | 法・ユニットの格納。検索・ recall で参照される想定。 | 0 件。 |
| kokuzo_pages | ページテキスト。検索でヒットする想定。 | 0 件。 |
| scripture_learning_ledger | 学習履歴・解像度。writeScriptureLearningLedger で書く想定。 | 0 件。 |
| thread_center_memory | スレッドごとの center。upsertThreadCenter / loadThreadCore（threadCoreStore が参照する可能性）で読む想定。 | 0 件。 |
| synapse_log | リクエスト/route のログ。writeSynapseLogV1 等で書く想定。 | 0 件。 |
| book_continuation_memory | 書籍継続。upsertBookContinuation で書く想定（chat.ts 7988）。 | 0 件。 |

- **continuity**: thread_center_memory が 0 のため、loadThreadCore で取得する「前の center」が存在しない。要するに/比較の「前ターン」がない。
- **memory**: 器（スキーマ・関数）はあるが、実体が 0 件なので「記憶に基づく返答」が成立していない。

---

## 次の1枚でやること

- **CARD_DB_REALITY_CHECK_AND_SEED_V1**:  
  - getDb("kokuzo") が指すファイルをログまたはコードで特定。  
  - 少なくとも 1 テーブル（例: thread_center_memory または book_continuation_memory）に 1 件 insert する path を 1 回だけ実行。  
  - そのテーブルの COUNT が 1 以上になることを acceptance とする。既通過主権の probe は変更しない。

---

**次の1枚**: [05_WORLD_CLASS_GAP_REPORT.md](./05_WORLD_CLASS_GAP_REPORT.md)
