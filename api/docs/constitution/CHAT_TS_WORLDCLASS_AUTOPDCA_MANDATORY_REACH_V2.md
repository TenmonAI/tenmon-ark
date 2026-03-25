# CHAT_TS_WORLDCLASS_AUTOPDCA_MANDATORY_REACH_V2

## 1. 主軸（Cursor 完全自動構築）

今後の chat.ts 系改善は **必ず** 次の順で進める。

1. **Cursorカード**（自然言語の作業指示・EDIT_SCOPE のみ。bash 本体は書かない）
2. **実装差分**（Cursor 上で最小 diff。1 変更 = 1 意図）
3. **VPS検証カード**（VPS 上で実行する bash / systemd / curl / seal 等の「実行束」）
4. **acceptance**（静的・runtime・surface の判定）
5. **next PDCA**（FAIL 時は証拠束 + 次カード名を固定）

**禁止語運用**: **VPSカード単体を「Cursorカード」と呼ばない。**  
Cursorカード = `generated_cursor_apply` に置く *実装前* の指示書。  
VPSカード = VPS で回す *検証・ログ採取用* のカード（従来 Stage1/2/3 bash に相当）。

## 2. 用語対応表

| 概念 | カード名（例） | 置き場所 |
|------|----------------|----------|
| 親 Cursor | `CHAT_TS_WORLDCLASS_PARENT_CURSOR_AUTO_V1` | `api/automation/generated_cursor_apply/` |
| Stage1 Cursor（surface） | `CHAT_TS_STAGE1_SURFACE_POLISH_CURSOR_AUTO_V1` | 同上 |
| Stage2 Cursor（route） | `CHAT_TS_STAGE2_ROUTE_AUTHORITY_CURSOR_AUTO_V1` | 同上 |
| Stage3 Cursor（seal） | `CHAT_TS_STAGE3_WORLDCLASS_SEAL_CURSOR_AUTO_V1` | 同上 |
| **Stage5 Cursor（最終束ね）** | **`CHAT_TS_STAGE5_WORLDCLASS_SEAL_AND_BASELINE_CURSOR_AUTO_V1`** | 同上 |
| VPS Stage1 | **`CHAT_TS_STAGE1_SURFACE_NEXT_PDCA_V1`** | 同上（実行手順は VPS 側スクリプト） |
| VPS Stage2 | **`CHAT_TS_STAGE2_ROUTE_NEXT_PDCA_V1`** | 同上 |
| VPS Stage3 | **`CHAT_TS_STAGE3_WORLDCLASS_NEXT_PDCA_V1`** | 同上 |
| **VPS Stage5** | **`CHAT_TS_STAGE5_WORLDCLASS_SEAL_VPS_V1`** | `chat_ts_worldclass_autopdca_mandatory_reach_v2.sh` / seal |

## 3. 到達定義（Stage5 束ね）

- `chat_ts_static_100=true`
- `chat_ts_runtime_100=true`
- `surface_clean=true`
- **`route_authority_clean=true`**
- **`longform_quality_clean=true`**
- **`density_lock=true`**
- `chat_ts_overall_100=true`（上記すべての論理積。`tenmon_chat_ts_worldclass_completion_report_v1.py` と seal merge で一致）

## 4. 固定優先順（本丸の合意）

現状の主戦場は build failure ではなく **surface noise** と **route authority**。

1. surface polish（Stage1）
2. route authority correction（Stage2）
3. density / trunk lock（必要時）
4. worldclass seal（Stage3）

## 5. 3 Stage（意味）

- **STAGE1** — surface_bleed_zero / surface polish  
- **STAGE2** — route_authority_recovery  
- **STAGE3** — baseline_and_worldclass_seal  

## 6. Non-Negotiables

- 憶測禁止、原因未断定 PATCH 禁止  
- 最小 diff / 1 変更 = 1 検証  
- **dist 直編集禁止**  
- acceptance PASS 以外の「完成宣言」禁止  
- `decisionFrame.ku` は常に object  
- GROUNDED 捏造禁止  
- LLM 既定禁止（許可ゲートのみ）  
- smoke-hybrid `threadId` を LLM_CHAT に入れない  
- **kokuzo_pages 正文の自動改変禁止**  
- FAIL 時は証拠束採取 + **exit≠0** + 次カード名を記録  

## 7. VPS 検証で必ず参照するアウトプット

- **VPSカード名**: `CHAT_TS_STAGE1_SURFACE_NEXT_PDCA_V1` / `CHAT_TS_STAGE2_ROUTE_NEXT_PDCA_V1` / `CHAT_TS_STAGE3_WORLDCLASS_NEXT_PDCA_V1`
- **スクリプト**: `api/scripts/chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh`
- **レポート**: `api/automation/tenmon_chat_ts_worldclass_completion_report_v1.py`（`--stdout-json` 等）

## 8. 自動生成物

`CHAT_TS_WORLDCLASS_NEXT_PDCA_AUTO_V2.md` 等は **VPS seal 側が生成する次手メモ**であり、Cursorカードではない。

## 9. Cursor 側 FAIL の次カード

親フロー失敗時の再編カード名: **`CHAT_TS_WORLDCLASS_PARENT_CURSOR_AUTO_RETRY_V1`**（指示の見直し・EDIT_SCOPE の再分割）。

## 9b. Completion supplement（判定の一貫性）

- **カード**: `CHAT_TS_COMPLETION_SUPPLEMENT_CURSOR_AUTO_V1` / **VPS**: `CHAT_TS_COMPLETION_SUPPLEMENT_VPS_V1`
- **スクリプト**: `api/automation/tenmon_chat_ts_completion_supplement_v1.py` + `api/automation/chat_ts_completion_dispatch_registry_v1.json`
- **役割**: report / seal / next-card の **食い違い記録**、**canonical = seal final**（同一 seal ディレクトリ文脈）、**blocker → Stage カード dispatch**
- **憲章**: `CHAT_TS_COMPLETION_SUPPLEMENT_V1.md`

## 10a. 残差改善（residual quality loop）

- **カード**: `CHAT_TS_RESIDUAL_IMPROVEMENT_CURSOR_AUTO_V1` / **VPS**: `CHAT_TS_RESIDUAL_IMPROVEMENT_VPS_V1`
- **スクリプト**: `api/automation/tenmon_chat_ts_residual_quality_score_v1.py` / `api/scripts/chat_ts_residual_improvement_v1.sh`
- **役割**: seal 出力から **5 軸スコア**を付け、**最低 1〜3 軸**を既存 **Stage1/2/3/5/POSTLOCK** カードへ**委譲**（本ループは**解析のみ**、本体一括改修はしない）。
- **憲章**: `CHAT_TS_RESIDUAL_IMPROVEMENT_V1.md`

## 10. POSTLOCK メンテナンス（完成後の退行検出）

- **カード**: `CHAT_TS_POSTLOCK_MAINTENANCE_CURSOR_AUTO_V1` / **VPS**: `CHAT_TS_POSTLOCK_MAINTENANCE_VPS_V1`
- **スクリプト**: `api/automation/tenmon_chat_ts_postlock_maintenance_v1.py` / `api/scripts/chat_ts_postlock_maintenance_v1.sh`
- **役割**: `chat.ts` **本体は変更せず**、seal 出力（runtime / surface / report / route / longform / density）を束ね、**baseline との差分**で退行のみ検出する。
- **統合**: `chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh` が PASS 後に maintenance を実行（`CHAT_TS_POSTLOCK_MAINTENANCE_SKIP=1` で無効化）。
- **厳格化**: `CHAT_TS_POSTLOCK_MAINTENANCE_ENFORCE=1` で seal を maintenance FAIL 時に **exit 1**。
- **baseline 更新**: `CHAT_TS_POSTLOCK_UPDATE_BASELINE=1`（退行なしの実行後に baseline を上書き）。

---

*Version: V2 — Cursor 主軸 + VPS 検証の二層に再編*
