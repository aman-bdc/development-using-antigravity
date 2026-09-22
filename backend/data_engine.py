import os
import json
import logging
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class DataEngine:
    """
    Processes structured datasets (CSV, JSON), generates summaries, detects schema,
    and returns analytical charts and query slices.
    """
    def __init__(self):
        self.datasets: Dict[str, pd.DataFrame] = {}
        self.metadata: Dict[str, Dict[str, Any]] = {}

    def register_dataframe(self, name: str, df: pd.DataFrame, source: str = "upload"):
        self.datasets[name] = df
        
        columns_info = []
        for col in df.columns:
            col_type = str(df[col].dtype)
            unique_count = int(df[col].nunique())
            null_count = int(df[col].isnull().sum())
            sample_val = df[col].dropna().iloc[0] if not df[col].dropna().empty else None
            
            # Format python native types
            if isinstance(sample_val, (np.int64, np.int32)):
                sample_val = int(sample_val)
            elif isinstance(sample_val, (np.float64, np.float32)):
                sample_val = float(sample_val)
            
            columns_info.append({
                "name": col,
                "type": col_type,
                "unique_values": unique_count,
                "null_values": null_count,
                "sample": sample_val
            })

        self.metadata[name] = {
            "name": name,
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": columns_info,
            "source": source
        }

    def load_csv_string(self, name: str, csv_content: str):
        import io
        df = pd.read_csv(io.StringIO(csv_content))
        self.register_dataframe(name, df, source="csv_text")

    def load_json_records(self, name: str, json_content: Any):
        if isinstance(json_content, str):
            json_content = json.loads(json_content)
        df = pd.json_normalize(json_content)
        self.register_dataframe(name, df, source="json_records")

    def get_summary(self, dataset_name: Optional[str] = None) -> Dict[str, Any]:
        if dataset_name and dataset_name in self.metadata:
            return self.metadata[dataset_name]
        return {
            "total_datasets": len(self.datasets),
            "datasets": list(self.metadata.values())
        }

    def analyze_metric(self, dataset_name: str, x_col: str, y_col: str, agg: str = "sum") -> Dict[str, Any]:
        """
        Group by x_col and aggregate y_col for charting.
        """
        if dataset_name not in self.datasets:
            return {"error": f"Dataset '{dataset_name}' not found."}

        df = self.datasets[dataset_name]
        if x_col not in df.columns or y_col not in df.columns:
            return {"error": f"Columns '{x_col}' or '{y_col}' do not exist."}

        # Ensure numeric for y_col
        temp_y = pd.to_numeric(df[y_col].astype(str).str.replace(r'[\$,]', '', regex=True), errors='coerce')
        temp_df = pd.DataFrame({x_col: df[x_col], y_col: temp_y}).dropna()

        if agg == "sum":
            grouped = temp_df.groupby(x_col)[y_col].sum()
        elif agg == "mean":
            grouped = temp_df.groupby(x_col)[y_col].mean()
        elif agg == "count":
            grouped = temp_df.groupby(x_col)[y_col].count()
        else:
            grouped = temp_df.groupby(x_col)[y_col].sum()

        records = [{"x": str(k), "y": round(float(v), 2)} for k, v in grouped.items()]
        # Sort by value descending
        records = sorted(records, key=lambda d: d["y"], reverse=True)

        return {
            "dataset": dataset_name,
            "x_axis": x_col,
            "y_axis": y_col,
            "aggregation": agg,
            "chart_type": "bar",
            "data": records[:10]  # top 10 for clean charting
        }

    def search_records(self, dataset_name: str, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search for query string across all string columns in the dataset.
        """
        if dataset_name not in self.datasets:
            return []

        df = self.datasets[dataset_name]
        mask = np.column_stack([
            df[col].astype(str).str.contains(query, case=False, na=False)
            for col in df.columns
        ])
        matched_df = df[mask.any(axis=1)].head(limit)
        
        # Clean up any NaNs/Infs for JSON serialization
        clean_records = json.loads(matched_df.to_json(orient="records"))
        return clean_records
