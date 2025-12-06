import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/**
 * Custom TENMON-ARK Page (CustomGPT互換)
 * Pro以上のユーザーがカスタムArkを作成・管理できる
 */
export default function CustomArks() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  const { data: arks, isLoading, refetch } = trpc.customArk.list.useQuery();
  const createMutation = trpc.customArk.create.useMutation({
    onSuccess: () => {
      toast.success("Custom ARKを作成しました");
      setDialogOpen(false);
      setName("");
      setDescription("");
      setSystemPrompt("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const deleteMutation = trpc.customArk.delete.useMutation({
    onSuccess: () => {
      toast.success("Custom ARKを削除しました");
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

  if (!user || !['pro', 'founder', 'dev'].includes(user.plan)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">Custom ARK</h2>
            <p className="text-muted-foreground mb-6">
              Custom ARKはPro以上のプランで利用できます
            </p>
            <Button onClick={() => setLocation('/subscription')}>
              プランをアップグレード
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const handleCreate = () => {
    if (!name.trim() || !systemPrompt.trim()) {
      toast.error("名前とシステムプロンプトは必須です");
      return;
    }

    createMutation.mutate({
      name,
      description,
      systemPrompt,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("本当に削除しますか？")) {
      deleteMutation.mutate({ id });
    }
  };

  const maxArks = user.plan === 'pro' ? 10 : Infinity;
  const currentCount = arks?.length || 0;

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
                  <Sparkles className="w-6 h-6" />
                  Custom TENMON-ARK
                </h1>
                <p className="text-sm text-muted-foreground">
                  {user.plan === 'pro' ? `${currentCount} / ${maxArks} 個作成済み` : '無制限'}
                </p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={user.plan === 'pro' && currentCount >= maxArks}>
                  <Plus className="w-4 h-4 mr-2" />
                  新規作成
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>新しいCustom ARKを作成</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">名前 *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="例: マーケティングアシスタント"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">説明</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="このCustom ARKの用途を説明してください"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="systemPrompt">システムプロンプト *</Label>
                    <Textarea
                      id="systemPrompt"
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="あなたは〇〇の専門家です。..."
                      rows={8}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          作成中...
                        </>
                      ) : (
                        "作成"
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
        {arks && arks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {arks.map((ark) => (
              <Card key={ark.id} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">{ark.name}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(ark.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                {ark.description && (
                  <p className="text-sm text-muted-foreground mb-3">{ark.description}</p>
                )}
                <div className="text-xs text-muted-foreground">
                  <p>作成日: {new Date(ark.createdAt).toLocaleDateString('ja-JP')}</p>
                  <p>使用回数: {ark.usageCount || 0}</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Custom ARKを作成しましょう</h3>
            <p className="text-muted-foreground mb-6">
              あなた専用のAIアシスタントを作成できます
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              最初のCustom ARKを作成
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
