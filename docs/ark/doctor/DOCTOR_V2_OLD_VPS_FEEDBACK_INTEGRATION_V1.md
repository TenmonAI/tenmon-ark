# DOCTOR-V2-OLD-VPS-FEEDBACK-INTEGRATION-V1

旧 4GB VPS 上の `doctor v2 (old_vps profile)` の出力を、Founder 改善要望
(`/api/feedback/history`) / 既存 `feedback-loop observer` / (任意で) MC 状態
(`/api/mc/vnext/*`) と接続し、次カード生成パイプラインに供給するための
**設計記録** (OBSERVE / 設計のみ / 実装は次カード)。

- カード ID: `CARD-DOCTOR-V2-OLD-VPS-FEEDBACK-INTEGRATION-V1`
- 種別: OBSERVE / 設計カード（write 一切なし）
- 対象: `docs/ark/doctor/DOCTOR_V2_OLD_VPS_FEEDBACK_INTEGRATION_V1.md` のみ新規作成
- 旧 VPS への新規 write: 0 / 本番 VPS への変更: 0 / systemd 登録: 0
- 親カード履歴:
  - `CARD-DOCTOR-V2-PATH-ENV-OVERRIDE-V1` (commit `eec9c76e` / PASS)
  - `CARD-DOCTOR-V2-OLD-VPS-PROFILE-V1` (commit `74e9e39a` 初版 + `3521619a` 補正版 / PASS)
  - `CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY-V2` (PASS / `profile=old_vps` / `verdict=YELLOW` / `signals=4`)
  - `CARD-FEEDBACK-LOOP-CARD-GENERATION-OBSERVE-V1` (commit `57e38c5c` / PASS / 46 件 / Notion 20+)

---

## 1. 背景と前提 (DRYRUN-V1-RETRY-V2 の結果引用)

旧 VPS で `TENMON_DOCTOR_PROFILE=old_vps` 付き doctor v2 を実行した RETRY-V2 結果:

| 項目 | 値 |
| --- | --- |
| profile | `old_vps` |
| verdict | `YELLOW` |
| critical | 0 |
| warn | 2 |
| info | 6+ (PROFILE-V1 で `_level_for_missing_local` により降格) |
| online_status.signals | **4 / 4** (api_health / chat_probe / pwa_root / pwa_evolution すべて 200) |
| online_status.label | `online` |
| next_card_suggestions | `["CARD-DOCTOR-V2-OLD-VPS-FEEDBACK-INTEGRATION-V1", "CARD-FEEDBACK-LOOP-CARD-GENERATION-V1"]` |

→ 旧 VPS は **観測基地として完全に機能** している。本カードはこの観測点を
Founder feedback ループに接続するための「データ路線」を確定させる。

### 既知の境界条件

- 旧 VPS には `kokuzo.sqlite` / `mc_intelligence_fire.jsonl` / `evolution_log_v1.ts` /
  PWA assets bundle が存在しない (本番 VPS 専用) → これらは old_vps profile で
  すでに `info` に降格済み
- 旧 VPS から本番 `/api/mc/vnext/claude-summary` / `/api/mc/vnext/intelligence` は
  `with_auth=True` で叩いており、bearer token 不在のため **401** を返す (RETRY-V2 実測)
- 本番 `/api/feedback/history` は **公開** (auth 不要 / 公開 API / 46 件)

### 規律 (再掲)

- READ-ONLY (双方向)
- systemd / cron / timer 登録禁止 (双方向)
- 旧 VPS 既存サービス変更禁止
- 本カードでの新規 write: 本 docs 1 ファイルのみ
- token / API key / IP / ssh 鍵パスを docs / log / commit に出さない

---

## 2. 旧 VPS doctor v2 出力ファイル構造とスキーマ

旧 VPS `/opt/tenmon-automation/out/` 配下に doctor v2 が生成する 3 ファイル:

```
/opt/tenmon-automation/out/doctor_v2_report_latest.json
/opt/tenmon-automation/out/doctor_v2_report_latest.md
/opt/tenmon-automation/out/doctor_v2_next_card_suggestions.md
```

これらは `TENMON_DOCTOR_OUT_DIR` の解決先であり、本番 VPS の同名ファイル
(`automation/out/doctor_v2_report_latest.*`) と **同じスキーマ** を共有する。
profile が違うだけ (`profile: "old_vps"` vs `"default"`)。

### 2.1 doctor_v2_report_latest.json (top-level keys)

本番 VPS 実測 (`v2.0.0-phase1` / 2026-04-26) と RETRY-V2 結果からの統合スキーマ:

```
doctor_version       : str   "v2.0.0-phase1"
profile              : str   "default" | "old_vps"
generated_at         : str   ISO 8601 UTC
verdict              : str   "GREEN" | "YELLOW" | "RED"
summary              : { critical: int, warn: int, info: int }
online_status        : { signals: 0..4, label: "online"|"partial"|"offline" }   ★ profile 共通
git                  : { branch, commit, dirty_count, untracked_count, ahead, behind }
api                  : { health, claude_summary, intelligence, chat_probe }
pwa                  : { pwa_root, pwa_evolution, pwa_no_slash, bundle_path, bundle_entry_hits, sidebar_link_hit }
db                   : { memory_units_total, kotodama_units, thread_center_memory,
                          persona_knowledge_bindings, thread_persona_links,
                          persona_profiles, sacred_corpus_registry }
safety               : { auto_patch, watchdog, mc_collect_timers,
                          denylist_path, denylist_exists,
                          auto_runner_exists, auto_runner_denylist_wired }
prompt_trace         : { khs_constitution, kotodama_constitution_v1,
                          kotodama_constitution_memory, response_length,
                          route_reason, provider, ts, source }
evolution            : { entry_ids, expected_top4, bundle_top4_hits }
next_card_suggestions: list[str]
findings             : list[ { level, area, message } ]
```

`api.*.status` / `pwa.*.status` の値は HTTP status code (200 / 404 / 401 等)。
旧 VPS では `db` / `prompt_trace` / `evolution` 系の値はほぼ未取得 (None) で、
それらは `findings` に level=info として記録される。

### 2.2 doctor_v2_report_latest.md (見出し構造)

```
# TENMON-ARK Doctor v2 Report (Phase 1)

- generated_at: ...
- doctor_version: ...
- profile: ...                    ← PROFILE-V1 で追加
- verdict: ...
- summary: critical=N / warn=N / info=N

## 1. git
## 2. api
## 3. pwa
## 4. db
## 5. safety
## 6. prompt_trace
## 7. evolution
## 8. Next card suggestions
```

feedback-integration では本 MD は人間用とみなし、機械処理は JSON 経由で行う。

### 2.3 doctor_v2_next_card_suggestions.md (構造)

```
# Doctor v2 — next card suggestions

- generated_at: `<ISO>`
- verdict: **<GREEN/YELLOW/RED>**
- critical: <N> / warn: <N> / info: <N>

## Suggestions

- <CARD-NAME-1>
- <CARD-NAME-2>

## Findings (driving the suggestion)

- [<level>] [<area>] <message>
- ...
```

JSON 側にも `next_card_suggestions: list[str]` で同等情報があるため、機械処理は
JSON のみで完結する。MD は TENMON のレビュー / Founder 共有用。

---

## 3. doctor_v2_report_latest.json の一次入力項目 (feedback-integration)

次段の feedback-integration が doctor v2 から取り込む項目を **必要最小限** に絞る:

| 項目 | 用途 |
| --- | --- |
| `profile` | `old_vps` / `default` を区別。old_vps のみ統合パスへ |
| `generated_at` | 取得時刻ベースで stale 判定 (例: 24h 以内) |
| `verdict` | RED → 修復系を最優先 |
| `summary.critical` | RED 強度 |
| `summary.warn` | YELLOW 強度 |
| `online_status.signals` | 観測基地の到達性 (0..4) — 補正版 PROFILE-V1 で hard gate |
| `online_status.label` | online / partial / offline ラベル |
| `next_card_suggestions` | doctor v2 自身の推薦リスト (一次候補) |
| `findings[].{level,area,message}` | level ≥ warn のみ拾う |

二次入力 (任意 / 統合ロジックでのフィルタに使う場合のみ):

| 項目 | 用途 |
| --- | --- |
| `api.health.status` / `api.chat_probe.status` | online_signals の根拠 |
| `api.claude_summary.status` / `api.intelligence.status` | MC auth 戦略の判定 (401 検知) |
| `pwa.pwa_root.status` / `pwa.pwa_evolution.status` | PWA 観測の到達性 |

二次入力は集計に使うのみで、findings の置き換えはしない (doctor v2 の判定を尊重する)。

---

## 4. 本番 `/api/feedback/history` の取得方式と保存先

### 4.1 endpoint 仕様 (実測 / 2026-04-26)

```
$ curl -sI -m 10 https://tenmon-ark.com/api/feedback/history
HTTP/2 200
content-type: application/json; charset=utf-8
content-length: 42150
x-powered-by: Express
access-control-allow-origin: *
```

| 項目 | 値 |
| --- | --- |
| HTTP status | 200 |
| 認証 | **不要** (`access-control-allow-origin: *` / 公開 API) |
| Content-Length | 約 42KB (現時点 46 件) |
| ?since= / ?limit= | **未対応** (limit=1 を渡しても同サイズが返る) |

### 4.2 レスポンス スキーマ

```json
{
  "ok": true,
  "items": [
    {
      "title": "...",
      "category": "...",
      "detail": "...",
      "priority": "...",
      "receiptNumber": "...",
      "isFounder": true,
      "device": "...",
      "notionSaved": true,
      "notionPageId": "...",
      "createdAt": "..."
    }
    /* ... 46 件 */
  ],
  "count": 46
}
```

(プライバシー: `title` / `detail` の本文は docs に展開しない / 個人情報を含む可能性あり)

### 4.3 取得方式の推奨

| 方式 | コスト | API 改修 | 推奨度 |
| --- | --- | --- | --- |
| 単発取得 (1 リクエスト全件) | 約 42KB / 1 RTT / DB クエリ 1 回 | 不要 | **★ 推奨** |
| 増分取得 (`?since=`) | 軽量 | **必要** (現状未対応) | 将来候補 |
| 全量取得 (現状と同じ) | 同上 (現状単発取得 = 全量取得) | 不要 | 採用 |

→ **当面は単発取得**。レスポンス約 42KB / 件数増 (1000+) で重くなった段階で
`?since=` を本番 API に追加するカードを別途起票する。

### 4.4 旧 VPS 側保存先 (設計のみ / 本カードでは write しない)

```
/opt/tenmon-automation/out/feedback_history_latest.json   ← 直近 GET 結果のキャッシュ (上書き)
/opt/tenmon-automation/out/feedback_history_<TS>.json     ← 履歴 (任意 / ローテーション要)
```

- `latest` は常に最新で上書き (mtime ベースで stale 判定)
- 履歴はローテーション設計を次カードで決める (例: 30 日 / 30 ファイル上限)
- 容量見積もり: 42KB × 30 = 約 1.3MB (軽微)

---

## 5. 本番 `/api/mc/vnext/*` の auth 戦略 (A / B / C と推奨 C)

doctor v2 RETRY-V2 で `claude_summary` / `intelligence` は 401 (旧 VPS に bearer token なし)。
本カードでは戦略のみ確定し、実装は持ち越す。

### 5.1 戦略 A: bearer token を旧 VPS に持ち込む

| 項目 | 内容 |
| --- | --- |
| メリット | MC 完全データ取得 / iroha clause / persona binding / coverage_ratio 等 |
| デメリット | token を旧 VPS に置くセキュリティ負担 |
| 配置 | `/opt/tenmon-automation/secrets/mc_token` (mode 600 / root のみ) |
| env | `TENMON_MC_BEARER_TOKEN` |
| 別途必要カード | `CARD-DOCTOR-V2-OLD-VPS-MC-AUTH-DESIGN-V1` |

### 5.2 戦略 B: 本番 VPS 側に旧 VPS 用ミラー endpoint

| 項目 | 内容 |
| --- | --- |
| メリット | 旧 VPS に token を置かなくて済む |
| デメリット | **本番 API 改修必要 (本カード規定で禁止)** |
| 採用 | 不可 |

### 5.3 戦略 C: MC データを使わずに進める ★ 推奨

| 項目 | 内容 |
| --- | --- |
| メリット | 認証不要 / 本番 API 改修不要 / 旧 VPS シンプル |
| デメリット | iroha clause coverage / enforcer verdict が直接見えない |
| 補完 | doctor v2 自身が `claude_summary.status` / `intelligence.status` を JSON に記録するため、401 という事実は取れる |

**短期は C で進める**。MC 数値が必要になった時点で別カードで A を設計。

### 5.4 C 採用時の影響

- doctor v2 old_vps profile はすでに 401 を `cs.get("ok") == False` 経路で
  finding 化していない (`PROFILE-V1` で既存挙動のまま) → **影響ゼロ**
- feedback-integration も MC 未取得を warn ではなく info で扱う契約
- 統合カード生成は doctor v2 + feedback history の 2 ソースのみで成立

---

## 6. 既存 feedback observer の再利用範囲

### 6.1 既存資産 `automation/tenmon_feedback_observer_v1.py` の構造

本番 VPS で実装済 (28612 bytes)。出力スキーマ (実測):

```
observer_version: "v1.0.0-phase1"
generated_at    : ISO
verdict         : YELLOW
summary         : { critical, warn, info }
db              : { tables_found, tables_detail }                ← kokuzo 観測 (旧 VPS では skip)
notion          : { token_present, feedback_db, task_db }        ← NOTION_TOKEN があれば動く
api             : { endpoints_checked: [
                      { url: "https://tenmon-ark.com/api/feedback/history", status: 200, row_count_if_any: 46 },
                      { url: ".../api/feedback/list", status: 404, ... },
                      { url: ".../api/founder/requests", status: 404, ... }
                    ] }
classification  : { by_category, total_observed }
loop_health     : { evolution_entries, commits_last_7d, doctor_v2_last_verdict }
card_candidates : list[ { category, count, suggested_card } ]
findings        : list[ { level, area, message } ]
```

**既に `loop_health.doctor_v2_last_verdict` で doctor v2 と統合済み**。
本カードの統合は **その逆向き** (doctor v2 の出力を card 候補生成パイプラインに繋ぐ)。

### 6.2 既存カテゴリマッピング (実装済 / 尊重)

```
chat_quality  → CARD-CHAT-QUALITY-OBSERVE-V1
knowledge     → CARD-KNOWLEDGE-COVERAGE-OBSERVE-V1
ui            → CARD-UI-USABILITY-OBSERVE-V1
tone          → CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1
performance   → CARD-CHAT-PERFORMANCE-OBSERVE-V1
bug           → CARD-CHAT-BUG-TRIAGE-OBSERVE-V1
other         → (suggested_card 無し)
```

**重要 / TENMON 裁定事項**: 親カードでは `knowledge → CARD-IROHA-MC-CONNECTION-AUDIT-V1` という
代替マッピングも提示されている。これは既存 feedback observer のマッピングと **異なる**。
本カードではこの差異を docs に記録するに留め、最終マッピングは次カード
`CARD-FEEDBACK-LOOP-CARD-GENERATION-V1` で TENMON 裁定。両方を出して優先順位で並べる選択肢もある。

### 6.3 旧 VPS への移植可否

| 観測項目 | 旧 VPS での動作 | 対応 |
| --- | --- | --- |
| DB 観測 (`kokuzo.sqlite`) | DB 不在 → tables_found=0 | env でスキップ可能化を次カードで判断 |
| Notion 観測 | `NOTION_TOKEN` があれば動作 | env 持ち込みで実行可能 (本カード対象外) |
| API 観測 (`/api/feedback/history` 等) | HTTPS GET → 動作可能 | そのまま流用 |
| 分類 / card_candidates 生成 | pure logic → 動作可能 | そのまま流用 |

→ 既存 `tenmon_feedback_observer_v1.py` は **env 渡しのみで旧 VPS でも動作する可能性が高い**。
ただし旧 VPS への配布 / 起動は **次カード以降** で判断 (本カードは設計のみ)。

### 6.4 再利用方針 (本カード裁定)

- **既存スクリプトは改修しない** (PROFILE-V1 で確立した「default 完全維持」原則を尊重)
- 旧 VPS 用は別ラッパー or 既存スクリプトを env で動かすか、を次カードで判断
- 既存 `card_candidates` スキーマ (`{category, count, suggested_card}`) を **継承**
- 既存カテゴリマッピングを **第一候補** とし、IROHA 系の代替マッピングは TENMON 裁定で追加

---

## 7. データ統合フロー (入力 → 中間処理 → 出力)

### 7.1 入力 (旧 VPS / read-only)

```
[1] /opt/tenmon-automation/out/doctor_v2_report_latest.json
    └ 2.1 のスキーマ / profile=old_vps / 領域 3 の一次入力項目を抽出

[2] /opt/tenmon-automation/out/doctor_v2_next_card_suggestions.md
    └ 機械処理は [1] の next_card_suggestions で代替可 / MD は人間用

[3] https://tenmon-ark.com/api/feedback/history   (HTTPS GET / auth 不要)
    └ items[] / count

[4] (任意) https://tenmon-ark.com/api/mc/vnext/intelligence   (戦略 C → skip)
[5] (任意) https://tenmon-ark.com/api/mc/vnext/claude-summary (戦略 C → skip)
```

### 7.2 中間処理 (旧 VPS / 設計のみ / 実装は次カード)

```
A. doctor_v2_view = {
     profile: old_vps,
     verdict: YELLOW,
     online_signals: 4,
     critical: 0, warn: 2,
     self_suggestions: [...],
     critical_findings: [...],
     warn_findings: [...]
   }

B. feedback_view = {
     total: 46,
     by_category: {chat_quality: N, knowledge: N, ui: N, tone: N,
                   performance: N, bug: N, other: N},
     by_priority: {high: N, mid: N, low: N},
     by_status:   { 受付: N, 対応中: N, 完了: N }   ← Notion 同期があれば
     last_7d:     N
     founder_only_count: N
   }

C. (任意 / 戦略 C で skip) mc_view = {...}

統合方針 (擬似):
   1. doctor_v2.verdict == "RED" → critical findings から修復系カードを最優先で出す
   2. doctor_v2.online_signals < 3 → 観測基地の rescue / connectivity-audit を最優先
   3. feedback_view.by_category の上位カテゴリから suggested_card を候補化
   4. doctor_v2.next_card_suggestions を候補に統合
   5. 重複排除 + 優先度ソート
```

### 7.3 出力 (旧 VPS / 設計のみ / 本カードでは write しない)

```
/opt/tenmon-automation/out/feedback_integration_latest.json
  {
    "integration_version": "v1.0.0",
    "generated_at": ...,
    "sources_used": ["doctor_v2", "feedback_history"],
    "doctor_v2_summary": { profile, verdict, online_signals, critical, warn,
                            self_suggestions },
    "feedback_summary":  { total, by_category, by_priority, last_7d, founder_only_count },
    "integrated_card_candidates": [
        { priority: 1, name: "...", reason: "...", source: "doctor_v2" },
        { priority: 2, name: "...", reason: "...", source: "feedback_history" },
        ...
    ],
    "findings_combined": [...]
  }

/opt/tenmon-automation/out/feedback_integration_latest.md
  └ 上を人間用に整形

/opt/tenmon-automation/out/integrated_card_candidates_latest.md
  └ 候補のみを並べた短い MD (TENMON 裁定用)
```

---

## 8. 統合カード生成ロジック (設計案)

### 8.1 優先度の階層

```
priority 1 (即時修復):
   doctor_v2.verdict == "RED" の critical findings からの修復カード
   doctor_v2.online_signals == 0 → CARD-DOCTOR-V2-OLD-VPS-RESCUE-V1

priority 2 (観測者の連結性):
   doctor_v2.online_signals == 1〜2 → CARD-DOCTOR-V2-OLD-VPS-CONNECTIVITY-AUDIT-V1
   doctor_v2.verdict == "YELLOW" の warn findings から observe カード

priority 3 (Founder 改善要望系):
   feedback_view.by_category の上位 (count >= 3) から suggested_card を候補化

priority 4 (doctor 自身の self-suggestions):
   doctor_v2.next_card_suggestions をそのまま追加

priority 5 (重複排除 + 統合 + 出力):
   同名カードの重複は最高 priority のものを採用
   priority -> count の二段ソート
```

### 8.2 設計案コード (next-card 実装の参考 / 本カードでは実装しない)

```python
def integrate_card_candidates(doctor_v2: dict,
                              feedback: dict,
                              mc: dict | None = None) -> list[dict]:
    """設計のみ。実装は CARD-FEEDBACK-LOOP-CARD-GENERATION-V1 で行う。"""
    candidates: list[dict] = []

    # 1. doctor v2 RED → 即時修復系
    if doctor_v2.get("verdict") == "RED":
        for f in doctor_v2.get("findings", []):
            if f.get("level") == "critical":
                candidates.append({
                    "priority": 1,
                    "name": _suggest_repair_card(f.get("area")),
                    "reason": f"doctor RED: {f.get('message')}",
                    "source": "doctor_v2",
                })

    # 2. doctor v2 観測基地の連結性
    online = (doctor_v2.get("online_status") or {}).get("signals", 0)
    if online == 0:
        candidates.append({"priority": 1,
                           "name": "CARD-DOCTOR-V2-OLD-VPS-RESCUE-V1",
                           "reason": "online_signals=0",
                           "source": "doctor_v2"})
    elif online <= 2:
        candidates.append({"priority": 2,
                           "name": "CARD-DOCTOR-V2-OLD-VPS-CONNECTIVITY-AUDIT-V1",
                           "reason": f"online_signals={online}",
                           "source": "doctor_v2"})

    # 3. feedback カテゴリ別 (既存 feedback observer のマッピングを踏襲)
    by_cat = (feedback.get("by_category") or {})
    for cat, n in by_cat.items():
        if n < 3:
            continue
        card = _CATEGORY_TO_CARD.get(cat)
        if card:
            candidates.append({"priority": 3,
                               "name": card,
                               "reason": f"feedback {cat} count={n}",
                               "source": "feedback_history"})

    # 4. doctor v2 self-suggestions
    for s in (doctor_v2.get("next_card_suggestions") or []):
        candidates.append({"priority": 4,
                           "name": s,
                           "reason": "doctor_v2 self-suggestion",
                           "source": "doctor_v2"})

    # 5. 重複排除 (priority 最小を残す) + ソート
    return _dedupe_and_sort(candidates)


_CATEGORY_TO_CARD = {
    "chat_quality": "CARD-CHAT-QUALITY-OBSERVE-V1",
    "knowledge":    "CARD-KNOWLEDGE-COVERAGE-OBSERVE-V1",   # ★ TENMON 裁定要
    "ui":           "CARD-UI-USABILITY-OBSERVE-V1",
    "tone":         "CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1",
    "performance":  "CARD-CHAT-PERFORMANCE-OBSERVE-V1",
    "bug":          "CARD-CHAT-BUG-TRIAGE-OBSERVE-V1",
}


def _suggest_repair_card(area: str | None) -> str:
    a = (area or "general").upper()
    return f"CARD-DOCTOR-V2-REPAIR-{a}-V1"
```

### 8.3 TENMON 裁定要点

- `knowledge` カテゴリの suggested_card は既存マッピング (`KNOWLEDGE-COVERAGE-OBSERVE-V1`) と
  親カードの代替案 (`IROHA-MC-CONNECTION-AUDIT-V1`) のいずれを採用するか
- `priority 4` (doctor self-suggestions) を `priority 3` (feedback) より下げてよいか、
  逆転させるか
- 重複時の reason マージ方式 (最高 priority のみか、すべて concat か)

---

## 9. 旧 VPS 側出力ファイルの保存先と容量見積もり

### 9.1 保存先ポリシー

| ファイル | パス | 上書き / 履歴 |
| --- | --- | --- |
| feedback history キャッシュ | `/opt/tenmon-automation/out/feedback_history_latest.json` | 上書き |
| feedback history 履歴 (任意) | `/opt/tenmon-automation/out/feedback_history_<TS>.json` | ローテーション (次カードで設計) |
| 統合 JSON | `/opt/tenmon-automation/out/feedback_integration_latest.json` | 上書き |
| 統合 MD | `/opt/tenmon-automation/out/feedback_integration_latest.md` | 上書き |
| 統合 候補のみ MD | `/opt/tenmon-automation/out/integrated_card_candidates_latest.md` | 上書き |

doctor v2 出力と **同一ディレクトリ (`/opt/tenmon-automation/out/`)** に同居。
prefix の差異 (`doctor_v2_*` vs `feedback_history_*` / `feedback_integration_*` /
`integrated_card_candidates_*`) で衝突なし。

### 9.2 容量見積もり

| ファイル | 1 回あたり | 30 日累積 (履歴含む場合) |
| --- | --- | --- |
| feedback_history_latest.json | 約 42KB | 約 1.3MB |
| feedback_integration_latest.json | 約 50〜80KB (推定) | 約 2.5MB |
| feedback_integration_latest.md | 約 10〜20KB | 約 0.6MB |
| integrated_card_candidates_latest.md | 約 2〜5KB | 約 0.15MB |

合計 30 日 4.5MB 程度 (旧 VPS 4GB / 既存使用 25% から見て **軽微**)。

### 9.3 既存 doctor v2 出力との衝突確認

```
doctor_v2_report_latest.json
doctor_v2_report_latest.md
doctor_v2_next_card_suggestions.md
feedback_history_latest.json              ← 新規
feedback_history_<TS>.json                ← 新規 (任意)
feedback_integration_latest.json          ← 新規
feedback_integration_latest.md            ← 新規
integrated_card_candidates_latest.md      ← 新規
```

ファイル名 prefix で完全分離 → 衝突なし。

---

## 10. 新規追加予定の環境変数 (次カードで実装)

| env 変数 | 必須 | 既定値 | 用途 |
| --- | --- | --- | --- |
| `TENMON_DOCTOR_OUT_DIR` | (既存) | `<REPO_ROOT>/automation/out` | 旧 VPS では `/opt/tenmon-automation/out` に override |
| `TENMON_DOCTOR_REPO_ROOT` | (既存) | `/opt/tenmon-ark-repo` | 旧 VPS では `/opt/tenmon-automation` に override |
| `TENMON_DOCTOR_PROFILE` | (既存 / 任意) | `default` | 旧 VPS では `old_vps` |
| `TENMON_FEEDBACK_HISTORY_URL` | **新規 / 任意** | `https://tenmon-ark.com/api/feedback/history` | feedback history 取得先 |
| `TENMON_FEEDBACK_INTEGRATION_OUT_DIR` | 新規 / 任意 | `<TENMON_DOCTOR_OUT_DIR>` を継承 | 統合出力先 (doctor v2 と同じ場所が標準) |
| `TENMON_MC_BEARER_TOKEN` | 任意 (戦略 A 採用時のみ) | (未設定) | MC `/api/mc/vnext/*` 認証用。本カードでは **使わない** (戦略 C) |

### 10.1 既存 env との互換性

- `TENMON_DOCTOR_*` は `PATH-ENV-OVERRIDE-V1` で確立済 / 改変なし
- 新規 env はすべて任意 / 未設定で既定値が使われる
- default 環境 (本番 VPS) では新規 env も影響しない (次カードでも default 完全維持)

---

## 11. 残課題と次カード (`CARD-FEEDBACK-LOOP-CARD-GENERATION-V1` の前提)

### 11.1 残課題

- **MC auth 戦略**: 本カードでは戦略 C を採用 (skip)。MC 数値が必要になったら
  `CARD-DOCTOR-V2-OLD-VPS-MC-AUTH-DESIGN-V1` で戦略 A を別途設計
- **knowledge カテゴリのカード割り当て**: TENMON 裁定で
  `KNOWLEDGE-COVERAGE-OBSERVE-V1` / `IROHA-MC-CONNECTION-AUDIT-V1` のどちらを優先するか確定
- **ローテーション設計**: feedback_history_<TS>.json の保持日数 / 上限ファイル数を次カードで決定
- **API ページング (`?since=`)**: 件数 1000+ で重くなった段階で本番 API 改修カードを別途起票
- **既存 feedback observer の旧 VPS 配布判断**: 既存スクリプトをそのまま env 渡しで
  動かすか、旧 VPS 用ラッパーを新設するかは次カードの裁定事項
- **systemd 化**: 自動実行の可否 / cron 化は将来 `OLD-VPS-SCHEDULE-DESIGN-V1` / `-IMPLEMENT-V1` で判断

### 11.2 次カードの前提条件

`CARD-FEEDBACK-LOOP-CARD-GENERATION-V1` 実装時に満たすべき前提:

1. **READ-ONLY**: 旧 VPS から本番 VPS への HTTPS GET / 旧 VPS 上の `/opt/tenmon-automation/out/` 配下への書き込みのみ
2. **systemd / cron 登録なし**: 1 回手動実行 + TENMON 裁定で結果を確認
3. **戦略 C 維持**: MC `/api/mc/vnext/*` は呼ばない (auth 401 を回避)
4. **既存 feedback observer の card_candidates スキーマを継承**
5. **doctor v2 出力の `profile=old_vps` をフィルタ条件に**
6. **token / API key / IP / receiptNumber の本文を docs / log / commit に出さない**
7. 失敗しても自動修復しない (DRYRUN-V1 と同じ規律)

---

## 12. TENMON 裁定用まとめ (どのカードへ進むか)

### 12.1 本カードの結論 (設計確定事項)

| 項目 | 確定内容 |
| --- | --- |
| 一次入力 | doctor v2 JSON の 9 項目 / 二次の 5 項目は任意 |
| feedback history 取得 | 単発 GET (auth 不要 / 約 42KB / 46 件) |
| MC auth 戦略 | **C (skip)** を当面採用 |
| 既存 feedback observer | スキーマ継承 / 改修ゼロ / 旧 VPS 配布は次カード |
| 統合フロー | 4 priority 階層 + 重複排除 + ソート |
| 出力先 | `/opt/tenmon-automation/out/feedback_integration_latest.{json,md}` |
| 新規 env | `TENMON_FEEDBACK_HISTORY_URL` / `TENMON_FEEDBACK_INTEGRATION_OUT_DIR` (任意) |
| 副作用 | 本カードでの新規 write: 本 docs 1 ファイルのみ / 旧 VPS への新規書込: 0 |

### 12.2 次カード候補と TENMON 裁定要件

```
A. CARD-FEEDBACK-LOOP-CARD-GENERATION-V1                              ★推奨
   → 本設計を最小実装。旧 VPS 上で 1 回手動実行。systemd / cron 登録なし。
   → 統合ロジック (8.2) + 出力 (7.3) を実装。
   → knowledge カテゴリのカード割り当てを TENMON 裁定で確定。

B. CARD-DOCTOR-V2-OLD-VPS-MC-AUTH-DESIGN-V1
   → 戦略 A の詳細設計 (token 配置 / 権限 / env 受け渡し)。
   → 短期は不要 (戦略 C で進む)。MC 数値が必要になったときに起票。

C. CARD-DOCTOR-V2-OLD-VPS-FEEDBACK-INTEGRATION-IMPL-V1
   → 本カードの設計だけを最小限実装するスクリプト (A の前段)。
   → A と統合するなら不要。
```

**TENMON 裁定**: 本カード PASS 後、原則 **A** へ進行。

---

## ロードマップ位置付け

```
Phase 3a: CARD-DOCTOR-V2-PATH-ENV-OVERRIDE-V1                           [PASS]
Phase 3c: CARD-DOCTOR-V2-OLD-VPS-PROFILE-V1                             [PASS]
Phase 3d: CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY-V2                     [PASS / signals=4]
Phase 3e: CARD-DOCTOR-V2-OLD-VPS-FEEDBACK-INTEGRATION-V1                ← 本カード (設計確定)
Phase 4 : CARD-FEEDBACK-LOOP-CARD-GENERATION-V1                         [次カード]
Phase 5 : CARD-IROHA-MC-CONNECTION-AUDIT-V1
Phase 6 : CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1
```

将来 Phase:
- `CARD-DOCTOR-V2-OLD-VPS-SCHEDULE-DESIGN-V1` (systemd 化設計)
- `CARD-DOCTOR-V2-OLD-VPS-SCHEDULE-IMPLEMENT-V1` (systemd 化実装)
- `CARD-DOCTOR-V2-OLD-VPS-MC-AUTH-DESIGN-V1` (MC auth 戦略 A 採用時)
- (条件付) `CARD-DOCTOR-V2-OLD-VPS-RESCUE-V1` / `CARD-DOCTOR-V2-OLD-VPS-CONNECTIVITY-AUDIT-V1`
