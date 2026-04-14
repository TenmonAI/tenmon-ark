/**
 * Ambient type declarations for modules without bundled types
 * and Express Request augmentation for multer.
 *
 * CARD 1: API build blocker 止血
 * - cookie-parser / multer / kuromoji の型が devDependencies 未インストール時でも
 *   ビルドが通るようにフォールバック宣言を用意する。
 * - @types/* が存在する場合はそちらが優先される（skipLibCheck: true）。
 */

// ── multer: Express.Request.file 拡張 ──────────────────────
// @types/multer がインストールされていない環境向けフォールバック
declare global {
  namespace Express {
    interface Request {
      file?: {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
        destination?: string;
        filename?: string;
        path?: string;
      };
      files?:
        | {
            [fieldname: string]: Array<Express.Request["file"] & {}>;
          }
        | Array<Express.Request["file"] & {}>;
    }
  }
}

export {};
