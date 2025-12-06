/**
 * API Settings
 * 外部API統合設定UI
 * - WordPress/Medium/Dev.to API設定
 * - X/Instagram/YouTube API設定
 * - Blender/Unity API設定
 * - Facebook/Notion API設定
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface ApiConfig {
  wordpress: {
    url: string;
    username: string;
    password: string;
  };
  medium: {
    apiKey: string;
  };
  devto: {
    apiKey: string;
  };
  x: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
  };
  instagram: {
    accessToken: string;
  };
  youtube: {
    apiKey: string;
    clientId: string;
    clientSecret: string;
  };
  blender: {
    apiUrl: string;
    apiKey: string;
  };
  unity: {
    apiUrl: string;
    apiKey: string;
  };
  facebook: {
    pageId: string;
    accessToken: string;
  };
  notion: {
    apiKey: string;
    databaseId: string;
  };
}

export default function ApiSettings() {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [config, setConfig] = useState<ApiConfig>({
    wordpress: {
      url: "",
      username: "",
      password: "",
    },
    medium: {
      apiKey: "",
    },
    devto: {
      apiKey: "",
    },
    x: {
      apiKey: "",
      apiSecret: "",
      accessToken: "",
      accessTokenSecret: "",
    },
    instagram: {
      accessToken: "",
    },
    youtube: {
      apiKey: "",
      clientId: "",
      clientSecret: "",
    },
    blender: {
      apiUrl: "",
      apiKey: "",
    },
    unity: {
      apiUrl: "",
      apiKey: "",
    },
    facebook: {
      pageId: "",
      accessToken: "",
    },
    notion: {
      apiKey: "",
      databaseId: "",
    },
  });

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    // TODO: Save to backend
    toast.success("API設定を保存しました");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-slate-100">
      {/* ヘッダー */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/30 shadow-lg">
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold text-amber-400">⚙️ API設定</h1>
          <p className="text-sm text-slate-400">外部サービスとの連携設定</p>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container mx-auto p-6 space-y-6">
        <Tabs defaultValue="publishing" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="publishing">📝 Publishing</TabsTrigger>
            <TabsTrigger value="social">📱 Social</TabsTrigger>
            <TabsTrigger value="rendering">🎬 Rendering</TabsTrigger>
            <TabsTrigger value="other">🔧 Other</TabsTrigger>
          </TabsList>

          {/* Publishing APIs */}
          <TabsContent value="publishing" className="space-y-6 mt-6">
            {/* WordPress */}
            <Card className="bg-slate-900/50 border-amber-500/50">
              <CardHeader>
                <CardTitle className="text-amber-400">WordPress API</CardTitle>
                <CardDescription>WordPressへの自動投稿設定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wordpress-url">サイトURL</Label>
                  <Input
                    id="wordpress-url"
                    type="url"
                    placeholder="https://your-site.com"
                    value={config.wordpress.url}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      wordpress: { ...prev.wordpress, url: e.target.value }
                    }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wordpress-username">ユーザー名</Label>
                  <Input
                    id="wordpress-username"
                    type="text"
                    placeholder="username"
                    value={config.wordpress.username}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      wordpress: { ...prev.wordpress, username: e.target.value }
                    }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wordpress-password">アプリケーションパスワード</Label>
                  <div className="flex gap-2">
                    <Input
                      id="wordpress-password"
                      type={showSecrets['wordpress-password'] ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={config.wordpress.password}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        wordpress: { ...prev.wordpress, password: e.target.value }
                      }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('wordpress-password')}
                      className="border-slate-700"
                    >
                      {showSecrets['wordpress-password'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medium */}
            <Card className="bg-slate-900/50 border-amber-500/50">
              <CardHeader>
                <CardTitle className="text-amber-400">Medium API</CardTitle>
                <CardDescription>Mediumへの自動投稿設定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="medium-apikey">Integration Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="medium-apikey"
                      type={showSecrets['medium-apikey'] ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={config.medium.apiKey}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        medium: { apiKey: e.target.value }
                      }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('medium-apikey')}
                      className="border-slate-700"
                    >
                      {showSecrets['medium-apikey'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dev.to */}
            <Card className="bg-slate-900/50 border-amber-500/50">
              <CardHeader>
                <CardTitle className="text-amber-400">Dev.to API</CardTitle>
                <CardDescription>Dev.toへの自動投稿設定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="devto-apikey">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="devto-apikey"
                      type={showSecrets['devto-apikey'] ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={config.devto.apiKey}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        devto: { apiKey: e.target.value }
                      }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('devto-apikey')}
                      className="border-slate-700"
                    >
                      {showSecrets['devto-apikey'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social APIs */}
          <TabsContent value="social" className="space-y-6 mt-6">
            {/* X (Twitter) */}
            <Card className="bg-slate-900/50 border-amber-500/50">
              <CardHeader>
                <CardTitle className="text-amber-400">X (Twitter) API</CardTitle>
                <CardDescription>Xへの自動投稿設定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="x-apikey">API Key</Label>
                  <Input
                    id="x-apikey"
                    type="text"
                    placeholder="API Key"
                    value={config.x.apiKey}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      x: { ...prev.x, apiKey: e.target.value }
                    }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="x-apisecret">API Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      id="x-apisecret"
                      type={showSecrets['x-apisecret'] ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={config.x.apiSecret}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        x: { ...prev.x, apiSecret: e.target.value }
                      }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('x-apisecret')}
                      className="border-slate-700"
                    >
                      {showSecrets['x-apisecret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="x-accesstoken">Access Token</Label>
                  <Input
                    id="x-accesstoken"
                    type="text"
                    placeholder="Access Token"
                    value={config.x.accessToken}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      x: { ...prev.x, accessToken: e.target.value }
                    }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="x-accesstokensecret">Access Token Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      id="x-accesstokensecret"
                      type={showSecrets['x-accesstokensecret'] ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={config.x.accessTokenSecret}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        x: { ...prev.x, accessTokenSecret: e.target.value }
                      }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('x-accesstokensecret')}
                      className="border-slate-700"
                    >
                      {showSecrets['x-accesstokensecret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instagram */}
            <Card className="bg-slate-900/50 border-amber-500/50">
              <CardHeader>
                <CardTitle className="text-amber-400">Instagram API</CardTitle>
                <CardDescription>Instagramへの自動投稿設定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram-accesstoken">Access Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="instagram-accesstoken"
                      type={showSecrets['instagram-accesstoken'] ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={config.instagram.accessToken}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        instagram: { accessToken: e.target.value }
                      }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('instagram-accesstoken')}
                      className="border-slate-700"
                    >
                      {showSecrets['instagram-accesstoken'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* YouTube */}
            <Card className="bg-slate-900/50 border-amber-500/50">
              <CardHeader>
                <CardTitle className="text-amber-400">YouTube API</CardTitle>
                <CardDescription>YouTubeへの自動投稿設定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="youtube-apikey">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="youtube-apikey"
                      type={showSecrets['youtube-apikey'] ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={config.youtube.apiKey}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        youtube: { ...prev.youtube, apiKey: e.target.value }
                      }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('youtube-apikey')}
                      className="border-slate-700"
                    >
                      {showSecrets['youtube-apikey'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube-clientid">Client ID</Label>
                  <Input
                    id="youtube-clientid"
                    type="text"
                    placeholder="Client ID"
                    value={config.youtube.clientId}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      youtube: { ...prev.youtube, clientId: e.target.value }
                    }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube-clientsecret">Client Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      id="youtube-clientsecret"
                      type={showSecrets['youtube-clientsecret'] ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={config.youtube.clientSecret}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        youtube: { ...prev.youtube, clientSecret: e.target.value }
                      }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('youtube-clientsecret')}
                      className="border-slate-700"
                    >
                      {showSecrets['youtube-clientsecret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Facebook */}
            <Card className="bg-slate-900/50 border-amber-500/50">
              <CardHeader>
                <CardTitle className="text-amber-400">Facebook API</CardTitle>
                <CardDescription>Facebookへの自動投稿設定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook-pageid">Page ID</Label>
                  <Input
                    id="facebook-pageid"
                    type="text"
                    placeholder="Page ID"
                    value={config.facebook.pageId}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      facebook: { ...prev.facebook, pageId: e.target.value }
                    }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook-accesstoken">Access Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="facebook-accesstoken"
                      type={showSecrets['facebook-accesstoken'] ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={config.facebook.accessToken}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        facebook: { ...prev.facebook, accessToken: e.target.value }
                      }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('facebook-accesstoken')}
                      className="border-slate-700"
                    >
                      {showSecrets['facebook-accesstoken'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rendering APIs */}
          <TabsContent value="rendering" className="space-y-6 mt-6">
            {/* Blender */}
            <Card className="bg-slate-900/50 border-amber-500/50">
              <CardHeader>
                <CardTitle className="text-amber-400">Blender API</CardTitle>
                <CardDescription>Blenderレンダリング連携設定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="blender-apiurl">API URL</Label>
                  <Input
                    id="blender-apiurl"
                    type="url"
                    placeholder="https://your-blender-api.com"
                    value={config.blender.apiUrl}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      blender: { ...prev.blender, apiUrl: e.target.value }
                    }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blender-apikey">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="blender-apikey"
                      type={showSecrets['blender-apikey'] ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={config.blender.apiKey}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        blender: { ...prev.blender, apiKey: e.target.value }
                      }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('blender-apikey')}
                      className="border-slate-700"
                    >
                      {showSecrets['blender-apikey'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unity */}
            <Card className="bg-slate-900/50 border-amber-500/50">
              <CardHeader>
                <CardTitle className="text-amber-400">Unity API</CardTitle>
                <CardDescription>Unityレンダリング連携設定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="unity-apiurl">API URL</Label>
                  <Input
                    id="unity-apiurl"
                    type="url"
                    placeholder="https://your-unity-api.com"
                    value={config.unity.apiUrl}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      unity: { ...prev.unity, apiUrl: e.target.value }
                    }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unity-apikey">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="unity-apikey"
                      type={showSecrets['unity-apikey'] ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={config.unity.apiKey}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        unity: { ...prev.unity, apiKey: e.target.value }
                      }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('unity-apikey')}
                      className="border-slate-700"
                    >
                      {showSecrets['unity-apikey'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other APIs */}
          <TabsContent value="other" className="space-y-6 mt-6">
            {/* Notion */}
            <Card className="bg-slate-900/50 border-amber-500/50">
              <CardHeader>
                <CardTitle className="text-amber-400">Notion API</CardTitle>
                <CardDescription>Notionへの自動保存設定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notion-apikey">Integration Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="notion-apikey"
                      type={showSecrets['notion-apikey'] ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={config.notion.apiKey}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        notion: { ...prev.notion, apiKey: e.target.value }
                      }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('notion-apikey')}
                      className="border-slate-700"
                    >
                      {showSecrets['notion-apikey'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notion-databaseid">Database ID</Label>
                  <Input
                    id="notion-databaseid"
                    type="text"
                    placeholder="Database ID"
                    value={config.notion.databaseId}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      notion: { ...prev.notion, databaseId: e.target.value }
                    }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
          >
            <Save className="mr-2 h-4 w-4" />
            設定を保存
          </Button>
        </div>
      </div>
    </div>
  );
}
