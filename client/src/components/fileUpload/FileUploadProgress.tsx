import { CheckCircle2, XCircle, Loader2, File } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadingFile {
  file: File;
  progress: number; // 0-100
  status: "uploading" | "success" | "error";
  error?: string;
  fileId?: number;
  fileUrl?: string;
}

interface FileUploadProgressProps {
  files: UploadingFile[];
  onRemove?: (index: number) => void;
}

export function FileUploadProgress({ files, onRemove }: FileUploadProgressProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      {files.map((uploadingFile, index) => (
        <FileProgressItem
          key={`${uploadingFile.file.name}-${index}`}
          uploadingFile={uploadingFile}
          onRemove={() => onRemove?.(index)}
        />
      ))}
    </div>
  );
}

interface FileProgressItemProps {
  uploadingFile: UploadingFile;
  onRemove: () => void;
}

function FileProgressItem({ uploadingFile, onRemove }: FileProgressItemProps) {
  const { file, progress, status, error } = uploadingFile;

  const getStatusIcon = () => {
    switch (status) {
      case "uploading":
        return <Loader2 className="w-4 h-4 text-divine-gold animate-spin" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "uploading":
        return `アップロード中... ${progress}%`;
      case "success":
        return "アップロード完了";
      case "error":
        return error || "アップロード失敗";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div
      className={cn(
        "relative p-4 rounded-lg border transition-all duration-200",
        "bg-divine-black/50 border-divine-gold/20",
        status === "success" && "border-green-500/30 bg-green-500/5",
        status === "error" && "border-red-500/30 bg-red-500/5"
      )}
    >
      <div className="flex items-start gap-3">
        {/* File Icon */}
        <div
          className={cn(
            "flex-shrink-0 p-2 rounded-lg",
            "bg-divine-gold/10 border border-divine-gold/20"
          )}
        >
          <File className="w-5 h-5 text-divine-gold" />
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          {/* File Name */}
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-white truncate">{file.name}</p>
            {getStatusIcon()}
          </div>

          {/* File Size & Status */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span className={cn(
              status === "success" && "text-green-400",
              status === "error" && "text-red-400"
            )}>
              {getStatusText()}
            </span>
          </div>

          {/* Progress Bar */}
          {status === "uploading" && (
            <div className="mt-2 h-1 bg-divine-black rounded-full overflow-hidden">
              <div
                className="h-full bg-divine-gold-gradient transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Error Message */}
          {status === "error" && error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Remove Button */}
        {(status === "success" || status === "error") && (
          <button
            onClick={onRemove}
            className={cn(
              "flex-shrink-0 p-1 rounded-lg transition-colors duration-200",
              "hover:bg-red-500/20 text-gray-400 hover:text-red-400"
            )}
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
