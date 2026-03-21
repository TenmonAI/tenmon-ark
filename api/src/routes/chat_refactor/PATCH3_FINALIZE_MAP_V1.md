# PATCH3_FINALIZE_MAP_V1

本カードでは live の finalize / wrapper ロジックは変更しない。  
目的は **単一点化の観測固定** のみ。

## 現状
- top wrapper:
  - `__TENMON_JSON_WRAP_V7`
  - `__origJsonTop`
- late wrapper:
  - `__origJson`
  - R9 ledger / rewriteUsed / rewriteDelta / sanitize 系
- reply:
  - payload 正規化
  - responseComposer
  - __tenmonGeneralGateResultMaybe
  - res.json 返却

## PATCH3の目的
- finalize責務を `chat_refactor/finalize.ts` へ退避するための土台作成
- live `chat.ts` はコメント追加のみに留める
- 次カードで wrapper の責務を「観測→移設」に進められるようにする

## 次カード
- PATCH4: wrapper/ledger/write 系の単一点観測
- PATCH5: reply single-exit 化の準備
