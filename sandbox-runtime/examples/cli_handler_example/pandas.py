### 用例 35：使用 pandas 库处理数据
from typing import Dict, Any


def handler(event: Dict[str, Any]) -> Any:
    """
    通用Python工具处理函数。
    每个文件都需要导出一个名为`handler`的函数。这个函数是工具的入口点。

    Parameters:
        event: dict
        表示函数执行的主要输入参数。
        可以通过 event.get("key", default_value) 获取具体的输入值。

    Return:
        Any data object
        函数的返回数据,应根据用户需求定义具体的输出格式。
        返回的数据应与声明的输出参数匹配。
        请记得在元数据中填写input/output,这有助于LLM识别和使用工具。
    """
    # TODO: 根据需求插入实际逻辑
    # 示例:
    # name = event.get("name", "default")
    # return {"message": f"Hello, {name}"}

    try:
        import pandas as pd
    except ImportError:
        return {
            "error": "ImportError",
            "message": "pandas library is not available",
            "suggestion": "Please install pandas: pip install pandas",
        }

    data = event.get("data", [])
    operation = event.get("operation", "describe")

    if not data:
        return {"error": "Empty data", "message": "data list cannot be empty"}

    try:
        # 创建 DataFrame
        df = pd.DataFrame(data)

        if operation == "describe":
            # 数据描述统计
            result = {
                "shape": list(df.shape),
                "columns": df.columns.tolist(),
                "dtypes": df.dtypes.astype(str).to_dict(),
                "describe": df.describe().to_dict(),
                "null_counts": df.isnull().sum().to_dict(),
            }
        elif operation == "filter":
            # 过滤数据
            filter_column = event.get("filter_column")
            filter_value = event.get("filter_value")
            if filter_column and filter_value is not None:
                filtered_df = df[df[filter_column] == filter_value]
                result = {
                    "original_count": len(df),
                    "filtered_count": len(filtered_df),
                    "data": filtered_df.to_dict("records"),
                }
            else:
                result = {"error": "Missing filter_column or filter_value"}
        elif operation == "groupby":
            # 分组聚合
            group_column = event.get("group_column")
            agg_column = event.get("agg_column")
            agg_func = event.get("agg_func", "sum")
            if group_column and agg_column:
                grouped = df.groupby(group_column)[agg_column].agg(agg_func)
                result = {"grouped_data": grouped.to_dict()}
            else:
                result = {"error": "Missing group_column or agg_column"}
        else:
            result = {"error": "Unknown operation", "operation": operation}

        return result
    except Exception as e:
        return {"error": type(e).__name__, "message": str(e)}
