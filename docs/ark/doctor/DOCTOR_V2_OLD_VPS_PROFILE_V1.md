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
- 切替対象は **既存 finding の level 引数** / **`derive_next_cards` の suggestions 戦略** /
  **`old_vps` profile 限定の verdict 再計算** の 3 つ
- 既存関数シグネチャは破壊しない（`derive_next_cards` のみ optional `online_signals` を追加）
- 既存 import の追加なし (`os` は PATH-ENV-OVERRIDE で既に import 済み)
- diff 行数: doctor v2 累計 +112 / -16 (目安 80〜150 内)
- default profile 経路では `_evaluate_old_vps_verdict` は呼ばれず、`derive_verdict` の従来ロジック
  がそのまま `verdict` を決める → 退行ゼロ

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

## 6. 観測基地判定ロジック (HTTPS 200 シグナル + verdict 再計算)

old_vps profile では、HTTPS 200 シグナル 4 種を **観測基地として機能しているかの必須判定**
として用いる。

### 6.1 判定対象 (4 endpoint)

```
1. /api/health           200
2. /api/chat probe       200
3. /pwa/                 200
4. /pwa/evolution        200
```

### 6.2 判定基準

```
online_signals = 200 を返した数 (0 〜 4)

online_signals >= 3  → 観測基地として PASS 寄り (GREEN または軽い YELLOW)
online_signals == 2  → YELLOW または RED 寄り (要注意)
online_signals == 1  → YELLOW または RED
online_signals == 0  → RED (観測基地として機能していない)
```

### 6.3 シグナル集計 `_evaluate_online_signals`

```python
def _evaluate_online_signals(api_section: dict, pwa_section: dict) -> tuple[int, str]:
    health        = (api_section.get("health") or {})
    chat_probe    = (api_section.get("chat_probe") or {})
    pwa_root      = (pwa_section.get("pwa_root") or {})
    pwa_evolution = (pwa_section.get("pwa_evolution") or {})
    signals = sum([
        health.get("status") == 200,
        chat_probe.get("status") == 200,
        pwa_root.get("status") == 200,
        pwa_evolution.get("status") == 200,
    ])
    if signals >= 3: return signals, "online"
    if signals >= 1: return signals, "partial"
    return signals, "offline"
```

| signals | label | 意味 |
| --- | --- | --- |
| 4 | online | 観測基地として完全に到達 |
| 3 | online | 観測基地として実質到達 (1 endpoint のみ瞬間的失敗) |
| 1〜2 | partial | 部分的にしか到達できていない |
| 0 | offline | 観測者として機能していない |

結果は report の top-level `online_status: {"signals": N, "label": "..."}` に保存。
default profile でも記録される (監査用情報) が、verdict 算出には使われない。

### 6.4 verdict 再計算 `_evaluate_old_vps_verdict` (old_vps 限定)

```python
def _evaluate_old_vps_verdict(online_signals: int,
                              critical_count: int,
                              warn_count: int) -> str:
    if online_signals == 0:
        return "RED"
    if online_signals <= 2:
        return "RED" if critical_count > 0 else "YELLOW"
    if critical_count > 0:
        return "RED"
    if warn_count > 0:
        return "YELLOW"
    return "GREEN"
```

呼び出しは `cmd_verify` 内の以下 1 行のみ (PROFILE が old_vps の時だけ verdict を上書き):

```python
verdict, crit, warn, info = derive_verdict(findings)
online_signals, online_label = _evaluate_online_signals(api_section, pwa_section)
if PROFILE == "old_vps":
    verdict = _evaluate_old_vps_verdict(online_signals, crit, warn)
```

default profile では `_evaluate_old_vps_verdict` は呼ばれず、`derive_verdict` の従来ロジック
がそのまま採用される → 退行ゼロ。

### 6.5 critical の立て方 (old_vps profile)

old_vps profile では、以下のみ critical として扱う (本物の到達性 / 重要装置の異常):

```
- /api/health が 200 以外 (タイムアウト含む)
- chat probe が 5xx または timeout
- /api/chat の acceptance verdict FAIL
- intelligence enforcer verdict not clean
- /pwa/evolution が 404
- tenmon-auto-patch が active
- kotodama_units != 12 (DB が読めた場合のみ)
- kotodama_constitution_v1 / kotodama_constitution_memory が 0/missing
  (jsonl が読めた場合のみ)
- online_signals == 0 (verdict 算出側で RED 確定)
- doctor v2 自体の起動失敗 (発生時は execution 不能なので通常出ない)
```

以下は `info` / `warn` 以下に整理 (旧 VPS には無くて正常 / token 不在なので 401 が想定内):

```
- local DB 不在                   → info (旧 VPS には無いのが正常)
- prompt_trace JSONL 不在          → info
- evolution_log_v1.ts 不在         → info
- PWA assets bundle 不在           → info
- claude_summary 401              → info "auth missing" (現行は finding 立てない)
- intelligence 401                → info "auth missing" (現行は finding 立てない)
- /pwa/ が 200 以外 (health/chat 生きていれば) → warn (current default 維持)
- /pwa/evolution が 200 以外 (404 以外で health/chat 生きていれば) → warn
```

### 6.6 ユニット検証結果 (verdict 13 ケース全 PASS)

```
[OK] online=0 crit=0 warn=0 -> RED      (offline 強制 RED)
[OK] online=0 crit=5 warn=5 -> RED
[OK] online=1 crit=0 warn=0 -> YELLOW
[OK] online=1 crit=1 warn=0 -> RED
[OK] online=2 crit=0 warn=0 -> YELLOW
[OK] online=2 crit=0 warn=5 -> YELLOW
[OK] online=2 crit=1 warn=0 -> RED
[OK] online=3 crit=0 warn=0 -> GREEN
[OK] online=3 crit=0 warn=1 -> YELLOW
[OK] online=3 crit=1 warn=0 -> RED
[OK] online=4 crit=0 warn=0 -> GREEN    (clean / 観測基地完全機能)
[OK] online=4 crit=0 warn=3 -> YELLOW
[OK] online=4 crit=1 warn=3 -> RED      (本番 VPS 実測 Step 6 と同条件)
```

---

## 7. `next_card_suggestions` の切り替えロジック (3 段階分岐)

```python
def derive_next_cards(verdict: str, findings: list[dict],
                      online_signals: int = 0) -> list[str]:
    if PROFILE == "old_vps":
        if online_signals >= 3:
            return [
                "CARD-DOCTOR-V2-OLD-VPS-FEEDBACK-INTEGRATION-V1",
                "CARD-FEEDBACK-LOOP-CARD-GENERATION-V1",
            ]
        if online_signals == 2:
            return ["CARD-DOCTOR-V2-OLD-VPS-CONNECTIVITY-AUDIT-V1"]
        # online_signals 0 or 1: 観測基地として機能していない
        return [
            "CARD-DOCTOR-V2-OLD-VPS-RESCUE-V1",
            "CARD-DOCTOR-V2-OLD-VPS-CONNECTIVITY-AUDIT-V1",
        ]
    # 以下、既存 default ロジック（GREEN / 主 finding ベース）
    ...
```

シグネチャ拡張は optional `online_signals=0` のみ。既存呼び出し互換。

old_vps profile の分岐は **online_signals 数のみ** で決まる (verdict は判断材料にしない)。
これは「観測基地が機能しているか」を主軸に suggestions を出すため。verdict は別途
`_evaluate_old_vps_verdict` で online_signals + crit/warn から再計算される。

### 7.1 シナリオ別出力 (ユニット検証 PASS / acceptance #8 / #16)

| profile | online_signals | verdict (再計算後) | next_card_suggestions |
| --- | --- | --- | --- |
| default | (使われない) | RED | `CARD-DOCTOR-V2-REPAIR-API-V1` (元来通り / 退行ゼロ) |
| default | (使われない) | GREEN | `CARD-FEEDBACK-LOOP-CARD-GENERATION-OBSERVE-V1`, `CARD-MEMORY-PROJECTION-DISTILLED-SCRIPTURE-V1` |
| old_vps | 4 (clean) | GREEN | **`OLD-VPS-FEEDBACK-INTEGRATION-V1`**, **`FEEDBACK-LOOP-CARD-GENERATION-V1`** |
| old_vps | 4 (warn>0) | YELLOW | 同上 |
| old_vps | 4 (crit>0) | RED | 同上 (online ≥ 3 なら observer 機能 → integration 推奨) |
| old_vps | 3 | GREEN/YELLOW/RED | 同上 |
| old_vps | 2 | YELLOW or RED | **`OLD-VPS-CONNECTIVITY-AUDIT-V1`** |
| old_vps | 1 | YELLOW or RED | **`OLD-VPS-RESCUE-V1`**, **`OLD-VPS-CONNECTIVITY-AUDIT-V1`** |
| old_vps | 0 | RED 確定 | **`OLD-VPS-RESCUE-V1`**, **`OLD-VPS-CONNECTIVITY-AUDIT-V1`** |
| 不正値 (`foo`) → default fallback | (使われない) | RED | `CARD-DOCTOR-V2-REPAIR-API-V1` |

### 7.2 補正前後の違い (前カードからの変更点)

| 観点 | 前カード (初版) | 本カード補正版 |
| --- | --- | --- |
| online ≥ 3 の条件 | `verdict in ("GREEN", "YELLOW")` 必要 | online_signals 数のみで分岐 (verdict 不問) |
| online < 3 の処理 | `CONNECTIVITY-AUDIT-V1` 1 種で固定 | `==2` と `<=1` で別カードに分離 |
| online ≤ 1 の RESCUE | 無し | **新規** `CARD-DOCTOR-V2-OLD-VPS-RESCUE-V1` |
| verdict の old_vps 再計算 | derive_verdict 任せ | `_evaluate_old_vps_verdict` で再計算 |

本番 VPS 上 Step 6 verify の suggestions が前回 (RED + fall-through で `REPAIR-API-V1`) から
(`OLD-VPS-FEEDBACK-INTEGRATION-V1` + `FEEDBACK-LOOP-CARD-GENERATION-V1`) に変わったことが
本補正の動作確認となる。

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
- `online_status = {"signals": 4, "label": "online"}` (本番 VPS は 4 endpoint すべて 200)
- `verdict = RED` (`_evaluate_old_vps_verdict(4, 1, 3)` → online ≥ 3 + crit > 0 → RED)
- `crit=1, warn=3, info=0` (本番 VPS では local 成果物がすべて揃っているため、
  `_level_for_missing_local` の発火がなく default と同じ件数になる = 設計意図通り)
- `next_card_suggestions = ["CARD-DOCTOR-V2-OLD-VPS-FEEDBACK-INTEGRATION-V1", "CARD-FEEDBACK-LOOP-CARD-GENERATION-V1"]`
  (補正版: online ≥ 3 なら verdict によらず観測基地統合を推奨)
- 既定 OUT_DIR の更新は Step 6 では発生せず、env override が完全分離

MD report 冒頭で `profile: \`old_vps\`` が明示される。

**補正版が動作している決定的証拠**: 同じ `verdict=RED` でも `default` profile は
`REPAIR-API-V1` を出すのに対し、`old_vps` profile は online_signals=4 を見て
`OLD-VPS-FEEDBACK-INTEGRATION-V1` + `FEEDBACK-LOOP-CARD-GENERATION-V1` を出している。
つまり同一観測条件で **profile によってのみ出力が分岐** している。

### 8.3 旧 VPS RETRY-V2 での期待値 (本カードでは未実施)

旧 VPS で patched doctor v2 + `TENMON_DOCTOR_PROFILE=old_vps` を実行した際の期待値:
- `profile = "old_vps"` が JSON / MD に明記
- DRYRUN-RETRY で発生していた warn=7 が **0〜2** に大幅減（local 成果物不在の 6+ 件が info に降格）
- `summary.info` が 6+ になる
- `online_status = {"signals": 4, "label": "online"}` (HTTPS 4 経路すべて 200 のため)
- `_evaluate_old_vps_verdict(4, 0, 0〜2)` → **GREEN または軽い YELLOW**
- `critical = 0` 維持
- `next_card_suggestions = ["CARD-DOCTOR-V2-OLD-VPS-FEEDBACK-INTEGRATION-V1", "CARD-FEEDBACK-LOOP-CARD-GENERATION-V1"]`

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

| 観測項目 | HEAD~1 (PATH-ENV-OVERRIDE-V1 直後) | Step 5 (default profile / 補正版) |
| --- | --- | --- |
| exit_code | 0 | 0 |
| verdict | RED | RED |
| critical | 1 | 1 |
| warn | 3 | 3 |
| profile キー | (無し) | `"default"` (新規追加 / 値は既定) |
| online_status キー | (無し) | `{"signals": 4, "label": "online"}` (監査情報追加 / verdict 算出には不使用) |
| next_card_suggestions | `["CARD-DOCTOR-V2-REPAIR-API-V1"]` | `["CARD-DOCTOR-V2-REPAIR-API-V1"]` |
| 既存 finding の level | (warn / critical) | 完全一致 |
| `_evaluate_old_vps_verdict` 呼び出し | (関数自体が無い) | **呼ばれない** (`if PROFILE == "old_vps"` ガード) |

`profile` / `online_status` の追加は report の **追加キー** であり、既存の consumer (JSON を
読む側) が既存キーを参照する場合の互換性を破壊しない。MD report も冒頭に 1 行 `profile:` を
追加するのみで、既存セクションは順序・内容ともに不変。

**default profile では `_evaluate_old_vps_verdict` への分岐自体に入らない** ため、補正版で
追加された verdict 再計算ロジックは default profile に一切影響を与えない。

---

## 12. 残課題と次カード

### 残課題
- 旧 VPS 実機での `old_vps` profile 検証は本カードの範囲外（次カード RETRY-V2 で実施）
- `_level_for_auth_missing` は将来用の defensive helper (現行 doctor v2 が 401 finding を立てない
  ため、現時点では呼び出し側ゼロ)
- `online_status` を MD report の本文に出すかどうかは次の小カードで検討（現状は JSON のみ）
- `RESCUE-V1` / `CONNECTIVITY-AUDIT-V1` は old_vps profile からの suggestions として
  実装名のみ確定。実カードは旧 VPS 観測結果に応じて起票判断する。

### 次カード候補

```
A. CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY-V2 (推奨)
   → 旧 VPS で TENMON_DOCTOR_PROFILE=old_vps 付きで再 DRYRUN
   → 期待: warn 7 → 0〜2 / verdict GREEN または軽い YELLOW / suggestions が
     OLD-VPS-FEEDBACK-INTEGRATION-V1 + FEEDBACK-LOOP-CARD-GENERATION-V1 になる
   → systemd / cron 禁止は維持
   → 次カードでも旧 VPS への新規 systemd 登録 / 自動実行は禁止

B. 本カード追補 (diff レビュー後の微調整が必要な場合のみ)

C. (条件付き) CARD-DOCTOR-V2-OLD-VPS-RESCUE-V1
   → online_signals が 0 〜 1 のときのみ起票。RETRY-V2 で online=4 を確認するため、
     通常は不要。

D. (条件付き) CARD-DOCTOR-V2-OLD-VPS-CONNECTIVITY-AUDIT-V1
   → online_signals が 2 のときのみ起票。同上、通常は不要。
```

TENMON 裁定: 本カード PASS 後、原則 A へ進行。

### Acceptance (17 項 / 補正版)

1. `python3 -m py_compile automation/tenmon_doctor_v2.py` PASS
2. default profile (env 未設定) で本番 VPS doctor v2 が従来通り動く (exit 0)
3. default profile の verdict / warn 件数が PATH-ENV-OVERRIDE 後と同等 (退行ゼロ)
4. `TENMON_DOCTOR_PROFILE=old_vps` で旧 VPS 向け判定になる
5. old_vps profile で local DB / prompt_trace / evolution / PWA assets 不在が critical にならない
6. old_vps profile で claude_summary / intelligence 401 が warn 未満になる契約
7. old_vps profile で health / chat / pwa / pwa_evolution 200 が重視される
8. old_vps profile で `next_card_suggestions` が旧 VPS 運用向けになる (3 段階分岐)
9. report JSON に `profile` キーが含まれる
10. 不正な profile 値 (例: `TENMON_DOCTOR_PROFILE=foo`) が default にフォールバック
11. 変更ファイルは doctor v2 + docs のみ
12. doctor v2 の diff 行数が 150 行以内
13. DB write 0 件 / systemctl 操作 0 回 / nginx 操作 0 回
14. 旧 VPS への操作 0 回 / token / IP 混入なし / enforcer clean
15. **(補正版追加)** old_vps profile で `online_signals` が JSON report に記録される (0〜4)
16. **(補正版追加)** `online_signals >= 3` のとき、verdict が GREEN / YELLOW / RED いずれか妥当 (online=0/1/2 で偽 PASS にならない)
17. **(補正版追加)** `online_signals == 0` のとき、verdict が RED 確定 (`_evaluate_old_vps_verdict` ユニット検証で実証 / 本番 VPS では発生しないので run-time observe ではなく unit test で確認)

---

## ロードマップ位置付け

```
Phase 3a: CARD-DOCTOR-V2-PATH-ENV-OVERRIDE-V1                           [PASS / eec9c76e]
Phase 3b: CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY                        [PASS / YELLOW / warn=7]
Phase 3c: CARD-DOCTOR-V2-OLD-VPS-PROFILE-V1                             ← 本カード (補正版)
Phase 3d: CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY-V2                     [次カード]
Phase 3e: (条件付) CARD-DOCTOR-V2-OLD-VPS-RESCUE-V1                     [online ≤ 1 時のみ]
Phase 3f: (条件付) CARD-DOCTOR-V2-OLD-VPS-CONNECTIVITY-AUDIT-V1         [online == 2 時のみ]
Phase 4 : CARD-FEEDBACK-LOOP-CARD-GENERATION-V1
```
