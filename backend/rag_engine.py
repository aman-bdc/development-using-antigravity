import re
import math
from typing import List, Dict, Any, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from rank_bm25 import BM25Okapi

from parser import DocumentChunk, ParsedDocument


class RAGEngine:
    def __init__(self):
        self.documents: Dict[str, ParsedDocument] = {}
        self.chunks: List[DocumentChunk] = []
        self.bm25: Optional[BM25Okapi] = None
        self.tokenized_corpus: List[List[str]] = []
        self.tfidf_vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix = None

    def add_document(self, doc: ParsedDocument):
        self.documents[doc.doc_id] = doc
        self.rebuild_index()

    def remove_document(self, doc_id: str):
        if doc_id in self.documents:
            del self.documents[doc_id]
            self.rebuild_index()

    def rebuild_index(self):
        self.chunks = []
        for doc in self.documents.values():
            self.chunks.extend(doc.chunks)

        if not self.chunks:
            self.bm25 = None
            self.tokenized_corpus = []
            self.tfidf_vectorizer = None
            self.tfidf_matrix = None
            return

        # Prepare corpus texts
        corpus_texts = [f"{c.filename} {c.location} {c.content}" for c in self.chunks]

        # 1. Tokenize for BM25
        self.tokenized_corpus = [self._tokenize(text) for text in corpus_texts]
        self.bm25 = BM25Okapi(self.tokenized_corpus)

        # 2. Fit TF-IDF
        self.tfidf_vectorizer = TfidfVectorizer(
            lowercase=True,
            stop_words="english",
            ngram_range=(1, 2),
            max_features=5000,
        )
        try:
            self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(corpus_texts)
        except Exception:
            self.tfidf_matrix = None

    def _tokenize(self, text: str) -> List[str]:
        # Lowercase and clean alphanumeric tokens
        tokens = re.findall(r"\w+", text.lower())
        return [t for t in tokens if len(t) > 1]

    def search(self, query: str, top_k: int = 6) -> List[Dict[str, Any]]:
        if not self.chunks or not query.strip():
            return []

        tokens = self._tokenize(query)
        if not tokens:
            return []

        n = len(self.chunks)
        bm25_scores = np.zeros(n)
        tfidf_scores = np.zeros(n)

        # 1. BM25 scoring
        if self.bm25:
            raw_bm25 = self.bm25.get_scores(tokens)
            max_bm25 = np.max(raw_bm25) if len(raw_bm25) > 0 and np.max(raw_bm25) > 0 else 1.0
            bm25_scores = np.array(raw_bm25) / max_bm25

        # 2. TF-IDF scoring
        if self.tfidf_vectorizer and self.tfidf_matrix is not None:
            try:
                q_vec = self.tfidf_vectorizer.transform([query])
                sims = cosine_similarity(q_vec, self.tfidf_matrix).flatten()
                tfidf_scores = sims
            except Exception:
                tfidf_scores = np.zeros(n)

        # 3. Hybrid combined score
        combined_scores = 0.55 * bm25_scores + 0.45 * tfidf_scores

        # Rank indices
        top_indices = np.argsort(combined_scores)[::-1][:top_k]

        results: List[Dict[str, Any]] = []
        for idx in top_indices:
            score = float(combined_scores[idx])
            if score <= 0.001 and len(results) >= 2:
                continue

            chunk = self.chunks[idx]
            # Form clean snippet: first 300 chars or most relevant lines
            content_lines = chunk.content.splitlines()
            snippet_lines = [l for l in content_lines if not l.startswith("File: ")][:4]
            snippet = "\n".join(snippet_lines)
            if len(snippet) > 280:
                snippet = snippet[:280] + "..."

            results.append(
                {
                    "chunk_id": chunk.chunk_id,
                    "doc_id": chunk.doc_id,
                    "filename": chunk.filename,
                    "file_type": chunk.file_type,
                    "location": chunk.location,
                    "content": chunk.content,
                    "snippet": snippet,
                    "score": round(score, 3),
                    "confidence": f"{min(99, max(45, int(score * 100)))}%",
                }
            )

        return results
