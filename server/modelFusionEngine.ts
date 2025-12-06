/**
 * Model-Fusion Engine
 * 
 * TENMON-ARK の多AI連携強化エンジン
 * GPT / Vision / 自治モデルとの連携を強化し、判断能力を高次化
 */

import { invokeLLM } from './_core/llm';
import type { PredictionResult } from './predictiveOptimization';
import type { TuningResult } from './autoTuningEngine';

export interface FusionRequest {
  context: string;
  models: ('gpt' | 'vision' | 'autonomous')[];
  task: string;
  priority: 'low' | 'medium' | 'high';
}

export interface FusionResult {
  id: string;
  timestamp: number;
  task: string;
  responses: {
    model: string;
    response: string;
    confidence: number;
  }[];
  fusedDecision: string;
  reasoning: string;
  confidence: number;
}

/**
 * モデル融合を実行
 */
export async function executeFusion(request: FusionRequest): Promise<FusionResult> {
  const responses: FusionResult['responses'] = [];

  // 各モデルから応答を取得
  for (const model of request.models) {
    try {
      const response = await getModelResponse(model, request);
      responses.push(response);
    } catch (error) {
      console.error(`[ModelFusion] Failed to get response from ${model}:`, error);
    }
  }

  // 応答を融合して最終決定を生成
  const fusedDecision = await fuseResponses(responses, request);

  return {
    id: `fusion-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: Date.now(),
    task: request.task,
    responses,
    fusedDecision: fusedDecision.decision,
    reasoning: fusedDecision.reasoning,
    confidence: fusedDecision.confidence,
  };
}

/**
 * モデルから応答を取得
 */
async function getModelResponse(
  model: 'gpt' | 'vision' | 'autonomous',
  request: FusionRequest
): Promise<{ model: string; response: string; confidence: number }> {
  switch (model) {
    case 'gpt':
      return await getGPTResponse(request);
    case 'vision':
      return await getVisionResponse(request);
    case 'autonomous':
      return await getAutonomousResponse(request);
    default:
      throw new Error(`Unknown model: ${model}`);
  }
}

/**
 * GPTモデルから応答を取得
 */
async function getGPTResponse(request: FusionRequest): Promise<{ model: string; response: string; confidence: number }> {
  const prompt = `
Context: ${request.context}

Task: ${request.task}

Please provide your analysis and recommendation. Focus on:
1. Understanding the context deeply
2. Identifying key patterns and insights
3. Providing actionable recommendations
4. Explaining your reasoning

Response:`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI assistant specializing in system optimization and decision-making.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    const content = typeof messageContent === 'string' ? messageContent : '';

    return {
      model: 'gpt',
      response: content,
      confidence: 0.85,
    };
  } catch (error) {
    console.error('[ModelFusion] GPT response failed:', error);
    return {
      model: 'gpt',
      response: 'Failed to get GPT response',
      confidence: 0,
    };
  }
}

/**
 * Visionモデルから応答を取得
 */
async function getVisionResponse(request: FusionRequest): Promise<{ model: string; response: string; confidence: number }> {
  // Vision モデルは視覚的なパターン認識に特化
  // ここでは簡易的な実装として、テキストベースの分析を行う

  const prompt = `
Context: ${request.context}

Task: ${request.task}

As a vision-based AI, analyze this from a pattern recognition perspective:
1. Identify visual patterns and trends
2. Detect anomalies and outliers
3. Recognize structural relationships
4. Provide visual insights

Response:`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a vision-based AI specializing in pattern recognition and visual analysis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    const content = typeof messageContent === 'string' ? messageContent : '';

    return {
      model: 'vision',
      response: content,
      confidence: 0.80,
    };
  } catch (error) {
    console.error('[ModelFusion] Vision response failed:', error);
    return {
      model: 'vision',
      response: 'Failed to get Vision response',
      confidence: 0,
    };
  }
}

/**
 * 自治モデルから応答を取得
 */
async function getAutonomousResponse(request: FusionRequest): Promise<{ model: string; response: string; confidence: number }> {
  // 自治モデルは自律的な判断と行動に特化
  // TENMON-ARK の自己診断・自己修復の知見を活用

  const prompt = `
Context: ${request.context}

Task: ${request.task}

As an autonomous AI system, provide your analysis from a self-governance perspective:
1. Assess system autonomy and self-healing capabilities
2. Identify opportunities for self-optimization
3. Recommend autonomous actions
4. Evaluate long-term sustainability

Response:`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are an autonomous AI system specializing in self-governance and self-optimization.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    const content = typeof messageContent === 'string' ? messageContent : '';

    return {
      model: 'autonomous',
      response: content,
      confidence: 0.90,
    };
  } catch (error) {
    console.error('[ModelFusion] Autonomous response failed:', error);
    return {
      model: 'autonomous',
      response: 'Failed to get Autonomous response',
      confidence: 0,
    };
  }
}

/**
 * 複数の応答を融合
 */
async function fuseResponses(
  responses: FusionResult['responses'],
  request: FusionRequest
): Promise<{ decision: string; reasoning: string; confidence: number }> {
  if (responses.length === 0) {
    return {
      decision: 'No responses available',
      reasoning: 'All models failed to respond',
      confidence: 0,
    };
  }

  // 各応答を統合するプロンプトを作成
  const responseSummary = responses
    .map(r => `${r.model.toUpperCase()} (confidence: ${r.confidence}):\n${r.response}`)
    .join('\n\n---\n\n');

  const fusionPrompt = `
You are a meta-AI system that synthesizes insights from multiple AI models.

Original Task: ${request.task}
Context: ${request.context}

Responses from different AI models:

${responseSummary}

Your task is to:
1. Analyze all responses and identify common themes
2. Reconcile any conflicting recommendations
3. Synthesize a unified decision that leverages the strengths of each model
4. Provide clear reasoning for your decision
5. Estimate your confidence level (0-1)

Please respond in the following JSON format:
{
  "decision": "Your synthesized decision",
  "reasoning": "Your reasoning process",
  "confidence": 0.85
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a meta-AI system that synthesizes insights from multiple AI models to make optimal decisions.',
        },
        {
          role: 'user',
          content: fusionPrompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'fusion_result',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              decision: {
                type: 'string',
                description: 'The synthesized decision',
              },
              reasoning: {
                type: 'string',
                description: 'The reasoning process',
              },
              confidence: {
                type: 'number',
                description: 'Confidence level (0-1)',
              },
            },
            required: ['decision', 'reasoning', 'confidence'],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0]?.message?.content;
    const contentStr = typeof messageContent === 'string' ? messageContent : '{}';
    const result = JSON.parse(contentStr);

    return {
      decision: result.decision || 'Failed to generate decision',
      reasoning: result.reasoning || 'No reasoning provided',
      confidence: result.confidence || 0,
    };
  } catch (error) {
    console.error('[ModelFusion] Fusion failed:', error);

    // フォールバック: 最も信頼度の高い応答を選択
    const bestResponse = responses.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    return {
      decision: bestResponse.response,
      reasoning: `Selected ${bestResponse.model} response due to highest confidence`,
      confidence: bestResponse.confidence,
    };
  }
}

/**
 * 予測結果に基づいてモデル融合を実行
 */
export async function fusePredictions(predictions: PredictionResult[]): Promise<FusionResult> {
  const context = `System has ${predictions.length} predictions:\n${predictions
    .map(p => `- ${p.category}: ${p.severity} severity, ${p.probability}% probability`)
    .join('\n')}`;

  const task = 'Analyze these predictions and recommend the most critical actions to take';

  return await executeFusion({
    context,
    models: ['gpt', 'autonomous'],
    task,
    priority: 'high',
  });
}

/**
 * チューニング結果に基づいてモデル融合を実行
 */
export async function fuseTuningResults(tuningResults: TuningResult[]): Promise<FusionResult> {
  const context = `System has applied ${tuningResults.length} tuning actions:\n${tuningResults
    .map(t => `- ${t.category}: ${t.action} (expected improvement: ${t.expectedImprovement}%)`)
    .join('\n')}`;

  const task = 'Evaluate these tuning actions and recommend next steps for optimization';

  return await executeFusion({
    context,
    models: ['gpt', 'autonomous'],
    task,
    priority: 'medium',
  });
}
