/**
 * Self Evolution Router (Phase Z-1)
 * 自己進化レイヤー API
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  scanOSInternal,
  generateImprovementProposals,
  createApprovalRequest,
  processApprovalRequest,
  executeImprovement,
  getSelfEvolutionStats,
  type ScanResult,
  type ImprovementProposal,
  type ApprovalRequest,
} from "../engines/selfEvolution/selfEvolutionLayer";

// メモリ内ストレージ（本番環境ではDBを使用）
const scanResultsStore: ScanResult[] = [];
const proposalsStore: ImprovementProposal[] = [];
const approvalRequestsStore: ApprovalRequest[] = [];

export const selfEvolutionRouter = router({
  /**
   * OS内部スキャンを実行
   */
  scanOS: protectedProcedure
    .input(
      z.object({
        targetTypes: z.array(
          z.enum(['error', 'efficiency', 'performance', 'bug', 'security', 'optimization'])
        ),
      })
    )
    .mutation(async ({ input }) => {
      const results = await scanOSInternal(input.targetTypes);

      // スキャン結果を保存
      results.forEach(result => scanResultsStore.push(result));

      return {
        success: true,
        results,
        total: results.length,
      };
    }),

  /**
   * スキャン結果一覧を取得
   */
  getScanResults: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        minSeverity: z.number().optional(),
        targetType: z.enum(['error', 'efficiency', 'performance', 'bug', 'security', 'optimization']).optional(),
      })
    )
    .query(async ({ input }) => {
      let results = scanResultsStore;

      // 重要度でフィルタ
      if (input.minSeverity !== undefined) {
        results = results.filter(r => r.severity >= input.minSeverity!);
      }

      // 対象種別でフィルタ
      if (input.targetType) {
        results = results.filter(r => r.targetType === input.targetType);
      }

      // 制限
      if (input.limit) {
        results = results.slice(0, input.limit);
      }

      return {
        success: true,
        results,
        total: scanResultsStore.length,
      };
    }),

  /**
   * 改善案を自動生成
   */
  generateProposals: protectedProcedure
    .input(
      z.object({
        scanResultIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      let scanResults = scanResultsStore;

      // 特定のスキャン結果のみを対象とする場合
      if (input.scanResultIds && input.scanResultIds.length > 0) {
        scanResults = scanResults.filter(r => input.scanResultIds!.includes(r.scanId));
      }

      const proposals = await generateImprovementProposals(scanResults);

      // 改善案を保存
      proposals.forEach(proposal => proposalsStore.push(proposal));

      return {
        success: true,
        proposals,
        total: proposals.length,
      };
    }),

  /**
   * 改善案一覧を取得
   */
  getProposals: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        minPriority: z.number().optional(),
        status: z.enum(['pending', 'approved', 'rejected', 'in_discussion', 'implemented']).optional(),
      })
    )
    .query(async ({ input }) => {
      let proposals = proposalsStore;

      // 優先度でフィルタ
      if (input.minPriority !== undefined) {
        proposals = proposals.filter(p => p.priority >= input.minPriority!);
      }

      // ステータスでフィルタ
      if (input.status) {
        proposals = proposals.filter(p => p.status === input.status);
      }

      // 制限
      if (input.limit) {
        proposals = proposals.slice(0, input.limit);
      }

      return {
        success: true,
        proposals,
        total: proposalsStore.length,
      };
    }),

  /**
   * 承認要求を作成
   */
  createApprovalRequest: protectedProcedure
    .input(
      z.object({
        proposalId: z.string(),
        approver: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const proposal = proposalsStore.find(p => p.proposalId === input.proposalId);

      if (!proposal) {
        throw new Error('改善案が見つかりません');
      }

      const approver = input.approver || ctx.user.name || '天聞';
      const request = await createApprovalRequest(proposal, approver);

      // 承認要求を保存
      approvalRequestsStore.push(request);

      return {
        success: true,
        request,
      };
    }),

  /**
   * 承認要求一覧を取得
   */
  getApprovalRequests: protectedProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'approved', 'rejected', 'in_discussion']).optional(),
      })
    )
    .query(async ({ input }) => {
      let requests = approvalRequestsStore;

      // ステータスでフィルタ
      if (input.status) {
        requests = requests.filter(r => r.status === input.status);
      }

      return {
        success: true,
        requests,
        total: approvalRequestsStore.length,
      };
    }),

  /**
   * 承認要求を処理
   */
  processApproval: protectedProcedure
    .input(
      z.object({
        requestId: z.string(),
        action: z.enum(['approve', 'reject', 'discuss']),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const request = approvalRequestsStore.find(r => r.requestId === input.requestId);

      if (!request) {
        throw new Error('承認要求が見つかりません');
      }

      const result = await processApprovalRequest(input.requestId, input.action, input.comment);

      // 承認要求のステータスを更新
      if (input.action === 'approve') {
        request.status = 'approved';
        request.approvedAt = Date.now();
        request.approverComment = input.comment;

        // 改善案のステータスも更新
        const proposal = proposalsStore.find(p => p.proposalId === request.proposalId);
        if (proposal) {
          proposal.status = 'approved';
        }
      } else if (input.action === 'reject') {
        request.status = 'rejected';
        request.rejectedAt = Date.now();
        request.approverComment = input.comment;

        // 改善案のステータスも更新
        const proposal = proposalsStore.find(p => p.proposalId === request.proposalId);
        if (proposal) {
          proposal.status = 'rejected';
        }
      } else if (input.action === 'discuss') {
        request.status = 'in_discussion';
        request.approverComment = input.comment;

        // 改善案のステータスも更新
        const proposal = proposalsStore.find(p => p.proposalId === request.proposalId);
        if (proposal) {
          proposal.status = 'in_discussion';
        }
      }

      return {
        success: true,
        result,
      };
    }),

  /**
   * 改善を実行（承認後）
   */
  executeImprovement: protectedProcedure
    .input(
      z.object({
        proposalId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const proposal = proposalsStore.find(p => p.proposalId === input.proposalId);

      if (!proposal) {
        throw new Error('改善案が見つかりません');
      }

      if (proposal.status !== 'approved') {
        throw new Error('この改善案は承認されていません');
      }

      const result = await executeImprovement(input.proposalId);

      // 改善案のステータスを更新
      if (result.success) {
        proposal.status = 'implemented';
      }

      return {
        success: true,
        result,
      };
    }),

  /**
   * 統計情報を取得
   */
  getStats: protectedProcedure
    .query(async () => {
      const stats = await getSelfEvolutionStats();

      return {
        success: true,
        stats,
      };
    }),
});
