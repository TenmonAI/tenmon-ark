/**
 * API Docs Generator
 * API仕様を自動生成
 */

export interface ApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description?: string;
  category?: string;
  input?: {
    type: 'json' | 'form-data' | 'multipart' | 'query';
    schema?: Record<string, unknown>;
    description?: string;
  };
  output?: {
    type: 'json';
    schema?: Record<string, unknown>;
    description?: string;
  };
  auth?: {
    required: boolean;
    type?: 'bearer' | 'session';
  };
  examples?: {
    request?: unknown;
    response?: unknown;
  };
}

export interface ApiDocs {
  version: string;
  generatedAt: string;
  routes: ApiRoute[];
}

/**
 * APIルート一覧をスキャン
 */
export function scanApiRoutes(): ApiRoute[] {
  const routes: ApiRoute[] = [];

  // REST API Routes
  routes.push({
    method: 'POST',
    path: '/api/stt/whisper',
    description: 'Whisper STT API - 音声をテキストに変換',
    category: 'stt',
    input: {
      type: 'multipart',
      description: 'multipart/form-data形式で音声ファイルをアップロード',
      schema: {
        file: { type: 'file', required: true, description: '音声ファイル（0.1MB〜16MB）' },
        language: { type: 'string', required: false, description: '言語コード（例: "ja", "en"）' },
        prompt: { type: 'string', required: false, description: 'カスタムプロンプト' },
      },
    },
    output: {
      type: 'json',
      description: '変換結果',
      schema: {
        text: { type: 'string', description: '変換されたテキスト' },
        language: { type: 'string', description: '検出された言語' },
        duration: { type: 'number', description: '音声の長さ（秒）' },
        segments: { type: 'array', description: 'タイムスタンプ付きセグメント' },
      },
    },
    auth: {
      required: true,
      type: 'session',
    },
  });

  routes.push({
    method: 'POST',
    path: '/api/concierge/semantic-search',
    description: 'セマンティック検索を実行',
    category: 'concierge',
    input: {
      type: 'json',
      description: 'JSON形式のリクエストボディ',
      schema: {
        query: { type: 'string', required: true, description: '検索クエリ' },
        limit: { type: 'number', required: false, description: '返す結果の最大数（デフォルト: 10）' },
      },
    },
    output: {
      type: 'json',
      description: '検索結果',
      schema: {
        results: {
          type: 'array',
          description: '検索結果の配列',
          items: {
            document: {
              id: { type: 'string' },
              text: { type: 'string' },
              metadata: { type: 'object' },
            },
            score: { type: 'number', description: '類似度スコア（0-1）' },
          },
        },
      },
    },
    auth: {
      required: true,
      type: 'session',
    },
  });

  routes.push({
    method: 'POST',
    path: '/api/concierge/semantic-index/add',
    description: 'ドキュメントをセマンティックインデックスに追加',
    category: 'concierge',
    input: {
      type: 'json',
      description: 'JSON形式のリクエストボディ',
      schema: {
        document: {
          id: { type: 'string', required: true, description: 'ドキュメントID' },
          text: { type: 'string', required: true, description: 'ドキュメントテキスト' },
          metadata: { type: 'object', required: false, description: 'メタデータ' },
        },
      },
    },
    output: {
      type: 'json',
      description: '追加結果',
      schema: {
        success: { type: 'boolean', description: '成功/失敗' },
      },
    },
    auth: {
      required: true,
      type: 'session',
    },
  });

  // tRPC Routes (主要なもの)
  routes.push({
    method: 'POST',
    path: '/api/trpc/atlasChat.chat',
    description: 'Atlas Chat API - 天聞アーク人格の脳によるチャット応答生成',
    category: 'atlasChat',
    input: {
      type: 'json',
      description: 'tRPC形式のリクエスト',
      schema: {
        message: { type: 'string', required: true, description: 'ユーザーメッセージ' },
        language: { type: 'string', required: false, description: '言語コード（デフォルト: "ja"）' },
        model: { type: 'string', required: false, description: 'モデル名（gpt-4o, gpt-4.1, gpt-o3）' },
        conversationId: { type: 'number', required: false, description: '会話ID' },
      },
    },
    output: {
      type: 'json',
      description: 'チャット応答',
      schema: {
        success: { type: 'boolean' },
        role: { type: 'string', description: 'ロール（"assistant"）' },
        text: { type: 'string', description: '応答テキスト' },
        reasoning: {
          steps: { type: 'array', description: '推論ステップ' },
          finalThought: { type: 'string', description: '最終思考' },
        },
        persona: {
          id: { type: 'string' },
          name: { type: 'string' },
          tone: { type: 'string' },
        },
        memory: {
          retrieved: { type: 'number', description: '取得した記憶数' },
          stored: { type: 'boolean', description: '記憶が保存されたか' },
        },
      },
    },
    auth: {
      required: true,
      type: 'session',
    },
  });

  routes.push({
    method: 'POST',
    path: '/api/trpc/animeBackground.generate',
    description: 'Anime Background Generator - Visual Synapse背景生成',
    category: 'anime',
    input: {
      type: 'json',
      description: 'tRPC形式のリクエスト',
      schema: {
        style: { type: 'string', required: true, description: 'アニメスタイル（ghibli, mappa, shinkai等）' },
        type: { type: 'string', required: true, description: '背景タイプ（nature, urban, interior等）' },
        mood: { type: 'string', required: false, description: 'ムード' },
        timeOfDay: { type: 'string', required: false, description: '時間帯' },
        weather: { type: 'string', required: false, description: '天気' },
        colorPalette: { type: 'string', required: false, description: 'カラーパレット' },
        description: { type: 'string', required: false, description: '追加の説明' },
        width: { type: 'number', required: false, description: '画像幅（デフォルト: 1024）' },
        height: { type: 'number', required: false, description: '画像高さ（デフォルト: 1024）' },
        saveToKokuzo: { type: 'boolean', required: false, description: 'Kokuzo Storageに保存するか' },
      },
    },
    output: {
      type: 'json',
      description: '生成結果',
      schema: {
        url: { type: 'string', description: '生成された画像のURL' },
        kokuzoUrl: { type: 'string', required: false, description: 'Kokuzo Storage URL' },
        metadata: { type: 'object', description: 'メタデータ' },
      },
    },
    auth: {
      required: true,
      type: 'session',
    },
  });

  routes.push({
    method: 'POST',
    path: '/api/trpc/lifeGuardian.scanDevice',
    description: 'Life Guardian - デバイスをスキャン',
    category: 'lifeGuardian',
    input: {
      type: 'json',
      description: 'tRPC形式のリクエスト（入力なし）',
      schema: {},
    },
    output: {
      type: 'json',
      description: 'デバイス保護状態',
      schema: {
        cameraProtection: { type: 'boolean' },
        microphoneProtection: { type: 'boolean' },
        locationProtection: { type: 'boolean' },
        storageProtection: { type: 'boolean' },
        networkProtection: { type: 'boolean' },
      },
    },
    auth: {
      required: true,
      type: 'session',
    },
  });

  routes.push({
    method: 'POST',
    path: '/api/trpc/lifeGuardian.comprehensiveThreatDetection',
    description: 'Life Guardian - 統合脅威検知',
    category: 'lifeGuardian',
    input: {
      type: 'json',
      description: 'tRPC形式のリクエスト',
      schema: {
        url: { type: 'string', required: true, description: 'チェックするURL' },
        content: { type: 'string', required: true, description: 'コンテンツ' },
        context: { type: 'object', required: false, description: '追加コンテキスト' },
      },
    },
    output: {
      type: 'json',
      description: '脅威検知結果',
      schema: {
        overallDanger: { type: 'string', description: '危険レベル（safe, low, medium, high, critical）' },
        threats: { type: 'array', description: '検出された脅威' },
        recommendation: { type: 'string', description: '推奨事項' },
      },
    },
    auth: {
      required: true,
      type: 'session',
    },
  });

  return routes;
}

/**
 * Markdown形式でAPI仕様を生成
 */
export function generateMarkdown(docs: ApiDocs): string {
  let markdown = `# API Documentation\n\n`;
  markdown += `**Version**: ${docs.version}\n`;
  markdown += `**Generated At**: ${docs.generatedAt}\n\n`;
  markdown += `---\n\n`;

  // カテゴリごとにグループ化
  const categories = new Map<string, ApiRoute[]>();
  for (const route of docs.routes) {
    const category = route.category || 'other';
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(route);
  }

  // カテゴリごとに出力
  for (const [category, routes] of categories.entries()) {
    markdown += `## ${category.toUpperCase()}\n\n`;
    
    for (const route of routes) {
      markdown += `### ${route.method} ${route.path}\n\n`;
      
      if (route.description) {
        markdown += `${route.description}\n\n`;
      }

      if (route.auth?.required) {
        markdown += `**認証**: 必須 (${route.auth.type || 'session'})\n\n`;
      }

      if (route.input) {
        markdown += `#### Request\n\n`;
        markdown += `**Content-Type**: ${route.input.type === 'json' ? 'application/json' : route.input.type === 'multipart' ? 'multipart/form-data' : route.input.type}\n\n`;
        
        if (route.input.schema) {
          markdown += `**Schema**:\n\`\`\`json\n${JSON.stringify(route.input.schema, null, 2)}\n\`\`\`\n\n`;
        }
      }

      if (route.output) {
        markdown += `#### Response\n\n`;
        markdown += `**Content-Type**: ${route.output.type === 'json' ? 'application/json' : route.output.type}\n\n`;
        
        if (route.output.schema) {
          markdown += `**Schema**:\n\`\`\`json\n${JSON.stringify(route.output.schema, null, 2)}\n\`\`\`\n\n`;
        }
      }

      markdown += `---\n\n`;
    }
  }

  return markdown;
}

/**
 * JSON形式でAPI仕様を生成
 */
export function generateJsonSpec(docs: ApiDocs): string {
  return JSON.stringify(docs, null, 2);
}

/**
 * API Docsを生成
 */
export function generateApiDocs(): ApiDocs {
  const routes = scanApiRoutes();
  
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    routes,
  };
}

