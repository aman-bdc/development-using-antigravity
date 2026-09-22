import os
import json
import re
from typing import List, Dict, Any, Optional
import requests

from parser import ParsedDocument
from rag_engine import RAGEngine
from data_engine import DataEngine


class ChatAgent:
    def __init__(self, rag_engine: RAGEngine, data_engine: DataEngine):
        self.rag_engine = rag_engine
        self.data_engine = data_engine

    def answer_query(
        self,
        query: str,
        history: Optional[List[Dict[str, str]]] = None,
        api_key: Optional[str] = None,
        model_name: str = "gemini-2.5-flash",
        temperature: float = 0.3,
    ) -> Dict[str, Any]:
        history = history or []
        
        # 1. Retrieve RAG chunks
        retrieved_chunks = self.rag_engine.search(query, top_k=5)
        
        # 2. Check for structured analytics & charts
        structured_analysis = self.data_engine.analyze_query(query)

        # Prepare citations list
        citations: List[Dict[str, Any]] = []
        for idx, chunk in enumerate(retrieved_chunks):
            cit_id = idx + 1
            citations.append(
                {
                    "id": cit_id,
                    "doc_id": chunk["doc_id"],
                    "filename": chunk["filename"],
                    "file_type": chunk["file_type"],
                    "location": chunk["location"],
                    "snippet": chunk["snippet"],
                    "full_content": chunk["content"],
                    "confidence": chunk["confidence"],
                }
            )

        # If we have structured analysis from a dataset not in RAG top chunks, add a citation for it
        table_data = structured_analysis.get("table_data") if structured_analysis else None
        chart_data = structured_analysis.get("chart_data") if structured_analysis else None

        if structured_analysis and structured_analysis.get("filename"):
            source_file = structured_analysis["filename"]
            already_cited = any(c["filename"] == source_file for c in citations)
            if not already_cited:
                cit_id = len(citations) + 1
                citations.append(
                    {
                        "id": cit_id,
                        "doc_id": structured_analysis.get("doc_id", "struct_1"),
                        "filename": source_file,
                        "file_type": "structured/dataset",
                        "location": f"Tabular Aggregation ({len(table_data.get('rows', []))} rows)",
                        "snippet": f"Derived summary from {source_file}: {table_data.get('title') if table_data else 'Records'}",
                        "full_content": f"Calculated metric: {structured_analysis.get('metric_label')} across {structured_analysis.get('group_col')}",
                        "confidence": "98%",
                    }
                )

        # Check API key from argument or environment
        effective_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_KEY") or os.environ.get("GOOGLE_API_KEY")

        if effective_key:
            try:
                ai_response = self._call_gemini(
                    query=query,
                    history=history,
                    citations=citations,
                    table_data=table_data,
                    chart_data=chart_data,
                    api_key=effective_key,
                    model_name=model_name,
                    temperature=temperature,
                )
                if ai_response:
                    return ai_response
            except Exception as e:
                print(f"[Agent] Gemini call failed ({e}), falling back to Local Smart Engine.")

        # Fallback: Local Smart Agent
        return self._local_smart_answer(
            query=query,
            citations=citations,
            table_data=table_data,
            chart_data=chart_data,
        )

    def _call_gemini(
        self,
        query: str,
        history: List[Dict[str, str]],
        citations: List[Dict[str, Any]],
        table_data: Optional[Dict[str, Any]],
        chart_data: Optional[Dict[str, Any]],
        api_key: str,
        model_name: str,
        temperature: float,
    ) -> Optional[Dict[str, Any]]:
        context_blocks = []
        for c in citations:
            context_blocks.append(
                f"[Source {c['id']}] (File: {c['filename']}, Location: {c['location']})\n{c['full_content']}"
            )
        context_str = "\n\n".join(context_blocks)

        system_instruction = (
            "You are an expert AI data analyst and research agent. Answer the user's question accurately using ONLY the provided sources.\n"
            "Rules for Citations:\n"
            "1. When stating facts, numbers, policies, or quotes, cite the source using the exact format `[^1]`, `[^2]`, etc.\n"
            "2. Ensure citations directly reference the [Source N] items provided.\n"
            "3. Format your response cleanly using Markdown (clear headings, bullet points, and bold text).\n"
            "4. Be concise, objective, and professional.\n"
            "5. If the provided sources do not contain sufficient info, state what is available and clarify what is missing."
        )

        user_prompt = f"Retrieved Context:\n{context_str}\n\nUser Question: {query}"
        if table_data:
            user_prompt += f"\n\nPrecomputed Data Table:\n{json.dumps(table_data.get('rows', [])[:10])}"

        generated_text = ""
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            resp = client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config={"system_instruction": system_instruction, "temperature": temperature},
            )
            generated_text = resp.text
        except Exception:
            clean_model = model_name if "/" not in model_name else model_name.split("/")[-1]
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={api_key}"
            payload = {
                "system_instruction": {"parts": [{"text": system_instruction}]},
                "contents": [{"parts": [{"text": user_prompt}]}],
                "generationConfig": {"temperature": temperature},
            }
            res = requests.post(url, json=payload, timeout=25)
            if res.status_code == 200:
                data = res.json()
                generated_text = data["candidates"][0]["content"]["parts"][0]["text"]
            else:
                raise RuntimeError(f"Gemini REST error {res.status_code}: {res.text}")

        suggested = self._generate_suggested_prompts(query, citations, table_data)

        return {
            "text": generated_text,
            "citations": citations,
            "table_data": table_data,
            "chart_data": chart_data,
            "suggested_prompts": suggested,
            "engine_used": f"Gemini ({model_name})",
        }

    def _local_smart_answer(
        self,
        query: str,
        citations: List[Dict[str, Any]],
        table_data: Optional[Dict[str, Any]],
        chart_data: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Provides an immediate, high-accuracy response with citations and data tables even without an API key."""
        q_lower = query.lower()
        has_docs = len(self.rag_engine.documents) > 0

        if not has_docs:
            return {
                "text": "No documents or datasets have been uploaded yet. Please upload a file (CSV, Excel, JSON, PDF, DOCX, Markdown) or click **Load Sample Data** below to get started!",
                "citations": [],
                "table_data": None,
                "chart_data": None,
                "suggested_prompts": [
                    "Load sample sales data",
                    "How do I upload a PDF or CSV?",
                    "What file formats are supported?",
                ],
                "engine_used": "Local Smart Engine",
            }

        # If tabular analytics was generated
        if table_data and chart_data:
            metric = chart_data.get("title", "Metric Summary")
            rows = table_data.get("rows", [])
            top_item = rows[0] if rows else {}
            group_k = chart_data.get("x_key", "")
            val_k = chart_data.get("y_keys", [""])[0]

            top_val = top_item.get(val_k, "N/A")
            top_cat = top_item.get(group_k, "N/A")

            source_num = 1
            for c in citations:
                if c["filename"] == table_data.get("source_file"):
                    source_num = c["id"]
                    break

            text = f"### Data Analysis: {metric}\n\n"
            text += f"Here is the aggregated breakdown based on **{table_data.get('source_file')}**:\n\n"
            if top_cat != "N/A":
                text += f"- **Top Performer**: **{top_cat}** leads with **{top_val}**.\n"
            text += f"- **Total Categories**: Analyzed **{len(rows)}** groups across the dataset.\n"
            text += f"- **Interactive Visualization**: Review the dynamic chart and detailed table below."

            return {
                "text": text,
                "citations": citations,
                "table_data": table_data,
                "chart_data": chart_data,
                "suggested_prompts": [
                    "Compare marketing spend across regions",
                    "Show profit margins by category",
                    "What was the highest grossing transaction?",
                ],
                "engine_used": "Local Smart Engine",
            }

        # If unstructured document match
        if citations:
            best = citations[0]
            text = f"Based on **{best['filename']}** ({best['location']}):\n\n"

            # Parse lines from full_content of the best citations to pull relevant statements
            query_words = set(re.findall(r"\w+", q_lower))
            extracted_points = []

            for cit in citations[:3]:
                cit_id = cit["id"]
                content_lines = [l.strip() for l in cit["full_content"].splitlines() if l.strip() and not l.startswith("File:")]
                for line in content_lines:
                    if line.startswith("#"):
                        continue
                    # Check overlap with query
                    line_words = set(re.findall(r"\w+", line.lower()))
                    overlap = query_words.intersection(line_words)
                    clean_line = line.lstrip("-*• ").strip()
                    if clean_line and (len(overlap) >= 1 or len(extracted_points) < 2):
                        point_text = f"- {clean_line}"
                        if point_text not in extracted_points:
                            extracted_points.append(point_text)
                    if len(extracted_points) >= 5:
                        break
                    if len(extracted_points) >= 5:
                        break

            if extracted_points:
                text += "\n".join(extracted_points) + "\n\n"
            else:
                text += f"{best['snippet']}\n\n"

            text += "Inspect the **Referenced Documents** section below to examine complete source passages."

            suggested = self._generate_suggested_prompts(query, citations, table_data)

            return {
                "text": text,
                "citations": citations,
                "table_data": table_data,
                "chart_data": chart_data,
                "suggested_prompts": suggested,
                "engine_used": "Local Smart Engine",
            }

        return {
            "text": "I could not locate specific information matching your query in the currently uploaded documents. Try rephrasing your query or checking that the relevant document is uploaded.",
            "citations": [],
            "table_data": None,
            "chart_data": None,
            "suggested_prompts": [
                "Show overview of uploaded files",
                "Summarize overall company policy",
                "Show sales by region",
            ],
            "engine_used": "Local Smart Engine",
        }

    def _generate_suggested_prompts(
        self,
        query: str,
        citations: List[Dict[str, Any]],
        table_data: Optional[Dict[str, Any]],
    ) -> List[str]:
        suggestions = []
        for c in citations:
            fname = c["filename"].lower()
            if "sales" in fname:
                suggestions.extend(["Show sales breakdown by region", "What is the average profit margin?"])
            elif "operation" in fname or "guide" in fname or "policy" in fname:
                suggestions.extend(["What are the customer support SLAs?", "Explain the remote work stipend"])
            elif "feedback" in fname:
                suggestions.extend(["Show customer sentiment breakdown", "List negative feedback comments"])

        if not suggestions:
            suggestions = [
                "Show overview of uploaded files",
                "Summarize the key insights",
                "Generate a comparison chart",
            ]

        seen = set()
        deduped = []
        for s in suggestions:
            if s not in seen and s.lower() != query.lower():
                seen.add(s)
                deduped.append(s)
            if len(deduped) >= 3:
                break
        return deduped
