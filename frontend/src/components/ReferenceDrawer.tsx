import { useState } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  Compass,
  Copy,
  Check,
  BookOpen,
  Info
} from 'lucide-react';
import type { Citation } from '../types';

interface ReferenceDrawerProps {
  citation: Citation | null;
  onClose: () => void;
}

export const ReferenceDrawer = ({ citation, onClose }: ReferenceDrawerProps) => {
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);

  if (!citation) return null;

  const handleCopy = () => {
    const textToCopy = showFull && citation.full_content ? citation.full_content : citation.snippet;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDocIcon = (filename: string, fileType: string) => {
    const f = filename.toLowerCase();
    if (f.endsWith('.csv') || f.endsWith('.xlsx') || f.endsWith('.xls') || fileType.includes('csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-zinc-700" />;
    }
    if (f.endsWith('.json') || f.endsWith('.md')) {
      return <FileCode className="w-5 h-5 text-zinc-700" />;
    }
    return <FileText className="w-5 h-5 text-zinc-700" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer content */}
      <div className="relative w-full max-w-lg h-full glass-panel border-l border-zinc-200/80 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200/60 bg-white/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-100/90 border border-zinc-200/70">
              {getDocIcon(citation.filename, citation.file_type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-900 text-white">
                  Source #{citation.id}
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  {citation.file_type}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 truncate max-w-[260px] mt-0.5" title={citation.filename}>
                {citation.filename}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            title="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-header badges */}
        <div className="px-6 py-3 bg-zinc-50/60 border-b border-zinc-200/40 flex items-center justify-between text-xs text-zinc-600">
          <div className="flex items-center gap-1.5 font-medium">
            <Compass className="w-3.5 h-3.5 text-zinc-500" />
            <span>{citation.location}</span>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-zinc-200 font-medium text-zinc-700 shadow-xs">
            <Sparkles className="w-3 h-3 text-zinc-600" />
            <span>{citation.confidence} Match</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {showFull ? 'Complete Context Chunk' : 'Referenced Snippet'}
              </span>
              <div className="flex items-center gap-2">
                {citation.full_content && (
                  <button
                    onClick={() => setShowFull(!showFull)}
                    className="text-xs text-zinc-600 hover:text-zinc-900 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>{showFull ? 'Show Summary' : 'Show Full Context'}</span>
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="text-xs text-zinc-600 hover:text-zinc-900 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  title="Copy snippet"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/90 border border-zinc-200/90 text-sm font-mono text-zinc-800 leading-relaxed whitespace-pre-wrap shadow-inner select-text">
              {showFull && citation.full_content ? citation.full_content : citation.snippet}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-100/60 border border-zinc-200/60 flex items-start gap-2.5 text-xs text-zinc-600">
            <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            <span>
              This citation was indexed from the active knowledge base. When using Gemini or the Local Smart Engine, statements in the answer are directly linked to this passage.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200/60 bg-white/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
