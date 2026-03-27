# TENMON_DANSHARI_LIFE_ORDER_KERNEL_CURSOR_AUTO_V1

## 目的

人生相談・生活秩序に関する問いに対し、**断捨離（整理・廃棄・離脱の三段）**を **生活秩序のメタ kernel** として抽象化する（物販用語の宣伝ではなく、**構造：何を止め、何を残すか**の裁定軸）。  
KHS root と混同せず、**補助軸（auxiliary / mapping 寄り）**として `thoughtCoreSummary` に載せる。

## D

- 最小 diff
- 1 変更 = 1 検証
- fail-closed
- broad rewrite 禁止
- **KHS root を唯一の法則源**— 断捨離は **秩序メタ**（root 代替禁止）
- `routeReason` / `decisionFrame` / `thoughtCoreSummary` 契約維持
- `chat.ts` 広域改修禁止、`finalize` 大改修禁止
- `web/src/**` 触らない、`dist` 直編集禁止
- スピリチュアル補間・断捨離商業語彙の羅列禁止
- build / audit PASS 以外 rollback

## Root / Layer

- **Root:** KHS（既存 fractal / kotodama 系）
- **本カードの kernel:** 「秩序・取舍」の **補助裁定**（danshari meta）
- **Mapping:** いろは・生活相談の文脈があれば `tenmonIrohaLifeCounselingKernelV1` と **併記可**（同一視禁止）

## 対象ファイル

### 新規（推奨）

- `api/src/core/tenmonDanshariLifeOrderKernelV1.ts`

### 編集可（最小）

- `api/src/core/knowledgeBinder.ts`

### 編集禁止

- `api/src/routes/chat.ts`（広域）
- `api/src/core/responseComposer.ts`（本カードでは観測のみ）
- `web/src/**`

## 新規モジュール契約

出力（例）:

- `card`: `"TENMON_DANSHARI_LIFE_ORDER_KERNEL_CURSOR_AUTO_V1"`
- `danshariOrderAxis`: `"断" | "捨" | "離" | "observe"` など短文
- `danshariCenterClaim`: root と混同しない一文（秩序の中心を観測）
- `danshariTension`: `string | null`
- `danshariProjectionHint`: 次の一手を一段だけ（断定禁止）

`resolveDanshariLifeOrderKernelV1(message: string, routeReason: string)`

- メッセージに整理・手放し・関係・優先順位・迷いの停止などの **秩序語**がなければ **null**
- 経典専用 route では原則 **null**

## knowledgeBinder

- `thoughtCoreSummaryPatch.danshariLifeOrderKernelV1` に bundle または省略

## acceptance

1. 人生相談系プロンプトで非 null、経典プローブで null または未衝突
2. bundle に「KHS=断捨離」などの **同一視表現が無い**
3. build PASS

## 出力（automation JSON）

```json
{
  "ok": true,
  "card": "TENMON_DANSHARI_LIFE_ORDER_KERNEL_CURSOR_AUTO_V1",
  "danshari_life_order_kernel_ready": true,
  "auxiliary_only": true,
  "khs_root_preserved": true,
  "rollback_used": false,
  "next_card_if_fail": "TENMON_DANSHARI_LIFE_ORDER_KERNEL_TRACE_CURSOR_AUTO_V1"
}
```
