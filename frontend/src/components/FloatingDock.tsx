import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  UploadCloud,
  BarChart3,
  SlidersHorizontal,
  Trash2,
  PanelLeft
} from 'lucide-react';

interface FloatingDockProps {
  activeTab?: string;
  docCount: number;
  isHistoryOpen?: boolean;
  onNewChat: () => void;
  onToggleHistory?: () => void;
  onOpenHistory?: () => void;
  onOpenUpload: () => void;
  onOpenDataViewer: () => void;
  onOpenSettings: () => void;
  onClearChat: () => void;
  className?: string;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  docCount,
  isHistoryOpen = true,
  onNewChat,
  onToggleHistory,
  onOpenHistory,
  onOpenUpload,
  onOpenDataViewer,
  onOpenSettings,
  onClearChat,
  className = '',
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleToggleHistory = () => {
    if (onToggleHistory) {
      onToggleHistory();
    } else if (onOpenHistory) {
      onOpenHistory();
    }
  };

  const dockItems = [
    {
      id: 'history',
      label: isHistoryOpen ? 'Collapse Sessions' : 'Show Chat Sessions',
      icon: isHistoryOpen ? (
        <MessageSquare className="w-4 h-4 text-zinc-700" />
      ) : (
        <PanelLeft className="w-4 h-4 text-zinc-700" />
      ),
      onClick: handleToggleHistory,
      active: isHistoryOpen,
    },
    {
      id: 'new_chat',
      label: 'New Chat',
      icon: <Plus className="w-4 h-4 text-white" />,
      onClick: onNewChat,
      primary: true,
    },
    {
      id: 'upload',
      label: 'Knowledge Base',
      icon: <UploadCloud className="w-4 h-4 text-zinc-700" />,
      badge: docCount > 0 ? docCount : undefined,
      onClick: onOpenUpload,
    },
    {
      id: 'dataviewer',
      label: 'Data Inspector',
      icon: <BarChart3 className="w-4 h-4 text-zinc-700" />,
      onClick: onOpenDataViewer,
    },
    {
      id: 'settings',
      label: 'Settings & API Key',
      icon: <SlidersHorizontal className="w-4 h-4 text-zinc-700" />,
      onClick: onOpenSettings,
    },
    {
      id: 'clear',
      label: 'Clear Messages',
      icon: <Trash2 className="w-4 h-4 text-zinc-500 hover:text-red-600" />,
      onClick: onClearChat,
      danger: true,
    },
  ];

  return (
    <nav
      aria-label="Main Dock"
      className={`glass-dock px-2.5 py-1.5 rounded-full flex items-center gap-1 shadow-xs border border-zinc-200/80 ${className}`}
    >
      {dockItems.map((item) => {
        const isHovered = hoveredItem === item.id;
        return (
          <div key={item.id} className="relative flex flex-col items-center">
            {/* Top Header Tooltip (pointing upwards toward dock button) */}
            {isHovered && (
              <div className="absolute top-10.5 px-2.5 py-1 rounded-lg glass-card text-xs font-medium text-zinc-800 whitespace-nowrap shadow-md pointer-events-none animate-in fade-in zoom-in-95 duration-150 border border-zinc-200/80 z-50">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-white border-l border-t border-zinc-200" />
                {item.label}
              </div>
            )}

            {/* Dock button */}
            <button
              onClick={item.onClick}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              aria-label={item.label}
              className={`dock-item relative p-2 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                item.primary
                  ? 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-xs'
                  : item.active
                  ? 'bg-zinc-200/90 text-zinc-900 shadow-xs border border-zinc-300'
                  : 'bg-white/80 hover:bg-white text-zinc-700 border border-zinc-200/70 shadow-xs'
              }`}
            >
              {item.icon}

              {/* Badge for document count */}
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-zinc-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs border border-white">
                  {item.badge}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </nav>
  );
};
