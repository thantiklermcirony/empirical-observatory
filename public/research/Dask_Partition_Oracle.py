"""Independent pandas-only partition-composition diagnostic; does not import Dask."""
import json
import platform
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

left = pd.DataFrame(index=["A", "B", "C"])
right = pd.DataFrame({"id": ["A", "B"], "value": [1, 2]}, index=["AAA", "BBB"])
kwargs = dict(how="left", left_index=True, right_on="id")
whole = left.merge(right, **kwargs)
unmatched_partition = left.iloc[2:].merge(right.iloc[:0], **kwargs)
composed = pd.concat([left.iloc[:2].merge(right, **kwargs), unmatched_partition])

def portable(frame):
    return json.loads(frame.to_json(orient="split"))

result = {
    "utc": datetime.now(timezone.utc).isoformat(),
    "stage": "independent_pandas_only_diagnostic",
    "python": platform.python_version(),
    "pandas": pd.__version__,
    "issue": "https://github.com/dask/dask/issues/12564",
    "whole_merge": portable(whole),
    "unmatched_partition_merge": portable(unmatched_partition),
    "composed_partition_merges": portable(composed),
    "values_equal": whole.reset_index(drop=True).equals(composed.reset_index(drop=True)),
    "indices_equal": whole.index.equals(composed.index),
    "limits": ["Dask is not installed or executed by this diagnostic.", "Partition arrangement is manually supplied; this does not prove the current Dask execution plan selects it.", "Current pandas output is a differential oracle, not maintainer approval of the desired Dask contract."]
}
out = Path(__file__).with_name("Dask_Partition_Oracle.json")
out.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2, allow_nan=False))
