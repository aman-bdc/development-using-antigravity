import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  FileCode,
  FileText,
  Sparkles,
  CheckCircle2,
  Loader2,
  Trash2,
  Plus,
  TrendingUp,
  BookOpen,
  Users,
  Info
} from 'lucide-react';
import type { DocumentFile } from '../types';
import { api } from '../services/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentFile[];
  onDocumentsUpdated: (docs: DocumentFile[]) => void;
}

export const UploadModal = ({
  isOpen,
  onClose,
  documents,
  onDocumentsUpdated,
}: UploadModalProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | File[]) => {
    if (!files.length) return;
    setIsUploading(true);
    setUploadMessage(null);
    setErrorMessage(null);

    try {
      const fileArray = Array.from(files);
      await api.uploadFiles(fileArray);
      setUploadMessage(`Successfully processed ${fileArray.length} file(s)!`);
      
      // Refresh documents
      const docsRes = await api.getDocuments();
      onDocumentsUpdated(docsRes.documents);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleLoadSamples = async () => {
    setIsLoadingSamples(true);
    setUploadMessage(null);
    setErrorMessage(null);
    try {
      const res = await api.loadSampleDatasets();
      setUploadMessage(res.message);
      onDocumentsUpdated(res.all_documents);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading sample datasets');
    } finally {
      setIsLoadingSamples(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await api.deleteDocument(docId);
      const docsRes = await api.getDocuments();
      onDocumentsUpdated(docsRes.documents);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error deleting file');
    }
  };

  const getIconForType = (filename: string, fileType: string) => {
    const f = filename.toLowerCase();
    if (f.endsWith('.csv') || f.endsWith('.xlsx') || f.endsWith('.xls') || fileType.includes('csv')) {
      return <FileSpreadsheet className="w-4 h-4 text-zinc-700" />;
    }
    if (f.endsWith('.json') || f.endsWith('.md')) {
      return <FileCode className="w-4 h-4 text-zinc-700" />;
    }
    return <FileText className="w-4 h-4 text-zinc-700" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Light dismiss on backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl glass-panel rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200/60 bg-white/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-zinc-100 border border-zinc-200">
              <UploadCloud className="w-5 h-5 text-zinc-800" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900">Upload Data & Knowledge Base</h3>
              <p className="text-xs text-zinc-500">
                Upload structured datasets or unstructured documents to query with citations.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
              isDragging
                ? 'border-zinc-800 bg-zinc-100/80 scale-[0.99]'
                : 'border-zinc-300 hover:border-zinc-500 bg-white/60 hover:bg-white/90'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
              accept=".csv,.tsv,.json,.xlsx,.xls,.pdf,.docx,.txt,.md"
            />

            <div className="p-3 rounded-2xl bg-zinc-100 border border-zinc-200 mb-3">
              {isUploading ? (
                <Loader2 className="w-6 h-6 text-zinc-900 animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6 text-zinc-800" />
              )}
            </div>

            <p className="text-sm font-semibold text-zinc-800">
              {isUploading ? 'Ingesting and indexing files...' : 'Click to select or drag and drop files here'}
            </p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Supports CSV, Excel (.xlsx), JSON, PDF, DOCX, Markdown, and TXT files.
            </p>

            {/* Formats badges */}
            <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                <FileSpreadsheet className="w-3 h-3 text-zinc-600" />
                CSV / Excel
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                <FileCode className="w-3 h-3 text-zinc-600" />
                JSON / Markdown
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                <FileText className="w-3 h-3 text-zinc-600" />
                PDF / DOCX / TXT
              </span>
            </div>
          </div>

          {/* Messages */}
          {uploadMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700 animate-in fade-in">
              <Info className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1-Click Sample Datasets */}
          <div className="glass-card p-4 rounded-2xl border border-zinc-200/70">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-zinc-700" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                  Quick Load Demo Datasets
                </h4>
              </div>
              <button
                onClick={handleLoadSamples}
                disabled={isLoadingSamples}
                className="px-3 py-1 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isLoadingSamples ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-white" />
                )}
                <span>Load All Samples</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-zinc-700">
              <div className="p-2.5 rounded-xl bg-white/80 border border-zinc-200/80 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-zinc-600 shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-zinc-900 truncate">sales_performance.csv</p>
                  <p className="text-[10px] text-zinc-500">24 rows, regional revenue</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/80 border border-zinc-200/80 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-zinc-600 shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-zinc-900 truncate">operations_guide.md</p>
                  <p className="text-[10px] text-zinc-500">Zero trust, remote work SLA</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/80 border border-zinc-200/80 flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-600 shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-zinc-900 truncate">customer_feedback.json</p>
                  <p className="text-[10px] text-zinc-500">Customer NPS & comments</p>
                </div>
              </div>
            </div>
          </div>

          {/* Uploaded Documents List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Active In-Memory Knowledge Base ({documents.length})
              </h4>
            </div>

            {documents.length > 0 ? (
              <div className="divide-y divide-zinc-200/60 border border-zinc-200/80 rounded-2xl overflow-hidden bg-white/80">
                {documents.map((doc) => (
                  <div key={doc.doc_id} className="p-3 flex items-center justify-between hover:bg-zinc-50/80 transition-colors">
                    <div className="flex items-center gap-3 truncate">
                      <div className="p-2 rounded-xl bg-zinc-100 border border-zinc-200">
                        {getIconForType(doc.filename, doc.file_type)}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-zinc-900 truncate">{doc.filename}</p>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                          <span>{(doc.size_bytes / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>{doc.chunk_count} chunks</span>
                          {doc.is_structured && (
                            <>
                              <span>•</span>
                              <span>{doc.row_count} records</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(doc.doc_id)}
                      title="Delete document"
                      className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center border border-zinc-200/70 rounded-2xl bg-white/40 text-xs text-zinc-400">
                No documents uploaded yet. Upload files above or load sample datasets.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200/60 bg-white/60 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {documents.length} document(s) currently indexed
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
