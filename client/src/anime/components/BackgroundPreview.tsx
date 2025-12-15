/**
 * Background Preview Component
 * 背景プレビューコンポーネント
 */

import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackgroundPreviewProps {
  url: string;
  onClose?: () => void;
}

export function BackgroundPreview({ url, onClose }: BackgroundPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `background-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="relative mt-4 rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 bg-slate-800/80 hover:bg-slate-700"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
        <img
          src={url}
          alt="Generated background"
          className="w-full h-auto"
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      </div>

      <div className="p-4 bg-slate-800/50 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          ダウンロード
        </Button>
      </div>
    </div>
  );
}

