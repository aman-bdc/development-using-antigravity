import { FileText, ExternalLink } from 'lucide-react';
import type { Citation } from '../types';

interface CitationBadgeProps {
  citation: Citation;
  onClick: (citation: Citation) => void;
}

export const CitationBadge = ({ citation, onClick }: CitationBadgeProps) => {
  return (
    <button
      onClick={() => onClick(citation)}
      title={`Source: ${citation.filename} (${citation.location})`}
      className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 text-xs font-medium text-zinc-700 bg-white/90 hover:bg-zinc-100 active:bg-zinc-200 border border-zinc-300/80 rounded-full shadow-sm hover:shadow transition-all duration-150 group cursor-pointer"
    >
      <FileText className="w-3 h-3 text-zinc-500 group-hover:text-zinc-900 transition-colors" />
      <span>[{citation.id}]</span>
      <ExternalLink className="w-2.5 h-2.5 text-zinc-400 group-hover:text-zinc-700 opacity-60 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};
