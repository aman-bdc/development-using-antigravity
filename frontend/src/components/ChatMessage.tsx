import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  User,
  Copy,
  Check,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
import type { Message, Citation } from '../types';
import { InteractiveTable } from './InteractiveTable';
import { InteractiveChart } from './InteractiveChart';

interface ChatMessageProps {
  message: Message;
  onSelectCitation: (citation: Citation) => void;
  onPromptClick?: (prompt: string) => void;
}

export const ChatMessage = ({
  message,
  onSelectCitation,
  onPromptClick,
}: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDocIcon = (filename: string) => {
    const f = filename.toLowerCase();
    if (f.endsWith('.csv') || f.endsWith('.xlsx') || f.endsWith('.xls')) {
      return <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-600" />;
    }
    if (f.endsWith('.json') || f.endsWith('.md')) {
      return <FileCode className="w-3.5 h-3.5 text-zinc-600" />;
    }
    return <FileText className="w-3.5 h-3.5 text-zinc-600" />;
  };

  // Render clean markdown text without inline citation tags
  const renderCleanContent = (content: string) => {
    // Strip citation tags like [^1], [^2], [1], [2] from inline text
    const cleaned = content.replace(/\[\^?[0-9]+\]/g, '').replace(/[ \t]+([.,;:!?])/g, '$1');
    return (
      <div className="prose prose-sm max-w-none text-zinc-800 leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleaned}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div className={`flex gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-2xl glass-card flex items-center justify-center shrink-0 border border-zinc-200/80 shadow-xs mt-1">
          <Bot className="w-4 h-4 text-zinc-800" />
        </div>
      )}

      {/* Message Bubble Container */}
      <div
        className={`relative max-w-3xl rounded-3xl p-5 transition-all ${
          isUser
            ? 'bg-zinc-900 text-white rounded-br-xs shadow-sm ml-12'
            : 'glass-panel rounded-tl-xs shadow-glass-sm mr-12'
        }`}
      >
        {/* Assistant Header info bar */}
        {!isUser && (
          <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-zinc-200/50 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900">Data Agent</span>
              {message.engine_used && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                  {message.engine_used}
                </span>
              )}
            </div>

            <button
              onClick={handleCopy}
              className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
              title="Copy message"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}

        {/* Message Content */}
        {isUser ? (
          <p className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        ) : (
          <div className="space-y-4">
            {renderCleanContent(message.content)}

            {/* Embedded Interactive Chart */}
            {message.chart_data && (
              <InteractiveChart config={message.chart_data} />
            )}

            {/* Embedded Interactive Table */}
            {message.table_data && (
              <InteractiveTable data={message.table_data} />
            )}

            {/* Sources & References Drawer Trigger Card */}
            {message.citations && message.citations.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-50/90 hover:bg-zinc-100/90 border border-zinc-200/80 text-xs font-medium text-zinc-700 transition-all shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-zinc-600" />
                    <span>
                      Referenced Documents ({message.citations.length})
                    </span>
                  </div>
                  {showSources ? (
                    <ChevronUp className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  )}
                </button>

                {showSources && (
                  <div className="mt-2 space-y-1.5 p-2 rounded-2xl bg-white/70 border border-zinc-200/60 animate-in fade-in duration-150">
                    {message.citations.map((citation) => (
                      <div
                        key={citation.id}
                        onClick={() => onSelectCitation(citation)}
                        className="p-2.5 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200 cursor-pointer transition-all flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5 truncate">
                          <div className="p-1.5 rounded-lg bg-zinc-100 border border-zinc-200 shrink-0 mt-0.5">
                            {getDocIcon(citation.filename)}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-zinc-900 truncate max-w-[200px]">
                                [{citation.id}] {citation.filename}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                • {citation.location}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                              {citation.snippet}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                          <Sparkles className="w-2.5 h-2.5 text-zinc-600" />
                          <span>{citation.confidence}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Suggested Prompts */}
            {message.suggested_prompts && message.suggested_prompts.length > 0 && onPromptClick && (
              <div className="pt-2 border-t border-zinc-200/50">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  <Sparkles className="w-3 h-3 text-zinc-500" />
                  <span>Suggested Next Questions</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {message.suggested_prompts.map((prompt, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => onPromptClick(prompt)}
                      className="px-3 py-1 text-xs text-zinc-700 bg-white/80 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200/80 rounded-full transition-all shadow-xs text-left cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
};
