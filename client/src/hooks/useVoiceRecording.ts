import { useState, useRef, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'processing';

export interface UseVoiceRecordingOptions {
  onTranscriptionComplete?: (text: string) => void;
  onError?: (error: string) => void;
}

/**
 * Voice recording hook for audio capture and transcription
 * 
 * Usage:
 * ```tsx
 * const { state, startRecording, stopRecording, error } = useVoiceRecording({
 *   onTranscriptionComplete: (text) => setInputMessage(text),
 *   onError: (error) => console.error(error),
 * });
 * ```
 */
export function useVoiceRecording(options: UseVoiceRecordingOptions = {}) {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Create audio blob
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        
        // Check file size (16MB limit)
        const sizeMB = audioBlob.size / (1024 * 1024);
        if (sizeMB > 16) {
          const errorMsg = `音声ファイルが大きすぎます（${sizeMB.toFixed(2)}MB）。16MB以下にしてください。`;
          setError(errorMsg);
          options.onError?.(errorMsg);
          setState('idle');
          return;
        }

        setState('processing');

        // Note: In production, you would upload to S3 first, then call ASR with the URL
        // For now, we'll convert to base64 for direct transmission
        // This is a simplified implementation - production should use S3
        try {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = (reader.result as string).split(',')[1];
            // Here you would call the ASR API
            // For now, just simulate success
            console.log('[Voice Recording] Audio captured, size:', sizeMB.toFixed(2), 'MB');
            setState('idle');
            options.onTranscriptionComplete?.('音声入力のテキスト変換結果がここに表示されます');
          };
          reader.onerror = () => {
            const errorMsg = '音声ファイルの読み込みに失敗しました';
            setError(errorMsg);
            options.onError?.(errorMsg);
            setState('idle');
          };
          reader.readAsDataURL(audioBlob);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : '音声処理に失敗しました';
          setError(errorMsg);
          options.onError?.(errorMsg);
          setState('idle');
        }
      };

      mediaRecorder.start();
      setState('recording');
      console.log('[Voice Recording] Recording started');

    } catch (err) {
      const errorMsg = err instanceof Error 
        ? err.message 
        : 'マイクへのアクセスに失敗しました';
      setError(errorMsg);
      options.onError?.(errorMsg);
      setState('idle');
      console.error('[Voice Recording] Error:', err);
    }
  }, [options]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      console.log('[Voice Recording] Recording stopped');
    }
  }, [state]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      chunksRef.current = [];
      setState('idle');
      console.log('[Voice Recording] Recording cancelled');
    }
  }, []);

  return {
    state,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording: state === 'recording',
    isProcessing: state === 'processing',
  };
}
