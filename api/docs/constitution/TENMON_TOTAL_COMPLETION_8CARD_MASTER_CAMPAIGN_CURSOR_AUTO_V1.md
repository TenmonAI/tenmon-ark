# TENMON_TOTAL_COMPLETION_8CARD_MASTER_CAMPAIGN_CURSOR_AUTO_V1

## 目的

天聞アークの current band が `code_complete_lived_unproven` に留まっている主因を、**PWA lived env → lived truth recovery → frontend last-mile closure → conversation continuity completion → final seal** の順で最小 diff / **1 変更 = 1 検証**で閉じ、**完成領域まで押し上げる 8 枚固定キャンペーン**として運用する。

本カードは **親カード**。**実装本体は子カード 8 枚**。親は **順序・依存・停止条件・PASS 条件のみ**を固定する。親カード自身は **product patch を当てない**。

---

## D（憲法）

- 最小 diff
- **1 変更 = 1 検証**
- **dist 直編集禁止**
- **repo → build → deploy/restart → audit → acceptance**
- cause 未断定 patch 禁止
- **acceptance PASS 以外封印禁止**
- **env failure と product failure を混同しない**
- **false fail を true blocker として扱わない**
- 優先は **内部知能追加ではなく接続面の整流**
- 本 campaign は **completion 専用**
- 各カードは **PASS/FAIL を明示**し、**FAIL なら次カードへ飛ばさず停止**
- **依存順序を崩さない**

---

## 現在の Evidence（固定・運用時は更新）

運用開始時点のスナップショット例（子カードで差し替え・更新する）:

- `/api/audit` 応答あり
- `/api/audit.build` 応答あり
- `/api/chat` は `threadId` / `decisionFrame` / `threadCore` / `threadCoreLinkSurfaceV1` を返す
- `threadid_surface_pass=true`
- PWA lived blockers 例: `url_sync_missing`, `refresh_restore_fail`, `newchat_reload_residue`, `continuity_fail`, `duplicate_or_bleed_fail`, `gate_audit_build_fail`
- `/api/health` は環境により 404 等になり得る（**env と product を分離**）
- Python `pip` / Python Playwright 不在時は **env カード優先**
- Node Playwright 存在時は preflight の driver 選択に従う
- `reload_residue_count` / `sessionid_residue_count` / `untracked_count` / `status_band` は hygiene レポートで観測

---

## 子カード固定順（8 枚）

### Phase 1: lived truth recovery

| 順 | カード名 |
|----|----------|
| 1 | `TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1` |
| 2 | `TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_CURSOR_AUTO_V1` |

### Phase 2: frontend last-mile closure

| 順 | カード名 |
|----|----------|
| 3 | `TENMON_PWA_THREAD_URL_CONSTITUTION_CURSOR_AUTO_V1` |
| 4 | `TENMON_PWA_NEWCHAT_SURFACE_BINDING_CURSOR_AUTO_V1` |
| 5 | `TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_CURSOR_AUTO_V1` |

### Phase 3: conversation completion

| 順 | カード名 |
|----|----------|
| 6 | `TENMON_CHAT_CONTINUITY_ROUTE_HOLD_CURSOR_AUTO_V1` |
| 7 | `TENMON_CHAT_SURFACE_DEDUP_AND_EXIT_CONTRACT_CURSOR_AUTO_V1` |

### Phase 4: seal

| 順 | カード名 |
|----|----------|
| 8 | `TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1` |

---

## 実行規則

- 各子カードは **単独で Cursor キュー投入可能な完成文面**で運用する。
- **PASS したカードのみ**次へ進む。
- **FAIL** したら Evidence を採取し、そのカードの **retry 版**を生成する（次カードに進まない）。
- **env 系カード（Phase 1）が未通過**の状態で lived final / seal に進まない。
- **frontend residue** が残っている状態で **final seal** しない。
- **continuity hold** が未通過の状態で **worldclass claim** しない。

---

## 停止条件（completion 到達の定義）

次の **すべて**を満たしたとき completion 到達とみなす。

- `pwa_playwright_preflight.json` で **`usable=true`**
- lived recheck 後に true blocker が **major 0**、または **cosmetic only**
- `url_sync_pass=true`
- `refresh_restore_pass=true`
- `newchat_pass=true`
- `continuity_pass=true`
- `duplicate_or_bleed_pass=true`
- 2ターン継続で `routeReason` が即 **`NATURAL_GENERAL_LLM_TOP`** に落ちない（hold / 継続契約の証跡）
- `pwa_final_seal_and_regression_guard_verdict.json` で **`unified_pass=true`**
- **regression guard 書込**まで完了

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
  - 該当 JSON verdict
- **次カードへ進む前に** retry カードを切る。

---

## FAIL_NEXT_CARD

`TENMON_TOTAL_COMPLETION_8CARD_MASTER_CAMPAIGN_RETRY_CURSOR_AUTO_V1`

（retry 用の生成物・手順は `api/automation/generated_cursor_apply/TENMON_TOTAL_COMPLETION_8CARD_MASTER_CAMPAIGN_RETRY_CURSOR_AUTO_V1.md` を参照）

---

## PASS 条件（本親カード）

- 本 campaign の **8 枚順序・依存・停止条件**が固定される。
- 子カード群が **completion 最短ルート**として運用できる。
- Cursor へ **親カード → 子カード順**でそのまま投入可能。

---

## 参照（子カード憲法・実装）

- `TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1`（憲法・スクリプト）
- `TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_CURSOR_AUTO_V1`（スクリプト）
- `TENMON_PWA_THREAD_URL_CONSTITUTION_CURSOR_AUTO_V1`
- `TENMON_PWA_NEWCHAT_SURFACE_BINDING_CURSOR_AUTO_V1`
- `TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_CURSOR_AUTO_V1`
- `TENMON_CHAT_CONTINUITY_ROUTE_HOLD_CURSOR_AUTO_V1`
- `TENMON_CHAT_SURFACE_DEDUP_AND_EXIT_CONTRACT_CURSOR_AUTO_V1`（該当憲法があれば）
- `TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1`

---

*Version: 1 — Parent orchestration only; no product patch in this card.*
