import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, MessageSquarePlus, Plus } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/**
 * Founder Feedback Center
 * Founderプランユーザーが機能要望・バグ報告を送信できる
 */
export default function FounderFeedback() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState<"feature_request" | "bug_report" | "improvement">("feature_request");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<number>(3);

  const { data: feedbacks, isLoading, refetch } = trpc.founderFeedback.list.useQuery();
  const createMutation = trpc.founderFeedback.create.useMutation({
    onSuccess: () => {
      toast.success("フィードバックを送信しました");
      setDialogOpen(false);
      setCategory("feature_request");
      setTitle("");
      setMessage("");
      setPriority(3);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (!user || !['founder', 'dev'].includes(user.plan)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <MessageSquarePlus className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">Founder Feedback</h2>
            <p className="text-muted-foreground mb-6">
              Founder Feedback CenterはFounderプランで利用できます
            </p>
            <Button onClick={() => setLocation('/subscription')}>
              Founderプランを確認
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!title.trim() || !message.trim()) {
      toast.error("タイトルとメッセージは必須です");
      return;
    }

    createMutation.mutate({
      category,
      title,
      message,
      priority,
    });
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "feature_request":
        return "機能要望";
      case "bug_report":
        return "バグ報告";
      case "improvement":
        return "改善提案";
      default:
        return cat;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "確認中";
      case "approved":
        return "承認済み";
      case "implemented":
        return "実装済み";
      case "rejected":
        return "却下";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "implemented":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setLocation('/dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <MessageSquarePlus className="w-6 h-6" />
                  Founder Feedback Center
                </h1>
                <p className="text-sm text-muted-foreground">
                  開発チームに直接フィードバックを送信
                </p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  新規フィードバック
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>新しいフィードバックを送信</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">カテゴリ *</Label>
                    <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feature_request">機能要望</SelectItem>
                        <SelectItem value="bug_report">バグ報告</SelectItem>
                        <SelectItem value="improvement">改善提案</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">タイトル *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="例: チャット履歴のエクスポート機能"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">詳細 *</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="具体的な内容を記載してください"
                      rows={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">優先度</Label>
                    <Select value={String(priority)} onValueChange={(val) => setPriority(Number(val))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - 低</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3 - 中</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5 - 高</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          送信中...
                        </>
                      ) : (
                        "送信"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {feedbacks && feedbacks.length > 0 ? (
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <Card key={feedback.id} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-primary/10 text-primary">
                        {getCategoryLabel(feedback.category)}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(feedback.status)}`}>
                        {getStatusLabel(feedback.status)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        優先度: {feedback.priority}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{feedback.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{feedback.message}</p>
                {feedback.adminResponse && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-xs font-semibold mb-2">開発チームからの返信:</p>
                    <p className="text-sm whitespace-pre-wrap">{feedback.adminResponse}</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-3">
                  送信日: {new Date(feedback.createdAt).toLocaleDateString('ja-JP')}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquarePlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">フィードバックを送信しましょう</h3>
            <p className="text-muted-foreground mb-6">
              機能要望やバグ報告を開発チームに直接送信できます
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              最初のフィードバックを送信
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
