import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Paperclip,
  Loader2,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (query: string) => void;
  isLoading: boolean;
  onOpenUpload: () => void;
  starterPrompts: string[];
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  onOpenUpload,
  starterPrompts,
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const BASE_TEXTAREA_HEIGHT = 76; // Comfortable multi-line starting height

  useEffect(() => {
    if (textareaRef.current) {
      if (!input) {
        textareaRef.current.style.height = `${BASE_TEXTAREA_HEIGHT}px`;
      } else {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.max(
          BASE_TEXTAREA_HEIGHT,
          Math.min(textareaRef.current.scrollHeight, 200)
        )}px`;
      }
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = `${BASE_TEXTAREA_HEIGHT}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      {/* Starter Prompts Carousel / Chips */}
      {starterPrompts.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 px-1 mb-2 no-scrollbar">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider shrink-0 mr-1">
            <Sparkles className="w-3 h-3 text-zinc-400" />
            <span>Try:</span>
          </div>
          {starterPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(prompt)}
              disabled={isLoading}
              className="px-3 py-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white/80 hover:bg-white border border-zinc-200/80 rounded-full shrink-0 shadow-xs transition-all cursor-pointer disabled:opacity-50 hover:border-zinc-300"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Spacious Input Glass Box */}
      <div className="glass-card rounded-2xl border border-zinc-200/90 shadow-glass-md transition-all focus-within:border-zinc-400 focus-within:shadow-glass-lg flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Multi-line Text Area with generous starting height */}
          <div className="px-4 pt-3 pb-1">
            <textarea
              ref={textareaRef}
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask questions about your data, request charts, compare metrics, or search documents..."
              disabled={isLoading}
              style={{ minHeight: `${BASE_TEXTAREA_HEIGHT}px` }}
              className="w-full text-sm bg-transparent border-0 focus:outline-hidden text-zinc-900 placeholder:text-zinc-400 resize-none leading-relaxed"
            />
          </div>

          {/* Bottom Utility & Action Bar */}
          <div className="px-3 pb-2.5 pt-1 flex items-center justify-between border-t border-zinc-100/80">
            {/* Left Tools */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenUpload}
                title="Upload or manage datasets (CSV, Excel, PDF, JSON, DOCX)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/90 transition-colors cursor-pointer border border-transparent hover:border-zinc-200/70"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span className="font-medium text-[11px] hidden sm:inline">Attach Data</span>
              </button>
              <button
                type="button"
                onClick={onOpenUpload}
                title="Supported formats: CSV, Excel, PDF, JSON, DOCX"
                className="hidden md:flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-600 rounded-md"
              >
                <FileSpreadsheet className="w-3 h-3" />
                <span>CSV, XLSX, PDF, JSON</span>
              </button>
            </div>

            {/* Right Tools & Send */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 hidden sm:inline select-none">
                Use <kbd className="px-1 py-0.5 text-[9px] font-sans bg-zinc-100 border border-zinc-200 rounded text-zinc-500">Shift</kbd> + <kbd className="px-1 py-0.5 text-[9px] font-sans bg-zinc-100 border border-zinc-200 rounded text-zinc-500">Enter</kbd> for newline
              </span>

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="p-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all shadow-xs shrink-0 cursor-pointer flex items-center justify-center w-8 h-8"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <p className="text-[11px] text-center text-zinc-400 mt-2">
        Antigravity Data Analytics • Hybrid RAG • Dynamic Visualizations
      </p>
    </div>
  );
};
