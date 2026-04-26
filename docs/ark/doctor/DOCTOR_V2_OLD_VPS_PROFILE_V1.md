# DOCTOR-V2-OLD-VPS-PROFILE-V1

doctor v2 に **profile 機構 (`default` / `old_vps`)** を追加し、旧 4GB VPS から本番 VPS を
HTTPS read-only で観測する運用に判定軸を最適化する設計記録。

- カード ID: `CARD-DOCTOR-V2-OLD-VPS-PROFILE-V1`
- 種別: PATCH 小カード（最小 diff）
- 対象: `automation/tenmon_doctor_v2.py` のみ（旧 VPS には一切触らない）
- doctor 版: `v2.0.0-phase1`
- 親カード履歴: PATH-ENV-OVERRIDE-V1 (commit `eec9c76e`) → DRYRUN-V1-RETRY (PASS / YELLOW / warn=7)

---

## 1. 背景 — DRYRUN-RETRY 結果と warn=7 の内訳

`CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY` で旧 VPS (4GB Ubuntu) 上の doctor v2 起動・実行・
出力生成すべて成功。`exit_code=0 / verdict=YELLOW / critical=0 / warn=7`。

warn=7 の内訳（既定の `default` profile が、旧 VPS という「観測者」環境で本番 VPS 前提の
判定軸を当ててしまったために生じたもの）:

| 領域 | 警告内容 | 旧 VPS で発火する理由 |
| --- | --- | --- |
| db | DB read error (`/opt/tenmon-ark-data/kokuzo.sqlite` 不在) | kokuzo は本番 VPS 専用 DB |
| safety | `dangerous_script_denylist_v1.json` not found | denylist 配置場所が `REPO_ROOT` 配下のため |
| prompt_trace | `mc_intelligence_fire.jsonl` not found | jsonl は本番 VPS の MC ログ |
| evolution | `evolution_log_v1.ts` not found | web/src は旧 VPS には配置していない |
| evolution | top4 ids mismatch | 上の不在に連動 |
| pwa | `EvolutionLogPage` bundle not found | PWA assets bundle は本番 VPS の Vite ビルド成果物 |
| (他に bundle 関連の派生 warn が +1〜) |

これらは **本番 VPS のヘルス指標** であって、旧 VPS にとっては「無くて正常」の領域である。
にもかかわらず warn として積み上がるため、`verdict=YELLOW` が発火し、旧 VPS から本番 VPS への
HTTPS 観測が成功している事実 (`/api/health` / `/api/chat` / `/pwa/` / `/pwa/evolution` ともに 200) が
verdict 上で埋もれていた。

加えて `claude_summary` / `intelligence` の HTTPS 取得は旧 VPS に bearer token が無いため 401。
本番 VPS では `with_auth=True` で取得して finding を立てる仕組みがあるが、旧 VPS では 401 が
構造的に発生する想定であり、これは「auth missing」として扱うのが正しい (現状の doctor v2 は
401 だと `cs.get("ok")` が False になり finding 自体は追加されない設計のため、本カードで挙動を
変える必要は無いが、将来 401 を warn として扱う実装に変えた際に備え、ヘルパは `old_vps` で
info に下げる契約を先に定義しておく)。

---

## 2. 設計方針

- **default profile の挙動は完全維持**（本番 VPS 実行時に退行ゼロ）
- `TENMON_DOCTOR_PROFILE=old_vps` を立てた時のみ、判定軸を「リモート観測者」用に切り替える
- 切替対象は **既存 finding の level 引数** と **`derive_next_cards` の suggestions 戦略** のみ
- 既存関数シグネチャは破壊しない（`derive_next_cards` のみ optional `online_signals` を追加）
- 既存 import の追加なし (`os` は PATH-ENV-OVERRIDE で既に import 済み)
- diff 行数: 77 insert / 14 delete (合計 91 行 / 目安 80〜150 内)

---

## 3. 追加する環境変数 `TENMON_DOCTOR_PROFILE`

| 項目 | 値 |
| --- | --- |
| 変数名 | `TENMON_DOCTOR_PROFILE` |
| 必須 | 否 (optional) |
| 既定値 | `default` |
| 許容値 | `default`, `old_vps` |
| 大小文字 | 内部で `strip().lower()` 処理 |
| 不正値 | `default` にフォールバック (silent / 例外なし) |

解決ロジック（実装抜粋）:

```python
_RAW_PROFILE = os.environ.get("TENMON_DOCTOR_PROFILE", "default").strip().lower()
PROFILE = _RAW_PROFILE if _RAW_PROFILE in ("default", "old_vps") else "default"
```

不正値検証 (acceptance #10):

```bash
$ TENMON_DOCTOR_PROFILE=foo python3 -c "
import importlib.util
s=importlib.util.spec_from_file_location('m','automation/tenmon_doctor_v2.py')
m=importlib.util.module_from_spec(s); s.loader.exec_module(m)
print(repr(m.PROFILE))"
'default'
```

---

## 4. profile ごとの判定軸の差分表

| 検出対象 | default profile | old_vps profile |
| --- | --- | --- |
| `/api/health` 不到達 / non-200 | critical | critical (変更なし) |
| `/api/chat` probe 失敗 | critical | critical (変更なし) |
| `/pwa/evolution` 404 | critical | critical (変更なし) |
| acceptance verdict FAIL | critical | critical (変更なし) |
| enforcer verdict not clean | critical | critical (変更なし) |
| `tenmon-auto-patch` active | critical | critical (変更なし) |
| `kotodama_units != 12` | critical | critical (変更なし) |
| `kotodama_constitution_v1 = 0/missing` | critical | critical (変更なし) |
| `kotodama_constitution_memory = 0/missing` | critical | critical (変更なし) |
| `EvolutionLogPage` bundle 不在 | warn | **info** (skipped) |
| bundle read error | warn | **info** |
| bundle entry title 欠落 | warn | **info** |
| sidebar 進化ログ link 欠落 | warn | **info** |
| DB read error (kokuzo 不在) | warn | **info** |
| `dangerous_script_denylist_v1.json` not found | warn | **info** |
| `tenmon_auto_runner.py` denylist wiring 未検出 | warn | **info** |
| `mc_intelligence_fire.jsonl` not found | warn | **info** |
| `evolution_log_v1.ts` read error / not found | warn | **info** |
| top4 ids mismatch | warn | **info** |
| bundle missing id | warn | **info** |
| `auto_patch.enabled` 想定外 | warn | warn (変更なし / safety なので維持) |
| baseline カウント差分 (`thread_center_memory` 等) | warn | warn (変更なし / 本番 VPS 観測時のみ発火想定) |
| `kotodama_*` clauses が 20% 以上ズレ | warn | warn (変更なし) |
| 直近 trace `response_length < 600` | warn | warn (変更なし / 本番 VPS で実 trace を読めた場合のみ) |
| git modified files | warn | warn (変更なし / どちらでも意味あり) |

**設計原則**:
- `critical` は absolutely 維持（本物の異常 / online signal の欠損 / 安全装置の異常）
- `warn` のうち「ローカル成果物が存在しないことが原因」のものだけを `info` に下げる
- ローカル成果物が**存在した上で値がズレている** warn は維持（本物の異常を報告する）
- safety 領域の active 系は両 profile で critical / warn を維持（観測者でも安全装置の異常検知は最優先）

---

## 5. ヘルパ関数 `_level_for_missing_local` / `_level_for_auth_missing` の責務

### 5.1 `_level_for_missing_local(default_level: str) -> str`

ローカルリソース不在に起因する finding の level を profile で切り替える。

```python
def _level_for_missing_local(default_level: str) -> str:
    if PROFILE == "old_vps":
        return "info"
    return default_level
```

- default profile: 引数の `default_level` をそのまま返す → 退行ゼロ
- old_vps profile: 一律 `info` を返す → finding は report の `findings` 配列には残るが
  `summary.warn` には集計されず、`derive_verdict` も `info` を critical/warn として扱わないため
  `verdict` への影響なし

適用箇所: 12 箇所（PWA bundle 系 4 / DB read error 1 / safety 2 / prompt_trace JSONL 1 / evolution 4）

### 5.2 `_level_for_auth_missing(default_level: str) -> str`

bearer token 不在に起因する 401 finding の level を profile で切り替える。

```python
def _level_for_auth_missing(default_level: str) -> str:
    if PROFILE == "old_vps":
        return "info"
    return default_level
```

現行 doctor v2 は `claude_summary` / `intelligence` の 401 を **finding として追加していない**
(`if cs.get("ok")` の中でしか finding を立てない)。本ヘルパは将来「401 を warn として扱う」
実装に拡張した場合の契約を **先に定義** しておくためのもの (defensive)。

将来の使用例:

```python
if cs.get("status") == 401:
    findings.append({
        "level": _level_for_auth_missing("warn"),
        "area": "api",
        "message": "claude-summary 401 (auth missing)",
    })
```

---

## 6. `_evaluate_online_signals` の HTTPS 200 シグナル評価

```python
def _evaluate_online_signals(api_section: dict, pwa_section: dict) -> tuple[int, str]:
    health = (api_section.get("health") or {})
    chat_probe = (api_section.get("chat_probe") or {})
    pwa_root = (pwa_section.get("pwa_root") or {})
    pwa_evolution = (pwa_section.get("pwa_evolution") or {})
    signals = sum([
        health.get("status") == 200,
        chat_probe.get("status") == 200,
        pwa_root.get("status") == 200,
        pwa_evolution.get("status") == 200,
    ])
    if signals >= 3:
        return signals, "online"
    if signals >= 1:
        return signals, "partial"
    return signals, "offline"
```

最大 4 / 最小 0 のシグナル数を集計し、`(signals, label)` を返す。

| signals | label | 意味 |
| --- | --- | --- |
| 4 | online | 観測基地として完全に到達 |
| 3 | online | 観測基地として実質到達 (1 endpoint だけ瞬間的失敗) |
| 1〜2 | partial | 部分的にしか到達できていない |
| 0 | offline | 観測者として機能していない |

- 結果は report の top-level `online_status: {"signals": N, "label": "..."}` に保存
- old_vps profile では `derive_next_cards` に渡され suggestions の分岐に使われる
- default profile でも report に出るが suggestions は従来ロジック (online_status は監査用情報)

ユニット検証結果:

```
[online_eval-all200]      sig=4 lbl=online
[online_eval-all_fail]    sig=0 lbl=offline
[online_eval-1_signal]    sig=1 lbl=partial
```

---

## 7. `next_card_suggestions` の切り替えロジック

```python
def derive_next_cards(verdict: str, findings: list[dict],
                      online_signals: int = 0) -> list[str]:
    if PROFILE == "old_vps":
        if verdict in ("GREEN", "YELLOW") and online_signals >= 3:
            return [
                "CARD-DOCTOR-V2-OLD-VPS-FEEDBACK-INTEGRATION-V1",
                "CARD-FEEDBACK-LOOP-CARD-GENERATION-V1",
            ]
        if online_signals < 3:
            return ["CARD-DOCTOR-V2-OLD-VPS-CONNECTIVITY-AUDIT-V1"]
    # 以下、既存 default ロジック（GREEN / 主 finding ベース）
    ...
```

シグネチャ拡張は optional `online_signals=0` のみ。既存呼び出し互換。

シナリオ別の出力 (acceptance #8 検証):

| profile | verdict | online_signals | next_card_suggestions |
| --- | --- | --- | --- |
| default | RED | 4 | `CARD-DOCTOR-V2-REPAIR-API-V1` (元来通り) |
| default | GREEN | 4 | `CARD-FEEDBACK-LOOP-CARD-GENERATION-OBSERVE-V1`, `CARD-MEMORY-PROJECTION-DISTILLED-SCRIPTURE-V1` |
| old_vps | YELLOW | 4 | **`CARD-DOCTOR-V2-OLD-VPS-FEEDBACK-INTEGRATION-V1`**, **`CARD-FEEDBACK-LOOP-CARD-GENERATION-V1`** |
| old_vps | GREEN | 3 | 同上 |
| old_vps | YELLOW | 2 | **`CARD-DOCTOR-V2-OLD-VPS-CONNECTIVITY-AUDIT-V1`** |
| old_vps | RED | 4 | (fall-through) `CARD-DOCTOR-V2-REPAIR-API-V1` |
| 不正値 (`foo`) → default fallback | YELLOW | 4 | `CARD-DOCTOR-V2-OBSERVE-GENERAL-V1` |

old_vps profile の RED は (本番 VPS の状態を反映してしまった) 想定外状況のため fall-through。
旧 VPS で実機運用する状態 (`old_vps + YELLOW + online ≥ 3`) では旧 VPS 向け suggestions が出る。

---

## 8. 本番 VPS での verify 結果

### 8.1 default profile (env 未設定 / Step 5)

```
$ unset TENMON_DOCTOR_PROFILE
$ python3 automation/tenmon_doctor_v2.py verify
[doctor_v2] verdict=RED crit=1 warn=3 info=0
exit_code=0
```

report (抜粋):
- `profile = "default"`
- `verdict = RED, crit=1, warn=3, info=0`
- `online_status = {"signals": 4, "label": "online"}`
- `next_card_suggestions = ["CARD-DOCTOR-V2-REPAIR-API-V1"]`

PATH-ENV-OVERRIDE-V1 直後の HEAD と verdict / crit / warn 完全一致 → **退行ゼロ**

### 8.2 old_vps profile (本番 VPS / `/tmp/tenmon-doctor-test-out` / Step 6)

```
$ TENMON_DOCTOR_PROFILE=old_vps \
  TENMON_DOCTOR_OUT_DIR=/tmp/tenmon-doctor-test-out \
  python3 automation/tenmon_doctor_v2.py verify
[doctor_v2] verdict=RED crit=1 warn=3 info=0
exit_code=0
```

report (抜粋):
- `profile = "old_vps"`
- `verdict = RED, crit=1, warn=3, info=0` (本番 VPS では local 成果物がすべて揃っているため、
  `_level_for_missing_local` の発火がなく default と同じ verdict になる = 設計意図通り)
- `online_status = {"signals": 4, "label": "online"}`
- `next_card_suggestions = ["CARD-DOCTOR-V2-REPAIR-API-V1"]` (RED かつ fall-through 経路)
- 既定 OUT_DIR の `mtime` 不変 → env override が完全分離

MD report 冒頭で `profile: \`old_vps\`` が明示される。

### 8.3 旧 VPS RETRY-V2 での期待値 (本カードでは未実施)

旧 VPS で patched doctor v2 + `TENMON_DOCTOR_PROFILE=old_vps` を実行した際の期待値:
- `profile = "old_vps"` が JSON / MD に明記
- DRYRUN-RETRY で発生していた warn=7 が **0〜2** に大幅減（local 成果物不在の 6+ 件が info に降格）
- `summary.info` が 6+ になる
- `verdict` は GREEN または軽い YELLOW
- `online_status = {"signals": 4, "label": "online"}` (HTTPS 4 経路すべて 200 のため)
- `next_card_suggestions = ["CARD-DOCTOR-V2-OLD-VPS-FEEDBACK-INTEGRATION-V1", "CARD-FEEDBACK-LOOP-CARD-GENERATION-V1"]`
- `critical` は 0 維持

---

## 9. 旧 VPS DRYRUN RETRY-V2 用の実行例 (次カード)

旧 VPS への scp / 実行は次カード `CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY-V2` の責務。
本カードでは旧 VPS には一切触らない。参考までに、TENMON が Mac 経由で実行する手順例:

```bash
# Mac から本番 VPS の patched doctor v2 を取得し、旧 VPS へ配布
scp <prod-vps>:/opt/tenmon-ark-repo/automation/tenmon_doctor_v2.py /tmp/
scp /tmp/tenmon_doctor_v2.py <old-vps>:/opt/tenmon-automation/doctor_v2/

# 旧 VPS で profile=old_vps 付き実行
ssh <old-vps> 'cd /opt/tenmon-automation && \
  TENMON_DOCTOR_OUT_DIR=/opt/tenmon-automation/out \
  TENMON_DOCTOR_REPO_ROOT=/opt/tenmon-automation \
  TENMON_DOCTOR_PROFILE=old_vps \
  python3 /opt/tenmon-automation/doctor_v2/tenmon_doctor_v2.py verify; \
  echo "exit_code=$?"' | tee ~/tenmon-dryrun-tmp/oldvps_doctor_dryrun_v2.log
```

ホスト名 / IP / SSH 鍵パスは抽象化（プライバシー規律）。

---

## 10. dangerous_script self-check 互換性確認

doctor v2 内蔵の `self_check()` は `DENY_TOKENS`（`rm` + ` -rf` / `sys` + `temctl restart` 等の
連結）をスクリプト本文 (コメント除外後) に対して `in` 検出する仕組み。

本カードで追加した 4 個の関数 (`_level_for_missing_local` / `_level_for_auth_missing` /
`_evaluate_online_signals` / `derive_next_cards` 拡張) と 12 箇所の置換、定数 1 個 (`PROFILE`) に
対し、self-check 検出ロジックを同じ条件で再実行した結果:

```
self-check hits: []  (PASS)
```

profile 名 (`default` / `old_vps`) や env 名 (`TENMON_DOCTOR_PROFILE`)、suggestions のカード名
(`CARD-DOCTOR-V2-OLD-VPS-FEEDBACK-INTEGRATION-V1` 等) は denylist トークンに該当しない。

---

## 11. 退行なし確認 (default 完全維持)

| 観測項目 | HEAD (PATH-ENV-OVERRIDE-V1) | Step 5 (default profile) |
| --- | --- | --- |
| exit_code | 0 | 0 |
| verdict | RED | RED |
| critical | 1 | 1 |
| warn | 3 | 3 |
| profile キー | (無し) | `"default"` (新規追加 / 値は既定) |
| online_status キー | (無し) | `{"signals": 4, "label": "online"}` (監査情報追加) |
| next_card_suggestions | `["CARD-DOCTOR-V2-REPAIR-API-V1"]` | `["CARD-DOCTOR-V2-REPAIR-API-V1"]` |
| 既存 finding の level | (warn / critical) | 完全一致 |

`profile` / `online_status` の追加は report の **追加キー** であり、既存の consumer (JSON を
読む側) が既存キーを参照する場合の互換性を破壊しない。MD report も冒頭に 1 行 `profile:` を
追加するのみで、既存セクションは順序・内容ともに不変。

---

## 12. 残課題と次カード

### 残課題
- 旧 VPS 実機での `old_vps` profile 検証は本カードの範囲外（次カード RETRY-V2 で実施）
- `_level_for_auth_missing` は将来用の defensive helper (現行 doctor v2 が 401 finding を立てない
  ため、現時点では呼び出し側ゼロ)
- `online_status` を MD report の本文に出すかどうかは次の小カードで検討（現状は JSON のみ）

### 次カード候補

```
A. CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY-V2 (推奨)
   → 旧 VPS で TENMON_DOCTOR_PROFILE=old_vps 付きで再 DRYRUN
   → 期待: warn 7 → 0〜2 / verdict GREEN または軽い YELLOW / suggestions が old_vps 向け
   → systemd / cron 禁止は維持
   → 次カードでも旧 VPS への新規 systemd 登録 / 自動実行は禁止

B. 本カード追補 (diff レビュー後の微調整が必要な場合のみ)
```

TENMON 裁定: 本カード PASS 後、原則 A へ進行。

---

## ロードマップ位置付け

```
Phase 3a: CARD-DOCTOR-V2-PATH-ENV-OVERRIDE-V1                           [PASS / eec9c76e]
Phase 3b: CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY                        [PASS / YELLOW / warn=7]
Phase 3c: CARD-DOCTOR-V2-OLD-VPS-PROFILE-V1                             ← 本カード
Phase 3d: CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY-V2                     [次カード]
Phase 4 : CARD-FEEDBACK-LOOP-CARD-GENERATION-V1
```
