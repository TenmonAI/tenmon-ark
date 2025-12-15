/**
 * Speech Input Hook
 * 音声入力とWhisper STT統合
 */

import { useState, useRef, useCallback } from 'react';

export type SpeechInputState = 'idle' | 'recording' | 'processing' | 'transcribing';

export interface SpeechInputResult {
  text: string;
  language: string;
  duration: number;
}

export interface UseSpeechInputOptions {
  onTranscriptionComplete?: (result: SpeechInputResult) => void;
  onError?: (error: string) => void;
  language?: string;
  prompt?: string;
}

/**
 * Speech Input Hook
 * 音声録音とWhisper STT変換を統合
 * 
 * Usage:
 * ```tsx
 * const { state, startRecording, stopRecording, transcript, error } = useSpeechInput({
 *   onTranscriptionComplete: (result) => {
 *     setInputMessage(result.text);
 *   },
 *   onError: (error) => console.error(error),
 *   language: 'ja',
 * });
 * ```
 */
export function useSpeechInput(options: UseSpeechInputOptions = {}) {
  const [state, setState] = useState<SpeechInputState>('idle');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript(null);
      
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

        setState('transcribing');

        try {
          // FormDataを作成
          const formData = new FormData();
          formData.append('file', audioBlob, 'audio.webm');
          
          if (options.language) {
            formData.append('language', options.language);
          }
          
          if (options.prompt) {
            formData.append('prompt', options.prompt);
          }

          // Whisper STT APIを呼び出し
          const response = await fetch('/api/stt/whisper', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const result = await response.json();
          
          setTranscript(result.text);
          options.onTranscriptionComplete?.({
            text: result.text,
            language: result.language,
            duration: result.duration,
          });
          setState('idle');

        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : '音声変換に失敗しました';
          setError(errorMsg);
          options.onError?.(errorMsg);
          setState('idle');
        }
      };

      mediaRecorder.start();
      setState('recording');
      console.log('[Speech Input] Recording started');

    } catch (err) {
      const errorMsg = err instanceof Error 
        ? err.message 
        : 'マイクへのアクセスに失敗しました';
      setError(errorMsg);
      options.onError?.(errorMsg);
      setState('idle');
      console.error('[Speech Input] Error:', err);
    }
  }, [options]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      setState('processing');
      console.log('[Speech Input] Recording stopped');
    }
  }, [state]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      chunksRef.current = [];
      setState('idle');
      console.log('[Speech Input] Recording cancelled');
    }
  }, []);

  return {
    state,
    transcript,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording: state === 'recording',
    isProcessing: state === 'processing' || state === 'transcribing',
  };
}

