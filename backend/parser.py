import io
import csv
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

def parse_markdown(content: str) -> Dict[str, Any]:
    """
    Parse a Markdown string into a list of sections based on headers.
    Returns structured text suitable for RAG chunking.
    """
    lines = content.split('\n')
    sections = []
    current_title = "Introduction"
    current_content = []

    for line in lines:
        if line.startswith('#'):
            if current_content:
                sections.append({
                    "title": current_title,
                    "content": "\n".join(current_content).strip()
                })
                current_content = []
            current_title = line.lstrip('#').strip()
        else:
            current_content.append(line)

    if current_content:
        sections.append({
            "title": current_title,
            "content": "\n".join(current_content).strip()
        })

    return {
        "format": "markdown",
        "sections": sections,
        "raw_text": content
    }

def parse_csv(content: str) -> Dict[str, Any]:
    """
    Parse CSV text and return summary statistics, headers, and row samples.
    """
    f = io.StringIO(content.strip())
    reader = csv.DictReader(f)
    rows = list(reader)
    if not rows:
        return {"format": "csv", "row_count": 0, "columns": [], "sample": [], "summary": {}}

    columns = list(rows[0].keys())
    
    # Calculate simple stats for numeric columns
    numeric_summaries = {}
    for col in columns:
        vals = []
        for r in rows:
            val_str = r.get(col, "").replace("$", "").replace(",", "").strip()
            try:
                vals.append(float(val_str))
            except ValueError:
                pass
        if len(vals) > len(rows) * 0.5 and len(vals) > 0:
            numeric_summaries[col] = {
                "min": round(min(vals), 2),
                "max": round(max(vals), 2),
                "avg": round(sum(vals) / len(vals), 2),
                "count": len(vals)
            }

    return {
        "format": "csv",
        "row_count": len(rows),
        "columns": columns,
        "sample": rows[:5],
        "rows": rows,
        "summary": numeric_summaries,
        "raw_text": f"CSV Dataset with {len(rows)} rows and columns: {', '.join(columns)}.\nKey Metrics:\n" + 
                    "\n".join([f"- {k}: Min={v['min']}, Max={v['max']}, Avg={v['avg']}" for k, v in numeric_summaries.items()])
    }

def parse_json(content: str) -> Dict[str, Any]:
    """
    Parse a JSON string, extract top-level structure, keys, sample records, and textual representation.
    """
    data = json.loads(content)
    if isinstance(data, list):
        record_count = len(data)
        sample = data[:3]
        keys = list(data[0].keys()) if data and isinstance(data[0], dict) else []
        summary_text = f"JSON Array containing {record_count} items. Attributes: {', '.join(keys)}."
    elif isinstance(data, dict):
        record_count = 1
        sample = data
        keys = list(data.keys())
        summary_text = f"JSON Object with keys: {', '.join(keys)}."
    else:
        record_count = 1
        sample = data
        keys = []
        summary_text = str(data)

    return {
        "format": "json",
        "record_count": record_count,
        "keys": keys,
        "sample": sample,
        "data": data,
        "raw_text": summary_text
    }

def parse_file_content(filename: str, content_bytes: bytes) -> Dict[str, Any]:
    """
    Route file parsing based on extension.
    Supported: .md, .txt, .csv, .json, .pdf (optional pypdf)
    """
    ext = filename.split('.')[-1].lower() if '.' in filename else ""
    try:
        text_content = content_bytes.decode('utf-8')
    except UnicodeDecodeError:
        try:
            text_content = content_bytes.decode('latin-1')
        except Exception:
            text_content = ""

    result = {
        "filename": filename,
        "extension": ext,
        "size_bytes": len(content_bytes),
        "timestamp": datetime.utcnow().isoformat(),
        "parsed": {}
    }

    try:
        if ext in ['md', 'txt']:
            result["parsed"] = parse_markdown(text_content)
        elif ext == 'csv':
            result["parsed"] = parse_csv(text_content)
        elif ext == 'json':
            result["parsed"] = parse_json(text_content)
        elif ext == 'pdf':
            # Basic fallback PDF extraction if pypdf or PyMuPDF is available
            try:
                import pypdf
                pdf_reader = pypdf.PdfReader(io.BytesIO(content_bytes))
                pdf_text = ""
                for page in pdf_reader.pages:
                    pdf_text += (page.extract_text() or "") + "\n"
                result["parsed"] = {
                    "format": "pdf",
                    "page_count": len(pdf_reader.pages),
                    "raw_text": pdf_text.strip()
                }
            except ImportError:
                result["parsed"] = {
                    "format": "pdf",
                    "raw_text": "PDF uploaded, but 'pypdf' is not installed for text extraction."
                }
        else:
            result["parsed"] = {
                "format": "unknown",
                "raw_text": text_content[:5000]
            }
    except Exception as e:
        logger.error(f"Error parsing file {filename}: {str(e)}")
        result["error"] = str(e)
        result["parsed"] = {"raw_text": text_content[:2000] if text_content else ""}

    return result