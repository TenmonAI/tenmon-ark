import { File, FileText, FileSpreadsheet, FileArchive, Image, Video, Music, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilePreviewData {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: "pdf" | "word" | "excel" | "zip" | "image" | "video" | "audio" | "other";
  fileUrl: string;
  mimeType: string;
  createdAt: Date;
}

interface FilePreviewProps {
  file: FilePreviewData;
  onRemove?: () => void;
  onClick?: () => void;
}

export function FilePreview({ file, onRemove, onClick }: FilePreviewProps) {
  const getFileIcon = () => {
    switch (file.fileType) {
      case "pdf":
        return <FileText className="w-6 h-6 text-red-400" />;
      case "word":
        return <FileText className="w-6 h-6 text-blue-400" />;
      case "excel":
        return <FileSpreadsheet className="w-6 h-6 text-green-400" />;
      case "zip":
        return <FileArchive className="w-6 h-6 text-yellow-400" />;
      case "image":
        return <Image className="w-6 h-6 text-purple-400" />;
      case "video":
        return <Video className="w-6 h-6 text-pink-400" />;
      case "audio":
        return <Music className="w-6 h-6 text-cyan-400" />;
      default:
        return <File className="w-6 h-6 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "たった今";
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    return date.toLocaleDateString("ja-JP");
  };

  const isImageFile = file.fileType === "image";
  const isVideoFile = file.fileType === "video";

  return (
    <div
      className={cn(
        "group relative p-4 rounded-lg border transition-all duration-200",
        "bg-divine-black/50 border-divine-gold/20",
        "hover:border-divine-gold/40 hover:bg-divine-gold/5",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Preview Area */}
      <div className="flex items-start gap-3">
        {/* File Icon or Thumbnail */}
        <div
          className={cn(
            "flex-shrink-0 rounded-lg overflow-hidden",
            isImageFile || isVideoFile ? "w-16 h-16" : "w-12 h-12 flex items-center justify-center bg-divine-gold/10 border border-divine-gold/20"
          )}
        >
          {isImageFile ? (
            <img
              src={file.fileUrl}
              alt={file.fileName}
              className="w-full h-full object-cover"
            />
          ) : isVideoFile ? (
            <video
              src={file.fileUrl}
              className="w-full h-full object-cover"
              muted
            />
          ) : (
            getFileIcon()
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          {/* File Name */}
          <p className="text-sm font-medium text-white truncate mb-1">{file.fileName}</p>

          {/* File Size & Date */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{formatFileSize(file.fileSize)}</span>
            <span>•</span>
            <span>{formatDate(file.createdAt)}</span>
          </div>

          {/* File Type Badge */}
          <div className="mt-2">
            <span
              className={cn(
                "inline-block px-2 py-0.5 text-xs font-medium rounded-full",
                "bg-divine-gold/10 text-divine-gold border border-divine-gold/20"
              )}
            >
              {file.fileType.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Remove Button */}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className={cn(
              "flex-shrink-0 p-1 rounded-lg transition-all duration-200",
              "opacity-0 group-hover:opacity-100",
              "hover:bg-red-500/20 text-gray-400 hover:text-red-400"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Hover Overlay for Click Action */}
      {onClick && (
        <div
          className={cn(
            "absolute inset-0 rounded-lg transition-opacity duration-200",
            "opacity-0 group-hover:opacity-100",
            "bg-divine-gold/5 pointer-events-none"
          )}
        />
      )}
    </div>
  );
}
