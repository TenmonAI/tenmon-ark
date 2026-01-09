// /opt/tenmon-ark/api/src/middleware/ssrfProtection.ts
import { URL } from "node:url";

/**
 * SSRF対策: URLが安全かチェック
 */
export function isSafeUrl(urlString: string): { safe: boolean; reason?: string } {
  try {
    const url = new URL(urlString);

    // http(s) のみ許可
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { safe: false, reason: `Invalid protocol: ${url.protocol}` };
    }

    // プライベートIP/localhost/メタデータIP拒否
    const hostname = url.hostname.toLowerCase();
    
    // localhost系
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0") {
      return { safe: false, reason: "localhost/private IP not allowed" };
    }

    // プライベートIP範囲
    const privateIpPatterns = [
      /^10\./,           // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
      /^192\.168\./,     // 192.168.0.0/16
      /^169\.254\./,     // 169.254.0.0/16 (link-local, メタデータサーバー)
      /^fc00:/,          // IPv6 private
      /^fe80:/,          // IPv6 link-local
    ];

    for (const pattern of privateIpPatterns) {
      if (pattern.test(hostname)) {
        return { safe: false, reason: "private IP range not allowed" };
      }
    }

    // メタデータサーバー（AWS/GCP/Azure）
    if (hostname === "169.254.169.254" || hostname.includes("metadata")) {
      return { safe: false, reason: "metadata server not allowed" };
    }

    return { safe: true };
  } catch (e) {
    return { safe: false, reason: `Invalid URL: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * SSRF対策付きfetch
 */
export async function safeFetch(
  url: string,
  options: RequestInit = {},
  maxSize = 10 * 1024 * 1024, // 10MB
  timeout = 5000 // 5秒
): Promise<Response> {
  // URLチェック
  const check = isSafeUrl(url);
  if (!check.safe) {
    throw new Error(`SSRF protection: ${check.reason}`);
  }

  // タイムアウト付きfetch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "TENMON-ARK/1.0",
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    // サイズチェック（Content-Length）
    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size > maxSize) {
        throw new Error(`Response too large: ${size} bytes (max: ${maxSize})`);
      }
    }

    return response;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw e;
  }
}

