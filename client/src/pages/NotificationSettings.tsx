import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/hooks/useNotification";
import { Bell, CheckCircle2, AlertTriangle, Shield } from "lucide-react";
import { useState } from "react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

/**
 * Notification Settings
 * 通知設定ページ
 */
export default function NotificationSettings() {
  const { user, loading: authLoading } = useAuth();
  const { permission, requestPermission, showNotification, isSupported } = useNotification();
  const [settings, setSettings] = useState({
    highRiskDetection: true,
    ethicsScoreLow: true,
    protectionLevelLow: true,
    soulSyncUpdate: false,
  });

  const handlePermissionRequest = async () => {
    const result = await requestPermission();
    if (result === "granted") {
      toast.success("通知許可が有効になりました");
      showNotification({
        title: "🌕 TENMON-ARK",
        message: "通知システムが正常に動作しています",
        type: "success",
      });
    } else {
      toast.error("通知許可が拒否されました");
    }
  };

  const handleTestNotification = () => {
    showNotification({
      title: "🛡️ テスト通知",
      message: "これはテスト通知です。通知システムが正常に動作しています。",
      type: "info",
    });
  };

  const handleSaveSettings = () => {
    // 設定を保存（実際はAPIに送信）
    toast.success("通知設定を保存しました");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <div className="text-center">
          <Bell className="w-12 h-12 animate-pulse text-purple-400 mx-auto mb-4" />
          <p className="text-slate-300">Loading Notification Settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <Card className="max-w-md mx-auto bg-slate-900/50 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-2xl text-purple-400">🔔 通知設定</CardTitle>
            <CardDescription>ログインが必要です</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
              <a href={getLoginUrl()}>ログイン</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            🔔 通知設定
          </h1>
          <p className="text-slate-400">TENMON-ARK通知システムの設定</p>
        </div>

        {/* ブラウザ通知許可 */}
        <Card className="bg-slate-900/50 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-purple-400 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              ブラウザ通知許可
            </CardTitle>
            <CardDescription>
              ブラウザ通知を有効にすると、高リスク検知時に即座に通知を受け取ることができます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-200">現在の状態</p>
                <p className="text-sm text-slate-400">
                  {!isSupported && "ブラウザが通知をサポートしていません"}
                  {isSupported && permission === "default" && "通知許可が未設定です"}
                  {isSupported && permission === "granted" && "通知許可が有効です"}
                  {isSupported && permission === "denied" && "通知許可が拒否されています"}
                </p>
              </div>
              {permission === "granted" ? (
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              )}
            </div>

            {isSupported && permission !== "granted" && (
              <Button
                onClick={handlePermissionRequest}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                通知を許可する
              </Button>
            )}

            {permission === "granted" && (
              <Button
                onClick={handleTestNotification}
                variant="outline"
                className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              >
                テスト通知を送信
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 通知設定 */}
        <Card className="bg-slate-900/50 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-purple-400 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              通知設定
            </CardTitle>
            <CardDescription>
              どのような状況で通知を受け取るかを設定できます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="highRisk" className="text-slate-200">
                    高リスク検知時の通知
                  </Label>
                  <p className="text-sm text-slate-400">
                    統合保護レベルが50未満になった場合に通知
                  </p>
                </div>
                <Switch
                  id="highRisk"
                  checked={settings.highRiskDetection}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, highRiskDetection: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="ethicsScore" className="text-slate-200">
                    倫理スコア低下時の通知
                  </Label>
                  <p className="text-sm text-slate-400">
                    倫理スコアが30未満になった場合に通知
                  </p>
                </div>
                <Switch
                  id="ethicsScore"
                  checked={settings.ethicsScoreLow}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, ethicsScoreLow: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="protectionLevel" className="text-slate-200">
                    保護レベル低下時の通知
                  </Label>
                  <p className="text-sm text-slate-400">
                    個人・端末・地球のいずれかの保護レベルが50未満になった場合に通知
                  </p>
                </div>
                <Switch
                  id="protectionLevel"
                  checked={settings.protectionLevelLow}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, protectionLevelLow: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="soulSync" className="text-slate-200">
                    Soul Sync更新時の通知
                  </Label>
                  <p className="text-sm text-slate-400">
                    魂同期が更新された場合に通知
                  </p>
                </div>
                <Switch
                  id="soulSync"
                  checked={settings.soulSyncUpdate}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, soulSyncUpdate: checked })
                  }
                />
              </div>
            </div>

            <Button
              onClick={handleSaveSettings}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              設定を保存
            </Button>
          </CardContent>
        </Card>

        {/* 通知履歴 */}
        <Card className="bg-slate-900/50 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-purple-400">通知履歴</CardTitle>
            <CardDescription>最近の通知履歴を表示します</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  id: 1,
                  type: "warning",
                  title: "統合保護レベル低下",
                  message: "統合保護レベルが48に低下しました",
                  timestamp: "2分前",
                },
                {
                  id: 2,
                  type: "error",
                  title: "倫理スコア低下",
                  message: "倫理スコアが28に低下しました",
                  timestamp: "15分前",
                },
                {
                  id: 3,
                  type: "info",
                  title: "Soul Sync更新",
                  message: "魂同期が更新されました",
                  timestamp: "1時間前",
                },
              ].map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
                >
                  {notification.type === "warning" && (
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  )}
                  {notification.type === "error" && (
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  )}
                  {notification.type === "info" && (
                    <Bell className="w-5 h-5 text-blue-400 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-slate-200">{notification.title}</p>
                    <p className="text-sm text-slate-400">{notification.message}</p>
                    <p className="text-xs text-slate-500 mt-1">{notification.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
