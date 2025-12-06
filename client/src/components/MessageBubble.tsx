import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit2, Copy, Trash2, Check, X } from "lucide-react";
import { Streamdown } from "streamdown";
import { useTranslation } from "react-i18next";

/**
 * メッセージバブルコンポーネント（GPT同等の編集機能付き）
 */
export interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
  onCopy?: () => void;
}

export function MessageBubble({
  role,
  content,
  timestamp,
  onEdit,
  onDelete,
  onCopy,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const { t } = useTranslation();

  const handleSaveEdit = () => {
    if (onEdit && editedContent.trim()) {
      onEdit(editedContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    onCopy?.();
  };

  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <Card
        className={`max-w-3xl group relative ${
          role === "user"
            ? "bg-amber-500/20 border-amber-500/50"
            : "bg-blue-500/20 border-blue-500/50"
        }`}
      >
        <div className="p-4">
          {/* ヘッダー */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-400">
                {role === "user" ? t("chat.you") : "TENMON-ARK"}
              </span>
              <span className="text-xs text-slate-400">
                {timestamp.toLocaleTimeString()}
              </span>
            </div>

            {/* メニューボタン（ホバー時に表示） */}
            {!isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {role === "user" && onEdit && (
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      {t("common.edit")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-2" />
                    {t("common.copy")}
                  </DropdownMenuItem>
                  {onDelete && (
                    <DropdownMenuItem onClick={onDelete} className="text-red-400">
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t("common.delete")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* コンテンツ */}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100 resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="h-8"
                >
                  <X className="w-4 h-4 mr-1" />
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveEdit}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 h-8"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {t("common.save")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <Streamdown>{content}</Streamdown>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
