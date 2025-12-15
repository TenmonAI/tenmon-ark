/**
 * ============================================================
 *  BULK INGEST ENGINE — 大量 ingest エンジン
 * ============================================================
 * 
 * 大量のファイルを ingest → SemanticUnit → FractalSeed に変換
 * 
 * 機能:
 * - テキスト処理
 * - PDF処理
 * - 画像処理
 * - バッチ処理
 * ============================================================
 */

import { createSemanticUnit, type SemanticUnit } from "../db/schema/semanticUnit";
import { createFractalSeed, type FractalSeed } from "../db/schema/fractalSeed";
import { processText } from "./textProcessor";
import { processPdf } from "./pdfProcessor";
import { processImage } from "./imageProcessor";
import { computeReishoSignature } from "../../reisho/reishoKernel";
import type { KzFile } from "../db/schema/kzFile";
import { saveSemanticUnit, saveFractalSeed, saveKzFile } from "../db/adapter";

export interface BulkIngestResult {
  /** 処理されたファイル数 */
  processedFiles: number;
  
  /** 生成された SemanticUnit 数 */
  semanticUnits: number;
  
  /** 生成された FractalSeed 数 */
  fractalSeeds: number;
  
  /** エラー数 */
  errors: number;
  
  /** エラーメッセージ */
  errorMessages: string[];
}

/**
 * 大量 ingest エンジン
 */
export async function bulkIngest(
  files: KzFile[],
  options: {
    batchSize?: number;
    enableFractalSeed?: boolean;
    enableReishoSignature?: boolean;
    conversationId?: number; // 会話ID（メタデータ）
    projectId?: number | null; // プロジェクトID（メタデータ）
  } = {}
): Promise<BulkIngestResult> {
  const {
    batchSize = 10,
    enableFractalSeed = true,
    enableReishoSignature = true,
  } = options;
  
  const result: BulkIngestResult = {
    processedFiles: 0,
    semanticUnits: 0,
    fractalSeeds: 0,
    errors: 0,
    errorMessages: [],
  };
  
  // バッチ処理
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    for (const file of batch) {
      try {
        // ファイルタイプに応じて処理
        let semanticUnits: SemanticUnit[] = [];
        
        switch (file.type) {
          case "text":
            semanticUnits = await processText(file);
            break;
          case "pdf":
            semanticUnits = await processPdf(file);
            break;
          case "image":
            semanticUnits = await processImage(file);
            break;
          default:
            console.warn(`Unsupported file type: ${file.type}`);
            continue;
        }
        
        // Reishō シグネチャを追加
        if (enableReishoSignature) {
          for (const unit of semanticUnits) {
            const signature = computeReishoSignature(
              unit.text,
              null
            );
            unit.reishoSignature = {
              reishoValue: signature.reishoValue,
              kanagiPhase: JSON.stringify(signature.kanagiPhaseTensor),
              fireWaterBalance: signature.unifiedFireWaterTensor.reduce((a, b) => a + b, 0) / signature.unifiedFireWaterTensor.length,
              unifiedFireWaterTensor: signature.unifiedFireWaterTensor,
              kanagiPhaseTensor: signature.kanagiPhaseTensor,
              kotodamaHelixTensor: signature.kotodamaHelixTensor,
            };
          }
        }
        
        // SemanticUnit に projectId / conversationId をメタデータとして付与
        for (const unit of semanticUnits) {
          if (!unit.metadata) {
            unit.metadata = {};
          }
          if (options.conversationId !== undefined) {
            unit.metadata.conversationId = String(options.conversationId);
          }
          if (options.projectId !== undefined) {
            unit.metadata.projectId = options.projectId;
          }
        }
        
        // SemanticUnit をデータベースに保存
        for (const unit of semanticUnits) {
          await saveSemanticUnit(unit as any);
        }
        
        // FractalSeed を生成
        if (enableFractalSeed && semanticUnits.length > 0) {
          const fractalSeed = await generateFractalSeedFromUnits(semanticUnits, options);
          
          // FractalSeed をデータベースに保存
          await saveFractalSeed(fractalSeed as any);
          result.fractalSeeds++;
        }
        
        // KzFile を更新（SemanticUnit と FractalSeed の参照を追加）
        file.semanticUnitIds = semanticUnits.map(u => u.id);
        if (enableFractalSeed && semanticUnits.length > 0) {
          const seed = await generateFractalSeedFromUnits(semanticUnits, {
            conversationId: options.conversationId,
            projectId: options.projectId,
          });
          file.fractalSeedIds = [seed.id];
        }
        await saveKzFile(file as any);
        
        result.semanticUnits += semanticUnits.length;
        result.processedFiles++;
      } catch (error) {
        result.errors++;
        result.errorMessages.push(
          `Error processing file ${file.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  }
  
  return result;
}

/**
 * SemanticUnit から FractalSeed を生成
 */
async function generateFractalSeedFromUnits(
  units: SemanticUnit[],
  options?: {
    conversationId?: number;
    projectId?: number | null;
  }
): Promise<FractalSeed> {
  const seedId = `seed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // メインタグを抽出
  const mainTags = units
    .flatMap(u => u.metadata.tags || [])
    .filter((tag, index, self) => self.indexOf(tag) === index)
    .slice(0, 10);
  
  // セマンティックエッジを生成
  const semanticEdges = units.slice(0, 10).map((unit, index) => ({
    targetId: unit.id,
    weight: unit.importance || 0.5,
  }));
  
  // Reishō シグネチャを統合
  const reishoSignatures = units
    .map(u => u.reishoSignature)
    .filter(s => s !== undefined);
  
  const avgReishoValue = reishoSignatures.length > 0
    ? reishoSignatures.reduce((sum, s) => sum + (s?.reishoValue || 0), 0) / reishoSignatures.length
    : 0.5;
  
  // メタデータを生成（projectId / conversationId を付与）
  const metadata: FractalSeed["metadata"] = {};
  if (options?.conversationId !== undefined) {
    metadata.conversationId = String(options.conversationId);
  }
  if (options?.projectId !== undefined) {
    metadata.projectId = options.projectId;
  }
  
  return createFractalSeed({
    id: seedId,
    semanticUnitIds: units.map(u => u.id),
    metadata,
    compressedRepresentation: {
      mainTags,
      semanticEdges,
      seedWeight: avgReishoValue,
    },
    reishoSignature: reishoSignatures[0] ? {
      reishoValue: avgReishoValue,
      kanagiPhase: reishoSignatures[0].kanagiPhase || "L-IN",
      fireWaterBalance: reishoSignatures[0].fireWaterBalance || 0,
      unifiedFireWaterTensor: reishoSignatures[0].unifiedFireWaterTensor,
      kanagiPhaseTensor: reishoSignatures[0].kanagiPhaseTensor,
      kotodamaHelixTensor: reishoSignatures[0].kotodamaHelixTensor,
    } : undefined,
    structuralParams: {
      recursionPotential: avgReishoValue,
      contractionPotential: avgReishoValue,
      reishoCurve: avgReishoValue,
    },
  });
}

export default {
  bulkIngest,
};

