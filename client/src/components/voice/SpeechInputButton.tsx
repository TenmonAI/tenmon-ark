/**
 * Speech Input Button Component
 * 音声入力ボタン（最小構成）
 * Record → Send → Transcript の流れ
 */

import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useSpeechInput } from '@/hooks/useSpeechInput';

interface SpeechInputButtonProps {
  onTranscript?: (text: string) => void;
  language?: string;
  className?: string;
}

/**
 * Speech Input Button
 * 音声録音とWhisper STT変換を統合したボタンコンポーネント
 */
export function SpeechInputButton({ 
  onTranscript, 
  language = 'ja',
  className 
}: SpeechInputButtonProps) {
  const { 
    state, 
    transcript, 
    error, 
    startRecording, 
    stopRecording, 
    cancelRecording,
    isRecording,
    isProcessing 
  } = useSpeechInput({
    language,
    onTranscriptionComplete: (result) => {
      onTranscript?.(result.text);
    },
    onError: (error) => {
      console.error('[Speech Input] Error:', error);
    },
  });

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className || ''}`}>
      <Button
        onClick={handleClick}
        disabled={isProcessing}
        variant={isRecording ? 'destructive' : 'default'}
        size="icon"
        className="relative"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        {isRecording && (
          <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </Button>
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      
      {transcript && (
        <p className="text-sm text-muted-foreground">{transcript}</p>
      )}
      
      {isRecording && (
        <Button
          onClick={cancelRecording}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          キャンセル
        </Button>
      )}
    </div>
  );
}

