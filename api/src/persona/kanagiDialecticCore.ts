// 天津金木思考回路：弁証核（Dialectic Core）

import type { KanagiTetraState } from "./types.js";

/**
 * セッション単位でTetraStateを保持
 */
const tetraStateStore = new Map<string, KanagiTetraState>();

/**
 * 初期TetraStateを生成
 */
function createInitialTetraState(): KanagiTetraState {
  return {
    fact: [],
    interpretation: [], // 複数必須（空配列で開始）
    value: [],
    action: [],
    integration: null,
    centerAccumulation: 0,
  };
}

/**
 * セッションIDからTetraStateを取得
 */
function getTetraState(sessionId: string): KanagiTetraState {
  return tetraStateStore.get(sessionId) || createInitialTetraState();
}

/**
 * TetraStateを保存
 */
function saveTetraState(sessionId: string, state: KanagiTetraState): void {
  tetraStateStore.set(sessionId, state);
}

/**
 * ================================
 * 弁証核：矛盾の生成
 * ================================
 * 
 * 入力から正反2つ以上の解釈を生成する
 * 
 * TODO: LLM統合予定箇所
 * 現在はテンプレートベースの簡易実装
 * 将来的には LLM を使って多様な解釈を生成
 */
export function createContradictions(
  input: string,
  sessionId: string,
  thesis?: string,
  antithesis?: string
): KanagiTetraState {
  const tetra = getTetraState(sessionId);
  
  // 事実層：入力から事実を抽出（簡易版）
  const facts = extractFacts(input);
  tetra.fact = [...tetra.fact, ...facts];
  
  // 解釈層：正反2つ以上の解釈を生成（テンプレートベース）
  const interpretations = generateContradictoryInterpretations(input);
  tetra.interpretation = [...tetra.interpretation, ...interpretations];
  
  // 価値層：価値判断を抽出（簡易版）
  const values = extractValues(input);
  tetra.value = [...tetra.value, ...values];
  
  // 行動層：行動方針を抽出（簡易版）
  const actions = extractActions(input);
  tetra.action = [...tetra.action, ...actions];
  
  // thesis / antithesis を保持（DialecticDriveから渡された場合）
  if (thesis) {
    tetra.thesis = thesis;
  }
  if (antithesis) {
    tetra.antithesis = antithesis;
  }
  
  saveTetraState(sessionId, tetra);
  return tetra;
}

/**
 * 事実を抽出（簡易版）
 * 
 * TODO: LLM統合予定箇所
 */
function extractFacts(input: string): string[] {
  const facts: string[] = [];
  
  // 簡易パターンマッチング
  if (input.includes("です") || input.includes("である")) {
    facts.push(input.trim());
  }
  
  // 数値や日付などの事実的要素を抽出
  const numberPattern = /\d+/;
  if (numberPattern.test(input)) {
    facts.push(`数値が含まれている: ${input.match(numberPattern)?.[0]}`);
  }
  
  return facts;
}

/**
 * 正反2つ以上の解釈を生成（テンプレートベース）
 * 
 * TODO: LLM統合予定箇所
 * 現在は簡易テンプレートで正反の解釈を生成
 * 将来的には LLM を使って多様な解釈を生成
 */
function generateContradictoryInterpretations(input: string): string[] {
  const interpretations: string[] = [];
  
  // テンプレートベースの正反解釈生成
  // 例：「Aである」→「Aである（肯定的解釈）」と「Aではない可能性がある（否定的解釈）」
  
  // 肯定的解釈
  interpretations.push(`「${input}」という事実は、肯定的な意味を持つ可能性がある。`);
  
  // 否定的解釈
  interpretations.push(`「${input}」という事実は、否定的な意味を持つ可能性もある。`);
  
  // 中立的解釈（3つ目）
  interpretations.push(`「${input}」という事実は、文脈によって意味が変わる可能性がある。`);
  
  return interpretations;
}

/**
 * 価値判断を抽出（簡易版）
 * 
 * TODO: LLM統合予定箇所
 */
function extractValues(input: string): string[] {
  const values: string[] = [];
  
  // 価値判断のキーワードを検出
  if (input.includes("良い") || input.includes("悪い") || input.includes("正しい") || input.includes("間違い")) {
    values.push(`価値判断が含まれている: ${input}`);
  }
  
  return values;
}

/**
 * 行動方針を抽出（簡易版）
 * 
 * TODO: LLM統合予定箇所
 */
function extractActions(input: string): string[] {
  const actions: string[] = [];
  
  // 行動を示すキーワードを検出
  if (input.includes("する") || input.includes("実行") || input.includes("行う")) {
    actions.push(`行動方針が示唆されている: ${input}`);
  }
  
  return actions;
}

/**
 * ================================
 * 弁証核：CENTER通過時の圧縮
 * ================================
 * 
 * CENTER状態で矛盾を圧縮（要約）する
 * 矛盾は削除せず、要約して保持する
 * thesis / antithesis を保持し、回転位相（depth）のみ更新
 */
export function compressAtCenter(
  tetra: KanagiTetraState,
  sessionId: string
): KanagiTetraState {
  // 既存の integration から回転位相を取得（存在する場合）
  const currentDepth = tetra.integration?.rotationDepth || 0;
  
  const compressed: KanagiTetraState = {
    fact: compressLayer(tetra.fact),
    interpretation: compressLayer(tetra.interpretation), // 複数必須（圧縮後も複数保持）
    value: compressLayer(tetra.value),
    action: compressLayer(tetra.action),
    integration: tetra.integration ? {
      ...tetra.integration,
      rotationDepth: currentDepth + 1, // 回転位相を更新
    } : null,
    centerAccumulation: tetra.centerAccumulation + 1,
    // thesis / antithesis を保持（削除しない）
    thesis: tetra.thesis,
    antithesis: tetra.antithesis,
  };
  
  saveTetraState(sessionId, compressed);
  return compressed;
}

/**
 * 層を圧縮（要約）
 * 
 * TODO: LLM統合予定箇所
 * 現在は簡易的な要約（最初の要素と最後の要素を保持）
 * 将来的には LLM を使って意味のある要約を生成
 */
function compressLayer(layer: string[]): string[] {
  if (layer.length <= 2) {
    return layer; // 2つ以下はそのまま
  }
  
  // 簡易圧縮：最初と最後を保持し、中間を要約
  const first = layer[0];
  const last = layer[layer.length - 1];
  const middle = layer.slice(1, -1);
  
  // 中間要素を要約（簡易版：最初の要素の一部を使用）
  const summary = middle.length > 0 
    ? `（中間に${middle.length}個の要素が存在）`
    : "";
  
  return [first, summary, last].filter(s => s.length > 0);
}

/**
 * ================================
 * 弁証核：観測円の生成（統合ではない）
 * ================================
 * 
 * INTERPRETATION から観測円を生成
 * 矛盾は排除せず、織りなされ、旋回し、上昇する
 * 結論を出さないことが「合」である
 */
export function synthesize(
  tetra: KanagiTetraState,
  sessionId: string
): KanagiTetraState {
  // 解釈層が2つ以上ない場合は観測円を生成できない
  if (tetra.interpretation.length < 2) {
    return tetra;
  }
  
  // 観測円を生成（テンプレートベース、結論を出さない）
  const integration = generateObservationCircle(tetra);
  
  const synthesized: KanagiTetraState = {
    ...tetra,
    integration: integration,
  };
  
  saveTetraState(sessionId, synthesized);
  return synthesized;
}

/**
 * 観測円を生成（テンプレートベース）
 * 
 * 結論を出さず、現在の観測位置を描写する
 * 矛盾は溶け合わず、織りなされ、旋回し、上昇する
 */
function generateObservationCircle(tetra: KanagiTetraState): import("./types.js").KanagiIntegration {
  const interpretations = tetra.interpretation;
  
  if (interpretations.length < 2) {
    return {
      observationCircle: interpretations[0] || "観測中。",
      unresolvedTensions: [],
      rotationDepth: 0,
    };
  }
  
  // 回転構造の生成（結論を出さない）
  // 「一方で...、他方で...、現在の観測位置からは...」という構造
  let observation = "";
  
  // 最初の解釈
  observation += `一方で、${interpretations[0]}\n\n`;
  
  // 2つ目以降の解釈
  for (let i = 1; i < interpretations.length; i++) {
    observation += `他方で、${interpretations[i]}\n\n`;
  }
  
  // 観測位置の描写（結論ではない）
  observation += `現在の観測位置からは、`;
  observation += `これらの矛盾が織りなされ、旋回し、上昇していることが見える。`;
  observation += `矛盾は溶け合わず、共旋上昇している。`;
  
  // 未解決の緊張を明示
  const tensions: string[] = [];
  for (let i = 0; i < interpretations.length; i++) {
    for (let j = i + 1; j < interpretations.length; j++) {
      tensions.push(`${interpretations[i].substring(0, 30)}... と ${interpretations[j].substring(0, 30)}... の対立は未解決のまま保持される`);
    }
  }
  
  return {
    observationCircle: observation,
    unresolvedTensions: tensions.length > 0 ? tensions : ["矛盾は保持され、旋回し続けている"],
    rotationDepth: tetra.integration?.rotationDepth || 0,
  };
}

/**
 * セッションIDからTetraStateを取得（外部公開用）
 */
export function getTetraStateForSession(sessionId: string): KanagiTetraState {
  return getTetraState(sessionId);
}

/**
 * DialecticDriveの結果をKanagiTetraStateに保存
 * 
 * thesis / antithesis を保持し、観測円を生成
 */
export function storeDialecticResult(
  sessionId: string,
  result: import("./dialecticDrive.js").DialecticResult
): KanagiTetraState {
  const tetra = getTetraState(sessionId);
  
  // thesis / antithesis を保持
  tetra.thesis = result.thesis;
  tetra.antithesis = result.antithesis;
  
  // 観測円を生成（回転構造）
  tetra.integration = {
    observationCircle: result.observationCircle,
    unresolvedTensions: result.unresolvedTensions,
    rotationDepth: tetra.integration?.rotationDepth || 0,
  };
  
  saveTetraState(sessionId, tetra);
  return tetra;
}

