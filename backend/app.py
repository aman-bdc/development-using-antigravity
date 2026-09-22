import os
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from parser import parse_file, ParsedDocument
from rag_engine import RAGEngine
from data_engine import DataEngine
from agent import ChatAgent

app = FastAPI(title="Antigravity Data Chatbot API", version="1.0.0")

# Allow CORS for development (Vite frontend on 5173 / localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory storage & engines
rag_engine = RAGEngine()
data_engine = DataEngine(rag_engine.documents)
chat_agent = ChatAgent(rag_engine, data_engine)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SAMPLE_DIR = os.path.join(BASE_DIR, "sample_data")
FRONTEND_DIST = os.path.join(os.path.dirname(BASE_DIR), "frontend", "dist")


class ChatRequest(BaseModel):
    query: str
    history: Optional[List[Dict[str, str]]] = []
    api_key: Optional[str] = None
    model_name: Optional[str] = "gemini-2.5-flash"
    temperature: Optional[float] = 0.3


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "documents_count": len(rag_engine.documents),
        "chunks_count": len(rag_engine.chunks),
    }


@app.get("/api/documents")
def get_documents():
    docs = [doc.to_metadata_dict() for doc in rag_engine.documents.values()]
    return {"documents": docs, "total_count": len(docs)}


@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    parsed_results = []
    for file in files:
        try:
            content_bytes = await file.read()
            doc = parse_file(file.filename, content_bytes)
            rag_engine.add_document(doc)
            parsed_results.append(doc.to_metadata_dict())
        except Exception as e:
            print(f"Error parsing file {file.filename}: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to parse {file.filename}: {str(e)}")

    return {
        "message": f"Successfully uploaded and indexed {len(parsed_results)} file(s).",
        "documents": parsed_results,
    }


@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str):
    if doc_id not in rag_engine.documents:
        raise HTTPException(status_code=404, detail="Document not found")
    
    rag_engine.remove_document(doc_id)
    return {"message": f"Document {doc_id} deleted successfully.", "remaining_count": len(rag_engine.documents)}


@app.get("/api/documents/{doc_id}/content")
def get_document_content(doc_id: str):
    if doc_id not in rag_engine.documents:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = rag_engine.documents[doc_id]
    if doc.is_structured and doc.dataframe is not None:
        df_preview = doc.dataframe.head(50)
        return {
            "doc_id": doc_id,
            "filename": doc.filename,
            "is_structured": True,
            "columns": list(doc.dataframe.columns),
            "total_rows": len(doc.dataframe),
            "rows": df_preview.to_dict(orient="records"),
        }
    else:
        return {
            "doc_id": doc_id,
            "filename": doc.filename,
            "is_structured": False,
            "text": doc.raw_text[:5000],
            "total_chars": len(doc.raw_text),
        }


@app.post("/api/load-samples")
def load_sample_datasets():
    loaded = []
    if os.path.exists(SAMPLE_DIR):
        for fname in os.listdir(SAMPLE_DIR):
            fpath = os.path.join(SAMPLE_DIR, fname)
            if os.path.isfile(fpath):
                already_present = any(d.filename == fname for d in rag_engine.documents.values())
                if not already_present:
                    with open(fpath, "rb") as f:
                        content_bytes = f.read()
                    doc = parse_file(fname, content_bytes)
                    rag_engine.add_document(doc)
                    loaded.append(doc.to_metadata_dict())

    return {
        "message": f"Loaded {len(loaded)} sample dataset(s).",
        "loaded_documents": loaded,
        "all_documents": [doc.to_metadata_dict() for doc in rag_engine.documents.values()],
    }


@app.post("/api/chat")
def chat(req: ChatRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    response = chat_agent.answer_query(
        query=req.query,
        history=req.history,
        api_key=req.api_key,
        model_name=req.model_name or "gemini-2.5-flash",
        temperature=req.temperature if req.temperature is not None else 0.3,
    )
    return response


# If production frontend bundle exists in frontend/dist, serve it statically
if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_root():
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend index.html not found")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept /api routes
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        target_file = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(target_file):
            return FileResponse(target_file)
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="File not found")


@app.on_event("startup")
def on_startup():
    # Auto-load bundled samples on startup so first-time users have data ready immediately
    load_sample_datasets()


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    host = os.environ.get("HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=port)

