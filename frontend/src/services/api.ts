import type { DocumentFile, AppSettings, Message } from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth(): Promise<{ status: string; documents_count: number; chunks_count: number }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to connect to backend server');
    return res.json();
  },

  async getDocuments(): Promise<{ documents: DocumentFile[]; total_count: number }> {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async uploadFiles(files: File[]): Promise<{ message: string; documents: DocumentFile[] }> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to upload files');
    }
    return res.json();
  },

  async deleteDocument(docId: string): Promise<{ message: string; remaining_count: number }> {
    const res = await fetch(`${API_BASE}/documents/${docId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  async loadSampleDatasets(): Promise<{ message: string; loaded_documents: DocumentFile[]; all_documents: DocumentFile[] }> {
    const res = await fetch(`${API_BASE}/load-samples`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to load sample datasets');
    return res.json();
  },

  async getDocumentContent(docId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/documents/${docId}/content`);
    if (!res.ok) throw new Error('Failed to fetch document content');
    return res.json();
  },

  async sendMessage(
    query: string,
    history: Message[],
    settings: AppSettings
  ): Promise<any> {
    const formattedHistory = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        history: formattedHistory,
        api_key: settings.apiKey || undefined,
        model_name: settings.modelName || 'gemini-2.5-flash',
        temperature: settings.temperature,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to get response from agent');
    }
    return res.json();
  },
};
