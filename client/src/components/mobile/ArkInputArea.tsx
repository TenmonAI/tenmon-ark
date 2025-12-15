/**
 * TENMON-ARK Input Area
 * 送信欄コンポーネント
 * 
 * GPT超えの入力体験
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Sparkles } from 'lucide-react';
import { triggerHapticWithSettings } from '@/lib/mobileOS/haptics';
import { ALPHA_TRANSITION_DURATION } from '@/lib/mobileOS/alphaFlow';

interface ArkInputAreaProps {
  onSend: (message: string) => void;
  onVoiceInput?: () => void;
  placeholder?: string;
  enableVoice?: boolean;
  enablePrediction?: boolean; // 次の単語予測
  className?: string;
}

export default function ArkInputArea({
  onSend,
  onVoiceInput,
  placeholder = 'メッセージを入力...',
  enableVoice = true,
  enablePrediction = true,
  className = '',
}: ArkInputAreaProps) {
  const [message, setMessage] = useState('');
  const [prediction, setPrediction] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自動リサイズ
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // 次の単語予測（簡易実装）
  useEffect(() => {
    if (!enablePrediction || !message) {
      setPrediction('');
      return;
    }

    // 簡易的な予測ロジック（実際はLLMを使用）
    const predictions: Record<string, string> = {
      'こんにち': 'は',
      'ありがとう': 'ございます',
      'よろしく': 'お願いします',
      'お疲れ': '様です',
      'おはよう': 'ございます',
    };

    const lastWord = message.split(' ').pop() || '';
    const predictedWord = predictions[lastWord];
    
    if (predictedWord) {
      setPrediction(predictedWord);
    } else {
      setPrediction('');
    }
  }, [message, enablePrediction]);

  const handleSend = () => {
    if (!message.trim()) return;

    triggerHapticWithSettings('send');
    onSend(message);
    setMessage('');
    setPrediction('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    // Tab キーで予測を受け入れ
    if (e.key === 'Tab' && prediction) {
      e.preventDefault();
      setMessage(message + prediction);
      setPrediction('');
    }
  };

  const handleVoiceInput = () => {
    triggerHapticWithSettings('tap');
    onVoiceInput?.();
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom z-30 ${className}`}
      style={{
        transition: `all ${ALPHA_TRANSITION_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
        minHeight: '60px', /* 高さ 48px → 60px */
      }}
    >
      <div className="container max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-end gap-2">
          {/* 音声入力ボタン */}
          {enableVoice && (
            <button
              onClick={handleVoiceInput}
              className="tap-target primary-button p-3 rounded-full bg-secondary/20 hover:bg-secondary/30 text-secondary-foreground intuitive-feedback"
              aria-label="音声入力"
              style={{
                transition: `all ${ALPHA_TRANSITION_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
              }}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}

          {/* 入力欄 */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              rows={1}
              className="w-full px-5 py-4 rounded-2xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{
                maxHeight: '120px',
                minHeight: '52px', /* 内側padding増加 */
                fontSize: '16px', /* フォントサイズ 14px → 16px */
                lineHeight: '1.6', /* 行間 1.45 → 1.6 */
                transition: `all ${ALPHA_TRANSITION_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
              }}
            />

            {/* 次の単語予測ヒント */}
            {enablePrediction && prediction && isFocused && (
              <div
                className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground pointer-events-none"
                style={{
                  animation: 'fade-in-cosmic 0.3s ease-out forwards',
                }}
              >
                <Sparkles className="w-3 h-3 text-primary/50" />
                <span className="text-primary/70">{prediction}</span>
                <span className="text-muted-foreground/50">(Tab)</span>
              </div>
            )}
          </div>

          {/* 送信ボタン */}
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="tap-target primary-button p-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed intuitive-feedback"
            aria-label="送信"
            style={{
              transition: `all ${ALPHA_TRANSITION_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
            }}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
