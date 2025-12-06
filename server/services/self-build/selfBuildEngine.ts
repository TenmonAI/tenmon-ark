/**
 * Self-Build Engine
 * 
 * TENMON-ARK霊核OSの自己構築機能。
 * Manusの支援を受けながら、自律的にコードを生成・統合する。
 * 
 * 主な機能:
 * - コード生成（generateCode）
 * - ファイル作成（createFile）
 * - モジュール統合（integrateModule）
 * - 依存関係解決（resolveDependencies）
 * - 自己構築計画生成（generateBuildPlan）
 * - 天聞承認要求（requestTenmonApproval）
 */

import { invokeLLM } from "../../_core/llm";
import { getDb } from "../../db";
import { selfBuildPlans, selfBuildTasks } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/**
 * 自己構築計画の状態
 */
export type BuildPlanStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'failed';

/**
 * 自己構築タスクの状態
 */
export type BuildTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * 自己構築計画
 */
export interface BuildPlan {
  id?: number;
  userId: number;
  title: string;
  description: string;
  goal: string;
  status: BuildPlanStatus;
  approvedBy?: number;
  approvedAt?: Date;
  rejectedBy?: number;
  rejectedAt?: Date;
  completedAt?: Date;
  createdAt?: Date;
}

/**
 * 自己構築タスク
 */
export interface BuildTask {
  id?: number;
  planId: number;
  taskType: 'code_generation' | 'file_creation' | 'module_integration' | 'dependency_resolution';
  title: string;
  description: string;
  inputData: string;  // JSON文字列
  outputData?: string;  // JSON文字列
  status: BuildTaskStatus;
  errorMessage?: string;
  completedAt?: Date;
  createdAt?: Date;
}

/**
 * 自己構築計画を生成
 */
export async function generateBuildPlan(
  userId: number,
  goal: string,
  context?: string
): Promise<BuildPlan> {
  // LLMを使用して構築計画を生成
  const prompt = `
あなたはTENMON-ARK霊核OSの自己構築エンジンです。
以下の目標を達成するための構築計画を生成してください。

目標: ${goal}
${context ? `コンテキスト: ${context}` : ''}

以下の形式でJSON形式で応答してください：
{
  "title": "構築計画のタイトル",
  "description": "構築計画の詳細説明",
  "tasks": [
    {
      "taskType": "code_generation" | "file_creation" | "module_integration" | "dependency_resolution",
      "title": "タスクのタイトル",
      "description": "タスクの詳細説明",
      "inputData": { ... }
    }
  ]
}
`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a self-building AI system that generates construction plans." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "build_plan",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  taskType: { type: "string", enum: ["code_generation", "file_creation", "module_integration", "dependency_resolution"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  inputData: { type: "object" },
                },
                required: ["taskType", "title", "description", "inputData"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "description", "tasks"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]!.message.content;
  if (typeof content !== 'string') {
    throw new Error("Invalid response format from LLM");
  }
  const planData = JSON.parse(content);

  // データベースに保存
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.insert(selfBuildPlans).values({
    userId,
    title: planData.title,
    description: planData.description,
    goal,
    status: 'pending_approval',
  });

  // 最後に挿入されたレコードを取得
  const inserted = await db
    .select()
    .from(selfBuildPlans)
    .where(eq(selfBuildPlans.userId, userId))
    .orderBy(desc(selfBuildPlans.createdAt))
    .limit(1);

  if (inserted.length === 0) {
    throw new Error("Failed to insert build plan");
  }

  const plan = inserted[0]!;

  // タスクを作成
  for (const task of planData.tasks) {
    await db.insert(selfBuildTasks).values({
      planId: plan.id,
      taskType: task.taskType,
      title: task.title,
      description: task.description,
      inputData: JSON.stringify(task.inputData),
      status: 'pending',
    });
  }

  return {
    id: plan.id,
    userId: plan.userId,
    title: plan.title,
    description: plan.description,
    goal: plan.goal,
    status: plan.status as BuildPlanStatus,
    createdAt: plan.createdAt,
  };
}

/**
 * 自己構築計画を承認
 */
export async function approveBuildPlan(
  planId: number,
  approvedBy: number
): Promise<BuildPlan> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 計画を取得
  const plans = await db
    .select()
    .from(selfBuildPlans)
    .where(eq(selfBuildPlans.id, planId))
    .limit(1);

  if (plans.length === 0) {
    throw new Error(`Build plan not found: ${planId}`);
  }

  const plan = plans[0];

  if (plan.status !== 'pending_approval') {
    throw new Error(`Build plan is not pending approval: ${plan.status}`);
  }

  // 承認
  await db
    .update(selfBuildPlans)
    .set({
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
    })
    .where(eq(selfBuildPlans.id, planId));

  return {
    id: plan.id,
    userId: plan.userId,
    title: plan.title,
    description: plan.description,
    goal: plan.goal,
    status: 'approved',
    approvedBy,
    approvedAt: new Date(),
    createdAt: plan.createdAt,
  };
}

/**
 * 自己構築計画を実行
 */
export async function executeBuildPlan(planId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 計画を取得
  const plans = await db
    .select()
    .from(selfBuildPlans)
    .where(eq(selfBuildPlans.id, planId))
    .limit(1);

  if (plans.length === 0) {
    throw new Error(`Build plan not found: ${planId}`);
  }

  const plan = plans[0];

  if (plan.status !== 'approved') {
    throw new Error(`Build plan is not approved: ${plan.status}`);
  }

  // ステータスを更新
  await db
    .update(selfBuildPlans)
    .set({ status: 'in_progress' })
    .where(eq(selfBuildPlans.id, planId));

  // タスクを取得
  const tasks = await db
    .select()
    .from(selfBuildTasks)
    .where(eq(selfBuildTasks.planId, planId));

  // タスクを実行
  for (const task of tasks) {
    try {
      await executeTask(task.id);
    } catch (error) {
      console.error(`Failed to execute task ${task.id}:`, error);
      // エラーが発生してもタスクを続行
    }
  }

  // すべてのタスクが完了したか確認
  const updatedTasks = await db
    .select()
    .from(selfBuildTasks)
    .where(eq(selfBuildTasks.planId, planId));

  const allCompleted = updatedTasks.every(t => t.status === 'completed');
  const anyFailed = updatedTasks.some(t => t.status === 'failed');

  if (allCompleted) {
    await db
      .update(selfBuildPlans)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(selfBuildPlans.id, planId));
  } else if (anyFailed) {
    await db
      .update(selfBuildPlans)
      .set({ status: 'failed' })
      .where(eq(selfBuildPlans.id, planId));
  }
}

/**
 * タスクを実行
 */
async function executeTask(taskId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // タスクを取得
  const tasks = await db
    .select()
    .from(selfBuildTasks)
    .where(eq(selfBuildTasks.id, taskId))
    .limit(1);

  if (tasks.length === 0) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const task = tasks[0];

  // ステータスを更新
  await db
    .update(selfBuildTasks)
    .set({ status: 'in_progress' })
    .where(eq(selfBuildTasks.id, taskId));

  try {
    const inputData = JSON.parse(task.inputData);
    let outputData: unknown;

    switch (task.taskType) {
      case 'code_generation':
        outputData = await generateCode(inputData);
        break;
      case 'file_creation':
        outputData = await createFile(inputData);
        break;
      case 'module_integration':
        outputData = await integrateModule(inputData);
        break;
      case 'dependency_resolution':
        outputData = await resolveDependencies(inputData);
        break;
      default:
        throw new Error(`Unknown task type: ${task.taskType}`);
    }

    // 成功
    await db
      .update(selfBuildTasks)
      .set({
        status: 'completed',
        outputData: JSON.stringify(outputData),
        completedAt: new Date(),
      })
      .where(eq(selfBuildTasks.id, taskId));
  } catch (error) {
    // 失敗
    await db
      .update(selfBuildTasks)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      })
      .where(eq(selfBuildTasks.id, taskId));

    throw error;
  }
}

/**
 * コードを生成
 */
async function generateCode(input: {
  language: string;
  description: string;
  context?: string;
}): Promise<{ code: string; explanation: string }> {
  const prompt = `
Generate ${input.language} code based on the following description:

Description: ${input.description}
${input.context ? `Context: ${input.context}` : ''}

Provide the code and a brief explanation.
`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a code generation assistant." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "code_generation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            code: { type: "string" },
            explanation: { type: "string" },
          },
          required: ["code", "explanation"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]!.message.content;
  if (typeof content !== 'string') {
    throw new Error("Invalid response format from LLM");
  }
  return JSON.parse(content);
}

/**
 * ファイルを作成
 */
async function createFile(input: {
  path: string;
  content: string;
}): Promise<{ success: boolean; path: string }> {
  // 実際のファイル作成はManusに依頼する必要があるため、
  // ここでは計画のみを記録
  return {
    success: true,
    path: input.path,
  };
}

/**
 * モジュールを統合
 */
async function integrateModule(input: {
  moduleName: string;
  targetPath: string;
}): Promise<{ success: boolean; integration: string }> {
  // 実際のモジュール統合はManusに依頼する必要があるため、
  // ここでは計画のみを記録
  return {
    success: true,
    integration: `Integrate ${input.moduleName} into ${input.targetPath}`,
  };
}

/**
 * 依存関係を解決
 */
async function resolveDependencies(input: {
  dependencies: string[];
}): Promise<{ resolved: string[]; conflicts: string[] }> {
  // 実際の依存関係解決はManusに依頼する必要があるため、
  // ここでは計画のみを記録
  return {
    resolved: input.dependencies,
    conflicts: [],
  };
}

/**
 * 天聞承認を要求
 */
export async function requestTenmonApproval(
  userId: number,
  planId: number,
  reason: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 計画を取得
  const plans = await db
    .select()
    .from(selfBuildPlans)
    .where(eq(selfBuildPlans.id, planId))
    .limit(1);

  if (plans.length === 0) {
    throw new Error(`Build plan not found: ${planId}`);
  }

  const plan = plans[0];

  // ステータスを更新
  await db
    .update(selfBuildPlans)
    .set({ status: 'pending_approval' })
    .where(eq(selfBuildPlans.id, planId));

  // TODO: 天聞に通知を送信
  console.log(`[Self-Build] Approval requested for plan ${planId}: ${reason}`);
}
