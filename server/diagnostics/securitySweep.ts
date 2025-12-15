/**
 * Security Sweep Engine
 * 認証漏れAPI、未検証パラメータ、危険パスの自動検出
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';

/**
 * セキュリティスイープ結果
 */
export interface SecuritySweepResult {
  unauthenticatedAPIs: Array<{
    file: string;
    line: number;
    endpoint: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  unvalidatedParameters: Array<{
    file: string;
    line: number;
    parameter: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  dangerousPaths: Array<{
    file: string;
    line: number;
    path: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  summary: {
    totalIssues: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
}

/**
 * セキュリティスイープを実行
 * 
 * @param targetDirectories スキャン対象ディレクトリ
 * @returns セキュリティスイープ結果
 */
export async function runSecuritySweep(
  targetDirectories: string[] = [
    'server/api',
    'server/chat',
    'server/concierge',
    'server/lifeGuardian',
    'server/deviceCluster-v3',
    'server/selfEvolution',
  ]
): Promise<SecuritySweepResult> {
  const unauthenticatedAPIs: SecuritySweepResult['unauthenticatedAPIs'] = [];
  const unvalidatedParameters: SecuritySweepResult['unvalidatedParameters'] = [];
  const dangerousPaths: SecuritySweepResult['dangerousPaths'] = [];

  // 各ディレクトリをスキャン
  for (const dir of targetDirectories) {
    if (!existsSync(dir)) {
      continue;
    }

    const files = await getAllTypeScriptFiles(dir);
    
    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      const lines = content.split('\n');

      // 認証漏れAPIの検出
      detectUnauthenticatedAPIs(file, lines, unauthenticatedAPIs);

      // 未検証パラメータの検出
      detectUnvalidatedParameters(file, lines, unvalidatedParameters);

      // 危険パスの検出
      detectDangerousPaths(file, lines, dangerousPaths);
    }
  }

  // サマリーを計算
  const allIssues = [
    ...unauthenticatedAPIs,
    ...unvalidatedParameters,
    ...dangerousPaths,
  ];

  const summary = {
    totalIssues: allIssues.length,
    highSeverity: allIssues.filter(i => i.severity === 'high').length,
    mediumSeverity: allIssues.filter(i => i.severity === 'medium').length,
    lowSeverity: allIssues.filter(i => i.severity === 'low').length,
  };

  return {
    unauthenticatedAPIs,
    unvalidatedParameters,
    dangerousPaths,
    summary,
  };
}

/**
 * すべてのTypeScriptファイルを取得
 */
async function getAllTypeScriptFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function scanDirectory(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // node_modules, dist, .git をスキップ
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
          await scanDirectory(fullPath);
        }
      } else if (entry.isFile() && extname(entry.name) === '.ts') {
        files.push(fullPath);
      }
    }
  }

  await scanDirectory(dir);
  return files;
}

/**
 * 認証漏れAPIを検出
 */
function detectUnauthenticatedAPIs(
  file: string,
  lines: string[],
  results: SecuritySweepResult['unauthenticatedAPIs']
): void {
  const publicEndpoints = [
    '/api/docs',
    '/api/stripe/webhook',
    '/api/oauth/callback',
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Express router の定義を検出
    if (line.includes('router.') && (line.includes('get(') || line.includes('post(') || line.includes('put(') || line.includes('delete('))) {
      // 認証チェックの有無を確認
      const hasAuth = checkAuthenticationInContext(lines, i, 20);
      
      if (!hasAuth) {
        // エンドポイントパスを抽出
        const endpointMatch = line.match(/['"`]([^'"`]+)['"`]/);
        const endpoint = endpointMatch ? endpointMatch[1] : 'unknown';

        // 公開エンドポイントは除外
        if (!publicEndpoints.some(pe => endpoint.startsWith(pe))) {
          results.push({
            file,
            line: lineNumber,
            endpoint,
            severity: 'high',
          });
        }
      }
    }

    // tRPC procedure の定義を検出
    if (line.includes('publicProcedure') && !line.includes('protectedProcedure')) {
      results.push({
        file,
        line: lineNumber,
        endpoint: 'tRPC procedure',
        severity: 'medium', // tRPCは明示的にpublicProcedureを使用する場合があるため
      });
    }
  }
}

/**
 * 認証チェックの有無を確認
 */
function checkAuthenticationInContext(
  lines: string[],
  startIndex: number,
  contextLines: number
): boolean {
  const endIndex = Math.min(startIndex + contextLines, lines.length);
  
  for (let i = startIndex; i < endIndex; i++) {
    const line = lines[i].toLowerCase();
    
    // 認証チェックのパターン
    if (
      line.includes('authenticaterequest') ||
      line.includes('authenticate') ||
      line.includes('authmiddleware') ||
      line.includes('protectedprocedure') ||
      line.includes('ispublicendpoint') ||
      line.includes('public endpoint')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * 未検証パラメータを検出
 */
function detectUnvalidatedParameters(
  file: string,
  lines: string[],
  results: SecuritySweepResult['unvalidatedParameters']
): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // req.body, req.query, req.params の直接使用を検出
    if (
      line.includes('req.body') ||
      line.includes('req.query') ||
      line.includes('req.params')
    ) {
      // zod検証の有無を確認
      const hasValidation = checkValidationInContext(lines, i, 30);
      
      if (!hasValidation) {
        // パラメータ名を抽出
        const paramMatch = line.match(/req\.(body|query|params)\.?(\w+)?/);
        const parameter = paramMatch ? `${paramMatch[1]}.${paramMatch[2] || '*'}` : 'unknown';

        results.push({
          file,
          line: lineNumber,
          parameter,
          severity: 'high',
        });
      }
    }
  }
}

/**
 * バリデーションの有無を確認
 */
function checkValidationInContext(
  lines: string[],
  startIndex: number,
  contextLines: number
): boolean {
  const endIndex = Math.min(startIndex + contextLines, lines.length);
  
  for (let i = startIndex; i < endIndex; i++) {
    const line = lines[i].toLowerCase();
    
    // バリデーションパターン
    if (
      line.includes('z.parse') ||
      line.includes('z.object') ||
      line.includes('zod') ||
      line.includes('validate') ||
      line.includes('schema.parse')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * 危険パスを検出
 */
function detectDangerousPaths(
  file: string,
  lines: string[],
  results: SecuritySweepResult['dangerousPaths']
): void {
  const dangerousPathPatterns = [
    /['"`]\/etc\//,
    /['"`]\/usr\//,
    /['"`]\/bin\//,
    /['"`]\/sbin\//,
    /['"`]\/var\//,
    /['"`]\/sys\//,
    /['"`]\/proc\//,
    /['"`]\.\.\//,
    /['"`]\.\.\\/,
    /['"`]server\/_core\//,
    /['"`]\.env/,
    /['"`]package\.json/,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    for (const pattern of dangerousPathPatterns) {
      if (pattern.test(line)) {
        const match = line.match(pattern);
        const path = match ? match[0].replace(/['"`]/g, '') : 'unknown';

        // コメントや文字列リテラル内の場合は除外
        if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
          results.push({
            file,
            line: lineNumber,
            path,
            severity: path.includes('..') || path.startsWith('/') ? 'high' : 'medium',
          });
        }
      }
    }
  }
}

/**
 * セキュリティスイープ結果をレポート形式で出力
 */
export function formatSecuritySweepReport(result: SecuritySweepResult): string {
  const lines: string[] = [];

  lines.push('# Security Sweep Report');
  lines.push('');
  lines.push(`**Total Issues**: ${result.summary.totalIssues}`);
  lines.push(`- High Severity: ${result.summary.highSeverity}`);
  lines.push(`- Medium Severity: ${result.summary.mediumSeverity}`);
  lines.push(`- Low Severity: ${result.summary.lowSeverity}`);
  lines.push('');

  if (result.unauthenticatedAPIs.length > 0) {
    lines.push('## Unauthenticated APIs');
    lines.push('');
    for (const api of result.unauthenticatedAPIs) {
      lines.push(`- **${api.endpoint}** (${api.file}:${api.line}) - ${api.severity.toUpperCase()}`);
    }
    lines.push('');
  }

  if (result.unvalidatedParameters.length > 0) {
    lines.push('## Unvalidated Parameters');
    lines.push('');
    for (const param of result.unvalidatedParameters) {
      lines.push(`- **${param.parameter}** (${param.file}:${param.line}) - ${param.severity.toUpperCase()}`);
    }
    lines.push('');
  }

  if (result.dangerousPaths.length > 0) {
    lines.push('## Dangerous Paths');
    lines.push('');
    for (const path of result.dangerousPaths) {
      lines.push(`- **${path.path}** (${path.file}:${path.line}) - ${path.severity.toUpperCase()}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

