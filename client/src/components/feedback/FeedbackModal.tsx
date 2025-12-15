/**
 * Feedback Modal Component
 * フィードバック送信モーダル
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { submitFeedback, type FeedbackRequest } from '@/lib/feedback/client';
import { toast } from 'sonner';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPage?: string;
}

export function FeedbackModal({ open, onOpenChange, defaultPage }: FeedbackModalProps) {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<string>('improvement');
  const [page, setPage] = useState(defaultPage || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('メッセージを入力してください');
      return;
    }

    if (!category) {
      toast.error('カテゴリを選択してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const feedback: FeedbackRequest = {
        message: message.trim(),
        category,
        page: page.trim() || undefined,
      };

      await submitFeedback(feedback);
      
      toast.success('フィードバックを送信しました');
      
      // フォームをリセット
      setMessage('');
      setCategory('improvement');
      setPage(defaultPage || '');
      onOpenChange(false);

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'フィードバックの送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>改善を提案する</DialogTitle>
          <DialogDescription>
            ご意見・ご要望をお聞かせください。Semantic Indexに登録され、今後の改善に活用されます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* カテゴリ選択 */}
          <div className="space-y-2">
            <Label htmlFor="category">カテゴリ</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="improvement">改善提案</SelectItem>
                <SelectItem value="feature_request">機能要望</SelectItem>
                <SelectItem value="bug_report">バグ報告</SelectItem>
                <SelectItem value="other">その他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ページ名（オプション） */}
          <div className="space-y-2">
            <Label htmlFor="page">ページ名（オプション）</Label>
            <Input
              id="page"
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder="例: Dashboard, ChatRoom"
            />
          </div>

          {/* メッセージ */}
          <div className="space-y-2">
            <Label htmlFor="message">メッセージ</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="ご意見・ご要望を入力してください"
              rows={5}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !message.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                送信中...
              </>
            ) : (
              '送信'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

