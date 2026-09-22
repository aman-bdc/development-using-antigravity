import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from parser import parse_file
from rag_engine import RAGEngine
from data_engine import DataEngine
from agent import ChatAgent


def test_full_pipeline():
    print("=== Testing Backend Pipeline ===")
    rag = RAGEngine()
    data = DataEngine(rag.documents)
    agent = ChatAgent(rag, data)

    sample_dir = os.path.join(backend_dir, "sample_data")
    assert os.path.exists(sample_dir), "sample_data dir must exist"

    # 1. Parse CSV
    csv_path = os.path.join(sample_dir, "sales_performance.csv")
    with open(csv_path, "rb") as f:
        csv_doc = parse_file("sales_performance.csv", f.read())
    rag.add_document(csv_doc)
    print(f"Parsed CSV: {csv_doc.filename}, rows: {len(csv_doc.dataframe)}, chunks: {len(csv_doc.chunks)}")
    assert len(csv_doc.dataframe) == 24, "Expected 24 rows in sales CSV"

    # 2. Parse Markdown (Unstructured)
    md_path = os.path.join(sample_dir, "operations_guide.md")
    with open(md_path, "rb") as f:
        md_doc = parse_file("operations_guide.md", f.read())
    rag.add_document(md_doc)
    print(f"Parsed Markdown: {md_doc.filename}, chunks: {len(md_doc.chunks)}")
    assert len(md_doc.chunks) > 0, "Expected chunks in operations markdown"

    # 3. Parse JSON (Semi-structured)
    json_path = os.path.join(sample_dir, "customer_feedback.json")
    with open(json_path, "rb") as f:
        json_doc = parse_file("customer_feedback.json", f.read())
    rag.add_document(json_doc)
    print(f"Parsed JSON: {json_doc.filename}, rows: {len(json_doc.dataframe)}, chunks: {len(json_doc.chunks)}")

    # 4. Test RAG Hybrid Search
    search_res = rag.search("Zero Trust encryption AES-256")
    print(f"Search results for 'Zero Trust encryption': {len(search_res)} hits")
    assert len(search_res) > 0, "Should find matching chunks for Zero Trust"
    assert "operations_guide.md" in [r["filename"] for r in search_res], "Should cite operations_guide.md"

    # 5. Test Data Engine Aggregations & Charts
    analysis_res = data.analyze_query("Show me total revenue by region")
    assert analysis_res is not None, "Data engine should generate table and chart for revenue by region"
    print(f"Data Engine Aggregation: {analysis_res['chart_data']['title']}, points: {len(analysis_res['chart_data']['data'])}")
    assert len(analysis_res['table_data']['rows']) == 4, "Expected 4 regions (North America, Europe, Asia Pacific, Latin America)"

    # 6. Test Agent Response Generation
    resp = agent.answer_query("Show total revenue by region in a chart")
    print(f"Agent text preview:\n{resp['text'][:200]}...")
    assert resp["table_data"] is not None, "Agent should provide table data"
    assert resp["chart_data"] is not None, "Agent should provide chart data"
    assert len(resp["citations"]) > 0, "Agent should provide citations"
    print(f"Citations count: {len(resp['citations'])}")
    print(f"First citation: {resp['citations'][0]['filename']} - {resp['citations'][0]['location']}")

    # 7. Test Unstructured Policy Query
    policy_resp = agent.answer_query("What is the home office setup stipend and workation policy?")
    print(f"Policy response preview:\n{policy_resp['text'][:200]}...")
    assert len(policy_resp["citations"]) > 0, "Agent should cite operations policy"
    assert any("operations_guide.md" in c["filename"] for c in policy_resp["citations"]), "Must cite operations guide"
    assert "1,500" in policy_resp["text"] or "1500" in policy_resp["text"] or "stipend" in policy_resp["text"].lower(), "Should mention stipend"

    print("\nALL BACKEND PIPELINE TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_full_pipeline()
