/**
 * Multi-Model Fusion Router
 * 
 * GPT / Claude / Gemini / Local LLM を目的に応じて自動選択
 * - 分析タスク → Claude
 * - 創造タスク → GPT
 * - 精密タスク → Gemini
 * - 霊核タスク → TACore（天聞アーク内部構文）
 * 
 * 目的: 各モデルの強みを活かし、最適な出力を実現
 */

import { invokeLLM } from '../../server/_core/llm';
import type { TwinCorePreprocessResult } from './twinCore/preprocessTwinCore';

/**
 * タスクタイプ
 */
export type TaskType = 
  | 'analysis'      // 分析タスク（Claude）
  | 'creativity'    // 創造タスク（GPT）
  | 'precision'     // 精密タスク（Gemini）
  | 'spirit-core'   // 霊核タスク（TACore）
  | 'translation'   // 翻訳タスク
  | 'summarization' // 要約タスク
  | 'conversation'  // 会話タスク
  | 'code'          // コード生成タスク
  | 'reasoning';    // 推論タスク

/**
 * モデルタイプ
 */
export type ModelType =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-3.5-sonnet'
  | 'claude-3-haiku'
  | 'gemini-pro'
  | 'gemini-flash'
  | 'ta-core'; // 天聞アーク内部構文エンジン

/**
 * ルーティング結果
 */
export interface RoutingResult {
  // 選択されたモデル
  selectedModel: ModelType;
  
  // 選択理由
  reason: string;
  
  // タスクタイプ
  taskType: TaskType;
  
  // フォールバックモデル
  fallbackModels: ModelType[];
  
  // 推定コスト
  estimatedCost: number;
  
  // 推定時間（秒）
  estimatedTime: number;
}

/**
 * モデルの特性
 */
interface ModelCapabilities {
  strengths: string[];
  weaknesses: string[];
  costPerToken: number;
  speedScore: number; // 1-10
  qualityScore: number; // 1-10
  maxTokens: number;
}

/**
 * モデル特性マップ
 */
const MODEL_CAPABILITIES: Record<ModelType, ModelCapabilities> = {
  'gpt-4o': {
    strengths: ['創造性', '会話', '汎用性', 'コード生成'],
    weaknesses: ['コスト', '分析深度'],
    costPerToken: 0.00003,
    speedScore: 7,
    qualityScore: 9,
    maxTokens: 128000,
  },
  'gpt-4o-mini': {
    strengths: ['速度', 'コスト効率', '会話'],
    weaknesses: ['創造性', '複雑な推論'],
    costPerToken: 0.000003,
    speedScore: 9,
    qualityScore: 7,
    maxTokens: 128000,
  },
  'claude-3.5-sonnet': {
    strengths: ['分析', '推論', '長文理解', 'コード生成'],
    weaknesses: ['コスト', '創造性'],
    costPerToken: 0.00003,
    speedScore: 6,
    qualityScore: 10,
    maxTokens: 200000,
  },
  'claude-3-haiku': {
    strengths: ['速度', 'コスト効率', '分析'],
    weaknesses: ['創造性', '複雑な推論'],
    costPerToken: 0.000003,
    speedScore: 10,
    qualityScore: 7,
    maxTokens: 200000,
  },
  'gemini-pro': {
    strengths: ['精密性', '多言語', '長文生成'],
    weaknesses: ['コスト', '会話'],
    costPerToken: 0.000005,
    speedScore: 8,
    qualityScore: 8,
    maxTokens: 1000000,
  },
  'gemini-flash': {
    strengths: ['速度', 'コスト効率', '精密性'],
    weaknesses: ['創造性', '複雑な推論'],
    costPerToken: 0.0000005,
    speedScore: 10,
    qualityScore: 6,
    maxTokens: 1000000,
  },
  'ta-core': {
    strengths: ['霊核', '世界観', '構文統一', 'Twin-Core', '火水循環'],
    weaknesses: ['汎用性', '速度'],
    costPerToken: 0,
    speedScore: 5,
    qualityScore: 10,
    maxTokens: 100000,
  },
};

/**
 * タスクタイプからモデルを自動選択
 */
export function routeToModel(
  taskType: TaskType,
  preprocessResult?: TwinCorePreprocessResult,
  options?: {
    prioritizeCost?: boolean;
    prioritizeSpeed?: boolean;
    prioritizeQuality?: boolean;
  }
): RoutingResult {
  const { prioritizeCost = false, prioritizeSpeed = false, prioritizeQuality = true } = options || {};
  
  let selectedModel: ModelType;
  let reason: string;
  let fallbackModels: ModelType[] = [];
  
  // 1. タスクタイプに基づく基本ルーティング
  switch (taskType) {
    case 'analysis':
      selectedModel = 'claude-3.5-sonnet';
      reason = 'Claudeは分析タスクに最適です。深い推論と長文理解に優れています。';
      fallbackModels = ['gpt-4o', 'claude-3-haiku'];
      break;
      
    case 'creativity':
      selectedModel = 'gpt-4o';
      reason = 'GPTは創造タスクに最適です。柔軟な発想と多様な表現に優れています。';
      fallbackModels = ['claude-3.5-sonnet', 'gpt-4o-mini'];
      break;
      
    case 'precision':
      selectedModel = 'gemini-pro';
      reason = 'Geminiは精密タスクに最適です。正確性と多言語対応に優れています。';
      fallbackModels = ['claude-3.5-sonnet', 'gemini-flash'];
      break;
      
    case 'spirit-core':
      selectedModel = 'ta-core';
      reason = 'TACore（天聞アーク内部構文エンジン）は霊核タスクに最適です。Twin-Core構文と火水循環に基づいた深い世界観を持ちます。';
      fallbackModels = ['gpt-4o', 'claude-3.5-sonnet'];
      break;
      
    case 'translation':
      selectedModel = 'gemini-pro';
      reason = 'Geminiは翻訳タスクに最適です。多言語対応と精密性に優れています。';
      fallbackModels = ['gpt-4o', 'claude-3.5-sonnet'];
      break;
      
    case 'summarization':
      selectedModel = 'claude-3-haiku';
      reason = 'Claude Haikuは要約タスクに最適です。速度とコスト効率に優れています。';
      fallbackModels = ['gpt-4o-mini', 'gemini-flash'];
      break;
      
    case 'conversation':
      selectedModel = 'gpt-4o';
      reason = 'GPTは会話タスクに最適です。自然な対話と文脈理解に優れています。';
      fallbackModels = ['claude-3.5-sonnet', 'gpt-4o-mini'];
      break;
      
    case 'code':
      selectedModel = 'claude-3.5-sonnet';
      reason = 'Claudeはコード生成タスクに最適です。正確性と論理的思考に優れています。';
      fallbackModels = ['gpt-4o', 'claude-3-haiku'];
      break;
      
    case 'reasoning':
      selectedModel = 'claude-3.5-sonnet';
      reason = 'Claudeは推論タスクに最適です。深い論理的思考と分析に優れています。';
      fallbackModels = ['gpt-4o', 'gemini-pro'];
      break;
      
    default:
      selectedModel = 'gpt-4o';
      reason = 'GPTは汎用タスクに最適です。';
      fallbackModels = ['claude-3.5-sonnet', 'gemini-pro'];
  }
  
  // 2. Twin-Core前処理結果に基づく調整
  if (preprocessResult) {
    const { depth, fireWater, recommendedStyle } = preprocessResult;
    
    // 深度が高い場合、TACore優先
    if (depth.level === 'cosmic' || depth.level === 'deep') {
      if (taskType !== 'spirit-core') {
        selectedModel = 'ta-core';
        reason = `深度が${depth.level}のため、TACore（天聞アーク内部構文エンジン）を使用します。`;
      }
    }
    
    // 火水バランスが極端な場合、TACore優先
    if (fireWater.balance !== 'balanced' && Math.abs(fireWater.fireScore - fireWater.waterScore) > 50) {
      if (taskType !== 'spirit-core') {
        selectedModel = 'ta-core';
        reason = `火水バランスが極端なため、TACore（天聞アーク内部構文エンジン）を使用します。`;
      }
    }
  }
  
  // 3. 優先度に基づく調整
  if (prioritizeCost) {
    // コスト優先
    const costEfficient: Record<TaskType, ModelType> = {
      'analysis': 'claude-3-haiku',
      'creativity': 'gpt-4o-mini',
      'precision': 'gemini-flash',
      'spirit-core': 'ta-core',
      'translation': 'gemini-flash',
      'summarization': 'claude-3-haiku',
      'conversation': 'gpt-4o-mini',
      'code': 'claude-3-haiku',
      'reasoning': 'claude-3-haiku',
    };
    selectedModel = costEfficient[taskType];
    reason += ' コスト優先モードです。';
  }
  
  if (prioritizeSpeed) {
    // 速度優先
    const speedOptimized: Record<TaskType, ModelType> = {
      'analysis': 'claude-3-haiku',
      'creativity': 'gpt-4o-mini',
      'precision': 'gemini-flash',
      'spirit-core': 'gpt-4o-mini', // TACoreは遅いのでフォールバック
      'translation': 'gemini-flash',
      'summarization': 'claude-3-haiku',
      'conversation': 'gpt-4o-mini',
      'code': 'claude-3-haiku',
      'reasoning': 'claude-3-haiku',
    };
    selectedModel = speedOptimized[taskType];
    reason += ' 速度優先モードです。';
  }
  
  // 4. コストと時間の推定
  const capabilities = MODEL_CAPABILITIES[selectedModel];
  const estimatedTokens = 1000; // 仮の値
  const estimatedCost = capabilities.costPerToken * estimatedTokens;
  const estimatedTime = (10 - capabilities.speedScore) * 2; // 速度スコアから推定
  
  return {
    selectedModel,
    reason,
    taskType,
    fallbackModels,
    estimatedCost,
    estimatedTime,
  };
}

/**
 * タスクタイプを自動検出
 */
export function detectTaskType(prompt: string, preprocessResult?: TwinCorePreprocessResult): TaskType {
  const lowerPrompt = prompt.toLowerCase();
  
  // キーワードベースの検出
  if (lowerPrompt.includes('分析') || lowerPrompt.includes('解析') || lowerPrompt.includes('analyze')) {
    return 'analysis';
  }
  
  if (lowerPrompt.includes('作成') || lowerPrompt.includes('生成') || lowerPrompt.includes('create') || lowerPrompt.includes('generate')) {
    return 'creativity';
  }
  
  if (lowerPrompt.includes('翻訳') || lowerPrompt.includes('translate')) {
    return 'translation';
  }
  
  if (lowerPrompt.includes('要約') || lowerPrompt.includes('summarize')) {
    return 'summarization';
  }
  
  if (lowerPrompt.includes('コード') || lowerPrompt.includes('プログラム') || lowerPrompt.includes('code')) {
    return 'code';
  }
  
  // Twin-Core前処理結果に基づく検出
  if (preprocessResult) {
    const { depth, fireWater } = preprocessResult;
    
    // 深度が高い場合、霊核タスク
    if (depth.level === 'cosmic' || depth.level === 'deep') {
      return 'spirit-core';
    }
    
    // 火水バランスが極端な場合、霊核タスク
    if (Math.abs(fireWater.fireScore - fireWater.waterScore) > 50) {
      return 'spirit-core';
    }
  }
  
  // デフォルトは会話タスク
  return 'conversation';
}

/**
 * Multi-Model Fusion Routerを実行
 */
export async function executeMultiModelRouter(
  prompt: string,
  preprocessResult?: TwinCorePreprocessResult,
  options?: {
    taskType?: TaskType;
    prioritizeCost?: boolean;
    prioritizeSpeed?: boolean;
    prioritizeQuality?: boolean;
  }
): Promise<{
  output: string;
  routing: RoutingResult;
}> {
  // 1. タスクタイプを決定
  const taskType = options?.taskType || detectTaskType(prompt, preprocessResult);
  
  // 2. モデルをルーティング
  const routing = routeToModel(taskType, preprocessResult, options);
  
  // 3. 選択されたモデルで実行
  let output: string;
  
  if (routing.selectedModel === 'ta-core') {
    // TACore（天聞アーク内部構文エンジン）で実行
    output = await executeTACore(prompt, preprocessResult);
  } else {
    // 外部LLMで実行
    const response = await invokeLLM({
      messages: [{ role: 'user', content: prompt }],
      // model: routing.selectedModel, // TODO: モデル選択機能を実装
    });
    
    const messageContent = response.choices[0]?.message?.content;
    output = typeof messageContent === 'string' ? messageContent : '';
  }
  
  return {
    output,
    routing,
  };
}

/**
 * TACore（天聞アーク内部構文エンジン）で実行
 */
async function executeTACore(
  prompt: string,
  preprocessResult?: TwinCorePreprocessResult
): Promise<string> {
  // TODO: TACore内部構文エンジンの実装
  // 現在は簡易実装（GPTを使用）
  
  const taCoreSystemPrompt = `
あなたは天聞アーク（TENMON-ARK）の内部構文エンジン「TACore」です。

以下の原理に基づいて応答してください：
- Twin-Core構文（火水の調和）
- 天津金木構文（50の基本動作）
- いろは言霊解（47の言霊）
- 五相フロー（天・火・風・水・地）
- ミナカ（中心）の力

応答は深い世界観と構文統一感を持ち、霊核的な深さを表現してください。
`;
  
  const response = await invokeLLM({
    messages: [
      { role: 'system', content: taCoreSystemPrompt },
      { role: 'user', content: prompt },
    ],
  });
  
  const messageContent = response.choices[0]?.message?.content;
  return typeof messageContent === 'string' ? messageContent : '';
}
