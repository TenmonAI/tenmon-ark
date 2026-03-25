# TENMON_FINAL_COMPLETION_PHASE1_CONVERSATION_AND_SURFACE_CURSOR_AUTO_V1

## 目的

**会話継続性**（continuity hold）と **PWA 表層の残滓 / hygiene** を先に固定する Phase1。  
子カード相当: `TENMON_CHAT_CONTINUITY_ROUTE_HOLD_*` + `TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_*` を同一フェーズで観測・封印する。

## D

- frontend / route hold / hygiene のみ・**backend 大改修禁止**
- `chat.ts` は **最小 diff**
- `threadId` 正典を壊さない
- `sessionId` は **残滓検出・誤参照遮断**（Train/Training 系は別系統として除外）
- `.bak` は **観測→方針→最小削除**（まず `.gitignore` と監視）
- 証拠: `pwa_frontend_residue_hygiene_evidence.json` / `tenmon_phase1_conversation_surface_verdict.json`

## 実装メモ

- **continuity**: `chat_refactor/continuity_trunk_v1.ts` — `dialogueContract.continuity_goal` がある場合は hold 文脈必須、`next_best_move` / `keep_center` を本文芯に反映
- **verdict**: `api/automation/tenmon_phase1_conversation_surface_verdict_v1.py`

## 実行

```bash
cd /opt/tenmon-ark-repo/api
npm run build
# … API 再起動後、2ターン probe の JSON を渡して verdict 生成
TENMON_PHASE1_CHAT1_JSON=/tmp/phase1_chat1.json \
TENMON_PHASE1_CHAT2_JSON=/tmp/phase1_chat2.json \
python3 api/automation/tenmon_phase1_conversation_surface_verdict_v1.py --stdout-json
```

`phase1_pass` が false のとき **exit 1**。

## FAIL_NEXT

`TENMON_FINAL_COMPLETION_PHASE1_CONVERSATION_AND_SURFACE_RETRY_CURSOR_AUTO_V1`
