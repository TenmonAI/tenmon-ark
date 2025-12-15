/**
 * Whisper STT API Endpoint
 * OpenAI Whisper API で音声→テキスト変換
 * 
 * 対応範囲: 10〜60秒の音声
 * リアルタイム変換はPHASE 2で実装予定
 */

import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { transcribeAudio, type TranscriptionResponse, type TranscriptionError } from '../../_core/voiceTranscription';
import { sdk } from '../../_core/sdk';

const router = express.Router();

// Zodスキーマ: リクエストボディの検証
const whisperRequestSchema = z.object({
  language: z.string().optional(),
  prompt: z.string().optional(),
});

// Zodスキーマ: レスポンス形式の統一
const whisperSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    text: z.string(),
    language: z.string(),
    duration: z.number().optional(),
    segments: z.array(z.any()).optional(),
  }),
});

const whisperErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.string().optional(),
  }),
});

// 許可されたMIMEタイプ（厳格なリスト）
const ALLOWED_MIME_TYPES = [
  'audio/wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/webm',
  'audio/mp4',
  'audio/m4a',
] as const;

// 許可された拡張子
const ALLOWED_EXTENSIONS = ['.wav', '.mp3', '.webm', '.m4a', '.mp4'] as const;

// Magic Number（ファイル形式の識別子）
const MAGIC_NUMBERS: Record<string, Buffer[]> = {
  'audio/wav': [Buffer.from('RIFF'), Buffer.from('WAVE')],
  'audio/mpeg': [Buffer.from([0xFF, 0xFB]), Buffer.from([0xFF, 0xF3]), Buffer.from([0xFF, 0xF2])],
  'audio/webm': [Buffer.from([0x1A, 0x45, 0xDF, 0xA3])],
  'audio/mp4': [Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70])],
};

/**
 * ファイルの拡張子を取得
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.substring(lastDot).toLowerCase() : '';
}

/**
 * Magic Numberによるファイル形式の検証
 * ファイルの先頭数バイトをチェックして、実際のファイル形式を確認
 */
function validateMagicNumber(buffer: Buffer, expectedMime: string): boolean {
  const magicNumbers = MAGIC_NUMBERS[expectedMime];
  if (!magicNumbers) {
    // Magic Numberが定義されていないMIMEタイプは許可しない（安全性のため）
    return false;
  }

  // 先頭数バイトをチェック
  for (const magic of magicNumbers) {
    if (buffer.length >= magic.length) {
      const header = buffer.slice(0, magic.length);
      if (header.equals(magic)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * アンチウイルススキャン（stub実装）
 * 本番環境では実際のウイルススキャンサービスと統合
 */
async function antivirusScanStub(buffer: Buffer, filename: string): Promise<{ safe: boolean; reason?: string }> {
  // Stub実装: 基本的なチェックのみ
  // 本番環境では ClamAV や VirusTotal API などと統合

  // 1. ファイルサイズが異常に小さい場合は拒否（空ファイルや不正なファイル）
  if (buffer.length < 100) {
    return {
      safe: false,
      reason: 'File is too small to be a valid audio file',
    };
  }

  // 2. ファイルサイズが異常に大きい場合は拒否（既にmulterで制限されているが、念のため）
  if (buffer.length > 16 * 1024 * 1024) {
    return {
      safe: false,
      reason: 'File exceeds maximum size limit',
    };
  }

  // 3. バイナリパターンの基本的なチェック（将来的に拡張可能）
  // 現在は stub として常に safe を返す
  // 本番環境では実際のウイルススキャンサービスを呼び出す

  return { safe: true };
}

const upload = multer({
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB limit
  },
  fileFilter: (req, file, cb) => {
    // 1. MIMEタイプのチェック
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      return cb(new Error(`Invalid MIME type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
    }

    // 2. 拡張子のチェック
    const extension = getFileExtension(file.originalname);
    if (!ALLOWED_EXTENSIONS.includes(extension as any)) {
      return cb(new Error(`Invalid file extension: ${extension}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }

    // MIMEタイプと拡張子の整合性チェック
    const mimeExtensionMap: Record<string, string[]> = {
      'audio/wav': ['.wav', '.wave'],
      'audio/wave': ['.wav', '.wave'],
      'audio/mpeg': ['.mp3'],
      'audio/mp3': ['.mp3'],
      'audio/webm': ['.webm'],
      'audio/mp4': ['.mp4'],
      'audio/m4a': ['.m4a'],
    };

    const allowedExtensions = mimeExtensionMap[file.mimetype];
    if (!allowedExtensions || !allowedExtensions.includes(extension)) {
      return cb(new Error(`MIME type ${file.mimetype} does not match extension ${extension}`));
    }

    cb(null, true);
  },
});

/**
 * POST /api/stt/whisper
 * 音声ファイルをアップロードしてテキストに変換
 * 
 * Request:
 * - multipart/form-data
 *   - file: 音声ファイル（必須）
 *   - language: 言語コード（オプション、例: "ja", "en"）
 *   - prompt: カスタムプロンプト（オプション）
 * 
 * Response:
 * - 200: { text: string, language: string, duration: number, segments: Array }
 * - 400: { error: string, code: string, details?: string }
 */
router.post('/whisper', upload.single('file'), async (req, res) => {
  try {
    // 認証チェック
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // ファイルチェック
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FORMAT',
          message: 'No audio file provided',
          details: 'Please provide an audio file in the request',
        },
      });
    }

    // リクエストボディの検証（zod）
    let bodyData: z.infer<typeof whisperRequestSchema>;
    try {
      bodyData = whisperRequestSchema.parse({
        language: req.body.language,
        prompt: req.body.prompt,
      });
    } catch (zodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid request body',
          details: zodError instanceof z.ZodError ? zodError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') : 'Validation failed',
        },
      });
    }

    // ファイルサイズチェック（10秒〜60秒の目安: 約1MB〜6MB）
    const sizeMB = req.file.size / (1024 * 1024);
    if (sizeMB < 0.1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_SMALL',
          message: 'Audio file is too small',
          details: 'Audio file must be at least 0.1MB (approximately 10 seconds)',
        },
      });
    }
    if (sizeMB > 16) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'Audio file exceeds maximum size limit',
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 16MB`,
        },
      });
    }

    // ファイルサイズから推定される音声時間（簡易計算）
    // 一般的な音声ファイルのビットレート: 128kbps = 16KB/s
    // より正確な計算には実際のファイル形式解析が必要
    const estimatedDurationSeconds = (req.file.size / (16 * 1024));
    if (estimatedDurationSeconds < 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DURATION_TOO_SHORT',
          message: 'Audio file duration is too short',
          details: 'Audio file must be at least 10 seconds long',
        },
      });
    }
    if (estimatedDurationSeconds > 60) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DURATION_TOO_LONG',
          message: 'Audio file duration is too long',
          details: 'Audio file must be at most 60 seconds long',
        },
      });
    }

    // Magic Numberによるファイル形式の検証（内容ベースの検証）
    const audioBuffer = req.file.buffer;
    if (!validateMagicNumber(audioBuffer, req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AUDIO',
          message: 'File content does not match declared MIME type',
          details: `The file content does not match the declared MIME type: ${req.file.mimetype}`,
        },
      });
    }

    // アンチウイルススキャン（stub実装）
    const scanResult = await antivirusScanStub(audioBuffer, req.file.originalname);
    if (!scanResult.safe) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AUDIO',
          message: 'File security check failed',
          details: scanResult.reason || 'File did not pass security validation',
        },
      });
    }

    // 一時的なURLを生成（実際の実装ではS3などにアップロード）
    // ここでは簡易版として、base64エンコードされたデータを使用
    const base64Audio = audioBuffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64Audio}`;

    // 言語とプロンプトを取得（zod検証済み）
    const language = bodyData.language || undefined;
    const prompt = bodyData.prompt || undefined;

    // 音声をテキストに変換
    const result = await transcribeAudio({
      audioUrl: dataUrl,
      language,
      prompt,
    });

    // エラーチェック
    if ('error' in result) {
      const error = result as TranscriptionError;
      return res.status(400).json({
        success: false,
        error: {
          code: error.code,
          message: error.error,
          details: error.details,
        },
      });
    }

    // 成功レスポンス（zod検証済み形式）
    const transcription = result as TranscriptionResponse;
    const successResponse = {
      success: true as const,
      data: {
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        segments: transcription.segments,
      },
    };

    // zod検証（型安全性のため）
    whisperSuccessResponseSchema.parse(successResponse);

    return res.status(200).json(successResponse);

  } catch (error) {
    console.error('[STT Whisper] Error:', error);
    
    // zod検証エラーの場合は詳細を返す
    if (error instanceof z.ZodError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Response validation failed',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVICE_ERROR',
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

export default router;

