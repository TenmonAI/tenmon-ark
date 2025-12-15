/**
 * API Docs Endpoint
 * API仕様を提供するエンドポイント
 * 
 * PUBLIC ENDPOINT: 認証不要（公開情報）
 */

import express from 'express';
import { generateApiDocs, generateMarkdown, generateJsonSpec } from './generator';

const router = express.Router();

/**
 * GET /api/docs
 * JSON形式のAPI仕様を返す
 * 
 * PUBLIC ENDPOINT: 認証不要
 */
router.get('/docs', (req, res) => {
  // PUBLIC ENDPOINT: 認証不要
  (req as any).isPublicEndpoint = true;
  try {
    const docs = generateApiDocs();
    const jsonSpec = generateJsonSpec(docs);
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(jsonSpec);
  } catch (error) {
    console.error('[API Docs] Error:', error);
    res.status(500).json({
      error: 'Failed to generate API documentation',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/docs/markdown
 * Markdown形式のAPI仕様を返す
 * 
 * PUBLIC ENDPOINT: 認証不要
 */
router.get('/docs/markdown', (req, res) => {
  // PUBLIC ENDPOINT: 認証不要
  (req as any).isPublicEndpoint = true;
  try {
    const docs = generateApiDocs();
    const markdown = generateMarkdown(docs);
    
    res.setHeader('Content-Type', 'text/markdown');
    res.status(200).send(markdown);
  } catch (error) {
    console.error('[API Docs] Error:', error);
    res.status(500).json({
      error: 'Failed to generate API documentation',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

