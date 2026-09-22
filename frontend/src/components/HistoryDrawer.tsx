import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  PanelLeftClose,
  Clock
} from 'lucide-react';
import type { ChatSession } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
}

export const HistoryDrawer = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
}: HistoryDrawerProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-zinc-200/70 bg-white/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-bold text-zinc-900 tracking-tight">Chat Sessions</span>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
            {sessions.length}
          </span>
        </div>

        <button
          onClick={onClose}
          title="Collapse sidebar"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          {isMobile ? <X className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3 border-b border-zinc-200/50">
        <button
          onClick={() => {
            onNewChat();
            if (isMobile) onClose();
          }}
          className="w-full py-2 px-3 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-[0.99]"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {sessions.length > 0 ? (
          sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const isEditing = editingId === session.id;

            return (
              <div
                key={session.id}
                onClick={() => {
                  onSelectSession(session.id);
                  if (isMobile) onClose();
                }}
                className={`group relative p-2.5 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-between ${
                  isActive
                    ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/90 font-medium'
                    : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-zinc-900' : 'bg-transparent'}`} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(session.id, e as any);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="w-full bg-white border border-zinc-300 rounded px-1.5 py-0.5 text-xs text-zinc-900 focus:outline-hidden focus:border-zinc-500"
                    />
                  ) : (
                    <div className="truncate flex flex-col">
                      <span className="truncate">{session.title}</span>
                      {session.messages && session.messages.length > 0 && (
                        <span className="text-[10px] text-zinc-400 font-normal truncate">
                          {session.messages.length} {session.messages.length === 1 ? 'message' : 'messages'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isEditing ? (
                    <button
                      onClick={(e) => handleSaveRename(session.id, e)}
                      className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 rounded cursor-pointer"
                      title="Save"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleStartRename(session, e)}
                      className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/70 rounded cursor-pointer"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-xs text-zinc-400 flex flex-col items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-300" />
            <span>No saved conversations</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-200/60 bg-white/50 text-[11px] text-zinc-400 text-center">
        <span>Stored locally in browser</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent / Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col h-full bg-white/80 backdrop-blur-xl border-r border-zinc-200/80 transition-all duration-250 ease-in-out shrink-0 overflow-hidden ${
          isOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 pointer-events-none border-r-0'
        }`}
      >
        <div className="w-72 h-full flex flex-col">
          {renderSidebarContent(false)}
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex bg-black/25 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={onClose} />
          <div className="relative w-full max-w-xs h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
