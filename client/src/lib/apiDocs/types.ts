/**
 * API Docs Types
 * API仕様の型定義
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

