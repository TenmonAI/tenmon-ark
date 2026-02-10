// API Base URL Configuration
// 本番環境: VPS (162.43.90.247:3000)
// 開発環境: localhost:3000 (環境変数で上書き可能)

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ""; // same-origin

