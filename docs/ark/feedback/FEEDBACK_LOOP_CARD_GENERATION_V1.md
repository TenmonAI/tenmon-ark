# FEEDBACK-LOOP-CARD-GENERATION-V1

旧 VPS 上で `doctor v2` の出力 (`profile=old_vps`) と本番 `/api/feedback/history`
を統合し、次に進めるべき Cursor カード候補を **手動 1 回実行** で生成する小実装カード。
TENMON-ARK Automation OS の最初の循環ループ (観測 → 分析 → 提案) を閉じる。

- カード ID: `CARD-FEEDBACK-LOOP-CARD-GENERATION-V1`
- 種別: 実装 (最小スクリプト) + 旧 VPS 1 回手動実行
- 自動実行: なし / systemd / cron / timer 登録: なし
- MC bearer token: 使用しない (戦略 C)
- 親カード: `CARD-DOCTOR-V2-OLD-VPS-FEEDBACK-INTEGRATION-V1` (commit `921cda86` PASS)
- 設計確定事項: 同上 docs `docs/ark/doctor/DOCTOR_V2_OLD_VPS_FEEDBACK_INTEGRATION_V1.md`

---

## 1. 背景 (FEEDBACK-INTEGRATION-V1 の設計引用)

| 設計事項 | 確定内容 (FEEDBACK-INTEGRATION-V1) | 本カードでの実装 |
| --- | --- | --- |
| 一次入力 | doctor v2 JSON の 9 項目 | `load_doctor_report()` で吸い上げ |
| feedback history 取得 | 単発 GET / auth 不要 / 約 42KB / 46 件 | `urllib.request` / timeout=10 |
| MC auth 戦略 | C (skip) | 本スクリプトでは MC を一切呼ばない |
| 既存 feedback observer | スキーマ継承 / 改修ゼロ | `category → suggested_card` マッピングを継承し、 TENMON 確定で knowledge を `IROHA-MC-CONNECTION-AUDIT-V1` に変更 |
| 統合フロー | 4 priority 階層 + 重複排除 + ソート | `integrate_candidates()` |
| 出力先 | `/opt/tenmon-automation/out/` | `_safe_mkdir` + 4 ファイル一括 write |

---

## 2. 目的とスコープ

### 2.1 目的
旧 VPS 上の doctor v2 出力 (`profile=old_vps`) と本番 `/api/feedback/history` を統合し、
**優先順位付きで次の Cursor カード候補を生成する**。

### 2.2 スコープ (in)
- Python3 stdlib only でスクリプトを実装 (本番 VPS 側 commit)
- TENMON が Mac 経由で旧 VPS にスクリプト配置 + 1 回手動実行
- `/opt/tenmon-automation/out/` に成果物 4 ファイル生成
- doctor v2 + feedback history の統合 + カード候補生成

### 2.3 スコープ (out)
- 自動実行 / systemd / cron / timer 登録: 一切なし
- 本番 VPS への変更: `automation/` への新規スクリプト + `docs/` 追加のみ
- 旧 VPS 既存サービス・timer・cron への変更: なし
- DB write / Notion write / migration / deploy: なし
- MC `/api/mc/vnext/*` 呼び出し: なし (戦略 C)
- スクリプトの 2 回以上連続実行: なし (DRYRUN は 1 回のみ)

---

## 3. 入力ソース (4 種、MC は使わない)

| # | 入力 | 場所 | 取得方法 |
| --- | --- | --- | --- |
| 1 | `doctor_v2_report_latest.json` | `<TENMON_DOCTOR_OUT_DIR>/` | ローカル read |
| 2 | `doctor_v2_next_card_suggestions.md` | `<TENMON_DOCTOR_OUT_DIR>/` | (任意 / JSON 側 `next_card_suggestions[]` で代替可) |
| 3 | `/api/feedback/history` | `<TENMON_FEEDBACK_HISTORY_URL>` | HTTPS GET / auth 不要 / timeout=10 |
| 4 | (任意) `/api/mc/vnext/*` | — | **使わない** (戦略 C) |

旧 VPS のデフォルト解決:
- `TENMON_DOCTOR_OUT_DIR` = `/opt/tenmon-automation/out`
- `TENMON_FEEDBACK_HISTORY_URL` = `https://tenmon-ark.com/api/feedback/history`

---

## 4. 出力ファイル (4 種)

すべて最後に一括 write (atomic policy)。すべて `<TENMON_FEEDBACK_LOOP_OUT_DIR>` 配下
(未設定なら `<TENMON_DOCTOR_OUT_DIR>` を継承)。

| # | ファイル | 内容 |
| --- | --- | --- |
| 1 | `feedback_history_latest.json` | `/api/feedback/history` の取得結果サマリーキャッシュ (本文展開なし / `head[:60]` + `sha8`) |
| 2 | `feedback_integration_latest.json` | 統合結果 (doctor + feedback / 候補リスト) |
| 3 | `feedback_integration_latest.md` | 人間向けレポート |
| 4 | `integrated_card_candidates_latest.md` | 優先順位付き card 候補リスト (TENMON 裁定用) |

(出力スキーマ詳細は親カード docs `DOCTOR_V2_OLD_VPS_FEEDBACK_INTEGRATION_V1.md` Section 7.3 参照。)

---

## 5. カテゴリ分類とキーワード

スクリプト内 `CATEGORY_KEYWORDS` (Python dict) で定義。`title + detail` を結合した
テキストにキーワードが含まれていれば該当カテゴリに分類。ヒット無しの場合は
API 側 `category` (日本語ラベル) をフォールバックヒントに使い、それでも該当無しなら `other`。

| カテゴリ | 主なキーワード (抜粋) |
| --- | --- |
| `chat_quality` | 答えが切れ / 短い / 途切れ / 詳しく / 長く話せ / 応答が短 / もっと話 |
| `tone` | 丁寧 / 敬語 / 言葉遣い / 口調 / やわらか / 断捨離 |
| `knowledge` | 言霊 / 宿曜 / カタカムナ / 天津金木 / 正典 / 法華経 / いろは / ことだま |
| `ui` | 見えない / ボタン / 画面 / Sidebar / PWA / 表示 / サイドバー / レイアウト / デザイン / ダッシュボード |
| `performance` | 遅い / 重い / 落ちる / 止まる / 応答が遅 / レスポンス |
| `bug` | エラー / 失敗 / おかしい / 動かない / クラッシュ / バグ / 不具合 |
| `other` | 上記すべてに該当しない |

API 側 `category` フォールバックヒント (一例 / 完全リストは
`API_CATEGORY_HINTS` 配列):

| API カテゴリ (日本語) | フォールバック先 |
| --- | --- |
| チャット | `chat_quality` |
| UI / デザイン / ダッシュボード | `ui` |
| 宿曜 / いろは / 言霊 | `knowledge` |
| 不具合 / 同期 / エラー | `bug` |
| 遅い / 重い | `performance` |
| 口調 / 敬語 / 断捨離 | `tone` |

### 5.1 プライバシー保護

- `title` / `detail` の **本文は出力ファイルに展開しない**
- `feedback_history_latest.json` の `items_summary[]` には `head[:60]` (最大 60 字)
  と `sha8` (SHA-256 先頭 8 字) のみ
- `priority` / `is_founder` / `created_at` / `api_category` (短縮) は格納

---

## 6. カテゴリ → suggested_card 対応表 (TENMON 確定)

```
chat_quality   → CARD-CHAT-QUALITY-OBSERVE-V1
tone           → CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1
knowledge      → CARD-IROHA-MC-CONNECTION-AUDIT-V1          ← TENMON 確定 (親カードでの裁定事項を解決)
ui             → CARD-PWA-UX-OBSERVE-V1
performance    → CARD-PERFORMANCE-OBSERVE-V1
bug            → CARD-BUG-TRIAGE-OBSERVE-V1
other          → CARD-FEEDBACK-TRIAGE-OBSERVE-V1
```

`knowledge` は親カード (FEEDBACK-INTEGRATION-V1) で「既存マッピング `KNOWLEDGE-COVERAGE-OBSERVE-V1`
vs 代替 `IROHA-MC-CONNECTION-AUDIT-V1`」が TENMON 裁定事項として残っていたが、
本カードで **`IROHA-MC-CONNECTION-AUDIT-V1` に確定**。

---

## 7. 優先順位ロジック

```
priority 1 (即時修復):
   doctor.verdict == "RED" の critical findings
     → area から修復カード名を推定 (CARD-DOCTOR-V2-REPAIR-<AREA>-V1)
   doctor.online_status.signals == 0
     → CARD-DOCTOR-V2-OLD-VPS-RESCUE-V1

priority 2 (観測者の連結性 + Founder 改善要望):
   doctor.online_status.signals が 1〜2
     → CARD-DOCTOR-V2-OLD-VPS-CONNECTIVITY-AUDIT-V1
   feedback by_category[cat] >= 3
     → CATEGORY_TO_CARD[cat] (Section 6 のマッピング)

priority 3 (doctor 自身の self-suggestion):
   doctor.next_card_suggestions[] をそのまま追加

priority 4 (TENMON 主線 boost / Section 8):
   CARD-IROHA-MC-CONNECTION-AUDIT-V1
   CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1
   ※ priority 1〜3 で既に出ていればスキップ、未出のみ追加

最終: 重複排除 + (priority asc, name asc) ソート
```

### 7.1 防御的挙動 (doctor 不在時)

`doctor_v2_report_latest.json` が読めなかった場合:
- `verdict` 系 priority 1 のロジックは findings 不在のためスキップ
- `online_signals` の int チェックも `None` なのでスキップ (RESCUE / CONNECTIVITY-AUDIT は出ない)
- feedback 由来候補 + TENMON boost のみが残る

---

## 8. TENMON 主線優先カード boost ロジック

```python
TENMON_PRIORITY_BOOSTS = {
    "CARD-IROHA-MC-CONNECTION-AUDIT-V1":     4,
    "CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1": 4,
}
```

これらは TENMON が「いろは / 断捨離」の主線として常に視野に入れたいカード。
priority 1〜3 で既に登場 (例: `knowledge` count ≥ 3 で
`CARD-IROHA-MC-CONNECTION-AUDIT-V1` が priority 2 に出る) していればスキップ。
**未出ならば** priority 4 で末尾に追加。これにより:

- feedback の文脈が薄い時でも TENMON 主線が候補リストに残る
- 文脈が濃い時 (例: knowledge=7) は priority 2 に昇格し、boost は省かれる

---

## 9. 実行手順 (Mac → 旧 VPS)

### Phase A — Cursor が本番 VPS で実装 + commit (本ドキュメント作成時に Cursor が実施)

```bash
cd /opt/tenmon-ark-repo
python3 -m py_compile automation/tenmon_feedback_loop_card_generator_v1.py

mkdir -p /tmp/feedback-loop-test-out
TENMON_FEEDBACK_LOOP_OUT_DIR=/tmp/feedback-loop-test-out \
TENMON_DOCTOR_OUT_DIR=/opt/tenmon-ark-repo/automation/out \
python3 automation/tenmon_feedback_loop_card_generator_v1.py generate
ls -la /tmp/feedback-loop-test-out/
rm -rf /tmp/feedback-loop-test-out

git add automation/tenmon_feedback_loop_card_generator_v1.py \
        docs/ark/feedback/FEEDBACK_LOOP_CARD_GENERATION_V1.md
git commit -m "feat(automation): FEEDBACK-LOOP-CARD-GENERATION-V1 - integrate doctor v2 + feedback history into prioritized card candidates (manual exec only, no auto, no systemd, MC strategy C)"
git log --oneline -1
git push origin feature/unfreeze-v4
```

### Phase B — TENMON が Mac から本番 VPS → 旧 VPS へ scp

```bash
mkdir -p ~/tenmon-feedback-loop-tmp

scp <PROD-VPS-HOST>:/opt/tenmon-ark-repo/automation/tenmon_feedback_loop_card_generator_v1.py \
    ~/tenmon-feedback-loop-tmp/

ssh root@<OLDVPS-HOST> 'mkdir -p /opt/tenmon-automation/feedback_loop'

scp ~/tenmon-feedback-loop-tmp/tenmon_feedback_loop_card_generator_v1.py \
    root@<OLDVPS-HOST>:/opt/tenmon-automation/feedback_loop/

ssh root@<OLDVPS-HOST> 'ls -la /opt/tenmon-automation/feedback_loop/'
```

### Phase C — TENMON が旧 VPS で 1 回だけ手動実行

```bash
ssh root@<OLDVPS-HOST> '
  python3 -m py_compile /opt/tenmon-automation/feedback_loop/tenmon_feedback_loop_card_generator_v1.py \
    && echo "py_compile OK"
'

ssh root@<OLDVPS-HOST> '
  cd /opt/tenmon-automation && \
  TENMON_DOCTOR_OUT_DIR=/opt/tenmon-automation/out \
  python3 /opt/tenmon-automation/feedback_loop/tenmon_feedback_loop_card_generator_v1.py generate
  echo "exit_code=$?"
' | tee ~/tenmon-feedback-loop-tmp/oldvps_feedback_loop_run.log
```

### Phase D — 出力確認

```bash
ssh root@<OLDVPS-HOST> 'ls -la /opt/tenmon-automation/out/'
ssh root@<OLDVPS-HOST> 'cat /opt/tenmon-automation/out/feedback_integration_latest.json | python3 -m json.tool | head -60'
ssh root@<OLDVPS-HOST> 'cat /opt/tenmon-automation/out/integrated_card_candidates_latest.md'
```

### Phase E — 副作用ゼロ確認 (Section 11)

### Phase F — 結果ログ提出

TENMON は Cursor に以下を貼る:
1. Phase A〜C の実行ログ
2. Phase D の出力 4 ファイルの内容
3. Phase E の副作用ゼロ確認

Cursor は受領後、本ドキュメントの `## 13. 期待される出力サンプル` 以降に
**実測結果** を反映して再 commit。

---

## 10. 旧 VPS 上の配置と 1 回手動実行

### 10.1 配置

```
/opt/tenmon-automation/
├── doctor_v2/
│   └── tenmon_doctor_v2.py            (PROFILE-V1 で配置済 / 既存)
├── feedback_loop/                       ← 新規ディレクトリ (Mac から mkdir)
│   └── tenmon_feedback_loop_card_generator_v1.py   ← 新規 scp 配置
└── out/                                  ← 既存 (doctor v2 出力)
    ├── doctor_v2_report_latest.json    (DRYRUN-V1-RETRY-V2 で生成済)
    ├── doctor_v2_report_latest.md       (同上)
    ├── doctor_v2_next_card_suggestions.md (同上)
    ├── feedback_history_latest.json    ← 新規 / 本カードで生成
    ├── feedback_integration_latest.json ← 新規 / 本カードで生成
    ├── feedback_integration_latest.md  ← 新規 / 本カードで生成
    └── integrated_card_candidates_latest.md ← 新規 / 本カードで生成
```

### 10.2 実行ユーザ
旧 VPS では `root` (旧 VPS の慣習)。本番 VPS では `tenmon` を想定。

### 10.3 実行回数
**1 回のみ**。失敗してもスクリプトは自動再試行しない。失敗ログを Phase F で提出。

### 10.4 実行コマンド (env override 含む)

```bash
TENMON_DOCTOR_OUT_DIR=/opt/tenmon-automation/out \
python3 /opt/tenmon-automation/feedback_loop/tenmon_feedback_loop_card_generator_v1.py generate
```

(`TENMON_FEEDBACK_LOOP_OUT_DIR` を別指定する場合のみ追加)

---

## 11. 副作用ゼロ確認手順

### 11.1 旧 VPS 側 (Mac から ssh で確認)

```bash
ssh root@<OLDVPS-HOST> '
  echo "--- existing tenmon services ---"
  systemctl is-active tenmon-ark-api.service 2>/dev/null || echo "(not present)"
  systemctl is-active tenmon-nas-watch.service 2>/dev/null || echo "(not present)"
  systemctl is-active nginx 2>/dev/null || echo "(not present)"

  echo "--- new feedback-loop service / timer / cron should NOT exist ---"
  systemctl list-units --type=service --no-pager | grep -i feedback || echo "no feedback service (expected)"
  systemctl list-timers --no-pager | grep -i feedback || echo "no feedback timer (expected)"
  crontab -l 2>/dev/null | grep -i feedback || echo "no feedback cron (expected)"

  echo "--- /opt 既存資産は不変 ---"
  stat -c "%y %n" /opt/tenmon-ark-repo /opt/tenmon-ark-data /opt/tenmon-automation/tenmon-ark 2>/dev/null
'
```

### 11.2 本番 VPS 側

```bash
stat -c '%y' /opt/tenmon-ark-data/kokuzo.sqlite
journalctl -u tenmon-ark-api.service --since "30 minutes ago" --no-pager | tail -5
systemctl is-active nginx
systemctl is-active tenmon-ark-api.service
git status --short | grep -v '^?? ' || echo "(no tracked changes)"
```

### 11.3 期待値
- 旧 VPS の既存サービスはすべて active のまま (本番 API / NAS watch / nginx 等)
- 旧 VPS に `feedback-loop*` という service / timer / cron は **存在しない**
- 本番 VPS の `kokuzo.sqlite` mtime は本カード実行前後で変化なし
- 本番 VPS で nginx / tenmon-ark-api.service は active

---

## 12. 失敗時 rollback 手順

旧 VPS (Mac から ssh):

```bash
ssh root@<OLDVPS-HOST> '
  rm -f /opt/tenmon-automation/out/feedback_history_latest.json
  rm -f /opt/tenmon-automation/out/feedback_integration_latest.json
  rm -f /opt/tenmon-automation/out/feedback_integration_latest.md
  rm -f /opt/tenmon-automation/out/integrated_card_candidates_latest.md
  rm -f /opt/tenmon-automation/feedback_loop/tenmon_feedback_loop_card_generator_v1.py
  rmdir /opt/tenmon-automation/feedback_loop/ 2>/dev/null || true
  echo "--- existing services unchanged ---"
  systemctl is-active tenmon-ark-api.service 2>/dev/null || echo "(not present)"
  systemctl is-active tenmon-nas-watch.service 2>/dev/null || echo "(not present)"
'
```

本番 VPS は `git revert` で対応 (TENMON 裁定後のみ / 自動 revert は禁止):

```bash
cd /opt/tenmon-ark-repo
# git revert <COMMIT-ID>   （TENMON 裁定後のみ）
```

doctor v2 出力 (旧 VPS の `doctor_v2_report_latest.*`) は **削除しない**
(別カードで再利用するため)。

---

## 13. 期待される出力サンプル (本番 VPS env override テスト実測)

Phase A の env override テストで確認した結果 (本番 VPS / `/tmp/feedback-loop-test-out` /
doctor 不在シナリオ):

```
[feedback-loop] doctor_available=False
[feedback-loop] doctor_verdict=None
[feedback-loop] doctor_profile=None
[feedback-loop] online_signals=None
[feedback-loop] feedback_status=200
[feedback-loop] feedback_count=46
[feedback-loop] candidates=4
```

`integrated_card_candidates`:

| priority | name | source | reason |
| --- | --- | --- | --- |
| P2 | `CARD-CHAT-QUALITY-OBSERVE-V1` | feedback_history | feedback chat_quality count=22 |
| P2 | `CARD-IROHA-MC-CONNECTION-AUDIT-V1` | feedback_history | feedback knowledge count=7 |
| P2 | `CARD-PWA-UX-OBSERVE-V1` | feedback_history | feedback ui count=15 |
| P4 | `CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1` | tenmon_priority | TENMON main-line boost |

API 側 `category` 分布 (実測 / 46 件 / 本文非展開):

```
チャット機能: 24
UI/デザイン:   9
宿曜鑑定:      5
スマホ使用感:  2
UI/UX:        2
表示・動作の不具合: 1
ダッシュボード: 1
同期:          1
その他:        1
```

スクリプト分類 (本番 VPS 実測):

```
chat_quality: 22
ui:           15
knowledge:     7
performance:   1
other:         1
```

**旧 VPS 模擬シナリオ** (doctor あり / `profile=old_vps` / `signals=4` / `verdict=YELLOW` /
`next_card_suggestions=[FEEDBACK-INTEGRATION-V1, FEEDBACK-LOOP-CARD-GENERATION-V1]`):

| priority | name | source |
| --- | --- | --- |
| P2 | `CARD-CHAT-QUALITY-OBSERVE-V1` | feedback_history |
| P2 | `CARD-IROHA-MC-CONNECTION-AUDIT-V1` | feedback_history |
| P2 | `CARD-PWA-UX-OBSERVE-V1` | feedback_history |
| P3 | `CARD-DOCTOR-V2-OLD-VPS-FEEDBACK-INTEGRATION-V1` | doctor_v2 (self-suggestion) |
| P3 | `CARD-FEEDBACK-LOOP-CARD-GENERATION-V1` | doctor_v2 (self-suggestion) |
| P4 | `CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1` | tenmon_priority |

→ `RESCUE-V1` / `CONNECTIVITY-AUDIT-V1` は signals=4 のため **出ない**。

(実旧 VPS 実行結果は Phase F 提出後にここを更新。)

---

## 14. 残課題と次カード

### 14.1 残課題

- 本番 `/api/feedback/history` が `?since=` 未対応 (件数 1000+ で重くなったら本番 API 改修カードを別途起票)
- 本スクリプトは MC を使わない (戦略 C / `auth_strategy: "C"` を JSON に明示)
- 既存 `tenmon_feedback_observer_v1.py` は **改修ゼロ** で本スクリプトと共存
- 旧 VPS では `feedback_history_<TS>.json` の履歴ローテーションは未実装
  (latest 上書きのみ)

### 14.2 次カード候補

```
A. integrated_card_candidates_latest.md の P1〜P3 から TENMON が選択 (推奨)
   → 想定:
     - CARD-IROHA-MC-CONNECTION-AUDIT-V1     (knowledge 主線)
     - CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1 (tone / 断捨離主線)
     - CARD-CHAT-QUALITY-OBSERVE-V1            (chat_quality 主線)
     - CARD-PWA-UX-OBSERVE-V1                  (ui 主線)

B. CARD-FEEDBACK-LOOP-CARD-GENERATION-AUTOMATE-V1
   → 同スクリプトを systemd timer 化する設計 (実装は別カード)
   → READ-ONLY 設計のみ

C. CARD-DOCTOR-V2-OLD-VPS-SCHEDULE-DESIGN-V1
   → doctor v2 + feedback-loop の同時 schedule 設計

D. 本カード追補 (出力に問題があった場合の修正カード)
```

---

## 15. TENMON 裁定用まとめ

### 15.1 本カードの結論 (実装確定事項)

| 項目 | 確定内容 |
| --- | --- |
| スクリプト本体 | `automation/tenmon_feedback_loop_card_generator_v1.py` (Python3 stdlib only) |
| docs | 本ファイル (`docs/ark/feedback/FEEDBACK_LOOP_CARD_GENERATION_V1.md`) |
| 環境変数 (任意 / 既存活用) | `TENMON_DOCTOR_OUT_DIR` / `TENMON_FEEDBACK_LOOP_OUT_DIR` / `TENMON_FEEDBACK_HISTORY_URL` |
| MC 戦略 | C (skip / 本スクリプトでは呼ばない) |
| `knowledge` のカード割り当て | **`CARD-IROHA-MC-CONNECTION-AUDIT-V1`** (TENMON 確定) |
| TENMON 主線 boost | `IROHA-MC-CONNECTION-AUDIT-V1` / `DANSHARI-CORPUS-SOURCE-OBSERVE-V1` を priority 4 で末尾追加 |
| 副作用 | 本番 VPS への変更: `automation/` 1 ファイル + `docs/` 1 ファイル / 旧 VPS 既存サービス: 不変 / DB write: ゼロ / Notion write: ゼロ / systemd 登録: ゼロ |

### 15.2 推奨ルート

**A. `integrated_card_candidates_latest.md` の上位 (P1〜P3) から TENMON が次カードを選択**

旧 VPS 実行で得られる候補は (Section 13 模擬) 上位 3 件が priority 2 で並ぶ:
- `CARD-CHAT-QUALITY-OBSERVE-V1`
- `CARD-IROHA-MC-CONNECTION-AUDIT-V1`
- `CARD-PWA-UX-OBSERVE-V1`

TENMON 想定: いろは / 断捨離主線を尊重し
**`CARD-IROHA-MC-CONNECTION-AUDIT-V1`** へ進行。

---

## ロードマップ位置付け

```
Phase 3a: CARD-DOCTOR-V2-PATH-ENV-OVERRIDE-V1                           [PASS]
Phase 3c: CARD-DOCTOR-V2-OLD-VPS-PROFILE-V1                             [PASS]
Phase 3d: CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY-V2                     [PASS / signals=4]
Phase 3e: CARD-DOCTOR-V2-OLD-VPS-FEEDBACK-INTEGRATION-V1                [PASS / 921cda86]
Phase 4 : CARD-FEEDBACK-LOOP-CARD-GENERATION-V1                         ← 本カード
Phase 5 : CARD-IROHA-MC-CONNECTION-AUDIT-V1                              (candidate に応じて)
Phase 6 : CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1                          (candidate に応じて)
```

将来 Phase:
- `CARD-FEEDBACK-LOOP-CARD-GENERATION-AUTOMATE-V1` (systemd 化)
- `CARD-DOCTOR-V2-OLD-VPS-SCHEDULE-DESIGN-V1`
- `CARD-DOCTOR-V2-OLD-VPS-MC-AUTH-DESIGN-V1` (戦略 A 採用時)
