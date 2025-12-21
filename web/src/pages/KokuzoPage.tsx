// KOKŪZŌ v1.1: Minimal UI for Persistent Wisdom Storage

import { useState, useRef, useEffect } from "react";

type KokuzoFile = {
  id: number;
  filename: string;
  uploaded_at: string;
};

type KokuzoSeed = {
  id: number;
  essence: string;
  created_at: string;
};

export function KokuzoPage() {
  const [files, setFiles] = useState<KokuzoFile[]>([]);
  const [seeds, setSeeds] = useState<KokuzoSeed[]>([]);
  const [uploading, setUploading] = useState(false);
  const [indexing, setIndexing] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files on mount
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const res = await fetch("/api/kokuzo/files");
      const data = await res.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error("[KOKUZO] Failed to load files", error);
    }
  };

  const loadSeeds = async (fileId: number) => {
    try {
      const res = await fetch(`/api/kokuzo/seeds?file_id=${fileId}`);
      const data = await res.json();
      if (data.success) {
        setSeeds(data.seeds);
      }
    } catch (error) {
      console.error("[KOKUZO] Failed to load seeds", error);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/kokuzo/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        await loadFiles();
      } else {
        alert(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      console.error("[KOKUZO] Upload error", error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleIndex = async (fileId: number) => {
    setIndexing(fileId);
    try {
      const res = await fetch("/api/kokuzo/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId }),
      });

      const data = await res.json();
      if (data.success) {
        await loadSeeds(fileId);
        alert(`Indexed: ${data.chunks} chunks created`);
      } else {
        alert(`Indexing failed: ${data.error}`);
      }
    } catch (error) {
      console.error("[KOKUZO] Index error", error);
      alert("Indexing failed");
    } finally {
      setIndexing(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">KOKŪZŌ v1.1</h1>

        {/* Drag & Drop Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center ${
            dragActive ? "border-gray-400 bg-gray-50" : "border-gray-300"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <p className="text-gray-600 mb-4">
            Drag & drop a file here, or{" "}
            <button
              className="text-blue-600 underline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              browse
            </button>
          </p>
          {uploading && <p className="text-sm text-gray-500">Uploading...</p>}
        </div>

        {/* Files List */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Files</h2>
          {files.length === 0 ? (
            <p className="text-gray-500 text-sm">No files uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.filename}</p>
                    <p className="text-xs text-gray-500">{file.uploaded_at}</p>
                  </div>
                  <button
                    className="px-4 py-1 bg-gray-900 text-white text-sm rounded disabled:opacity-50"
                    onClick={() => handleIndex(file.id)}
                    disabled={indexing === file.id}
                  >
                    {indexing === file.id ? "Indexing..." : "Index / Analyze"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seeds List */}
        {seeds.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Generated Seeds</h2>
            <div className="space-y-3">
              {seeds.map((seed) => (
                <div key={seed.id} className="p-3 border border-gray-200 rounded">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{seed.essence}</p>
                  <p className="text-xs text-gray-500 mt-2">{seed.created_at}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

