/**
 * KOKŪZŌ Storage Panel
 * 虚空蔵サーバーのファイル・意味・構文核を管理するダッシュボード
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Search, Folder, FileText } from "lucide-react";
import { useState } from "react";
import { FractalSeedViewer } from "./FractalSeedViewer";

export function KokuzoStoragePanel() {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    // TODO: ファイルアップロード処理を実装
    setUploading(true);
    // await uploadFile();
    setUploading(false);
  };

  return (
    <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">KOKŪZŌ Storage</h2>
          <p className="text-slate-300 text-sm mt-2">
            虚空蔵サーバーのファイル・意味・構文核をここから管理します。
          </p>
        </div>
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? "アップロード中..." : "ファイルをアップロード"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              ファイル
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-xs">アップロードされたファイル一覧</p>
            <p className="text-white text-2xl font-bold mt-2">0</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Search className="w-4 h-4" />
              セマンティックユニット
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-xs">抽出された意味単位</p>
            <p className="text-white text-2xl font-bold mt-2">0</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Folder className="w-4 h-4" />
              フラクタルシード
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-xs">圧縮された構文核</p>
            <p className="text-white text-2xl font-bold mt-2">0</p>
          </CardContent>
        </Card>
      </div>

      {/* FractalSeed Viewer */}
      <div className="mt-6">
        <FractalSeedViewer 
          seed={{
            id: "demo-seed",
            ownerId: "demo-user",
            semanticUnitIds: [],
            compressedRepresentation: {
              centroidVector: [],
              kotodamaVector: {
                vowelVector: [0.2, 0.2, 0.2, 0.2, 0.2],
                consonantVector: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
                fire: 0.5,
                water: 0.5,
                balance: 0,
              },
              fireWaterBalance: 0,
              kanagiPhaseMode: "L-IN",
              mainTags: [],
              lawIds: [],
              semanticEdges: [],
              seedWeight: 0.5,
            },
            laws: [],
            createdAt: Date.now(),
          }}
        />
      </div>
    </div>
  );
}

