import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  BarChart3,
  ShieldCheck,
  Bot,
  PanelLeft
} from 'lucide-react';
import type { Message, Citation, DocumentFile, ChatSession, AppSettings } from './types';
import { api } from './services/api';
import { FloatingDock } from './components/FloatingDock';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ReferenceDrawer } from './components/ReferenceDrawer';
import { UploadModal } from './components/UploadModal';
import { KnowledgeBaseModal } from './components/KnowledgeBaseModal';
import { SettingsModal } from './components/SettingsModal';
import { HistoryDrawer } from './components/HistoryDrawer';

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  modelName: 'gemini-2.5-flash',
  temperature: 0.3,
};

const DEFAULT_PROMPTS = [
  'Show total revenue by region in a bar chart',
  'What is the home office setup stipend and workation policy?',
  'Breakdown customer feedback sentiment in a table',
  'Compare marketing spend vs revenue',
];

export function App() {
  // Application State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('agy_chat_sessions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    const initialSession: ChatSession = {
      id: 'session_default',
      title: 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString(),
    };
    return [initialSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const saved = localStorage.getItem('agy_active_session_id');
    return saved || 'session_default';
  });

  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('agy_chat_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [starterPrompts, setStarterPrompts] = useState<string[]>(DEFAULT_PROMPTS);

  // Modals & Drawers
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDataViewerOpen, setIsDataViewerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Keyboard shortcut (Ctrl+B / Cmd+B) to toggle chat sessions sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsHistoryOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save sessions & settings to localStorage
  useEffect(() => {
    localStorage.setItem('agy_chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('agy_active_session_id', activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    localStorage.setItem('agy_chat_settings', JSON.stringify(settings));
  }, [settings]);

  // Initial fetch of documents & auto-load samples if empty
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.getDocuments();
        if (res.documents.length === 0) {
          const sampleRes = await api.loadSampleDatasets();
          setDocuments(sampleRes.all_documents);
        } else {
          setDocuments(res.documents);
        }
      } catch (err) {
        console.warn('Backend server not connected yet or loading samples failed:', err);
      }
    };
    fetchDocs();
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handlers
  const handleSendMessage = async (query: string) => {
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessage];
    updateActiveSessionMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await api.sendMessage(query, updatedMessages, settings);

      const assistantMessage: Message = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: response.text,
        citations: response.citations,
        table_data: response.table_data,
        chart_data: response.chart_data,
        suggested_prompts: response.suggested_prompts,
        engine_used: response.engine_used,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      updateActiveSessionMessages([...updatedMessages, assistantMessage]);

      if (response.suggested_prompts && response.suggested_prompts.length > 0) {
        setStarterPrompts(response.suggested_prompts);
      }
    } catch (err: any) {
      const errorMessage: Message = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `Error generating response: ${err.message || 'Network connection failed'}. Please ensure the backend server is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      updateActiveSessionMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateActiveSessionMessages = (newMessages: Message[]) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          let title = s.title;
          if (title === 'New Conversation' && newMessages.length > 0) {
            const firstUser = newMessages.find((m) => m.role === 'user');
            if (firstUser) {
              title = firstUser.content.slice(0, 28) + (firstUser.content.length > 28 ? '...' : '');
            }
          }
          return { ...s, messages: newMessages, title };
        }
        return s;
      })
    );
  };

  const handleNewChat = () => {
    const newId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setStarterPrompts(DEFAULT_PROMPTS);
  };

  const handleClearChat = () => {
    updateActiveSessionMessages([]);
    setStarterPrompts(DEFAULT_PROMPTS);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const fallback: ChatSession = {
          id: `session_${Date.now()}`,
          title: 'New Conversation',
          messages: [],
          createdAt: new Date().toISOString(),
        };
        setActiveSessionId(fallback.id);
        return [fallback];
      }
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s))
    );
  };

  return (
    <div className="flex h-screen overflow-hidden text-zinc-900 bg-[#fafafa]">
      {/* Integrated Collapsible Chat Sessions Sidebar (Shown by default) */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => setActiveSessionId(id)}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
      />

      {/* Main Content Column */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Top Header with Relocated Setting Dock */}
        <header className="sticky top-0 z-30 glass-panel border-b border-zinc-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {!isHistoryOpen && (
              <button
                onClick={() => setIsHistoryOpen(true)}
                title="Show Chat Sessions (Ctrl+B)"
                className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200/80 bg-white transition-all shadow-xs cursor-pointer flex items-center justify-center"
              >
                <PanelLeft className="w-4 h-4 text-zinc-700" />
              </button>
            )}

            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-zinc-900 tracking-tight">Antigravity Data Chatbot</h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                  <ShieldCheck className="w-3 h-3 text-zinc-700" />
                  {settings.apiKey ? settings.modelName : 'Local Smart Engine'}
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-zinc-500">
                Interactive Data Analytics & RAG with Document Citations
              </p>
            </div>
          </div>

          {/* Relocated Setting Dock in Top Header */}
          <div className="flex items-center">
            <FloatingDock
              docCount={documents.length}
              isHistoryOpen={isHistoryOpen}
              onNewChat={handleNewChat}
              onToggleHistory={() => setIsHistoryOpen((prev) => !prev)}
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenDataViewer={() => setIsDataViewerOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onClearChat={handleClearChat}
            />
          </div>
        </header>

        {/* Main Chat Scroll Container */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 flex flex-col">
          <main className="w-full max-w-4xl mx-auto flex-1 flex flex-col">
            {messages.length === 0 ? (
              /* Empty / Welcome Hero State */
              <div className="my-auto py-8 text-center space-y-6 max-w-xl mx-auto animate-in fade-in duration-300">
                <div className="inline-flex p-4 rounded-3xl glass-card border border-zinc-200/90 shadow-glass-sm">
                  <Sparkles className="w-8 h-8 text-zinc-800 stroke-[1.5]" />
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
                    Chat With Your Data
                  </h2>
                  <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                    Upload your structured files (CSV, Excel, JSON) or unstructured documents (PDF, DOCX, Markdown) to get instant answers with interactive charts, responsive tables, and verifiable citations.
                  </p>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  <div className="p-4 rounded-2xl glass-card border border-zinc-200/80 shadow-xs">
                    <FileSpreadsheet className="w-5 h-5 text-zinc-700 mb-2" />
                    <h4 className="text-xs font-semibold text-zinc-900">Structured Data</h4>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Automatic sums, averages, grouping, and interactive data tables.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl glass-card border border-zinc-200/80 shadow-xs">
                    <BarChart3 className="w-5 h-5 text-zinc-700 mb-2" />
                    <h4 className="text-xs font-semibold text-zinc-900">Dynamic Charts</h4>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Recharts bar, line, area, and pie charts with live tooltips.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl glass-card border border-zinc-200/80 shadow-xs">
                    <FileText className="w-5 h-5 text-zinc-700 mb-2" />
                    <h4 className="text-xs font-semibold text-zinc-900">Verified Sources</h4>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Examine referenced documents and exact snippets anytime.
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-white" />
                    <span>Upload Your Files</span>
                  </button>
                  <button
                    onClick={() => setIsDataViewerOpen(true)}
                    className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <BarChart3 className="w-4 h-4 text-zinc-700" />
                    <span>Inspect Active Data</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Message List */
              <div className="space-y-4 pb-4">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onSelectCitation={(citation) => setActiveCitation(citation)}
                    onPromptClick={handleSendMessage}
                  />
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="w-8 h-8 rounded-2xl glass-card flex items-center justify-center shrink-0 border border-zinc-200/80 shadow-xs">
                      <Bot className="w-4 h-4 text-zinc-800" />
                    </div>
                    <div className="glass-panel rounded-3xl rounded-tl-xs px-5 py-3.5 shadow-glass-sm flex items-center gap-2 text-xs text-zinc-500">
                      <div className="w-2 h-2 rounded-full bg-zinc-800 animate-ping" />
                      <span>Agent analyzing documents, calculating metrics & compiling citations...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </main>
        </div>

        {/* Chat Input Bar (Spacious, Clean, No Overlapping Dock) */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onOpenUpload={() => setIsUploadOpen(true)}
          starterPrompts={starterPrompts}
        />
      </div>

      {/* Reference Drawer (Shown when any citation card is clicked) */}
      <ReferenceDrawer
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        documents={documents}
        onDocumentsUpdated={(docs) => setDocuments(docs)}
      />

      {/* Data Viewer / Inspector Modal */}
      <KnowledgeBaseModal
        isOpen={isDataViewerOpen}
        onClose={() => setIsDataViewerOpen(false)}
        documents={documents}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => setSettings(newSettings)}
      />
    </div>
  );
}

export default App;
