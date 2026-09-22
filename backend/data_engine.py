import re
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np

from parser import ParsedDocument


class DataEngine:
    """Performs smart structured data analytics, table generation, and chart generation."""

    def __init__(self, documents: Dict[str, ParsedDocument]):
        self.documents = documents

    def get_structured_dfs(self) -> List[Tuple[str, str, pd.DataFrame]]:
        """Returns list of (doc_id, filename, dataframe) for all structured documents."""
        dfs = []
        for doc_id, doc in self.documents.items():
            if doc.is_structured and doc.dataframe is not None and not doc.dataframe.empty:
                dfs.append((doc_id, doc.filename, doc.dataframe))
        return dfs

    def analyze_query(self, query: str) -> Optional[Dict[str, Any]]:
        """Analyzes query against available structured dataframes to produce tables and charts."""
        dfs = self.get_structured_dfs()
        if not dfs:
            return None

        q_lower = query.lower()

        # Keywords indicating quantitative, analytical, tabular or visual intent
        analytical_keywords = [
            "chart", "graph", "plot", "visualize", "trend", "breakdown", "distribution",
            "compare", "table", "list", "show all", "summary", "top", "rank", "highest",
            "lowest", "most", "least", "total", "sum", "average", "avg", "mean",
            "revenue", "sales", "spend", "units", "margin", "profit", "rating", "sentiment"
        ]

        has_analytical_intent = any(w in q_lower for w in analytical_keywords)
        if not has_analytical_intent:
            return None

        for doc_id, filename, df in dfs:
            cols = [c for c in df.columns]
            num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            cat_cols = [c for c in cols if c not in num_cols]

            # 1. Match category column
            group_col = None
            for c in cat_cols:
                c_clean = c.lower().replace("_", " ")
                if c.lower() in q_lower or c_clean in q_lower:
                    group_col = c
                    break

            if not group_col:
                for c in cat_cols:
                    unique_vals = [str(v).lower() for v in df[c].dropna().unique()[:8]]
                    if any(v in q_lower for v in unique_vals if len(v) > 3):
                        group_col = c
                        break

            # 2. Match metric column (numeric)
            metric_col = None
            for c in num_cols:
                c_clean = c.lower().replace("_", " ")
                if c.lower() in q_lower or c_clean in q_lower:
                    metric_col = c
                    break

            if not metric_col and num_cols:
                aliases = {
                    "revenue": ["sales", "income", "money", "earnings", "revenue"],
                    "units_sold": ["units", "volume", "sold", "quantity"],
                    "marketing_spend": ["marketing", "spend", "ad spend", "ads"],
                    "profit_margin_pct": ["margin", "profit", "profitability"],
                    "rating": ["rating", "score", "stars", "satisfaction"],
                }
                for c in num_cols:
                    for alias, words in aliases.items():
                        if alias in c.lower() and any(w in q_lower for w in words):
                            metric_col = c
                            break
                    if metric_col:
                        break

            # Only default if user explicitly asked for chart/table/breakdown/total/average
            explicit_viz = any(w in q_lower for w in ["chart", "graph", "plot", "table", "breakdown", "compare", "summary", "total", "average"])
            if explicit_viz:
                if not group_col and cat_cols:
                    # Prefer columns like region, category, product, sentiment
                    preferred = [c for c in cat_cols if any(k in c.lower() for k in ["region", "category", "product", "sentiment", "date"])]
                    group_col = preferred[0] if preferred else cat_cols[0]
                if not metric_col and num_cols:
                    preferred = [c for c in num_cols if any(k in c.lower() for k in ["revenue", "sales", "rating", "margin"])]
                    metric_col = preferred[0] if preferred else num_cols[0]

            if group_col and metric_col:
                agg_type = "mean" if any(w in q_lower for w in ["average", "mean", "margin", "pct", "rate", "rating"]) else "sum"
                try:
                    if agg_type == "mean":
                        res = df.groupby(group_col)[metric_col].mean().round(2).reset_index()
                        agg_label = f"Avg {metric_col.replace('_', ' ').title()}"
                    else:
                        res = df.groupby(group_col)[metric_col].sum().round(2).reset_index()
                        agg_label = f"Total {metric_col.replace('_', ' ').title()}"

                    res.rename(columns={metric_col: agg_label}, inplace=True)
                    res = res.sort_values(by=agg_label, ascending=False)

                    is_time_series = any(d in group_col.lower() for d in ["date", "month", "year", "time", "day"])
                    chart_type = "line" if is_time_series else ("pie" if len(res) <= 4 and "breakdown" in q_lower else "bar")

                    table_cols = [
                        {"key": group_col, "label": group_col.replace("_", " ").title(), "type": "string"},
                        {"key": agg_label, "label": agg_label, "type": "number"},
                    ]

                    rows = res.to_dict(orient="records")
                    chart_config = {
                        "chart_type": chart_type,
                        "title": f"{agg_label} by {group_col.replace('_', ' ').title()}",
                        "x_key": group_col,
                        "y_keys": [agg_label],
                        "data": rows,
                        "description": f"Aggregated from {filename} ({len(df)} records)",
                    }

                    table_data = {
                        "title": f"Summary Table: {agg_label} by {group_col.replace('_', ' ').title()}",
                        "columns": table_cols,
                        "rows": rows,
                        "source_file": filename,
                        "total_rows": len(rows),
                    }

                    return {
                        "doc_id": doc_id,
                        "filename": filename,
                        "table_data": table_data,
                        "chart_data": chart_config,
                        "metric_label": agg_label,
                        "group_col": group_col,
                        "summary_records": rows,
                    }
                except Exception:
                    pass

            # Filter check
            filter_col = None
            filter_val = None
            for c in cat_cols:
                for val in df[c].dropna().unique():
                    if str(val).lower() in q_lower and len(str(val)) > 2:
                        filter_col = c
                        filter_val = val
                        break
                if filter_col:
                    break

            if filter_col:
                matched_df = df[df[filter_col] == filter_val]
                if not matched_df.empty:
                    preview_df = matched_df.head(15)
                    table_cols = [{"key": c, "label": c.replace("_", " ").title(), "type": "number" if c in num_cols else "string"} for c in preview_df.columns]
                    rows = preview_df.to_dict(orient="records")

                    table_data = {
                        "title": f"Records matching '{filter_val}' in {filename}",
                        "columns": table_cols,
                        "rows": rows,
                        "source_file": filename,
                        "total_rows": len(matched_df),
                    }

                    chart_config = None
                    if num_cols and len(rows) > 1:
                        top_num = num_cols[0]
                        first_cat = [c for c in preview_df.columns if c != filter_col and c not in num_cols]
                        x_k = first_cat[0] if first_cat else preview_df.columns[0]
                        chart_config = {
                            "chart_type": "bar",
                            "title": f"{top_num.replace('_', ' ').title()} for {filter_val}",
                            "x_key": x_k,
                            "y_keys": [top_num],
                            "data": preview_df[[x_k, top_num]].to_dict(orient="records"),
                            "description": f"Filtered records from {filename}",
                        }

                    return {
                        "doc_id": doc_id,
                        "filename": filename,
                        "table_data": table_data,
                        "chart_data": chart_config,
                        "summary_records": rows,
                    }

        return None
