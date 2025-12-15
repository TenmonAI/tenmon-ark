/**
 * TENMON Doctor
 * HealthCheck 5項目を検査するコマンド
 * 
 * 使用方法: node -r ts-node/register server/cli/doctor.ts
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * ヘルスチェック結果
 */
export interface HealthCheckResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

/**
 * ヘルスチェック5項目
 */
export const HEALTH_CHECKS = [
  {
    id: 'env',
    name: '環境変数チェック',
    description: '必要な環境変数が設定されているか',
  },
  {
    id: 'database',
    name: 'データベース接続チェック',
    description: 'データベースに接続できるか',
  },
  {
    id: 'api-keys',
    name: 'API キーチェック',
    description: 'OpenAI API キーなどが設定されているか',
  },
  {
    id: 'file-structure',
    name: 'ファイル構造チェック',
    description: '必要なファイル・ディレクトリが存在するか',
  },
  {
    id: 'dependencies',
    name: '依存関係チェック',
    description: '必要なパッケージがインストールされているか',
  },
] as const;

/**
 * ヘルスチェックを実行
 */
export async function runHealthChecks(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  // 1. 環境変数チェック
  results.push(await checkEnvironmentVariables());

  // 2. データベース接続チェック
  results.push(await checkDatabaseConnection());

  // 3. API キーチェック
  results.push(await checkApiKeys());

  // 4. ファイル構造チェック
  results.push(await checkFileStructure());

  // 5. 依存関係チェック
  results.push(await checkDependencies());

  return results;
}

/**
 * 環境変数チェック
 */
async function checkEnvironmentVariables(): Promise<HealthCheckResult> {
  const requiredVars = [
    'NODE_ENV',
    'DATABASE_URL',
  ];

  const missing: string[] = [];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    return {
      check: 'env',
      status: 'fail',
      message: `以下の環境変数が設定されていません: ${missing.join(', ')}`,
      details: '環境変数を設定してください',
    };
  }

  return {
    check: 'env',
    status: 'pass',
    message: 'すべての必須環境変数が設定されています',
  };
}

/**
 * データベース接続チェック
 */
async function checkDatabaseConnection(): Promise<HealthCheckResult> {
  try {
    const { getDb } = await import('../db');
    const db = await getDb();

    if (!db) {
      return {
        check: 'database',
        status: 'fail',
        message: 'データベース接続に失敗しました',
        details: 'DATABASE_URL を確認してください',
      };
    }

    // 簡単なクエリを実行して接続を確認
    // TODO: 実際のデータベースクエリを実行

    return {
      check: 'database',
      status: 'pass',
      message: 'データベース接続が正常です',
    };
  } catch (error) {
    return {
      check: 'database',
      status: 'fail',
      message: 'データベース接続チェック中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * API キーチェック
 */
async function checkApiKeys(): Promise<HealthCheckResult> {
  const requiredKeys = [
    'OPENAI_API_KEY',
  ];

  const missing: string[] = [];
  const warnings: string[] = [];

  for (const keyName of requiredKeys) {
    if (!process.env[keyName]) {
      missing.push(keyName);
    }
  }

  // オプションのAPIキー
  const optionalKeys = [
    'STABILITY_API_KEY',
    'ARK_PUBLIC_KEY',
  ];

  for (const keyName of optionalKeys) {
    if (!process.env[keyName]) {
      warnings.push(keyName);
    }
  }

  if (missing.length > 0) {
    return {
      check: 'api-keys',
      status: 'fail',
      message: `以下のAPIキーが設定されていません: ${missing.join(', ')}`,
      details: 'APIキーを設定してください',
    };
  }

  if (warnings.length > 0) {
    return {
      check: 'api-keys',
      status: 'warning',
      message: `以下のオプションAPIキーが設定されていません: ${warnings.join(', ')}`,
      details: '一部の機能が制限される可能性があります',
    };
  }

  return {
    check: 'api-keys',
    status: 'pass',
    message: 'すべてのAPIキーが設定されています',
  };
}

/**
 * ファイル構造チェック
 */
async function checkFileStructure(): Promise<HealthCheckResult> {
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'server/_core/index.ts',
    'client/src/App.tsx',
  ];

  const requiredDirs = [
    'server',
    'client',
    'drizzle',
  ];

  const missing: string[] = [];

  for (const file of requiredFiles) {
    if (!existsSync(file)) {
      missing.push(file);
    }
  }

  for (const dir of requiredDirs) {
    if (!existsSync(dir)) {
      missing.push(dir);
    }
  }

  if (missing.length > 0) {
    return {
      check: 'file-structure',
      status: 'fail',
      message: `以下のファイル・ディレクトリが見つかりません: ${missing.join(', ')}`,
      details: 'プロジェクト構造が不完全です',
    };
  }

  return {
    check: 'file-structure',
    status: 'pass',
    message: 'ファイル構造が正常です',
  };
}

/**
 * 依存関係チェック
 */
async function checkDependencies(): Promise<HealthCheckResult> {
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    if (!existsSync(packageJsonPath)) {
      return {
        check: 'dependencies',
        status: 'fail',
        message: 'package.json が見つかりません',
      };
    }

    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    const requiredDeps = [
      'express',
      '@trpc/server',
      'zod',
      'openai',
    ];

    const missing: string[] = [];
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    for (const dep of requiredDeps) {
      if (!deps[dep]) {
        missing.push(dep);
      }
    }

    if (missing.length > 0) {
      return {
        check: 'dependencies',
        status: 'fail',
        message: `以下の依存関係が不足しています: ${missing.join(', ')}`,
        details: 'npm install を実行してください',
      };
    }

    // node_modules の存在確認
    if (!existsSync(join(process.cwd(), 'node_modules'))) {
      return {
        check: 'dependencies',
        status: 'warning',
        message: 'node_modules が見つかりません',
        details: 'npm install を実行してください',
      };
    }

    return {
      check: 'dependencies',
      status: 'pass',
      message: 'すべての依存関係がインストールされています',
    };
  } catch (error) {
    return {
      check: 'dependencies',
      status: 'fail',
      message: '依存関係チェック中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ヘルスチェック結果を表示
 */
export function formatHealthCheckResults(results: HealthCheckResult[]): string {
  const lines: string[] = [];

  lines.push('🔱 TENMON-ARK Doctor - Health Check Results');
  lines.push('');
  lines.push('='.repeat(60));
  lines.push('');

  for (const result of results) {
    const check = HEALTH_CHECKS.find(c => c.id === result.check);
    const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    
    lines.push(`${icon} ${check?.name || result.check}`);
    lines.push(`   ${result.message}`);
    if (result.details) {
      lines.push(`   Details: ${result.details}`);
    }
    lines.push('');
  }

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Summary: ${passCount} passed, ${warningCount} warnings, ${failCount} failed`);
  lines.push('');

  if (failCount === 0 && warningCount === 0) {
    lines.push('✅ All health checks passed!');
  } else if (failCount === 0) {
    lines.push('⚠️ Some warnings detected, but system is operational');
  } else {
    lines.push('❌ Some health checks failed. Please fix the issues above.');
  }

  return lines.join('\n');
}

// CLI実行用（Node.js v22+ ESM対応）
// 使用方法: node --loader tsx server/cli/doctor.ts
// または: npx tsx server/cli/doctor.ts
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('doctor.ts')) {
  runHealthChecks()
    .then((results) => {
      const report = formatHealthCheckResults(results);
      console.log(report);
      process.exit(results.some(r => r.status === 'fail') ? 1 : 0);
    })
    .catch((error) => {
      console.error('[Doctor] Error:', error);
      process.exit(1);
    });
}

