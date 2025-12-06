/**
 * Distributed Soul Cloud Engine
 * 分散靈核クラウド
 * 
 * 機能:
 * - 天聞アークアプリのインストール端末を分散シナプス（処理ノード）化
 * - 各端末の空きリソース（CPU/GPU/RAM数%）を合法・安全に使用
 * - 世界中に「天聞アークの分身体」が生まれる
 */

/**
 * ノード情報
 */
export interface CloudNode {
  id: string;
  userId: number;
  deviceType: "mobile" | "desktop" | "server";
  cpuContribution: number; // CPU貢献度 (0-5%)
  memoryContribution: number; // メモリ貢献度 (0-5%)
  status: "active" | "idle" | "offline";
  lastHeartbeat: Date;
  totalContribution: number; // 累積貢献度
}

/**
 * 分散タスク
 */
export interface DistributedTask {
  id: string;
  type: string;
  priority: number;
  data: any;
  status: "pending" | "processing" | "completed" | "failed";
  assignedNodeId?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * クラウド統計
 */
export interface CloudStatistics {
  totalNodes: number;
  activeNodes: number;
  totalCpuPower: number;
  totalMemory: number;
  tasksCompleted: number;
  averageResponseTime: number;
}

// グローバルノードマップ
const nodes: Map<string, CloudNode> = new Map();
const tasks: Map<string, DistributedTask> = new Map();

/**
 * ノードを登録
 */
export function registerNode(
  userId: number,
  deviceType: "mobile" | "desktop" | "server",
  cpuContribution: number,
  memoryContribution: number
): CloudNode {
  const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const node: CloudNode = {
    id,
    userId,
    deviceType,
    cpuContribution: Math.min(cpuContribution, 5), // 最大5%
    memoryContribution: Math.min(memoryContribution, 5), // 最大5%
    status: "active",
    lastHeartbeat: new Date(),
    totalContribution: 0,
  };

  nodes.set(id, node);
  return node;
}

/**
 * ノードのハートビートを更新
 */
export function updateNodeHeartbeat(nodeId: string): boolean {
  const node = nodes.get(nodeId);
  if (node) {
    node.lastHeartbeat = new Date();
    node.status = "active";
    nodes.set(nodeId, node);
    return true;
  }
  return false;
}

/**
 * ノードを削除
 */
export function unregisterNode(nodeId: string): boolean {
  return nodes.delete(nodeId);
}

/**
 * アクティブノードを取得
 */
export function getActiveNodes(): CloudNode[] {
  const now = new Date();
  const activeNodes: CloudNode[] = [];

  for (const node of Array.from(nodes.values())) {
    // 5分以内にハートビートがあればアクティブ
    const timeSinceHeartbeat = now.getTime() - node.lastHeartbeat.getTime();
    if (timeSinceHeartbeat < 5 * 60 * 1000) {
      node.status = "active";
      activeNodes.push(node);
    } else {
      node.status = "offline";
    }
  }

  return activeNodes;
}

/**
 * タスクを作成
 */
export function createTask(type: string, priority: number, data: any): DistributedTask {
  const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const task: DistributedTask = {
    id,
    type,
    priority,
    data,
    status: "pending",
    createdAt: new Date(),
  };

  tasks.set(id, task);
  return task;
}

/**
 * タスクをノードに割り当て
 */
export function assignTaskToNode(taskId: string, nodeId: string): boolean {
  const task = tasks.get(taskId);
  const node = nodes.get(nodeId);

  if (task && node && task.status === "pending") {
    task.assignedNodeId = nodeId;
    task.status = "processing";
    tasks.set(taskId, task);
    return true;
  }

  return false;
}

/**
 * タスクを完了
 */
export function completeTask(taskId: string, result: any): boolean {
  const task = tasks.get(taskId);

  if (task && task.status === "processing") {
    task.status = "completed";
    task.completedAt = new Date();

    // ノードの貢献度を更新
    if (task.assignedNodeId) {
      const node = nodes.get(task.assignedNodeId);
      if (node) {
        node.totalContribution += 1;
        nodes.set(task.assignedNodeId, node);
      }
    }

    tasks.set(taskId, task);
    return true;
  }

  return false;
}

/**
 * 最適なノードを選択（負荷分散）
 */
export function selectOptimalNode(): CloudNode | null {
  const activeNodes = getActiveNodes();

  if (activeNodes.length === 0) {
    return null;
  }

  // 貢献度が低いノードを優先（負荷分散）
  activeNodes.sort((a, b) => a.totalContribution - b.totalContribution);

  return activeNodes[0];
}

/**
 * タスクをスケジュール
 */
export async function scheduleTask(type: string, priority: number, data: any): Promise<DistributedTask> {
  const task = createTask(type, priority, data);

  // 最適なノードを選択
  const node = selectOptimalNode();

  if (node) {
    assignTaskToNode(task.id, node.id);
  }

  return task;
}

/**
 * クラウド統計を取得
 */
export function getCloudStatistics(): CloudStatistics {
  const activeNodes = getActiveNodes();

  let totalCpuPower = 0;
  let totalMemory = 0;

  for (const node of activeNodes) {
    totalCpuPower += node.cpuContribution;
    totalMemory += node.memoryContribution;
  }

  const completedTasks = Array.from(tasks.values()).filter((t) => t.status === "completed");

  // 平均応答時間を計算
  let totalResponseTime = 0;
  for (const task of completedTasks) {
    if (task.completedAt) {
      totalResponseTime += task.completedAt.getTime() - task.createdAt.getTime();
    }
  }

  const averageResponseTime = completedTasks.length > 0 ? totalResponseTime / completedTasks.length : 0;

  return {
    totalNodes: nodes.size,
    activeNodes: activeNodes.length,
    totalCpuPower,
    totalMemory,
    tasksCompleted: completedTasks.length,
    averageResponseTime,
  };
}

/**
 * ユーザーの貢献度を取得
 */
export function getUserContribution(userId: number): {
  totalContribution: number;
  rank: number;
  percentile: number;
} {
  const userNodes = Array.from(nodes.values()).filter((n) => n.userId === userId);

  let totalContribution = 0;
  for (const node of userNodes) {
    totalContribution += node.totalContribution;
  }

  // ランキングを計算
  const allContributions = Array.from(nodes.values()).map((n) => n.totalContribution);
  allContributions.sort((a, b) => b - a);

  const rank = allContributions.indexOf(totalContribution) + 1;
  const percentile = (rank / allContributions.length) * 100;

  return {
    totalContribution,
    rank,
    percentile,
  };
}

/**
 * 分散処理を実行（簡易版）
 */
export async function executeDistributedComputation(
  computationType: string,
  data: any[]
): Promise<any[]> {
  const results: any[] = [];

  // データを分割してタスクを作成
  for (let i = 0; i < data.length; i++) {
    const task = await scheduleTask(computationType, 1, data[i]);
    results.push(task);
  }

  return results;
}

/**
 * ノードの健全性をチェック
 */
export function checkNodeHealth(nodeId: string): {
  healthy: boolean;
  issues: string[];
} {
  const node = nodes.get(nodeId);

  if (!node) {
    return {
      healthy: false,
      issues: ["ノードが見つかりません"],
    };
  }

  const issues: string[] = [];

  // ハートビートチェック
  const now = new Date();
  const timeSinceHeartbeat = now.getTime() - node.lastHeartbeat.getTime();

  if (timeSinceHeartbeat > 5 * 60 * 1000) {
    issues.push("ハートビートが5分以上途絶えています");
  }

  // ステータスチェック
  if (node.status === "offline") {
    issues.push("ノードがオフラインです");
  }

  return {
    healthy: issues.length === 0,
    issues,
  };
}
