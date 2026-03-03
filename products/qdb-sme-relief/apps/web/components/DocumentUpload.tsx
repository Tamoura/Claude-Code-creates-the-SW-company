"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useLang } from "@/lib/language-context";

interface UploadedFile {
  name: string;
  size: number;
}

interface DocumentUploadProps {
  sectionKey: string; // used as identifier for parent tracking
  title: string;
  titleAr: string;
  description?: string;
  descriptionAr?: string;
  accept?: string;
  multiple?: boolean;
  onFileAdded?: (file: UploadedFile) => void;
  validationResult?: React.ReactNode;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUpload({
  sectionKey: _sectionKey,
  title,
  titleAr,
  description,
  descriptionAr,
  accept = ".pdf,.xlsx,.csv",
  multiple = false,
  onFileAdded,
  validationResult,
}: DocumentUploadProps) {
  const { isAr, t } = useLang();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList).map((f) => ({
      name: f.name,
      size: f.size,
    }));

    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setFiles((prev) => (multiple ? [...prev, ...newFiles] : newFiles));
      newFiles.forEach((f) => onFileAdded?.(f));
    }, 800);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const hasFiles = files.length > 0;

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <h3 className="text-sm font-semibold text-qdb-navy mb-1">
        {isAr ? titleAr : title}
      </h3>
      {(description || descriptionAr) && (
        <p className="text-xs text-gray-500 mb-3">
          {isAr ? descriptionAr : description}
        </p>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-qdb-navy bg-blue-50"
            : hasFiles
              ? "border-green-400 bg-green-50"
              : "border-gray-300 hover:border-qdb-navy hover:bg-gray-50"
        }`}
        role="button"
        aria-label={t(`Upload ${title}`, `رفع ${titleAr}`)}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={handleChange}
          aria-label={t("File input", "ملف")}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-qdb-navy border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">
              {t("Uploading...", "جاري الرفع...")}
            </p>
          </div>
        ) : hasFiles ? (
          <div className="flex flex-col items-center gap-1">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-green-700">
              {t("File uploaded", "تم رفع الملف")}
            </p>
            <p className="text-xs text-gray-500">
              {t("Click to replace", "انقر للاستبدال")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm text-gray-600 font-medium">
              {t("Drag & drop or click to browse", "اسحب وأفلت أو انقر للتصفح")}
            </p>
            <p className="text-xs text-gray-400">
              {accept.toUpperCase().replace(/\./g, "").replace(/,/g, ", ")}
            </p>
          </div>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((file, i) => (
            <li
              key={i}
              className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <svg
                  className="w-4 h-4 text-green-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="truncate text-gray-700">{file.name}</span>
                <span className="text-gray-400 text-xs flex-shrink-0">
                  ({formatBytes(file.size)})
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="text-gray-400 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                aria-label={t("Remove file", "حذف الملف")}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Validation result */}
      {hasFiles && !isUploading && validationResult && (
        <div className="mt-3">{validationResult}</div>
      )}
    </div>
  );
}
