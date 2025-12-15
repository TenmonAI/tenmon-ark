import { useState } from "react";
import { FilePreview, FilePreviewData } from "./FilePreview";
import { Loader2, Trash2, Download, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FileListProps {
  files: FilePreviewData[];
  loading?: boolean;
  onDelete?: (fileId: number) => void;
  onView?: (file: FilePreviewData) => void;
  onDownload?: (file: FilePreviewData) => void;
  onToggleLearning?: (fileId: number, enabled: boolean) => void;
}

export function FileList({ files, loading, onDelete, onView, onDownload, onToggleLearning }: FileListProps) {
  const [deleteFileId, setDeleteFileId] = useState<number | null>(null);

  const handleDelete = () => {
    if (deleteFileId && onDelete) {
      onDelete(deleteFileId);
      setDeleteFileId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-divine-gold animate-spin" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">アップロードされたファイルはありません</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {files.map((file) => (
          <div key={file.id} className="relative group">
            <FilePreview
              file={file}
              onClick={() => onView?.(file)}
            />

            {/* Learning Toggle (Bottom Left) */}
            {onToggleLearning && (
              <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-divine-black/80 border border-divine-gold/20 rounded-lg px-2 py-1">
                <span className="text-xs text-gray-400">学習:</span>
                <Switch
                  checked={file.isIntegratedToMemory === 1}
                  onCheckedChange={(checked) => {
                    onToggleLearning(file.id, checked);
                  }}
                  disabled={file.isProcessed === 0}
                  className="data-[state=checked]:bg-divine-gold"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div
              className={cn(
                "absolute top-2 right-2 flex items-center gap-1",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              )}
            >
              {/* View Button */}
              {onView && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(file);
                  }}
                  className={cn(
                    "p-2 rounded-lg transition-colors duration-200",
                    "bg-divine-black/80 border border-divine-gold/20",
                    "hover:bg-divine-gold/20 hover:border-divine-gold/40",
                    "text-gray-400 hover:text-divine-gold"
                  )}
                  title="表示"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}

              {/* Download Button */}
              {onDownload && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(file);
                  }}
                  className={cn(
                    "p-2 rounded-lg transition-colors duration-200",
                    "bg-divine-black/80 border border-divine-gold/20",
                    "hover:bg-divine-gold/20 hover:border-divine-gold/40",
                    "text-gray-400 hover:text-divine-gold"
                  )}
                  title="ダウンロード"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}

              {/* Delete Button */}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteFileId(file.id);
                  }}
                  className={cn(
                    "p-2 rounded-lg transition-colors duration-200",
                    "bg-divine-black/80 border border-red-500/20",
                    "hover:bg-red-500/20 hover:border-red-500/40",
                    "text-gray-400 hover:text-red-400"
                  )}
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteFileId !== null} onOpenChange={() => setDeleteFileId(null)}>
        <AlertDialogContent className="bg-divine-black border-divine-gold/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">ファイルを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              この操作は取り消せません。ファイルは完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-divine-black border-divine-gold/20 text-white hover:bg-divine-gold/10">
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
