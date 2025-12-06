/**
 * Speak Page
 * 音声会話UI（/speak）
 * 
 * 機能:
 * - Push-to-talkボタン
 * - リアルタイム波形（WebAudio API）
 * - 火水インジケーター
 * - 言灵字幕（KJCE適用）
 * - 魂同期メーター（Soul Sync連動）
 * - 自然なアニメーション（宇宙基調・黒×金×蒼）
 * - 会話ログ（音声＋テキスト）
 */

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ConversationMessage {
  role: 'user' | 'assistant';
  originalText: string;
  kotodamaText?: string;
  timestamp: number;
  fireWaterBalance?: {
    fire: number;
    water: number;
  };
}

export default function Speak() {
  const { user, loading, isAuthenticated } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [conversationLog, setConversationLog] = useState<ConversationMessage[]>([]);
  const [fireWaterBalance, setFireWaterBalance] = useState({ fire: 50, water: 50 });
  const [soulSyncLevel, setSoulSyncLevel] = useState(75);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const analyzeVoiceTurnMutation = trpc.kde.analyzeVoiceTurn.useQuery as any;
  const generateResponseTextMutation = trpc.kde.generateResponseText.useMutation();
  const generateResponseWaveformMutation = trpc.kde.generateResponseWaveform.useMutation();

  // 認証チェック
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-900 to-blue-950">
        <div className="text-white text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-slate-900 to-blue-950 p-4">
        <Card className="p-8 max-w-md w-full bg-slate-900/50 border-amber-500/30">
          <h1 className="text-2xl font-bold text-white mb-4 text-center">
            🌕 TENMON-ARK Voice
          </h1>
          <p className="text-slate-300 mb-6 text-center">
            音声会話機能を使用するにはログインが必要です
          </p>
          <Button
            onClick={() => window.location.href = getLoginUrl()}
            className="w-full bg-gradient-to-r from-amber-500 to-blue-500 hover:from-amber-600 hover:to-blue-600"
          >
            ログイン
          </Button>
        </Card>
      </div>
    );
  }

  // 音声録音開始
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // AudioContext for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start visualization
      visualizeAudio();

      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        // TODO: 音声認識処理（Web Speech API or 外部API）
        // 現在はダミーテキスト
        const dummyTranscript = "こんにちは、今日はいい天気ですね";
        setTranscript(dummyTranscript);
        await processUserInput(dummyTranscript);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("録音エラー:", error);
      toast.error("マイクへのアクセスが拒否されました");
    }
  };

  // 音声録音停止
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop visualization
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Stop audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      // Stop media stream
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // 音声可視化
  const visualizeAudio = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      // Calculate audio level
      const sum = dataArray.reduce((acc, val) => acc + Math.abs(val - 128), 0);
      const level = sum / bufferLength / 128;
      setAudioLevel(level);

      // Draw waveform
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#f59e0b'); // amber
      gradient.addColorStop(0.5, '#3b82f6'); // blue
      gradient.addColorStop(1, '#06b6d4'); // cyan
      ctx.strokeStyle = gradient;

      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  };

  // ユーザー入力処理
  const processUserInput = async (text: string) => {
    try {
      // 会話ログに追加
      const userMessage: ConversationMessage = {
        role: 'user',
        originalText: text,
        timestamp: Date.now(),
      };
      setConversationLog(prev => [...prev, userMessage]);

      // 音声ターン分析
      const analysisResult = await analyzeVoiceTurnMutation.mutateAsync({
        transcript: text,
      });

      if (analysisResult.success) {
        // 火水バランス更新
        setFireWaterBalance(analysisResult.analysis.fireWaterModulation);

        // 魂同期レベル更新
        setSoulSyncLevel(analysisResult.analysis.soulSyncInterpretation.soulResonance);
      }

      // 応答テキスト生成
      const responseResult = await generateResponseTextMutation.mutateAsync({
        userInput: text,
        conversationHistory: conversationLog.map(msg => ({
          role: msg.role,
          content: msg.originalText,
          timestamp: msg.timestamp,
        })),
      });

      if (responseResult.success) {
        // 会話ログに追加
        const assistantMessage: ConversationMessage = {
          role: 'assistant',
          originalText: responseResult.originalText,
          kotodamaText: responseResult.kotodamaText,
          timestamp: Date.now(),
          fireWaterBalance: {
            fire: responseResult.arkCoreMetadata.fireWaterBalance > 0 ? 50 + responseResult.arkCoreMetadata.fireWaterBalance / 2 : 50,
            water: responseResult.arkCoreMetadata.fireWaterBalance < 0 ? 50 - responseResult.arkCoreMetadata.fireWaterBalance / 2 : 50,
          },
        };
        setConversationLog(prev => [...prev, assistantMessage]);

        // 音声合成
        setIsSpeaking(true);
        const waveformResult = await generateResponseWaveformMutation.mutateAsync({
          text: responseResult.kotodamaText,
        });

        if (waveformResult.success) {
          // TODO: 音声再生
          // 現在はダミー
          setTimeout(() => {
            setIsSpeaking(false);
          }, 2000);
        }
      }
    } catch (error) {
      console.error("処理エラー:", error);
      toast.error("応答の生成に失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-blue-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-blue-400 to-cyan-400 mb-2">
            🌕 TENMON-ARK Voice
          </h1>
          <p className="text-slate-400">声と魂と火水の調べを聴く</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左カラム: 火水インジケーター & 魂同期メーター */}
          <div className="space-y-6">
            {/* 火水インジケーター */}
            <Card className="p-6 bg-slate-900/50 border-amber-500/30">
              <h2 className="text-lg font-semibold text-white mb-4">🔥💧 火水バランス</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-slate-300 mb-2">
                    <span>火</span>
                    <span>{fireWaterBalance.fire}%</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
                      style={{ width: `${fireWaterBalance.fire}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-slate-300 mb-2">
                    <span>水</span>
                    <span>{fireWaterBalance.water}%</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${fireWaterBalance.water}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* 魂同期メーター */}
            <Card className="p-6 bg-slate-900/50 border-blue-500/30">
              <h2 className="text-lg font-semibold text-white mb-4">🔮 魂同期レベル</h2>
              <div className="relative">
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                    {soulSyncLevel}%
                  </div>
                </div>
                <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${soulSyncLevel}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* 音声レベル */}
            <Card className="p-6 bg-slate-900/50 border-green-500/30">
              <h2 className="text-lg font-semibold text-white mb-4">🎤 音声レベル</h2>
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-100"
                  style={{ width: `${audioLevel * 100}%` }}
                />
              </div>
            </Card>
          </div>

          {/* 中央カラム: 波形 & 録音ボタン */}
          <div className="space-y-6">
            {/* 波形表示 */}
            <Card className="p-6 bg-slate-900/50 border-amber-500/30">
              <h2 className="text-lg font-semibold text-white mb-4">🌊 音声波形</h2>
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="w-full rounded-lg bg-black/50"
              />
            </Card>

            {/* 録音ボタン */}
            <div className="flex justify-center">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isSpeaking}
                className={`w-32 h-32 rounded-full text-white transition-all duration-300 ${
                  isRecording
                    ? 'bg-gradient-to-br from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 animate-pulse'
                    : 'bg-gradient-to-br from-amber-500 to-blue-500 hover:from-amber-600 hover:to-blue-600'
                }`}
              >
                {isRecording ? (
                  <MicOff className="w-12 h-12" />
                ) : isSpeaking ? (
                  <Volume2 className="w-12 h-12 animate-pulse" />
                ) : (
                  <Mic className="w-12 h-12" />
                )}
              </Button>
            </div>

            {/* 状態表示 */}
            <div className="text-center">
              <p className="text-slate-300">
                {isRecording ? '🎤 録音中...' : isSpeaking ? '🔊 話しています...' : '🎤 ボタンを押して話す'}
              </p>
            </div>
          </div>

          {/* 右カラム: 会話ログ */}
          <div>
            <Card className="p-6 bg-slate-900/50 border-cyan-500/30 h-[600px] flex flex-col">
              <h2 className="text-lg font-semibold text-white mb-4">💬 会話ログ</h2>
              <div className="flex-1 overflow-y-auto space-y-4">
                {conversationLog.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-amber-500/20 border border-amber-500/30 ml-8'
                        : 'bg-blue-500/20 border border-blue-500/30 mr-8'
                    }`}
                  >
                    <div className="text-xs text-slate-400 mb-2">
                      {msg.role === 'user' ? 'あなた' : 'TENMON-ARK'}
                    </div>
                    <div className="text-white mb-2">{msg.originalText}</div>
                    {msg.kotodamaText && msg.kotodamaText !== msg.originalText && (
                      <div className="text-sm text-amber-300 border-t border-amber-500/30 pt-2 mt-2">
                        ✨ {msg.kotodamaText}
                      </div>
                    )}
                    {msg.fireWaterBalance && (
                      <div className="text-xs text-slate-400 mt-2">
                        🔥 {msg.fireWaterBalance.fire}% 💧 {msg.fireWaterBalance.water}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
