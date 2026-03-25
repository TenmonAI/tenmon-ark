# TENMON_SURFACE_TEMPLATE_CLEAN_FINALIZE_CURSOR_AUTO_V1

## 目的

会話**表面**に漏れていた定型テンプレを `finalize.ts` から除去し、天聞らしさと実用会話の両方を損なう同一文の繰り返しを止める。  
**意味生成・ルーティング（`routeReason`）は変更しない。**

## 変更内容（finalize.ts のみ）

1. **デフォルト字面の除去**（`shapeScriptureEssenceSurfaceV1`）  
   - `structure` / `modern` のフォールバックを空文字。  
   - コアと重複した `structure` は空にし、`[core, structure, modern].filter(Boolean)` で連結。

2. **最終ストリップ**（`stripSurfaceTemplateLeakFinalizeV1`）  
   `stripScripturePlaceholderAndTraceV1` の後、連続性ホールド処理の後、**`out.response` 代入直前**に適用。早期出口（明示長文 / grounding / beauty）の `out.response` にも同関数を通す。

除去対象（代表）:

- `語義・作用・読解の軸を分けて読むと、要点が崩れにくいです。`
- `語義・作用・読解の軸を分けると、主張の射程が崩れにくくなります。`
- `現代では、概念を押さえたうえで判断や実装に一段だけ落とすと使えます。`
- `について、今回は…の立場で答えます。`（可変部分は正規表現で吸収）
- `判断軸（内部参照は要約表示）について…`

## 非交渉

- 最小 diff、`finalize.ts` のみ。
- `routeReason` の契約を壊さない。
- surface のクリーンアップのみ（内部推論ロジックは触らない）。
- `npm run build` PASS 必須。

## 受け入れ（運用）

- 以下プローブで上記定型の**漏れ 0 件**（手動または E2E）:
  - `君の思考を聞きたい`
  - `教えて`
  - `今日の大分の天気は？`
  - `現代人のよくない点を教えて`
- `routeReason` は従来通り維持。
- デプロイ後 `GET /api/health`（または readiness）が PASS。

## NEXT

- PASS → `TENMON_CONTEXT_CARRY_FACTUAL_SKIP_ROUTING_CURSOR_AUTO_V1`
- FAIL → `TENMON_SURFACE_TEMPLATE_CLEAN_FINALIZE_RETRY_CURSOR_AUTO_V1`
