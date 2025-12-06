import { useState, useCallback } from "react";
import { FileUploadZone } from "./FileUploadZone";
import { FileUploadProgress, UploadingFile } from "./FileUploadProgress";
import { FileList } from "./FileList";
import { FilePreviewData } from "./FilePreview";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FileUploadManagerProps {
  conversationId?: number;
  onFileUploaded?: (fileId: number, fileUrl: string) => void;
}

export function FileUploadManager({ conversationId, onFileUploaded }: FileUploadManagerProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [activeTab, setActiveTab] = useState<"upload" | "files">("upload");

  // Fetch uploaded files
  const { data: files, isLoading, refetch } = trpc.fileUpload.listFiles.useQuery({
    conversationId,
    limit: 50,
  });

  // Upload mutation
  const uploadMutation = trpc.fileUpload.uploadFile.useMutation({
    onSuccess: (data, variables, context) => {
      // Update uploading file status
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file.name === variables.fileName
            ? { ...f, status: "success", progress: 100, fileId: data.fileId, fileUrl: data.fileUrl }
            : f
        )
      );

      // Notify parent
      onFileUploaded?.(data.fileId, data.fileUrl);

      // Refetch files list
      refetch();

      toast.success(`${variables.fileName} をアップロードしました`);
    },
    onError: (error, variables) => {
      // Update uploading file status
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file.name === variables.fileName
            ? { ...f, status: "error", error: error.message }
            : f
        )
      );

      toast.error(`${variables.fileName} のアップロードに失敗しました: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = trpc.fileUpload.deleteFile.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("ファイルを削除しました");
    },
    onError: (error) => {
      toast.error(`ファイルの削除に失敗しました: ${error.message}`);
    },
  });

  // Handle file selection
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      // Add files to uploading list
      const newUploadingFiles: UploadingFile[] = files.map((file) => ({
        file,
        progress: 0,
        status: "uploading" as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      // Upload each file
      for (const file of files) {
        try {
          // Convert file to base64
          const base64 = await fileToBase64(file);

          // Simulate progress (since we don't have real progress tracking yet)
          const progressInterval = setInterval(() => {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.file.name === file.name && f.status === "uploading"
                  ? { ...f, progress: Math.min(f.progress + 10, 90) }
                  : f
              )
            );
          }, 200);

          // Upload file
          await uploadMutation.mutateAsync({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            fileData: base64,
            conversationId,
          });

          clearInterval(progressInterval);
        } catch (error) {
          console.error("File upload error:", error);
        }
      }
    },
    [conversationId, uploadMutation]
  );

  // Handle file delete
  const handleFileDelete = useCallback(
    (fileId: number) => {
      deleteMutation.mutate({ fileId });
    },
    [deleteMutation]
  );

  // Handle file view
  const handleFileView = useCallback((file: FilePreviewData) => {
    // Open file in new tab
    window.open(file.fileUrl, "_blank");
  }, []);

  // Handle file download
  const handleFileDownload = useCallback((file: FilePreviewData) => {
    // Create download link
    const link = document.createElement("a");
    link.href = file.fileUrl;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Remove uploading file from list
  const handleRemoveUploadingFile = useCallback((index: number) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Convert uploaded files to FilePreviewData
  const filePreviewData: FilePreviewData[] =
    files?.map((file) => ({
      ...file,
      createdAt: new Date(file.createdAt),
    })) || [];

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "files")}>
        <TabsList className="bg-divine-black border border-divine-gold/20">
          <TabsTrigger
            value="upload"
            className="data-[state=active]:bg-divine-gold/20 data-[state=active]:text-divine-gold"
          >
            アップロード
          </TabsTrigger>
          <TabsTrigger
            value="files"
            className="data-[state=active]:bg-divine-gold/20 data-[state=active]:text-divine-gold"
          >
            ファイル一覧 ({filePreviewData.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          {/* Upload Zone */}
          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            disabled={uploadMutation.isPending}
          />

          {/* Upload Progress */}
          {uploadingFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-divine-gold">アップロード中</h3>
              <FileUploadProgress files={uploadingFiles} onRemove={handleRemoveUploadingFile} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="files">
          {/* File List */}
          <FileList
            files={filePreviewData}
            loading={isLoading}
            onDelete={handleFileDelete}
            onView={handleFileView}
            onDownload={handleFileDownload}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to convert File to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64Data = base64.split(",")[1] || base64;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
