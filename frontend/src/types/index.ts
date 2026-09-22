export interface Citation {
  id: number;
  doc_id: string;
  filename: string;
  file_type: string;
  location: string;
  snippet: string;
  full_content?: string;
  confidence: string;
}

export interface TableColumn {
  key: string;
  label: string;
  type?: 'string' | 'number';
}

export interface TableData {
  title: string;
  columns: TableColumn[];
  rows: Record<string, any>[];
  source_file?: string;
  total_rows?: number;
}

export interface ChartConfig {
  chart_type: 'bar' | 'line' | 'area' | 'pie';
  title: string;
  x_key: string;
  y_keys: string[];
  data: Record<string, any>[];
  description?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  table_data?: TableData;
  chart_data?: ChartConfig;
  suggested_prompts?: string[];
  engine_used?: string;
  timestamp: string;
}

export interface DocumentFile {
  doc_id: string;
  filename: string;
  file_type: string;
  is_structured: boolean;
  size_bytes: number;
  chunk_count: number;
  row_count: number;
  column_count: number;
  columns: string[];
  summary: Record<string, any>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

export interface AppSettings {
  apiKey: string;
  modelName: string;
  temperature: number;
}
