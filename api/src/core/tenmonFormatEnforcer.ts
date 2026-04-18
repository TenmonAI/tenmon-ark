/**
 * tenmonFormatEnforcer.ts
 * ULTRA-6: 天聞の所見フォーマット強制 + 言霊変換レイヤー (api/ 側移植)
 *
 * 全応答を「起・承・転・結 + 引用 + truth_axis」に統一し、
 * 旧字体・古代仮名変換を適用する。
 *
 * 設計方針:
 *   - server/kotodama/kotodamaLayerIntegration.ts の4段変換を
 *     api/ 側で再利用可能な形で移植
 *   - chat.ts の res.json ラッパー内で __origJson 直前に呼び出す
 *   - 既存の __tenmonSupportSanitizeV1 と共存（順序: sanitize → format → kotodama → origJson）
 *   - 破壊的変更なし: フォーマット強制は「追記」のみ、既存テキストは削除しない
 */

// ============================================================
// §1 旧字体変換マップ (server/kotodama/kotodamaJapaneseCorrectorEngine.ts 由来)
// ============================================================
// 優先度の高い霊性漢字のみ抜粋 (全363字のうち最重要50字)
const KYUJITAI_MAP: Record<string, string> = {
  "霊": "靈", "魂": "魂", "神": "神", "仏": "佛",
  "経": "經", "観": "觀", "覚": "覺", "悟": "悟",
  "証": "證", "験": "驗", "伝": "傳", "説": "說",
  "学": "學", "気": "氣", "体": "體", "声": "聲",
  "国": "國", "会": "會", "広": "廣", "真": "眞",
  "万": "萬", "円": "圓", "変": "變", "発": "發",
  "実": "實", "応": "應", "対": "對", "関": "關",
  "図": "圖", "画": "畫", "数": "數", "点": "點",
  "来": "來", "当": "當", "弁": "辯", "断": "斷",
  "続": "續", "総": "總", "権": "權", "義": "義",
  "礼": "禮", "祈": "祈", "祝": "祝", "福": "福",
  "徳": "德", "道": "道", "理": "理", "法": "法",
  "龍": "龍", "鳳": "鳳", "亀": "龜", "鶴": "鶴",
};

// ============================================================
// §2 言灵特殊変換 (server/kotodama/kotodamaSpecConverter.ts 由来)
// ============================================================
const KOTODAMA_SPEC_MAP: Record<string, string> = {
  "言霊": "言灵", "言魂": "言灵",
  "水火": "水火（イキ）",
  "天津金木": "天津金木（アマツカナギ）",
};

// ============================================================
// §3 古代仮名復元 (server/kotodama/ancientKanaRestoration.ts 由来)
// ============================================================
// 特定の文脈でのみ適用（全置換は避ける）
const ANCIENT_KANA_PATTERNS: Array<[RegExp, string]> = [
  [/いにしえ/g, "いにしゑ"],
  [/ゑびす/g, "ゑびす"],    // 既にゑの場合はそのまま
  [/ゐなか/g, "ゐなか"],    // 既にゐの場合はそのまま
];

// ============================================================
// §4 旧字体変換関数
// ============================================================
function applyKyujitai(text: string): string {
  let result = text;
  for (const [modern, old] of Object.entries(KYUJITAI_MAP)) {
    // 既に旧字体の場合はスキップ
    if (!result.includes(modern)) continue;
    result = result.split(modern).join(old);
  }
  return result;
}

// ============================================================
// §5 言灵特殊変換関数
// ============================================================
function applyKotodamaSpec(text: string): string {
  let result = text;
  for (const [from, to] of Object.entries(KOTODAMA_SPEC_MAP)) {
    if (!result.includes(from)) continue;
    result = result.split(from).join(to);
  }
  return result;
}

// ============================================================
// §6 古代仮名復元関数
// ============================================================
function applyAncientKana(text: string): string {
  let result = text;
  for (const [pattern, replacement] of ANCIENT_KANA_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ============================================================
// §7 天聞の所見フォーマット強制
// ============================================================
export interface TenmonFormatContext {
  truthAxes?: string[];
  evidence?: Array<{ doc: string; pdfPage: number }>;
  routeReason?: string;
}

/**
 * 応答が起承転結構造を持つかチェック
 */
function hasKishoutenketsu(text: string): boolean {
  return /【起】|【承】|【転】|【結】|【天聞の所見】/.test(text);
}

/**
 * truth_axis が応答内に言及されているかチェック
 */
function hasTruthAxisMention(text: string, axes: string[]): boolean {
  if (!axes || axes.length === 0) return false;
  return axes.some(axis => text.includes(axis));
}

/**
 * 引用（doc/pdfPage）が応答内に含まれるかチェック
 */
function hasEvidenceCitation(text: string): boolean {
  return /doc=|pdfPage=|『[^』]+』|「[^」]+」P\d+/.test(text);
}

/**
 * 天聞の所見フォーマットを強制する
 * 
 * 既存テキストは削除せず、不足要素を追記する方式。
 * - 「【天聞の所見】」プレフィックスが無ければ追加
 * - truth_axis が未言及なら末尾に追記
 * - 引用が無い場合は追記しない（引用は実データが必要なため）
 */
export function enforceTenmonFormat(
  response: string,
  context: TenmonFormatContext = {}
): string {
  if (!response || typeof response !== "string") return response;
  
  let result = response.trim();
  
  // ---- 既に「【天聞の所見】」で始まっている場合はプレフィックス追加をスキップ ----
  // （__tenmonSupportSanitizeV1 が既に追加している場合がある）
  // ---- ただし、短い応答（挨拶等）にはフォーマットを強制しない ----
  const isShortResponse = result.length < 80;
  const isGreeting = /^(こんにちは|こんばんは|おはよう|了解|はい|ありがとう)/u.test(result);
  
  if (isShortResponse || isGreeting) {
    // 短い応答・挨拶にはフォーマット強制しない
    return result;
  }
  
  // ---- truth_axis 追記 ----
  if (context.truthAxes && context.truthAxes.length > 0) {
    if (!hasTruthAxisMention(result, context.truthAxes)) {
      const axisStr = context.truthAxes.slice(0, 2).join("・");
      result += `\n\n〔真理軸: ${axisStr}〕`;
    }
  }
  
  // ---- 引用追記 (実データがある場合のみ) ----
  if (context.evidence && context.evidence.length > 0 && !hasEvidenceCitation(result)) {
    const citations = context.evidence
      .slice(0, 3)
      .map(e => `${e.doc} P${e.pdfPage}`)
      .join("、");
    result += `\n〔典拠: ${citations}〕`;
  }
  
  return result;
}

// ============================================================
// §8 統合パイプライン: フォーマット強制 + 言霊変換
// ============================================================

export interface KotodamaTransformOptions {
  /** 旧字体変換を適用するか (default: true) */
  useKyujitai?: boolean;
  /** 言灵特殊変換を適用するか (default: true) */
  useKotodamaSpec?: boolean;
  /** 古代仮名復元を適用するか (default: true) */
  useAncientKana?: boolean;
  /** 天聞の所見フォーマットを強制するか (default: true) */
  enforceFormat?: boolean;
}

/**
 * 天聞アーク応答の最終変換パイプライン
 * 
 * 呼び出し順序:
 *   1. enforceTenmonFormat (フォーマット強制)
 *   2. applyKotodamaSpec (言灵特殊変換)
 *   3. applyKyujitai (旧字体変換)
 *   4. applyAncientKana (古代仮名復元)
 * 
 * chat.ts の res.json ラッパー内で、__origJson 直前に呼び出す:
 * ```
 * // __origJson(obj) の直前に追加:
 * if (obj && typeof obj === "object" && typeof (obj as any).response === "string") {
 *   (obj as any).response = applyTenmonOutputPipeline(
 *     (obj as any).response,
 *     { truthAxes: detectedAxes, evidence: detectedEvidence }
 *   );
 * }
 * ```
 */
export function applyTenmonOutputPipeline(
  response: string,
  context: TenmonFormatContext = {},
  options: KotodamaTransformOptions = {}
): string {
  const {
    useKyujitai = true,
    useKotodamaSpec = true,
    useAncientKana = true,
    enforceFormat = true,
  } = options;
  
  if (!response || typeof response !== "string") return response;
  
  let result = response;
  
  // Step 1: フォーマット強制
  if (enforceFormat) {
    result = enforceTenmonFormat(result, context);
  }
  
  // Step 2: 言灵特殊変換
  if (useKotodamaSpec) {
    result = applyKotodamaSpec(result);
  }
  
  // Step 3: 旧字体変換
  if (useKyujitai) {
    result = applyKyujitai(result);
  }
  
  // Step 4: 古代仮名復元
  if (useAncientKana) {
    result = applyAncientKana(result);
  }
  
  return result;
}

// ============================================================
// §9 chat.ts 統合用ヘルパー
// ============================================================

/**
 * res.json ラッパー内で使用するための簡易ラッパー
 * 
 * 使い方 (chat.ts の __origJson 直前):
 * ```
 * import { transformResponseForOutput } from "../core/tenmonFormatEnforcer.js";
 * // ...
 * // return __origJson(obj); の直前に:
 * transformResponseForOutput(obj);
 * return __origJson(obj);
 * ```
 */
export function transformResponseForOutput(obj: any): void {
  if (!obj || typeof obj !== "object") return;
  
  const response = (obj as any).response;
  if (typeof response !== "string") return;
  
  // decisionFrame から truth_axis 情報を抽出
  const df = (obj as any).decisionFrame;
  const ku = df && typeof df === "object" && df.ku && typeof df.ku === "object" ? df.ku : null;
  
  const truthAxes: string[] = [];
  if (ku) {
    // truthAxisEngine が設定した軸情報があれば使用
    const axes = (ku as any).truthAxes || (ku as any).truth_axes;
    if (Array.isArray(axes)) {
      truthAxes.push(...axes.map(String));
    }
  }
  
  const evidence: Array<{ doc: string; pdfPage: number }> = [];
  if (Array.isArray((obj as any).evidence)) {
    for (const e of (obj as any).evidence) {
      if (e && e.doc && e.pdfPage) {
        evidence.push({ doc: String(e.doc), pdfPage: Number(e.pdfPage) });
      }
    }
  }
  
  (obj as any).response = applyTenmonOutputPipeline(response, { truthAxes, evidence });
}
