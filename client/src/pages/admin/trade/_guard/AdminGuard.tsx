/**
 * ============================================================
 *  ADMIN GUARD — 天聞専用アクセス制御
 * ============================================================
 * 
 * TENMON_ADMIN のみ許可
 * それ以外は即遮断
 * ============================================================
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * 天聞専用アクセス制御
 * 
 * 条件:
 * - user.role === "admin"
 * - user.id === "TENMON" (オプション: 必要に応じて実装)
 * 
 * NG:
 * - Feature Flag なし
 * - Founder も不可
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  // 認証チェック
  if (!isAuthenticated || !user) {
    setLocation("/");
    return null;
  }

  // 権限チェック: admin のみ許可
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-500">アクセス拒否</h1>
          <p className="text-gray-400">このページは管理者専用です。</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

