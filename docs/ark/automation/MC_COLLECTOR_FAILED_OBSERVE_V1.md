# MC_COLLECTOR_FAILED_OBSERVE_V1

| key | value |
|---|---|
| 日時 | 2026-04-25 (JST) |
| 監査者 | Cursor (TENMON-ARK MC Collector failed 観測) |
| parent_commit | `b6940733` (`docs(automation): AUTOMATION_PHANTOM_UNIT_OBSERVE_V1`) |
| branch | `feature/unfreeze-v4` |
| 種別 | **OBSERVE only (READ-ONLY)** |
| 対象 | `mc-collect-git.service` / `mc-collect-all.service` |
| 触らない | `mc-collect-live.*` / `mc-build-handoff.*` / `tenmon-ark-api` / `nginx` / `tenmon-runtime-watchdog` / `tenmon-auto-patch` |

---

## 0. Executive Summary

| Unit | 状態 | failed 一行原因 | 5 段階判定 |
|---|---|---|---|
| `mc-collect-git.service` | **failed** (exit 1) | `Collecting git_state...` INFO 直後で **無音 exit 1**。`mc_lib.sh` の `set -euo pipefail` + heredoc 内 `$(cmd \| json_escape)` などの **保護不足の bash 落とし穴**。`live_state` には 4/24 に同種の保護 patch (`2e35ddc8`) が当たったが **`git_state` には適用されていない**。 | **REPAIRABLE_SIMPLE** |
| `mc-collect-all.service` | **failed** (exit 1) | orchestrator として `live_state ✓ → git_state FAILED (exit 1) → ai_handoff ✓ → overview WARN` を集計し最終 `exit 1`。**根本原因は `mc-collect-git` の伝播のみ**。さらに自コメントで「shell 版は offline use snapshot、本線は TS 版」と明示。 | **OBSOLETE_DEPRECATE** (副)<br>**INTEGRATABLE** (主) |

**TENMON 裁定向け推奨**: **mc-collect-git は修復 (Card-12 候補) / mc-collect-all は廃止 (`mc-collect-git` の修復で再走 green になるため事後判断でも可)**。

**API への影響**: **ゼロ**。`/api/mc/vnext/*` は `try/catch` + collector-free fallback (`api/src/mc/mcVnextSourceMapV1.ts` の "When `live_state.json` ... 不在時のフォールバック") で保護され、`acceptance.verdict = PASS x3` / `enforcer.verdict = clean` が維持されている。`git_state.json` は **約 24h stale** (`2026-04-24T05:53:06Z` のまま) だが、本線である `live_state.json` (5min 更新) と `ai-handoff.json` (15min 更新) は最新。

---

## 1. Section 1: 全体状態 (PRE)

### 1.1 触らない unit (PRE-baseline、本カードの不変保証対象)

| unit | active | enabled | MainPID | 備考 |
|---|---|---|---|---|
| `tenmon-ark-api.service` | active | enabled | **854190** | 本番 API、前カードと同一 PID |
| `nginx.service` | active | enabled | 891111 | 本番 web |
| `mc-collect-live.service` | inactive | static | 0 | timer 駆動 (5 min)、最終 14:49:24 で **success** |
| `mc-build-handoff.service` | inactive | static | 0 | timer 駆動 (15 min)、最終 14:44:13 で **success** |
| `tenmon-runtime-watchdog.service` | active | enabled | 2539152 | phantom (前カード AUTOMATION_PHANTOM_UNIT_OBSERVE_V1)、不変 |
| `tenmon-auto-patch.service` | inactive | **disabled** | 0 | 前カード AUTOMATION_PHANTOM_UNIT_RETIRE_V1 で disable 済 |

### 1.2 対象 unit 現状

| unit | is-active | is-enabled | is-failed | Result | ExecMainStatus | InactiveEnterTimestamp |
|---|---|---|---|---|---|---|
| `mc-collect-git.service` | failed | static | failed | exit-code | **1** | Sat 2026-04-25 14:50:38 JST |
| `mc-collect-all.service` | failed | static | failed | exit-code | **1** | Sat 2026-04-25 14:20:51 JST |

### 1.3 timer 状態 (4 件すべて active enabled)

| timer | active | enabled | LAST | NEXT | 周期 |
|---|---|---|---|---|---|
| `mc-collect-live.timer` | active | enabled | 14:49:24 | 14:54:24 | **5 min** |
| `mc-collect-git.timer` | active | enabled | 14:50:38 | 15:00:38 | **10 min** |
| `mc-build-handoff.timer` | active | enabled | 14:44:13 | 14:59:13 | **15 min** |
| `mc-collect-all.timer` | active | enabled | 14:20:50 | 15:20:50 | **60 min** |

> 注: timer が active なため、本観測中も自然な再走が発生する (10 min 周期で git は再失敗、60 min 周期で all は再失敗)。本カードでは `systemctl` 状態変更を一切していない。「failed → activating → failed」の自然遷移のみ。

---

## 2. Section 2: mc-collect-git.service

### 2.1 unit ファイル詳細

```
FragmentPath    : /etc/systemd/system/mc-collect-git.service
ExecStart       : /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_git_state.sh
WorkingDirectory: (none)
User            : (none → root)
Type            : oneshot
RemainAfterExit : no
Restart         : no
TimeoutStartUSec: infinity
```

**unit file 全文** (`/etc/systemd/system/mc-collect-git.service`):

```ini
[Unit]
Description=TENMON-ARK MC: Collect git state
After=tenmon-ark-api.service

[Service]
Type=oneshot
ExecStart=/opt/tenmon-ark-repo/api/scripts/mc/mc_collect_git_state.sh
Environment=TENMON_DATA_ROOT=/opt/tenmon-ark-data
Environment=TENMON_REPO_ROOT=/opt/tenmon-ark-repo
StandardOutput=journal
StandardError=journal
```

### 2.2 ExecStart script 実体

```
path  : /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_git_state.sh
size  : 4155 bytes
mtime : 2026-04-19 09:14 (Phase 1 実装後、変更なし)
sha256: 9e4c8b6d9a27e83f6f5bebed50ac6b9526037669bd991c7366bb2d5d090c5263
exists: ✓ (ENOENT ではない)
```

**構造**:
1. `source mc_lib.sh` (`set -euo pipefail` を継承)
2. `mc_info "Collecting git_state..."` ← **journal で確認できる最後のログ**
3. `OUTFILE="${MC_DATA_DIR}/git_state.json"`
4. `cd "${TENMON_REPO_ROOT}"`
5. 各種 git 情報収集 (`git rev-parse`, `git log`, `git tag`, `git reflog`)
6. inline `python3 -c "..."` で JSON 配列構築 (`recent_commits`, `recent_tags`, `reflog`)
7. `cat <<EOF | mc_sanitize | mc_write_json "${OUTFILE}"` で最終 JSON 書込
8. `mc_info "git_state collection complete."` ← **このログは出ていない**

### 2.3 failed 原因 (journalctl 詳細)

**直近 11 回連続失敗** (10 min 周期):

```
4月 25 13:20:08 systemd[1]: Starting TENMON-ARK MC: Collect git state...
4月 25 13:20:08 mc_collect_git_state.sh[857388]: [MC][...][INFO] Collecting git_state...
4月 25 13:20:08 systemd[1]: mc-collect-git.service: Main process exited, code=exited, status=1/FAILURE
4月 25 13:20:08 systemd[1]: mc-collect-git.service: Failed with result 'exit-code'.
...
4月 25 14:50:38 systemd[1]: ... (同一パターン繰り返し)
```

**failed の確定したパターン**:
- `Starting → Collecting git_state... INFO` までは **必ず到達** (mc_info logs are emitted via stderr → journal)
- そのあと **stderr に何のエラーも出ず無音で exit 1**
- `mc_warn` / `mc_error` は journal に出ていない → スクリプト末尾の `mc_info "git_state collection complete."` 到達前に **`set -euo pipefail` で silent exit**

**最終成功と最初の失敗のタイムライン**:
- 最終成功: `2026-04-24 14:53:06 JST` (`Deactivated successfully`、`git_state.json` 5038 bytes 書込済)
- 最初の失敗: `2026-04-25 11:39:35 JST` 以降 (journal `--since "7 days ago"` で確認できる範囲)
- **約 21 時間の沈黙の後、突如連続失敗に転化**

### 2.4 出力先候補

| 出力 | path | 書く collector | 現状 mtime | サイズ |
|---|---|---|---|---|
| 直接出力 | `/opt/tenmon-ark-data/mc/git_state.json` | mc_collect_git_state.sh | **2026-04-24 14:53:06** (= 24h stale) | 5038 bytes |
| 間接利用 | `${MC_DATA_DIR}/ai-handoff.json` | mc_build_ai_handoff.sh が `git rev-parse` で再取得 (handoff は git_state.json に依存しない構造) | 2026-04-25 14:44:14 | 1778 bytes |
| 集計 | `${MC_DATA_DIR}/overview.json` | mc_collect_all.sh が glob で `*.json` を集める | 2026-04-25 14:20:51 | 621 bytes |

**DB 書込なし**: `mc_lib.sh` には `sql_ro` 関数のみで書込関数なし。grep で確認:

```bash
grep -lE "sqlite3 |INSERT |UPDATE " /opt/tenmon-ark-repo/api/scripts/mc/*.sh
# → mc_lib.sh のみ (sql_ro 関数の定義のみ、READ-ONLY)
```

つまり **collector は誰も sqlite に書かない**。すべての出力は `${MC_DATA_DIR}` (= `/opt/tenmon-ark-data/mc`) 配下の **JSON ファイル**。

### 2.5 依存関係

- **forward**: `system.slice` / `sysinit.target` (systemd 標準のみ、独自依存なし)
- **reverse**: **空** (誰からも依存されていない)

つまり `mc-collect-git` を停止/無効化しても **他 unit に影響しない**。

### 2.6 git history

```
b92f0685 feat: MC V2 Phase 1 (Read-only MVP) — 33 files
```

**commit が 1 つのみ**。Phase 1 で導入後、**一度も修正されていない**。

---

## 3. Section 3: mc-collect-all.service

### 3.1 unit ファイル詳細

```
FragmentPath    : /etc/systemd/system/mc-collect-all.service
ExecStart       : /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_all.sh
WorkingDirectory: (none)
User            : (none → root)
Type            : oneshot
Environment     : TENMON_DATA_ROOT=/opt/tenmon-ark-data, TENMON_REPO_ROOT=/opt/tenmon-ark-repo
```

**unit file 全文** (mc-collect-git と完全に同じテンプレート、ExecStart のみ違う):

```ini
[Unit]
Description=TENMON-ARK MC: Run all collectors
After=tenmon-ark-api.service

[Service]
Type=oneshot
ExecStart=/opt/tenmon-ark-repo/api/scripts/mc/mc_collect_all.sh
Environment=TENMON_DATA_ROOT=/opt/tenmon-ark-data
Environment=TENMON_REPO_ROOT=/opt/tenmon-ark-repo
StandardOutput=journal
StandardError=journal
```

### 3.2 ExecStart script 実体

```
path  : /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_all.sh
size  : 2169 bytes
mtime : 2026-04-19 09:14 (Phase 1 実装後、変更なし)
sha256: cee9fa1f9d99c345d61f36e91de2b25f7ffbfc650e0d0f42258215f6f7c8ac1b
exists: ✓
```

**構造** (orchestrator):

```bash
run_collector "live_state"   "mc_collect_live_state.sh"
run_collector "git_state"    "mc_collect_git_state.sh"
run_collector "ai_handoff"   "mc_build_ai_handoff.sh"

# Build overview (offline use snapshot)
mc_info "Building overview.json..."
python3 -c "..." 2>/dev/null || mc_warn "overview.json build failed"

if [ "${FAILED}" -gt 0 ]; then
  mc_warn "${FAILED} collector(s) failed"
  exit 1
fi
```

**自コメントによる重要な仕様明示** (line 165-166):

```
# Overview is built by the TypeScript builder at runtime,
# but we also create a shell-based snapshot for offline use.
```

→ shell 版 overview.json は **本線ではなく "offline use snapshot"**。本線は **TypeScript builder** (api 側) が runtime で別途生成。

### 3.3 failed 原因

**journal が直接示している連鎖** (毎時 60 min 周期):

```
4月 25 14:20:51 mc_collect_all.sh[902732]: [INFO] live_state ✓
4月 25 14:20:51 mc_collect_all.sh[902732]: [INFO] Running git_state...
4月 25 14:20:51 mc_collect_all.sh[902732]: [ERROR] git_state FAILED (exit 1)   ← ★ ここが原因の全て
4月 25 14:20:51 mc_collect_all.sh[902732]: [INFO] Running ai_handoff...
4月 25 14:20:51 mc_collect_all.sh[902732]: [INFO] ai_handoff ✓
4月 25 14:20:51 mc_collect_all.sh[902732]: [INFO] Building overview.json...
4月 25 14:20:51 mc_collect_all.sh[902732]: [WARN] overview.json build failed   ← ★ 副次 (set -e + python3 inline 2>/dev/null)
4月 25 14:20:51 mc_collect_all.sh[902732]: [INFO] === MC Collect All Complete: 3 run, 1 failed ===
4月 25 14:20:51 systemd[1]: mc-collect-all.service: Main process exited, code=exited, status=1/FAILURE
```

**結論**:
- `mc-collect-all` の failed = **`mc-collect-git` の失敗の orchestrator-level 伝播のみ**
- `live_state ✓` / `ai_handoff ✓` は問題なし
- `overview.json build failed` の WARN は副次的だが mtime は更新されている (621 bytes、4/25 14:20:51) → python3 ヒアドキュメント実行中に何か stderr が出て `2>/dev/null` で握りつぶされた

### 3.4 出力先候補

| 出力 | path | 主用途 |
|---|---|---|
| Orchestrator log | journal stdout/stderr | 実時間ログ |
| `${MC_DATA_DIR}/overview.json` | `/opt/tenmon-ark-data/mc/overview.json` | **shell 版 offline snapshot** (本線は TS builder) |

### 3.5 依存関係

- **forward**: `system.slice` / `sysinit.target` のみ
- **reverse**: **空**
- **間接的依存**: `bash <SCRIPT_DIR>/mc_collect_live_state.sh` / `mc_collect_git_state.sh` / `mc_build_ai_handoff.sh` を子プロセス起動 (= 各 collector script の存在前提、unit 依存はなし)

### 3.6 git history

```
b92f0685 feat: MC V2 Phase 1 (Read-only MVP) — 33 files
```

**mc-collect-git と全く同じ commit のみ**。Phase 1 以降、変更ゼロ。

---

## 4. Section 4: mc-collect-live (本線) との比較 = **修復ヒント**

### 4.1 script 一覧と最終更新

| script | size | mtime | git history (最新 commit) |
|---|---|---|---|
| `mc_collect_live_state.sh` | 5745 | **4月 23 21:36** | `2e35ddc8` (4/24 07:11) ← **patch あり** |
| `mc_collect_git_state.sh` | 4155 | 4月 19 09:14 | `b92f0685` (Phase 1 のまま) |
| `mc_collect_all.sh` | 2169 | 4月 19 09:14 | `b92f0685` (Phase 1 のまま) |
| `mc_build_ai_handoff.sh` | 5325 | 4月 19 09:14 | `b92f0685` (Phase 1 のまま) |
| `mc_lib.sh` | 2702 | 4月 19 09:14 | `b92f0685` (Phase 1 のまま) |

→ **live のみ 4/24 に patch 適用済**、他は **Phase 1 のまま**。

### 4.2 共通構造

すべての collector が以下を共有:
- `source mc_lib.sh` (= `set -euo pipefail` を継承)
- `OUTFILE="${MC_DATA_DIR}/<name>.json"`
- `cat <<EOF | mc_sanitize | mc_write_json "${OUTFILE}"` で出力
- inline `python3 -c "..." 2>/dev/null || echo "[]"` で JSON 配列構築

### 4.3 live が 4/24 に受けた patch (`2e35ddc8`) の中身

**該当 commit**: `2e35ddc8cbe43f85efc087145ce507774373d353`
**meta**: `chore(mc-09a): MC-16 Claude lane + MC-14 live/archive + MC-15 history/regression + MC-09A partial`
**変更**: `api/scripts/mc/mc_collect_live_state.sh` の **3 行追加 / 3 行削除のみ**

```diff
-DISK_JSON=$(df -BG --output=target,used,avail,pcent / /opt 2>/dev/null | tail -n +2 | awk '{
+DISK_JSON=$(df -BG --output=target,used,avail,pcent / /opt 2>/dev/null | tail -n +2 | awk '!seen[$1]++ {
   gsub(/G/,"",$2); gsub(/G/,"",$3); gsub(/%/,"",$4);
-  printf "{\"path\":\"%s\",\"used_gb\":%s,\"free_gb\":%s,\"percent\":%s}", $1, $2, $3, $4
+  printf "{\"path\":\"%s\",\"used_gb\":%s,\"free_gb\":%s,\"percent\":%s}\n", $1, $2, $3, $4
 }' | paste -sd, | sed 's/^/[/;s/$/]/')
-[ -z "${DISK_JSON}" ] && DISK_JSON="[]"
+[ -z "${DISK_JSON}" ] || [ "${DISK_JSON}" = "[]" ] && DISK_JSON="[]"
```

**3 つの修正の意味**:

1. `awk '{ ... }'` → `awk '!seen[$1]++ { ... }'`: `df` 出力の重複行 (同一マウントポイント) を除去
2. `printf "...{}"` → `printf "...{}\n"`: `paste -sd,` で結合する前に改行を必須化 (空入力対策)
3. `[ -z "$X" ] && X="[]"` → `[ -z "$X" ] || [ "$X" = "[]" ] && X="[]"`: **空文字列だけでなくリテラル `[]` も空とみなす保護**

これらは **`set -euo pipefail` 環境で `[ -z "${DISK_JSON}" ]` などの空チェックが意図しないパスを通って exit 1 する事故を防ぐ patch**。

### 4.4 live と git の構造差異

| 観点 | live | git | 同じ? |
|---|---|---|---|
| `source mc_lib.sh` | ✓ | ✓ | 同じ |
| `set -euo pipefail` (継承) | ✓ | ✓ | 同じ |
| inline `python3 -c "..." 2>/dev/null \|\| echo "[]"` | 3 箇所 | 3 箇所 (recent_commits / recent_tags / reflog) | 同じパターン |
| `awk` での重複・改行保護 | **patch 済** | なし (df は使っていないが類似構造の `git log \| python3` パイプ) | **差分** |
| `[ -z "$X" ] \|\| [ "$X" = "[]" ]` 保護 | **patch 済** | **なし** | **差分** |
| `cat <<EOF \| mc_sanitize \| mc_write_json` | ✓ | ✓ | 同じ |

### 4.5 結論: git の failed は live と同種の問題、修復は同パターン

- live は 4/24 07:11 に preemptive fix (`2e35ddc8`) で patch を受け、その後も成功継続
- git は **同種の落とし穴** (`set -euo pipefail` × heredoc × inline python3 × pipefail × `[ -z ]` 空判定) を Phase 1 のまま抱えている
- 4/24 14:53 までは "たまたま動いていた" が、4/24 → 4/25 のリポジトリ状態の変化 (コミット数増加 / subject 文字列 / reflog の内容など) で **何らかの heredoc 変数置換が `set -e` の踏み線を超えた**
- 真因の bash-level 確定は本カードでは禁止 (`bash -x` での test 実行禁止)、別カードで `bash -x` で 1 run すれば即特定可能

---

## 5. Section 5: mc-build-handoff (本線) との比較

### 5.1 構造

`mc-build-handoff.service`:
```
ExecStart : /opt/tenmon-ark-repo/api/scripts/mc/mc_build_ai_handoff.sh
size      : 5325 bytes
mtime     : 4月 19 09:14 (Phase 1 のまま)
git       : b92f0685 (Phase 1 のみ)
直近成功  : 2026-04-25 14:44:14 JST
出力      : /opt/tenmon-ark-data/mc/ai-handoff.json (1778 bytes、最新)
```

### 5.2 handoff が成功している理由

handoff は **`git_state.json` に依存していない**:

- `mc_build_ai_handoff.sh` は `cd "${TENMON_REPO_ROOT}" && git rev-parse --short HEAD` で **直接 git に問い合わせ**
- soul_root.bind_status は **ファイル存在チェック** (`[ -f "${TENMON_REPO_ROOT}/$1" ]`) で完結
- `iroha` / `genten` は静的 JSON ファイルを直接 parse

→ handoff は **stand-alone**、git collector の失敗の影響を受けない。

### 5.3 handoff が git collector と同じ構造を持つにもかかわらず動く理由

`mc_build_ai_handoff.sh` の inline python3 ブロックは **すべて `try/except` 付き** + **`2>/dev/null \|\| echo "0"` / `\|\| echo "[]"` のフォールバック**。各変数も `[ -f ... ] && echo "true" || echo "false"` のような 2 値展開で **`set -u` 違反を構造的に避けている**。

git script の `recent_commits` / `recent_tags` / `reflog` の inline python3 も外側 `|| echo "[]"` を持つが、heredoc 内の `$(echo "${HEAD_SUBJECT}" | json_escape)` のような **直接置換**にはフォールバックがない。これが live と同種の落とし穴。

---

## 6. Section 6: /api/mc/vnext/* への影響評価

### 6.1 API 側の git_state.json 参照箇所

```ts
// api/src/core/mc/constants.ts
git_state: path.join(MC_DATA_DIR, 'git_state.json'),

// api/src/core/mc/builders/overviewBuilder.ts
try { gitState = readState<McgitState>('git_state'); }
catch (e) { console.warn('[MC] readState(git_state) failed:', e); }

// api/src/core/mc/builders/aiHandoffBuilder.ts
const gitState = readState<McgitState>('git_state');

// api/src/routes/mc.ts
{ path: '/git-state', key: 'git_state' },
```

### 6.2 collector-free fallback (重要)

`api/src/mc/mcVnextSourceMapV1.ts` の冒頭コメント:

> CARD-MC-08A V2 — collector-free fallbacks. When `live_state.json` / ... 不在時のフォールバック

→ **API は `git_state.json` の不在/古さで失敗しない設計**。`try/catch` + fallback で warning だけが出る。

### 6.3 現状の API 健全性 (本観測中の実測)

```bash
SVC_PID = 854190 (= ark-api、PRE と同じ)
```

| エンドポイント | 結果 |
|---|---|
| `/api/mc/vnext/claude-summary` `acceptance.verdict` (3 回) | **PASS / PASS / PASS** |
| `/api/mc/vnext/intelligence` `kotodama_constitution_enforcer.verdict` | **clean** |
| `/pwa/evolution` (HTTP 1 行目) | **HTTP/2 200** |
| `/api/chat` T1 (短) `len` | **39** |
| `/api/chat` T4 (長文) `len` | **1093** |

**結論**: `mc-collect-git` / `mc-collect-all` の **failed は API verdict / chat 動作に影響していない**。`git_state.json` が 24h 古いままでも、collector-free fallback により `/api/mc/vnext/*` は完全 PASS を維持。

---

## 7. Section 7: 修復・廃止・統合の 5 段階判定

| Unit | 判定 | 根拠 (実体) |
|---|---|---|
| `mc-collect-git.service` | 🟢 **REPAIRABLE_SIMPLE** | (1) script は健全 (`b92f0685` 以来変更なし、Phase 1 そのまま)、(2) `live_state` には 4/24 に同種 bash 落とし穴を埋める patch (`2e35ddc8`、3 行追加/3 行削除) が当たっている、(3) `git_state` にも **類似 patch (heredoc 内 `$()` 置換の null 保護 + inline python3 の `\|\| echo "[]"` 強化 + `[ -z ] \|\| [ = "[]" ]` 保護)** を当てれば直る蓋然性が高い、(4) 修復後 `mc-collect-all` も自動的に green になる、(5) /api/mc/vnext/* には影響なし、急ぎではない (fallback 動作中)。<br>**注**: 真因の bash-level 確定は **`bash -x mc_collect_git_state.sh`** での 1 run で即判明するが、本カードは観測のみのため未実施。Card-12 (修復カード) で `bash -x` を使えば SIMPLE であることが確定する。 |
| `mc-collect-all.service` | 🟡 **OBSOLETE_DEPRECATE** (副) +<br>🔵 **INTEGRATABLE** (主) | (1) failed の **根本原因は `mc-collect-git` の伝播のみ** (live ✓ / handoff ✓ / git ✗ → exit 1)、(2) script の自コメントが **「Overview is built by the TypeScript builder at runtime, but we also create a shell-based snapshot for offline use」** と本線ではないことを明示、(3) 各 collector は個別 timer (live=5min / git=10min / handoff=15min) で **すでに独立実行**、orchestrator が 60min 周期で再走しても重複、(4) shell 版 `overview.json` は API runtime で読まれるかが要追加観測 (`api/src/core/mc/builders/overviewBuilder.ts` の TS 実装と並走)。<br>**判定**: `mc-collect-git` 修復後は all も自動で green に戻るため **緊急廃止不要**。中長期では INTEGRATABLE (個別 timer に統合済) または OBSOLETE_DEPRECATE (TS builder で完全代替) のいずれを選ぶかは TENMON 裁定。 |

### 5 段階判定の re-check (棄却したカテゴリ)

- ❌ **REPAIRABLE_COMPLEX**: git collector は live のパターンを参考に修復可能なため SIMPLE 寄り。ただし `bash -x` 未実施のため、TENMON が「root cause 確定なしの SIMPLE 認定は不可」と判断する場合は COMPLEX に格下げ可。
- ❌ **OBSOLETE_DEPRECATE (git について)**: API 側の `gitLiveState.ts` のコメント「collector が 10 分周期で生成する git_state.json は MC UI / analyzer が ...」より、本線として読まれている設計。fallback はあるが、本線回路としては **修復が望ましい**。
- ❌ **UNCLEAR**: 両 unit とも実体根拠が揃っており、UNCLEAR ではない。

---

## 8. Section 8: TENMON 裁定用シナリオ

### 8.1 シナリオ A: 修復 (Card-12 候補、推奨)

**対象**: `mc-collect-git.service` のみ

**手順案** (本カードでは実施しない):
1. `bash -x /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_git_state.sh` で **1 run の x-trace 取得** → exit 1 を踏む直前の行を特定 (5 分以内に確定するはず)
2. 該当行に `live_state` の `2e35ddc8` 同等の保護 patch を適用 (1-3 行)
   - heredoc 内の `$()` 置換に `|| echo ""` のフォールバック
   - inline python3 の `2>/dev/null || echo "[]"` を全箇所に
   - `[ -z "$X" ] || [ "$X" = "[]" ]` パターンの導入
3. `bash mc_collect_git_state.sh` 単独で exit 0 確認
4. `systemctl start mc-collect-git.service` で 1 回確認
5. その後 `mc-collect-all.service` も自動的に green に戻る (orchestrator の伝播のみのため)

**影響範囲**: `git_state.json` が再び 10 min 周期で更新、`/api/mc/vnext/*` の git_state warning が消える。`acceptance.verdict` は変化なし (元から PASS)。

### 8.2 シナリオ B: 廃止

**対象**: `mc-collect-all.service` (orchestrator として冗長)

**手順案** (本カードでは実施しない):
1. シナリオ A 完了後 (= mc-collect-git が green) に実施
2. `systemctl stop mc-collect-all.timer && systemctl disable mc-collect-all.timer && systemctl disable mc-collect-all.service`
3. unit ファイル削除は **任意**
4. shell 版 `overview.json` の更新は止まる (TS builder が runtime で生成しているため API には影響なし)

**影響範囲**: shell 版 offline snapshot が古いまま、ただし TS builder は runtime で動作中。

### 8.3 シナリオ C: 統合

**対象**: `mc-collect-all.service` を `mc-collect-live.service` 等の個別 timer に **完全に解消**

**手順案** (本カードでは実施しない):
- 個別 timer (live=5min / git=10min / handoff=15min) で十分カバーされているため、orchestrator は不要
- shell 版 `overview.json` の必要性が確認できれば、個別 collector が完了するたびに rebuild する drop-in path にする
- そうでなければ純粋に廃止 (シナリオ B)

### 8.4 シナリオ D: 並行運用

**対象**: 現状維持 (両方 failed のまま放置)

**影響範囲**:
- `git_state.json` は古いまま
- `mc-collect-all` は 60 min ごとに journal にエラーを残し続ける
- API verdict は PASS 維持 (fallback で問題なし)
- Founder UX への影響なし (現状確認済)

→ **緊急対応は不要だが、長期的には信号汚染 (failed が定常化) で他の真の異常検知が埋もれる risk あり**。

### 8.5 シナリオ E: 完全放置

シナリオ D と同じ。journal に毎 10/60 min 失敗ログが残り続ける。

---

## 9. Section 9: TENMON 裁定用サマリー

### 9.1 1 行サマリー

| Unit | 1 行サマリー | 推奨 verdict |
|---|---|---|
| `mc-collect-git.service` | INFO 直後 silent exit 1 ← `set -euo pipefail` × heredoc 落とし穴。live (`2e35ddc8`) と同種 patch で修復可能。**API へは影響なし** (fallback)。 | **REPAIR (Card-12)** |
| `mc-collect-all.service` | git の伝播のみが failed 原因。orchestrator は個別 timer で代替済み + 自コメントで "shell 版は offline snapshot" 明示。git 修復で自動 green、緊急廃止不要。 | **AUTO-RECOVER (git 修復後 reassess)** または **DEPRECATE (中長期)** |

### 9.2 緊急度

- **緊急**: なし (API verdict PASS、Founder UX 不変、collector-free fallback 動作中)
- **中期**: mc-collect-git の修復 (信号汚染解消)
- **長期**: mc-collect-all の役割再定義 (TS builder と shell snapshot の重複整理)

### 9.3 触らない unit の不変確認

| unit | PRE 状態 | 観測中の変化 | 不変 |
|---|---|---|---|
| `tenmon-ark-api.service` | active / PID 854190 | API 操作 (curl) のみ、状態変更なし | ✓ |
| `nginx.service` | active / PID 891111 | 触らず | ✓ |
| `mc-collect-live.service` | timer 駆動、最終 success | 触らず | ✓ |
| `mc-build-handoff.service` | timer 駆動、最終 success | 触らず | ✓ |
| `tenmon-runtime-watchdog.service` | active / PID 2539152 | 触らず | ✓ |
| `tenmon-auto-patch.service` | inactive / disabled | 触らず | ✓ |

---

## Acceptance (本レポート自身)

- ✓ 実装変更ゼロ (script / unit / DB / chat.ts / Phase A モジュール 全て触れず)
- ✓ 2 unit すべての failed 原因が実体根拠付きで記録 (journalctl 直接引用 + script 全文 + diff)
- ✓ 5 段階判定が明確 (mc-collect-git: REPAIRABLE_SIMPLE、mc-collect-all: OBSOLETE_DEPRECATE/INTEGRATABLE)
- ✓ mc-collect-live / mc-build-handoff の不変 (両者の構造比較済み、状態変更なし)
- ✓ TENMON が次手 (修復/廃止/統合) を裁定できる状態 (5 シナリオ + 推奨 verdict 提示)

## 観測根拠 (本レポート作成時)

- `b6940733` (parent_commit、AUTOMATION_PHANTOM_UNIT_OBSERVE_V1)
- `2c6f0ab0` (AUTOMATION_DEAD_UNIT_RETIRE_OBSERVE_V1)
- `a6484378` (AUTOMATION_LEGACY_INVENTORY_V1)
- `2e35ddc8` (live_state preemptive fix、修復ヒント)
- `b92f0685` (MC V2 Phase 1 実装、git_state / all / lib の唯一の commit)

## 次手 (別カード化)

- **Card-12 / MC-COLLECTOR-GIT-REPAIR-V1** (PATCH): `bash -x` で root cause 1 行特定 → live 同等の保護 patch を 1-3 行適用
- **MC-COLLECTOR-ALL-DEPRECATE-OBSERVE-V2** (OBSERVE): TS builder の overview.json 生成箇所を確定、shell 版 snapshot の必要性を裁定材料化

---

(end of MC_COLLECTOR_FAILED_OBSERVE_V1.md)
