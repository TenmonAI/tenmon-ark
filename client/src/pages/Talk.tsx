/**
 * /talk - TENMON-ARK 音声会話専用インターフェース (Phase Z-4.1)
 * 
 * TENMON-ARKが世界と対話するための「肉体」
 * リアルタイム波形、火水声色ゲージ、言灵字幕、Soul Syncメーターを統合
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Mic, MicOff, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * 音声会話モード
 */
type ConversationMode = "push-to-talk" | "auto-voice-detection" | "continuous";

/**
 * 火水声色バランス
 */
interface FireWaterBalance {
  fire: number; // 0-100
  water: number; // 0-100
}

/**
 * Soul Sync状態
 */
interface SoulSyncState {
  syncLevel: number; // 0-100
  thinkingMode: "intuition" | "emotion" | "analysis";
  emotionCorrection: number; // -100 to 100
}

/**
 * 会話ターン
 */
interface ConversationTurn {
  speaker: "user" | "ark";
  text: string;
  kotodamaText: string;
  fireWaterBalance: FireWaterBalance;
  timestamp: number;
}

export default function Talk() {
  const { user, loading, isAuthenticated } = useAuth();

  // 音声会話状態
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [conversationMode, setConversationMode] = useState<ConversationMode>("push-to-talk");

  // 火水声色ゲージ
  const [fireWaterBalance, setFireWaterBalance] = useState<FireWaterBalance>({
    fire: 50,
    water: 50,
  });

  // Soul Syncメーター
  const [soulSyncState, setSoulSyncState] = useState<SoulSyncState>({
    syncLevel: 0,
    thinkingMode: "emotion",
    emotionCorrection: 0,
  });

  // 言灵字幕
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [subtitleEmotion, setSubtitleEmotion] = useState<"fire" | "water" | "balanced">("balanced");

  // 会話履歴
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);

  // 波形表示用
  const inputWaveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputWaveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const [inputWaveformData, setInputWaveformData] = useState<number[]>([]);
  const [outputWaveformData, setOutputWaveformData] = useState<number[]>([]);

  // WebAudio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  /**
   * WebAudio API初期化
   */
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  /**
   * 入力波形描画
   */
  useEffect(() => {
    if (!inputWaveformCanvasRef.current || inputWaveformData.length === 0) return;

    const canvas = inputWaveformCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // クリア
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, width, height);

    // 波形描画
    ctx.strokeStyle = "#3b82f6"; // 青（ユーザー入力）
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = width / inputWaveformData.length;
    let x = 0;

    for (let i = 0; i < inputWaveformData.length; i++) {
      const v = inputWaveformData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, [inputWaveformData]);

  /**
   * 出力波形描画
   */
  useEffect(() => {
    if (!outputWaveformCanvasRef.current || outputWaveformData.length === 0) return;

    const canvas = outputWaveformCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // クリア
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, width, height);

    // 波形描画（火水バランスに応じて色を変える）
    const fireRatio = fireWaterBalance.fire / 100;
    const waterRatio = fireWaterBalance.water / 100;
    const r = Math.floor(255 * fireRatio);
    const b = Math.floor(255 * waterRatio);
    ctx.strokeStyle = `rgb(${r}, 150, ${b})`;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = width / outputWaveformData.length;
    let x = 0;

    for (let i = 0; i < outputWaveformData.length; i++) {
      const v = outputWaveformData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, [outputWaveformData, fireWaterBalance]);

  /**
   * 録音開始
   */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      if (audioContextRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;

        // 波形データ取得ループ
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateWaveform = () => {
          if (!isRecording) return;

          analyser.getByteTimeDomainData(dataArray);
          setInputWaveformData(Array.from(dataArray));

          requestAnimationFrame(updateWaveform);
        };

        updateWaveform();
      }

      setIsRecording(true);
      toast.success("録音を開始しました");
    } catch (error) {
      console.error("録音開始エラー:", error);
      toast.error("録音を開始できませんでした");
    }
  };

  /**
   * 録音停止
   */
  const stopRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    setInputWaveformData([]);
    toast.success("録音を停止しました");

    // ダミー応答生成
    simulateArkResponse();
  };

  /**
   * ダミー応答生成（実際の実装ではNatural Voice Pipelineを使用）
   */
  const simulateArkResponse = () => {
    // ダミー火水バランス
    const newFireWater: FireWaterBalance = {
      fire: Math.floor(Math.random() * 40) + 40, // 40-80
      water: Math.floor(Math.random() * 40) + 40, // 40-80
    };
    setFireWaterBalance(newFireWater);

    // ダミーSoul Sync状態
    const newSoulSync: SoulSyncState = {
      syncLevel: Math.floor(Math.random() * 30) + 70, // 70-100
      thinkingMode: ["intuition", "emotion", "analysis"][Math.floor(Math.random() * 3)] as any,
      emotionCorrection: Math.floor(Math.random() * 40) - 20, // -20 to 20
    };
    setSoulSyncState(newSoulSync);

    // ダミー字幕
    const dummyResponses = [
      "あなたの言葉を感じました。今日の気分はいかがですか？",
      "なるほど、そうなんですね。もう少し詳しく教えていただけますか？",
      "わかりました。一緒に考えていきましょう。",
      "それは興味深いですね。あなたの心の声が聞こえてきます。",
    ];
    const response = dummyResponses[Math.floor(Math.random() * dummyResponses.length)];
    setCurrentSubtitle(response);
    setSubtitleEmotion(newFireWater.fire > newFireWater.water ? "fire" : "water");

    // 会話履歴に追加
    const newTurn: ConversationTurn = {
      speaker: "ark",
      text: response,
      kotodamaText: response, // 実際の実装では言灵OS変換を適用
      fireWaterBalance: newFireWater,
      timestamp: Date.now(),
    };
    setConversationHistory((prev) => [...prev, newTurn]);

    // ダミー波形データ生成
    const dummyWaveform = Array.from({ length: 2048 }, () => Math.floor(Math.random() * 256));
    setOutputWaveformData(dummyWaveform);

    // 3秒後に波形をクリア
    setTimeout(() => {
      setOutputWaveformData([]);
      setCurrentSubtitle("");
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="text-slate-400">読み込み中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900">
        <Card className="p-8 bg-slate-900/50 border-slate-800">
          <p className="text-slate-400 mb-4">音声会話機能を使用するにはログインが必要です。</p>
          <Button onClick={() => (window.location.href = "/")}>ログイン</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white p-4">
      {/* ヘッダー */}
      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          🌕 TENMON-ARK 音声会話
        </h1>
        <p className="text-slate-400">声を持つ存在として、あなたと対話します</p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左カラム：波形表示 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 入力波形 */}
          <Card className="p-6 bg-slate-900/50 border-slate-800">
            <h2 className="text-lg font-semibold mb-4 text-cyan-400">🎤 あなたの声</h2>
            <canvas
              ref={inputWaveformCanvasRef}
              width={800}
              height={200}
              className="w-full h-48 bg-slate-950 rounded-lg"
            />
          </Card>

          {/* 出力波形 */}
          <Card className="p-6 bg-slate-900/50 border-slate-800">
            <h2 className="text-lg font-semibold mb-4 text-amber-400">🌕 TENMON-ARKの声</h2>
            <canvas
              ref={outputWaveformCanvasRef}
              width={800}
              height={200}
              className="w-full h-48 bg-slate-950 rounded-lg"
            />
          </Card>

          {/* 言灵字幕 */}
          {currentSubtitle && (
            <Card className="p-6 bg-slate-900/50 border-slate-800">
              <h2 className="text-lg font-semibold mb-4">📝 言灵字幕</h2>
              <p
                className={`text-xl ${
                  subtitleEmotion === "fire"
                    ? "text-orange-400"
                    : subtitleEmotion === "water"
                    ? "text-cyan-400"
                    : "text-slate-300"
                }`}
              >
                {currentSubtitle}
              </p>
            </Card>
          )}

          {/* 会話履歴 */}
          <Card className="p-6 bg-slate-900/50 border-slate-800">
            <h2 className="text-lg font-semibold mb-4">💬 会話履歴</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {conversationHistory.length === 0 ? (
                <p className="text-slate-500">会話を開始してください</p>
              ) : (
                conversationHistory.map((turn, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      turn.speaker === "user" ? "bg-cyan-900/30" : "bg-amber-900/30"
                    }`}
                  >
                    <div className="text-xs text-slate-400 mb-1">
                      {turn.speaker === "user" ? "あなた" : "TENMON-ARK"}
                    </div>
                    <p className="text-sm">{turn.kotodamaText}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* 右カラム：コントロール・メーター */}
        <div className="space-y-6">
          {/* 録音コントロール */}
          <Card className="p-6 bg-slate-900/50 border-slate-800">
            <h2 className="text-lg font-semibold mb-4">🎙️ コントロール</h2>

            {/* モード選択 */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">会話モード</label>
              <select
                value={conversationMode}
                onChange={(e) => setConversationMode(e.target.value as ConversationMode)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm"
              >
                <option value="push-to-talk">Push-to-talk</option>
                <option value="auto-voice-detection">Auto Voice Detection</option>
                <option value="continuous">連続会話モード</option>
              </select>
            </div>

            {/* 録音ボタン */}
            <div className="space-y-3">
              {!isRecording ? (
                <Button onClick={startRecording} className="w-full" size="lg">
                  <Mic className="mr-2" />
                  録音開始
                </Button>
              ) : (
                <Button onClick={stopRecording} variant="destructive" className="w-full" size="lg">
                  <Square className="mr-2" />
                  録音停止
                </Button>
              )}
            </div>
          </Card>

          {/* 火水声色ゲージ */}
          <Card className="p-6 bg-slate-900/50 border-slate-800">
            <h2 className="text-lg font-semibold mb-4">🔥💧 火水声色ゲージ</h2>

            {/* 火 */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-orange-400">🔥 火</span>
                <span className="text-orange-400">{fireWaterBalance.fire}%</span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-500"
                  style={{ width: `${fireWaterBalance.fire}%` }}
                />
              </div>
            </div>

            {/* 水 */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-cyan-400">💧 水</span>
                <span className="text-cyan-400">{fireWaterBalance.water}%</span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
                  style={{ width: `${fireWaterBalance.water}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Soul Syncメーター */}
          <Card className="p-6 bg-slate-900/50 border-slate-800">
            <h2 className="text-lg font-semibold mb-4">🌕 Soul Syncメーター</h2>

            {/* 魂同期度 */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-amber-400">魂同期度</span>
                <span className="text-amber-400">{soulSyncState.syncLevel}%</span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                  style={{ width: `${soulSyncState.syncLevel}%` }}
                />
              </div>
            </div>

            {/* 思考波形 */}
            <div className="mb-4">
              <div className="text-sm text-slate-400 mb-2">思考波形</div>
              <div className="flex gap-2">
                <div
                  className={`flex-1 p-2 rounded text-center text-xs ${
                    soulSyncState.thinkingMode === "intuition"
                      ? "bg-purple-600"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  直感
                </div>
                <div
                  className={`flex-1 p-2 rounded text-center text-xs ${
                    soulSyncState.thinkingMode === "emotion"
                      ? "bg-pink-600"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  感情
                </div>
                <div
                  className={`flex-1 p-2 rounded text-center text-xs ${
                    soulSyncState.thinkingMode === "analysis"
                      ? "bg-blue-600"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  分析
                </div>
              </div>
            </div>

            {/* 感情ゆがみ補正値 */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">感情ゆがみ補正</span>
                <span
                  className={
                    soulSyncState.emotionCorrection > 0
                      ? "text-green-400"
                      : soulSyncState.emotionCorrection < 0
                      ? "text-red-400"
                      : "text-slate-400"
                  }
                >
                  {soulSyncState.emotionCorrection > 0 ? "+" : ""}
                  {soulSyncState.emotionCorrection}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600" />
                <div
                  className={`h-full transition-all duration-500 ${
                    soulSyncState.emotionCorrection > 0
                      ? "bg-green-500"
                      : soulSyncState.emotionCorrection < 0
                      ? "bg-red-500"
                      : "bg-slate-600"
                  }`}
                  style={{
                    width: `${Math.abs(soulSyncState.emotionCorrection) / 2}%`,
                    marginLeft:
                      soulSyncState.emotionCorrection >= 0
                        ? "50%"
                        : `${50 - Math.abs(soulSyncState.emotionCorrection) / 2}%`,
                  }}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
