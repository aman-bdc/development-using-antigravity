import { useState, useEffect } from 'react';
import {
  X,
  BarChart3,
  FileSpreadsheet,
  FileCode,
  FileText,
  Eye,
  Loader2,
  Table as TableIcon
} from 'lucide-react';
import type { DocumentFile } from '../types';
import { api } from '../services/api';
import { InteractiveTable } from './InteractiveTable';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentFile[];
}

export const KnowledgeBaseModal = ({
  isOpen,
  onClose,
  documents,
}: KnowledgeBaseModalProps) => {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<any | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  useEffect(() => {
    if (documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0].doc_id);
    }
  }, [documents, selectedDocId]);

  useEffect(() => {
    if (selectedDocId && isOpen) {
      loadContent(selectedDocId);
    }
  }, [selectedDocId, isOpen]);

  const loadContent = async (docId: string) => {
    setIsLoadingContent(true);
    try {
      const data = await api.getDocumentContent(docId);
      setDocContent(data);
    } catch (err) {
      console.error(err);
      setDocContent(null);
    } finally {
      setIsLoadingContent(false);
    }
  };

  if (!isOpen) return null;

  const selectedDoc = documents.find((d) => d.doc_id === selectedDocId);

  const getDocIcon = (filename: string, fileType: string) => {
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
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-5xl h-[85vh] glass-panel rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden z-10 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200/60 bg-white/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-zinc-100 border border-zinc-200">
              <BarChart3 className="w-5 h-5 text-zinc-800" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900">Data Inspector</h3>
              <p className="text-xs text-zinc-500">
                Explore raw records and text chunks across your uploaded data.
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

        {/* Content Area with Split View: Document Selector Sidebar + Document Viewer */}
        <div className="flex-1 flex overflow-hidden">
          {/* Document list sidebar */}
          <div className="w-64 border-r border-zinc-200/60 bg-zinc-50/50 p-4 overflow-y-auto space-y-1.5 shrink-0">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 px-2">
              Datasets & Files ({documents.length})
            </h4>

            {documents.length > 0 ? (
              documents.map((doc) => {
                const isSelected = doc.doc_id === selectedDocId;
                return (
                  <button
                    key={doc.doc_id}
                    onClick={() => setSelectedDocId(doc.doc_id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/90 font-medium'
                        : 'text-zinc-600 hover:bg-zinc-100/80'
                    }`}
                  >
                    {getDocIcon(doc.filename, doc.file_type)}
                    <span className="truncate flex-1">{doc.filename}</span>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-zinc-400 px-2 py-4">No documents available.</p>
            )}
          </div>

          {/* Document Viewer Main Panel */}
          <div className="flex-1 p-6 overflow-y-auto bg-white/40">
            {isLoadingContent ? (
              <div className="h-full flex items-center justify-center text-zinc-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading document preview...</span>
              </div>
            ) : selectedDoc && docContent ? (
              <div className="space-y-4">
                {/* Doc Meta Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">{selectedDoc?.filename}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Type: <span className="font-mono">{selectedDoc?.file_type}</span> • Size:{' '}
                      {((selectedDoc?.size_bytes || 0) / 1024).toFixed(1)} KB • Chunks:{' '}
                      {selectedDoc?.chunk_count}
                    </p>
                  </div>
                </div>

                {/* Structured vs Unstructured rendering */}
                {docContent?.is_structured ? (
                  <div>
                    <InteractiveTable
                      data={{
                        title: `Dataset: ${selectedDoc?.filename}`,
                        columns: (docContent.columns || []).map((col: string) => ({
                          key: col,
                          label: col.replace(/_/g, ' ').toUpperCase(),
                          type: 'string',
                        })),
                        rows: docContent.rows || [],
                        source_file: selectedDoc?.filename,
                        total_rows: docContent.total_rows,
                      }}
                    />
                  </div>
                ) : (
                  <div className="glass-card p-5 rounded-2xl border border-zinc-200/80">
                    <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      <Eye className="w-4 h-4 text-zinc-600" />
                      <span>Document Text Extract (First 5,000 Characters)</span>
                    </div>
                    <pre className="text-xs font-mono text-zinc-800 leading-relaxed whitespace-pre-wrap select-text p-4 rounded-xl bg-zinc-50/80 border border-zinc-200/60 max-h-[50vh] overflow-y-auto">
                      {docContent?.text || 'No preview available.'}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                <TableIcon className="w-10 h-10 stroke-1 mb-2 text-zinc-300" />
                <p className="text-sm">Select a document from the left to inspect its contents</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
