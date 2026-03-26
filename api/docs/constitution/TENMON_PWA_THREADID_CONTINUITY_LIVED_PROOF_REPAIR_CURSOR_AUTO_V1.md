# TENMON_PWA_THREADID_CONTINUITY_LIVED_PROOF_REPAIR_CURSOR_AUTO_V1

## 目的
PWA lived proof の blocker を縮める。
特に
- `continuity_fail`
- `duplicate_or_bleed_fail`
- `threadId_missing`
- `sessionId` residue hot path
を優先して直す。

## 実装（web/src のみ最小 diff）
### hot path canonicalization
- mainline chat transport では request は `threadId` のみ（旧 session 名義のキーを載せない）
- response normalize も `threadId` に寄せる（sessionId フォールバック禁止）

### sessionId 残差整理
- `web/src/api/chat.ts` の `sessionId` 依存を削除
- `web/src/types/chat.ts` は mainline 実用型の中から `sessionId` を取り除く（互換説明は comment のみ）

### continuity lived proof
- thread 切替 / refresh / new chat で
  - continuity hold
  - duplicate bleed
  - threadId missing
を再検証し、ブロッカーが縮むことを確認する

## 非交渉条件
- backend 契約を壊さない
- backend ではなく web 側 hot path の責務に限定する
- dist 直編集禁止、success 捏造禁止

## 検証（acceptance）
- `tenmon_pwa_lived_completion_readiness.json` が改善する
- lived proof が `final_ready=true` へ寄る
- `sessionid_residue_count` が（静的・動的）で縮小
- `threadId_missing_in_response` が残らない

*Version: 1*

