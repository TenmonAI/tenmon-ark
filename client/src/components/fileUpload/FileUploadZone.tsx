import { useCallback, useState } from "react";
import { Upload, File, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedFileTypes?: string[];
  disabled?: boolean;
}

export function FileUploadZone({
  onFilesSelected,
  maxFiles = 10,
  maxFileSize = 16 * 1024 * 1024, // 16MB default
  acceptedFileTypes = [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".zip",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".mp4",
    ".webm",
    ".mov",
    ".mp3",
    ".wav",
    ".m4a",
    ".ogg",
  ],
  disabled = false,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    if (files.length > maxFiles) {
      errors.push(`最大${maxFiles}ファイルまでアップロード可能です`);
      return { valid: [], errors };
    }

    for (const file of files) {
      // Check file size
      if (file.size > maxFileSize) {
        errors.push(
          `${file.name}: ファイルサイズが${(maxFileSize / 1024 / 1024).toFixed(0)}MBを超えています`
        );
        continue;
      }

      // Check file type
      const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!acceptedFileTypes.includes(fileExtension)) {
        errors.push(`${file.name}: サポートされていないファイル形式です`);
        continue;
      }

      valid.push(file);
    }

    return { valid, errors };
  };

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const { valid, errors } = validateFiles(fileArray);

      if (errors.length > 0) {
        setError(errors.join(", "));
        setTimeout(() => setError(null), 5000);
      }

      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    },
    [onFilesSelected, maxFiles, maxFileSize, acceptedFileTypes]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      handleFiles(files);
    },
    [disabled, handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      handleFiles(e.target.files);
      // Reset input value to allow selecting the same file again
      e.target.value = "";
    },
    [disabled, handleFiles]
  );

  return (
    <div className="relative">
      {/* Drag & Drop Zone */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-all duration-200",
          "hover:border-divine-gold hover:bg-divine-gold/5",
          isDragging && "border-divine-gold bg-divine-gold/10 scale-[1.02]",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "cursor-pointer"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled) {
            document.getElementById("file-upload-input")?.click();
          }
        }}
      >
        <div className="flex flex-col items-center justify-center py-12 px-6">
          {/* Upload Icon */}
          <div
            className={cn(
              "mb-4 p-4 rounded-full transition-all duration-200",
              "bg-divine-gold/10",
              isDragging && "bg-divine-gold/20 scale-110"
            )}
          >
            <Upload
              className={cn(
                "w-8 h-8 transition-colors duration-200",
                "text-divine-gold",
                isDragging && "text-divine-gold animate-bounce"
              )}
            />
          </div>

          {/* Text */}
          <div className="text-center">
            <p className="text-lg font-medium text-divine-gold mb-2">
              {isDragging ? "ファイルをドロップ" : "ファイルをアップロード"}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              ドラッグ&ドロップ または クリックして選択
            </p>

            {/* Supported Formats */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>対応形式: PDF, Word, Excel, Zip, 画像, 動画, 音声</p>
              <p>最大ファイルサイズ: {(maxFileSize / 1024 / 1024).toFixed(0)}MB</p>
              <p>最大ファイル数: {maxFiles}個</p>
            </div>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          id="file-upload-input"
          type="file"
          multiple
          accept={acceptedFileTypes.join(",")}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
