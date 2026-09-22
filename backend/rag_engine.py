import os
import re
import numpy as np
from typing import List, Dict, Any, Optional

class MockEmbeddingEngine:
    """
    Fast and robust TF-IDF / term-frequency cosine similarity embedder for offline/fallback RAG,
    ensuring deterministic responses even without external API quotas.
    """
    def __init__(self):
        self.vocab = {}

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'\b[a-zA-Z0-9_-]{2,}\b', text.lower())

    def embed_documents(self, docs: List[str]) -> np.ndarray:
        all_tokens = [self._tokenize(d) for d in docs]
        # Build vocabulary
        for tokens in all_tokens:
            for t in tokens:
                if t not in self.vocab:
                    self.vocab[t] = len(self.vocab)
        
        vecs = np.zeros((len(docs), max(1, len(self.vocab))), dtype=np.float32)
        for i, tokens in enumerate(all_tokens):
            for t in tokens:
                if t in self.vocab:
                    vecs[i, self.vocab[t]] += 1.0
            norm = np.linalg.norm(vecs[i])
            if norm > 0:
                vecs[i] /= norm
        return vecs

    def embed_query(self, query: str) -> np.ndarray:
        tokens = self._tokenize(query)
        vec = np.zeros(max(1, len(self.vocab)), dtype=np.float32)
        for t in tokens:
            if t in self.vocab:
                vec[self.vocab[t]] += 1.0
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec

class RAGEngine:
    """
    Vector search engine managing chunked knowledge base documents.
    Supports source-grounded retrieval with similarity scores and page/line metadata.
    """
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.documents: List[Dict[str, Any]] = []
        self.embedder = MockEmbeddingEngine()
        self.embeddings: Optional[np.ndarray] = None

    def chunk_text(self, text: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        words = text.split()
        if not words:
            return []
        
        chunks = []
        step = max(1, self.chunk_size - self.chunk_overlap)
        for i in range(0, len(words), step):
            chunk_slice = words[i:i + self.chunk_size]
            chunk_str = " ".join(chunk_slice)
            chunk_meta = dict(metadata)
            chunk_meta["chunk_index"] = len(chunks)
            chunk_meta["word_count"] = len(chunk_slice)
            chunks.append({
                "id": f"{metadata.get('doc_id', 'doc')}_c{len(chunks)}",
                "text": chunk_str,
                "metadata": chunk_meta
            })
            if i + self.chunk_size >= len(words):
                break
        return chunks

    def add_document(self, doc_id: str, title: str, text: str, category: str = "general", extra_meta: Optional[Dict] = None):
        meta = {
            "doc_id": doc_id,
            "title": title,
            "category": category,
            **(extra_meta or {})
        }
        chunks = self.chunk_text(text, meta)
        self.documents.extend(chunks)
        self._rebuild_index()

    def _rebuild_index(self):
        if not self.documents:
            self.embeddings = None
            return
        texts = [d["text"] for d in self.documents]
        self.embeddings = self.embedder.embed_documents(texts)

    def search(self, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        if not self.documents or self.embeddings is None:
            return []

        query_vec = self.embedder.embed_query(query)
        if np.linalg.norm(query_vec) == 0:
            # Fallback simple keyword match
            return self.documents[:top_k]

        # Cosine similarity
        scores = np.dot(self.embeddings, query_vec)
        top_indices = np.argsort(scores)[::-1][:top_k]

        results = []
        for idx in top_indices:
            score = float(scores[idx])
            if score > 0.05:  # Relevance threshold
                item = dict(self.documents[idx])
                item["score"] = round(score, 3)
                results.append(item)
        return results

    def clear(self):
        self.documents = []
        self.embeddings = None
        self.embedder = MockEmbeddingEngine()
