# Antigravity Data Chatbot

A modern, light monochrome glass-themed Chatbot application that empowers users to upload structured (CSV, Excel, JSON) and unstructured data (PDF, DOCX, TXT, Markdown), chat intelligently on top of their data, explore interactive tables and dynamic charts, and examine referenced documents and exact snippet references.

---

## Key Features

1. **Multi-Format Data Ingestion**:
   - **Structured Data**: CSV, TSV, Excel (`.xlsx`, `.xls`), JSON records.
   - **Unstructured Documents**: PDF, DOCX, Markdown (`.md`), and plain text (`.txt`).
   - **Knowledge Base Manager**: View active files, chunk counts, record sizes, or delete documents.
   - **Quick-Load Demo Datasets**: 1-click loading of bundled sales CSV, corporate operations Markdown, and customer feedback JSON.

2. **Intelligent Dual-Engine Chat**:
   - **Local Smart Engine (Offline / Keyless)**: Works immediately out of the box with zero setup. Performs BM25 hybrid ranking, Pandas structured aggregations (sums, averages, grouping), and citation extraction.
   - **Google Gemini Engine**: Seamless integration with `gemini-2.5-flash`, `gemini-1.5-flash`, or `gemini-1.5-pro` via the Settings modal or `.env`.

3. **Persistent Left Sidebar & Top Header Dock**:
   - **Collapsible Chat Sessions Sidebar**: Visible by default on desktop with session rename/delete actions and `Ctrl+B` toggle shortcut.
   - **Top Header Dock**: Relocated from bottom of screen into a sleek glass toolbar capsule in the top header.
   - **Taller Multi-Line Input Box**: Spacious multi-line starting height with dedicated bottom utility bar.

4. **Verifiable Citations & Reference Drawer**:
   - Sources grouped in the **Referenced Documents** section at the bottom of messages without distracting inline tags.
   - Clicking any source item opens a slide-over **Reference Drawer** highlighting the exact source snippet, document type, file name, page/row numbers, and confidence score.

5. **Responsive & Interactive Visualizations**:
   - **Interactive Tables**: Instant search/filter, column header sorting (ascending/descending with SVG indicators), pagination, copy to clipboard, and CSV export.
   - **Interactive Charts**: Powered by Recharts. Supports Bar, Line, Area, and Pie charts with hover tooltips, legend toggles, dynamic chart-type switching, and raw data view.

---

## Quick Start

### 1. Run the Application
Execute the single launcher script:
```bash
python run.py
```
This automatically starts the FastAPI server and serves the compiled React application at:
- **Web Application**: [http://127.0.0.1:8080](http://127.0.0.1:8080)
- **Interactive API Docs**: [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs)

### 2. Development Mode (Hot Reload)
```bash
# Terminal 1: Backend
python backend/app.py

# Terminal 2: Frontend
cd frontend
npm run dev
```
Then open [http://localhost:5173](http://localhost:5173).
