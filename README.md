# Antigravity Data Chatbot

A modern, light monochrome glass-themed Chatbot application that empowers users to upload structured (CSV, Excel, JSON) and unstructured data (PDF, DOCX, TXT, Markdown), chat intelligently on top of their data, explore interactive tables and dynamic charts, and click inline citations to inspect source documents and exact snippet references.

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

3. **Verifiable Inline Citations & Reference Drawer**:
   - Every answer includes clickable citation badges (e.g. `[1]`, `[2]`).
   - Clicking any citation badge opens a slide-over **Reference Drawer** highlighting the exact source snippet, document type, file name, page/row numbers, and confidence score.
   - Expandable "Sources & References" card below each assistant message.

4. **Responsive & Interactive Visualizations**:
   - **Interactive Tables**: Instant search/filter, column header sorting (ascending/descending with SVG indicators), pagination, copy to clipboard, and CSV export.
   - **Interactive Charts**: Powered by Recharts. Supports Bar, Line, Area, and Pie charts with hover tooltips, legend toggles, dynamic chart-type switching, and raw data view.

5. **Aesthetics & Floating Rounded Dock**:
   - **Light Monochrome Palette**: Pure whites, frosted glass, neutral zinc accents, and deep charcoal typography.
   - **Glassmorphism**: `backdrop-blur-2xl` translucent panels, soft diffused shadows, hairline borders.
   - **Floating Rounded Dock**: macOS / visionOS inspired island dock bar pinned to the bottom center with hover micro-animations and tooltips.
   - **Strictly SVG Vector Icons**: Powered exclusively by `lucide-react` with zero emojis.

---

## Quick Start

### 1. Run the Application
Execute the single launcher script:
```bash
python run.py
```
This automatically starts the FastAPI server and serves the compiled React application at:
- **Web Application**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Development Mode (Hot Reload)
If you wish to develop with Vite hot reloading:
```bash
# Terminal 1: Backend
python -m uvicorn backend.app:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```
Then open [http://localhost:5173](http://localhost:5173).

---

## Project Structure

```
development-using-antigravity/
├── backend/
│   ├── app.py                 # FastAPI backend & static SPA router
│   ├── parser.py              # Multi-format parser (CSV, Excel, JSON, PDF, DOCX, MD)
│   ├── rag_engine.py          # BM25 & TF-IDF hybrid retrieval and indexing
│   ├── data_engine.py         # Pandas structured data queries & chart config generator
│   ├── agent.py               # Orchestrator (Gemini 2.5 Flash + Local Smart Engine)
│   ├── test_backend.py        # Automated test suite
│   ├── sample_data/           # Bundled demo datasets
│   │   ├── sales_performance.csv
│   │   ├── operations_guide.md
│   │   └── customer_feedback.json
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FloatingDock.tsx       # Floating rounded glass dock with Lucide SVG icons
│   │   │   ├── ChatMessage.tsx        # Message bubbles with markdown & embedded charts
│   │   │   ├── ChatInput.tsx          # Glass input bar with starter prompt chips
│   │   │   ├── InteractiveTable.tsx   # Sortable, searchable, paginated glass table
│   │   │   ├── InteractiveChart.tsx   # Recharts Bar/Line/Area/Pie with type switchers
│   │   │   ├── CitationBadge.tsx      # Clickable citation badge
│   │   │   ├── ReferenceDrawer.tsx    # Slide-over source reference inspector
│   │   │   ├── UploadModal.tsx        # Drag & drop upload modal with sample loaders
│   │   │   ├── KnowledgeBaseModal.tsx # Data inspector for raw tables and text chunks
│   │   │   ├── SettingsModal.tsx      # Gemini API key & model settings
│   │   │   └── HistoryDrawer.tsx      # Saved chat sessions drawer
│   │   ├── services/
│   │   │   └── api.ts                 # Backend API client
│   │   ├── types/                     # TypeScript definitions
│   │   ├── App.tsx                    # Main application component
│   │   └── index.css                  # Glassmorphism tokens & custom styles
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── run.py                     # Single-command launcher
├── Dockerfile                 # Multi-stage production container build
├── .dockerignore              # Docker build context exclusions
├── .github/workflows/
│   └── deploy-gcp-cloudrun.yml # GitHub Actions CI/CD to Google Cloud Run
└── README.md
```

---

## Deploy to Google Cloud Run (GitHub Actions)

This repository includes an automated CI/CD pipeline ([`.github/workflows/deploy-gcp-cloudrun.yml`](.github/workflows/deploy-gcp-cloudrun.yml)) that builds the multi-stage Docker container and deploys it directly to **Google Cloud Run**.

### 1. Prerequisites (GCP Setup)
1. Ensure the required APIs are enabled in your Google Cloud Project:
   ```bash
   gcloud services enable run.googleapis.com containerregistry.googleapis.com
   ```
2. Your Service Account must have the following IAM roles:
   - **Cloud Run Admin** (`roles/run.admin`): To deploy and manage Cloud Run revisions.
   - **Storage Admin** (`roles/storage.admin`): To push container images to Google Container Registry (`gcr.io`).
   - **Service Account User** (`roles/iam.serviceAccountUser`): To run the service as the Compute Engine service account.

### 2. Configure GitHub Secrets
In your GitHub repository, navigate to **Settings** → **Secrets and variables** → **Actions** → **New repository secret** and add:

| Secret Name | Required | Description |
| :--- | :--- | :--- |
| `GCP_SA_KEY` | **Yes** | The full raw JSON contents of your Google Cloud Service Account key file. |
| `GCP_PROJECT_ID` | *Optional* | Your GCP Project ID (e.g. `my-project-12345`). If omitted, it is automatically extracted from `GCP_SA_KEY`. |
| `GEMINI_API_KEY` | *Optional* | Gemini API Key if you want Gemini to be active in the cloud environment without manual client entry. |

*(Optional)* You can also set a repository variable `GCP_REGION` under **Variables** (defaults to `us-central1`).

### 3. Trigger Deployment
- **Automatic**: Push any changes to the `main` branch.
- **Manual**: Go to **Actions** → **Deploy to Google Cloud Run** → click **Run workflow**.

Once complete, the workflow will output the public live URL of your application in the GitHub Actions summary!

