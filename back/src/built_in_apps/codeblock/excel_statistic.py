import csv
import io
import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime

# ========= 可配置 =========
SAMPLE_N = 200          # 取前N行做统计/规划
TOPN = 10               # TopN/频次TopN
CORR_MAX_PAIRS = 15     # 最多输出多少对相关性
# =========================


def _guess_delimiter(text: str) -> str:
    candidates = [",", "\t", ";", "|"]
    lines = [ln for ln in text.splitlines() if ln.strip()][:50]
    best, best_score = ",", -1.0
    for d in candidates:
        try:
            lens = [len(next(csv.reader([ln], delimiter=d))) for ln in lines]
        except Exception:
            continue
        if not lens:
            continue
        score = sum(lens) / len(lens)
        if score > best_score:
            best_score = score
            best = d
    return best


def _try_parse_number(x: str):
    if x is None:
        return None
    s = str(x).strip()
    if s == "":
        return None
    s = s.replace(",", "")
    percent = False
    if s.endswith("%"):
        percent = True
        s = s[:-1].strip()
    try:
        v = float(s)
        if math.isnan(v) or math.isinf(v):
            return None
        return v / 100.0 if percent else v
    except Exception:
        return None


_DATE_PATTERNS = [
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%Y.%m.%d",
    "%Y-%m-%d %H:%M:%S",
    "%Y/%m/%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y/%m/%d %H:%M",
    "%Y%m%d",
]


def _try_parse_date(x: str):
    if x is None:
        return None
    s = str(x).strip()
    if s == "":
        return None
    if not re.search(r"\d", s):
        return None
    for fmt in _DATE_PATTERNS:
        try:
            return datetime.strptime(s, fmt)
        except Exception:
            pass
    return None


def _pearson_corr(xs, ys):
    n = min(len(xs), len(ys))
    if n < 3:
        return None
    mx = sum(xs) / n
    my = sum(ys) / n
    num = 0.0
    dx2 = 0.0
    dy2 = 0.0
    for i in range(n):
        dx = xs[i] - mx
        dy = ys[i] - my
        num += dx * dy
        dx2 += dx * dx
        dy2 += dy * dy
    den = math.sqrt(dx2) * math.sqrt(dy2)
    if den == 0:
        return None
    return num / den


def main(input: str) -> str:
    import traceback
    try:
        text = (input or "").strip("\ufeff").strip()
        if not text:
            return json.dumps({"error": "empty_input"}, ensure_ascii=False)

        delim = _guess_delimiter(text)
        f = io.StringIO(text)
        reader = csv.reader(f, delimiter=delim)
        raw_rows = [r for r in reader if any(str(cell).strip() for cell in r)]
        rows = [[str(c).strip() for c in r] for r in raw_rows]

        col_count = max((len(r) for r in rows), default=0)
        if col_count == 0:
            return json.dumps({"error": "no_columns"}, ensure_ascii=False)
        rows = [r + [""] * (col_count - len(r)) for r in rows]

        def _numeric_ratio(row):
            vals = [c for c in row if c != ""]
            if not vals:
                return 0.0
            nums = sum(1 for c in vals if _try_parse_number(c) is not None)
            return nums / len(vals)

        header_detected = False
        if len(rows) >= 2:
            r0 = _numeric_ratio(rows[0])
            r1 = _numeric_ratio(rows[1])
            header_detected = (r0 <= 0.2 and r1 >= 0.4) or (r0 == 0.0 and r1 > 0.0)

        header = rows[0] if header_detected else None
        data_rows = rows[1:] if header_detected else rows
        if not data_rows:
            return json.dumps({"error": "no_data"}, ensure_ascii=False)

        columns = [c if c else f"col{i+1}" for i, c in enumerate(header)] if header_detected else [f"col{i+1}" for i in range(col_count)]

        # 采样
        sample_rows = data_rows[:SAMPLE_N]

        # 列类型推断 + 统计
        schema = []
        numeric_cols = []
        date_cols = []
        category_cols = []
        string_cols = []

        # 预提取列值
        cols_vals = [[r[j] for r in sample_rows] for j in range(col_count)]

        numeric_summary = {}
        freq_summary = {}
        date_summary = {}

        for j, name in enumerate(columns):
            col = cols_vals[j]
            non_empty = [v for v in col if v != ""]
            uniq = len(set(non_empty)) if non_empty else 0
            uniq_ratio = (uniq / len(non_empty)) if non_empty else 0.0

            nums = [_try_parse_number(v) for v in non_empty]
            num_vals = [v for v in nums if v is not None]
            num_ratio = (len(num_vals) / len(non_empty)) if non_empty else 0.0

            dts = [_try_parse_date(v) for v in non_empty]
            dt_vals = [v for v in dts if v is not None]
            dt_ratio = (len(dt_vals) / len(non_empty)) if non_empty else 0.0

            inferred = "string"
            if dt_ratio >= 0.8 and len(non_empty) > 0:
                inferred = "date"
                date_cols.append(name)
                dt_vals_sorted = sorted(dt_vals)
                date_summary[name] = {
                    "count": len(dt_vals),
                    "min": dt_vals_sorted[0].isoformat(sep=" "),
                    "max": dt_vals_sorted[-1].isoformat(sep=" "),
                }
            elif num_ratio >= 0.8 and len(non_empty) > 0:
                inferred = "number"
                numeric_cols.append(name)
                if num_vals:
                    numeric_summary[name] = {
                        "count": len(num_vals),
                        "min": min(num_vals),
                        "max": max(num_vals),
                        "mean": sum(num_vals) / len(num_vals),
                    }
            else:
                if len(non_empty) > 0 and uniq_ratio <= 0.2:
                    inferred = "category"
                    category_cols.append(name)
                else:
                    inferred = "string"
                    string_cols.append(name)

                if non_empty:
                    c = Counter(non_empty)
                    freq_summary[name] = [{"value": k, "count": v} for k, v in c.most_common(TOPN)]

            schema.append({
                "name": name,
                "type": inferred,
                "numeric_ratio": round(num_ratio, 4),
                "date_ratio": round(dt_ratio, 4),
                "unique_ratio": round(uniq_ratio, 4),
                "non_empty": len(non_empty),
            })

        # 相关性
        correlations = []
        if len(numeric_cols) >= 2:
            num_series = {c: [_try_parse_number(r[columns.index(c)]) for r in sample_rows] for c in numeric_cols}
            for i in range(len(numeric_cols)):
                for k in range(i + 1, len(numeric_cols)):
                    a, b = numeric_cols[i], numeric_cols[k]
                    valid = [(num_series[a][idx], num_series[b][idx]) for idx in range(len(sample_rows)) if num_series[a][idx] is not None and num_series[b][idx] is not None]
                    if len(valid) >= 3:
                        corr = _pearson_corr([x[0] for x in valid], [x[1] for x in valid])
                        if corr is not None:
                            correlations.append({"x": a, "y": b, "corr": round(corr, 4), "n": len(valid)})
            correlations.sort(key=lambda t: abs(t["corr"]), reverse=True)
            correlations = correlations[:CORR_MAX_PAIRS]

        # 图表规划
        time_col = date_cols[0] if date_cols else None
        dim_candidates = [c["name"] for c in schema if c["type"] in ("category", "string") and 0.05 <= c["unique_ratio"] <= 0.9]
        dimension_cols = dim_candidates[:2]
        metric_cols = numeric_cols[:3]

        chart_plan = []
        if metric_cols:
            chart_plan.append({"id": "c1", "type": "histogram", "title": f"{metric_cols[0]} 分布（样本）", "x": metric_cols[0], "y": "count", "topN": TOPN})
        if dimension_cols and metric_cols:
            chart_plan.append({"id": "c2", "type": "bar", "title": f"{dimension_cols[0]} × {metric_cols[0]}（均值）", "x": dimension_cols[0], "y": metric_cols[0], "topN": TOPN})
        if time_col and metric_cols:
            chart_plan.append({"id": "c4", "type": "line", "title": f"{time_col} 趋势", "x": time_col, "y": metric_cols[0], "topN": TOPN})

        out = {
            "meta": {"delimiter": delim, "header_detected": header_detected, "sample_rows": len(sample_rows), "col_count": col_count},
            "columns": columns,
            "schema": schema,
            "rows_sample": sample_rows,
            "metrics": {"numeric_summary": numeric_summary, "date_summary": date_summary, "freq_top": freq_summary, "correlations": correlations},
            "selected": {"time_col": time_col, "dimension_cols": dimension_cols, "metric_cols": metric_cols},
            "chart_plan": chart_plan
        }
        return json.dumps(out, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e), "traceback": traceback.format_exc()}, ensure_ascii=False)
