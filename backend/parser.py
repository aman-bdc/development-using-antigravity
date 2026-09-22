import os
import io
import json
import uuid
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd

try:
    import pypdf
except ImportError:
    try:
        import PyPDF2 as pypdf
    except ImportError:
        pypdf = None

try:
    import docx
except ImportError:
    docx = None


class DocumentChunk:
    def __init__(
        self,
        chunk_id: str,
        doc_id: str,
        filename: str,
        file_type: str,
        location: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.chunk_id = chunk_id
        self.doc_id = doc_id
        self.filename = filename
        self.file_type = file_type
        self.location = location
        self.content = content
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "doc_id": self.doc_id,
            "filename": self.filename,
            "file_type": self.file_type,
            "location": self.location,
            "content": self.content,
            "metadata": self.metadata,
        }


class ParsedDocument:
    def __init__(
        self,
        doc_id: str,
        filename: str,
        file_type: str,
        is_structured: bool,
        size_bytes: int,
        chunks: List[DocumentChunk],
        dataframe: Optional[pd.DataFrame] = None,
        summary: Optional[Dict[str, Any]] = None,
        raw_text: Optional[str] = None,
    ):
        self.doc_id = doc_id
        self.filename = filename
        self.file_type = file_type
        self.is_structured = is_structured
        self.size_bytes = size_bytes
        self.chunks = chunks
        self.dataframe = dataframe
        self.summary = summary or {}
        self.raw_text = raw_text or ""

    def to_metadata_dict(self) -> Dict[str, Any]:
        return {
            "doc_id": self.doc_id,
            "filename": self.filename,
            "file_type": self.file_type,
            "is_structured": self.is_structured,
            "size_bytes": self.size_bytes,
            "chunk_count": len(self.chunks),
            "row_count": len(self.dataframe) if self.dataframe is not None else 0,
            "column_count": len(self.dataframe.columns) if self.dataframe is not None else 0,
            "columns": list(self.dataframe.columns) if self.dataframe is not None else [],
            "summary": self.summary,
        }


def parse_file(filename: str, content_bytes: bytes) -> ParsedDocument:
    doc_id = str(uuid.uuid4())[:8]
    ext = os.path.splitext(filename)[1].lower()
    size_bytes = len(content_bytes)

    if ext in [".csv", ".tsv"]:
        return _parse_csv(doc_id, filename, content_bytes, ext)
    elif ext in [".xlsx", ".xls"]:
        return _parse_excel(doc_id, filename, content_bytes, ext)
    elif ext == ".json":
        return _parse_json(doc_id, filename, content_bytes, ext)
    elif ext == ".pdf":
        return _parse_pdf(doc_id, filename, content_bytes, ext)
    elif ext == ".docx":
        return _parse_docx(doc_id, filename, content_bytes, ext)
    elif ext in [".md", ".markdown", ".txt", ".log"]:
        return _parse_text(doc_id, filename, content_bytes, ext)
    else:
        # Fallback treat as text
        return _parse_text(doc_id, filename, content_bytes, ext)


def _parse_csv(doc_id: str, filename: str, content_bytes: bytes, ext: str) -> ParsedDocument:
    sep = "\t" if ext == ".tsv" else ","
    try:
        df = pd.read_csv(io.BytesIO(content_bytes), sep=sep)
    except Exception:
        df = pd.read_csv(io.BytesIO(content_bytes), sep=sep, encoding="latin-1")

    # Generate summary
    summary = {
        "columns": [str(c) for c in df.columns],
        "dtypes": {str(k): str(v) for k, v in df.dtypes.items()},
        "total_rows": len(df),
        "preview": df.head(5).to_dict(orient="records"),
    }

    chunks: List[DocumentChunk] = []
    # 1. Add schema/summary chunk
    schema_desc = f"Document: {filename} (Tabular CSV/TSV Dataset)\nTotal Rows: {len(df)}\nColumns: {', '.join(df.columns)}\n"
    # Basic numeric summaries
    numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
    if numeric_cols:
        stats = df[numeric_cols].describe().round(2).to_dict()
        schema_desc += f"Numeric Stats: {json.dumps(stats)}\n"

    chunks.append(
        DocumentChunk(
            chunk_id=f"{doc_id}_summary",
            doc_id=doc_id,
            filename=filename,
            file_type="structured/csv",
            location="Dataset Overview & Schema",
            content=schema_desc,
            metadata={"type": "schema", "columns": list(df.columns)},
        )
    )

    # 2. Chunk rows in batches of 5-10 for granular retrieval
    batch_size = 5
    for i in range(0, len(df), batch_size):
        batch = df.iloc[i : i + batch_size]
        start_row = i + 1
        end_row = min(i + batch_size, len(df))
        loc = f"Row {start_row}-{end_row}" if start_row != end_row else f"Row {start_row}"
        
        # Format chunk content as readable markdown/key-value text
        rows_text = []
        for idx, row in batch.iterrows():
            row_items = [f"{col}: {row[col]}" for col in df.columns if pd.notna(row[col])]
            rows_text.append(f"[Row {idx + 1}] " + ", ".join(row_items))
        
        chunk_content = f"File: {filename} | {loc}\n" + "\n".join(rows_text)
        chunks.append(
            DocumentChunk(
                chunk_id=f"{doc_id}_row_{start_row}_{end_row}",
                doc_id=doc_id,
                filename=filename,
                file_type="structured/csv",
                location=loc,
                content=chunk_content,
                metadata={"start_row": start_row, "end_row": end_row},
            )
        )

    return ParsedDocument(
        doc_id=doc_id,
        filename=filename,
        file_type="csv" if ext == ".csv" else "tsv",
        is_structured=True,
        size_bytes=len(content_bytes),
        chunks=chunks,
        dataframe=df,
        summary=summary,
        raw_text=df.to_string(),
    )


def _parse_excel(doc_id: str, filename: str, content_bytes: bytes, ext: str) -> ParsedDocument:
    df = pd.read_excel(io.BytesIO(content_bytes))
    summary = {
        "columns": [str(c) for c in df.columns],
        "dtypes": {str(k): str(v) for k, v in df.dtypes.items()},
        "total_rows": len(df),
        "preview": df.head(5).to_dict(orient="records"),
    }

    chunks: List[DocumentChunk] = []
    schema_desc = f"Document: {filename} (Excel Spreadsheet)\nTotal Rows: {len(df)}\nColumns: {', '.join(df.columns)}\n"
    numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
    if numeric_cols:
        stats = df[numeric_cols].describe().round(2).to_dict()
        schema_desc += f"Numeric Stats: {json.dumps(stats)}\n"

    chunks.append(
        DocumentChunk(
            chunk_id=f"{doc_id}_summary",
            doc_id=doc_id,
            filename=filename,
            file_type="structured/excel",
            location="Workbook Overview",
            content=schema_desc,
            metadata={"type": "schema", "columns": list(df.columns)},
        )
    )

    batch_size = 5
    for i in range(0, len(df), batch_size):
        batch = df.iloc[i : i + batch_size]
        start_row = i + 1
        end_row = min(i + batch_size, len(df))
        loc = f"Row {start_row}-{end_row}" if start_row != end_row else f"Row {start_row}"
        
        rows_text = []
        for idx, row in batch.iterrows():
            row_items = [f"{col}: {row[col]}" for col in df.columns if pd.notna(row[col])]
            rows_text.append(f"[Row {idx + 1}] " + ", ".join(row_items))
        
        chunk_content = f"File: {filename} | {loc}\n" + "\n".join(rows_text)
        chunks.append(
            DocumentChunk(
                chunk_id=f"{doc_id}_row_{start_row}_{end_row}",
                doc_id=doc_id,
                filename=filename,
                file_type="structured/excel",
                location=loc,
                content=chunk_content,
                metadata={"start_row": start_row, "end_row": end_row},
            )
        )

    return ParsedDocument(
        doc_id=doc_id,
        filename=filename,
        file_type="excel",
        is_structured=True,
        size_bytes=len(content_bytes),
        chunks=chunks,
        dataframe=df,
        summary=summary,
        raw_text=df.to_string(),
    )


def _parse_json(doc_id: str, filename: str, content_bytes: bytes, ext: str) -> ParsedDocument:
    raw_str = content_bytes.decode("utf-8", errors="replace")
    parsed_json = json.loads(raw_str)

    df: Optional[pd.DataFrame] = None
    is_structured = False
    chunks: List[DocumentChunk] = []

    if isinstance(parsed_json, list) and len(parsed_json) > 0 and isinstance(parsed_json[0], dict):
        # Tabular-like list of records
        try:
            df = pd.DataFrame(parsed_json)
            is_structured = True
        except Exception:
            df = None

    if df is not None and is_structured:
        summary = {
            "columns": [str(c) for c in df.columns],
            "total_rows": len(df),
            "preview": df.head(5).to_dict(orient="records"),
        }
        chunks.append(
            DocumentChunk(
                chunk_id=f"{doc_id}_summary",
                doc_id=doc_id,
                filename=filename,
                file_type="structured/json",
                location="JSON Records Overview",
                content=f"Document: {filename} (JSON Array with {len(df)} items)\nFields: {', '.join(df.columns)}",
                metadata={"type": "schema"},
            )
        )

        for idx, item in enumerate(parsed_json):
            item_text = json.dumps(item, indent=2)
            loc = f"Record #{idx + 1}"
            if "id" in item:
                loc += f" ({item['id']})"
            chunks.append(
                DocumentChunk(
                    chunk_id=f"{doc_id}_rec_{idx}",
                    doc_id=doc_id,
                    filename=filename,
                    file_type="structured/json",
                    location=loc,
                    content=f"File: {filename} | {loc}\n{item_text}",
                    metadata={"record_index": idx},
                )
            )
    else:
        # Hierarchical or general JSON
        summary = {"type": "hierarchical_json", "size": len(raw_str)}
        # Split into readable sections
        sections = _chunk_text_string(raw_str, max_chars=800, overlap=100)
        for idx, sec in enumerate(sections):
            chunks.append(
                DocumentChunk(
                    chunk_id=f"{doc_id}_part_{idx}",
                    doc_id=doc_id,
                    filename=filename,
                    file_type="unstructured/json",
                    location=f"Section {idx + 1}",
                    content=f"File: {filename} | Section {idx + 1}\n{sec}",
                    metadata={"chunk_index": idx},
                )
            )

    return ParsedDocument(
        doc_id=doc_id,
        filename=filename,
        file_type="json",
        is_structured=is_structured,
        size_bytes=len(content_bytes),
        chunks=chunks,
        dataframe=df,
        summary=summary,
        raw_text=raw_str,
    )


def _parse_pdf(doc_id: str, filename: str, content_bytes: bytes, ext: str) -> ParsedDocument:
    chunks: List[DocumentChunk] = []
    full_text = []

    if pypdf is not None:
        reader = pypdf.PdfReader(io.BytesIO(content_bytes))
        num_pages = len(reader.pages)
        for page_idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            full_text.append(f"--- Page {page_idx + 1} ---\n{page_text}")
            if page_text.strip():
                # Split page into chunks if large
                page_chunks = _chunk_text_string(page_text, max_chars=700, overlap=100)
                for c_idx, c_text in enumerate(page_chunks):
                    loc = f"Page {page_idx + 1}" if len(page_chunks) == 1 else f"Page {page_idx + 1}, Part {c_idx + 1}"
                    chunks.append(
                        DocumentChunk(
                            chunk_id=f"{doc_id}_p{page_idx + 1}_c{c_idx}",
                            doc_id=doc_id,
                            filename=filename,
                            file_type="unstructured/pdf",
                            location=loc,
                            content=f"File: {filename} | {loc}\n{c_text}",
                            metadata={"page": page_idx + 1, "part": c_idx + 1},
                        )
                    )
    else:
        num_pages = 1
        full_text.append("PDF reading library not available.")

    combined = "\n\n".join(full_text)
    summary = {"pages": num_pages, "characters": len(combined)}
    return ParsedDocument(
        doc_id=doc_id,
        filename=filename,
        file_type="pdf",
        is_structured=False,
        size_bytes=len(content_bytes),
        chunks=chunks,
        summary=summary,
        raw_text=combined,
    )


def _parse_docx(doc_id: str, filename: str, content_bytes: bytes, ext: str) -> ParsedDocument:
    chunks: List[DocumentChunk] = []
    paragraphs = []

    if docx is not None:
        doc = docx.Document(io.BytesIO(content_bytes))
        for p in doc.paragraphs:
            if p.text.strip():
                paragraphs.append(p.text.strip())

    combined = "\n\n".join(paragraphs)
    text_chunks = _chunk_text_string(combined, max_chars=700, overlap=100)
    for idx, c_text in enumerate(text_chunks):
        loc = f"Paragraph block {idx + 1}"
        chunks.append(
            DocumentChunk(
                chunk_id=f"{doc_id}_para_{idx}",
                doc_id=doc_id,
                filename=filename,
                file_type="unstructured/docx",
                location=loc,
                content=f"File: {filename} | {loc}\n{c_text}",
                metadata={"block_index": idx + 1},
            )
        )

    summary = {"paragraphs": len(paragraphs), "characters": len(combined)}
    return ParsedDocument(
        doc_id=doc_id,
        filename=filename,
        file_type="docx",
        is_structured=False,
        size_bytes=len(content_bytes),
        chunks=chunks,
        summary=summary,
        raw_text=combined,
    )


def _parse_text(doc_id: str, filename: str, content_bytes: bytes, ext: str) -> ParsedDocument:
    raw_str = content_bytes.decode("utf-8", errors="replace")
    chunks: List[DocumentChunk] = []

    # If markdown, try to split by headers
    if ext in [".md", ".markdown"]:
        sections = _chunk_markdown(raw_str)
    else:
        sections = _chunk_text_string(raw_str, max_chars=700, overlap=100)

    for idx, (title, text) in enumerate(sections):
        loc = title if title else f"Section {idx + 1}"
        chunks.append(
            DocumentChunk(
                chunk_id=f"{doc_id}_sec_{idx}",
                doc_id=doc_id,
                filename=filename,
                file_type="unstructured/markdown" if "md" in ext else "unstructured/text",
                location=loc,
                content=f"File: {filename} | {loc}\n{text}",
                metadata={"section_index": idx + 1, "title": title},
            )
        )

    summary = {"sections": len(sections), "characters": len(raw_str)}
    return ParsedDocument(
        doc_id=doc_id,
        filename=filename,
        file_type="markdown" if "md" in ext else "text",
        is_structured=False,
        size_bytes=len(content_bytes),
        chunks=chunks,
        summary=summary,
        raw_text=raw_str,
    )


def _chunk_text_string(text: str, max_chars: int = 700, overlap: int = 100) -> List[str]:
    chunks = []
    text = text.strip()
    if not text:
        return chunks

    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        # Try to break on newline or period if possible
        if end < len(text):
            last_break = max(text.rfind("\n", start, end), text.rfind(". ", start, end))
            if last_break > start + 200:
                end = last_break + 1
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap if end < len(text) else len(text)
    return chunks


def _chunk_markdown(md_text: str) -> List[Tuple[str, str]]:
    lines = md_text.splitlines()
    sections: List[Tuple[str, str]] = []
    current_title = "Introduction"
    current_lines = []

    for line in lines:
        if line.startswith("#"):
            if current_lines:
                sections.append((current_title, "\n".join(current_lines).strip()))
                current_lines = []
            current_title = line.lstrip("#").strip()
        current_lines.append(line)

    if current_lines:
        sections.append((current_title, "\n".join(current_lines).strip()))

    # If sections are empty or just 1 huge section, fall back to sub-chunking
    expanded = []
    for title, text in sections:
        if len(text) > 900:
            sub_chunks = _chunk_text_string(text, max_chars=700, overlap=100)
            for i, sc in enumerate(sub_chunks):
                sub_title = f"{title} (Part {i+1})" if len(sub_chunks) > 1 else title
                expanded.append((sub_title, sc))
        else:
            if text.strip():
                expanded.append((title, text))

    return expanded if expanded else [("Document", md_text)]
