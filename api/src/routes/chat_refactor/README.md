# chat_refactor

本番 `chat.ts` を凍結したうえで、外部再構成するための土台ディレクトリ。

- **BASELINE_V1.md** … 責務分類（entry / route preempt / define / scripture / general / finalize / persistence）と危険箇所一覧。ロールバック基準面の参照用。
- **entry.ts**, **finalize.ts**, **general.ts**, **define.ts** … 必要に応じて責務を移す先のスタブ。本カードでは中身は未実装。

live routing / 会話本文 / routeReason の変更は行わず、以後の安全化カードを「live 直改修なし」で設計するための基準を固定する。
