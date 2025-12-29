#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Example demonstrating how to use SharedEnvSandbox for file operations and code execution.
"""

import os
import sys
import asyncio
import uuid
from pathlib import Path

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sandbox_runtime.sdk.shared_env import SharedEnvSandbox
import argparse


async def main():
    parser = argparse.ArgumentParser(description="SharedEnvSandbox Example")
    parser.add_argument(
        "--server", type=str, default="http://sandbox_runtime:9101", help="Server URL"
    )
    args = parser.parse_args()

    # Initialize the sandbox with a session ID
    session_id = str(uuid.uuid4())
    print(f"Using session ID: {session_id}")
    sandbox = SharedEnvSandbox(session_id=session_id, servers=[args.server])

    try:
        # Example 1: Create a file
        print("\n=== Creating a file ===")
        content = "print('Hello from SharedEnv!')"
        result = await sandbox.create_file(content, "hello.py")
        print(f"File created: {result}")

        # Example 2: List files
        print("\n=== Listing files ===")
        files = await sandbox.list_files()
        for file in files:
            print(f"File: {file}")

        # Example 3: Read file content
        print("\n=== Reading file content ===")
        file_content = await sandbox.read_file("hello.py")
        print(f"File content: {file_content}")

        # Example 4: Execute Python code
        print("\n=== Executing Python code ===")
        code = """
def greet(name):
    return f"Hello, {name}!"

result = greet("SharedEnv")
print(result)
"""
        result = await sandbox.execute_code(code, filename="greet.py")
        print(f"Execution result: {result}")

        # Example 5: Upload and download file
        print("\n=== File upload and download ===")
        # Create a test file
        test_file = Path("test_upload.txt")
        test_file.write_text("This is a test file for upload/download")

        # Upload the file
        upload_result = await sandbox.upload_file(test_file)
        print(f"Upload result: {upload_result}")

        # Download the file
        download_path = Path("test_download.txt")
        await sandbox.download_file("test_upload.txt", download_path)
        print(f"Downloaded content: {download_path.read_text()}")

        # Example 6: Execute command
        print("\n=== Executing command ===")
        result = await sandbox.execute("ls")
        print(f"Command result: {result}")

        # Example 7: Execute command with arguments
        print("\n=== Executing command with arguments ===")
        result = await sandbox.execute("ls", "-l")
        print(f"Command result: {result}")

        # Example 8: Execute Python code with arguments
        print("\n=== Executing Python code with arguments ===")
        code = """
import sys

print(f"Hello, {sys.argv[1]}!")
"""
        result = await sandbox.execute_code(code, args=["SharedEnv"])
        print(f"Execution result: {result}")

        # 测试读取不存在的文件
        print("\n=== Reading non-existent file ===")
        try:
            result = await sandbox.read_file("non_existent.txt")
            print(f"File content: {result}")
        except Exception as e:
            print(f"Error: {str(e)}")

        # Cleanup test files
        test_file.unlink()
        download_path.unlink()

        # Example 9: Get sandbox status
        print("\n=== Getting sandbox status ===")
        status = await sandbox.get_status()
        print(f"Sandbox status: {status}")

        # Example 10: Execute Python code with output params
        print("\n=== Executing Python code with output params ===")
        code = """
a = 1
b = 2
c = "I am a string"
d = [1, 2, 3]
e = {"a": 1, "b": 2, "c": "I am a string", "d": [1, 2, 3]}
"""
        result = await sandbox.execute_code(
            code, output_params=["a", "b", "c", "d", "e"]
        )
        print(f"Execution result: {result}")

        # Example 11: Execute Python code with errors
        print("\n=== Executing Python code with errors ===")
        code = """
print(1/0)
"""
        result = await sandbox.execute_code(code)
        print(f"Execution result: {result}")

        # Example 12: Pandas data analysis
        print("\n=== Pandas data analysis ===")
        pandas_code = """
import pandas as pd
import numpy as np

# 创建示例数据
np.random.seed(42)
data = {
    'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'],
    'age': np.random.randint(20, 60, 8),
    'salary': np.random.randint(30000, 100000, 8),
    'department': ['IT', 'HR', 'IT', 'Finance', 'HR', 'IT', 'Finance', 'IT'],
    'experience': np.random.randint(1, 15, 8)
}

df = pd.DataFrame(data)

# 基本统计分析
print("=== 数据概览 ===")
print(f"数据形状: {df.shape}")
print(f"列名: {list(df.columns)}")
print("\\n前5行数据:")
print(df.head())

print("\\n=== 基本统计信息 ===")
print(df.describe())

print("\\n=== 部门统计 ===")
dept_stats = df.groupby('department').agg({
    'age': ['mean', 'count'],
    'salary': ['mean', 'sum'],
    'experience': 'mean'
}).round(2)
print(dept_stats)

print("\\n=== 年龄分布 ===")
age_bins = [20, 30, 40, 50, 60]
age_labels = ['20-30', '31-40', '41-50', '51-60']
df['age_group'] = pd.cut(df['age'], bins=age_bins, labels=age_labels, right=False)
age_dist = df['age_group'].value_counts().sort_index()
print(age_dist)

print("\\n=== 相关性分析 ===")
correlation = df[['age', 'salary', 'experience']].corr().round(3)
print(correlation)

# 找出高薪员工
high_salary = df[df['salary'] > df['salary'].mean()]
print(f"\\n=== 高薪员工 (高于平均薪资 {df['salary'].mean():.0f}) ===")
print(high_salary[['name', 'department', 'salary', 'experience']].sort_values('salary', ascending=False))

# 计算统计指标
stats_summary = {
    'total_employees': len(df),
    'avg_age': df['age'].mean(),
    'avg_salary': df['salary'].mean(),
    'max_salary': df['salary'].max(),
    'min_salary': df['salary'].min(),
    'salary_std': df['salary'].std(),
    'it_employees': len(df[df['department'] == 'IT']),
    'hr_employees': len(df[df['department'] == 'HR']),
    'finance_employees': len(df[df['department'] == 'Finance'])
}

print("\\n=== 统计摘要 ===")
for key, value in stats_summary.items():
    print(f"{key}: {value:.2f}" if isinstance(value, float) else f"{key}: {value}")
"""
        result = await sandbox.execute_code(pandas_code, filename="pandas_analysis.py")
        print(f"Pandas analysis result: {result}")

        # Example 10: Pandas with data visualization
        print("\n=== Pandas with data visualization ===")
        viz_code = """
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# 创建销售数据
np.random.seed(123)
sales_data = {
    'month': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    'sales': np.random.randint(1000, 5000, 12),
    'profit': np.random.randint(100, 800, 12),
    'customers': np.random.randint(50, 200, 12)
}

df = pd.DataFrame(sales_data)

# 计算利润率
df['profit_margin'] = (df['profit'] / df['sales'] * 100).round(2)

print("=== 销售数据分析 ===")
print("月度销售数据:")
print(df)

print("\\n=== 销售统计 ===")
print(f"总销售额: {df['sales'].sum():,}")
print(f"平均月销售额: {df['sales'].mean():.0f}")
print(f"最高月销售额: {df['sales'].max()} ({df.loc[df['sales'].idxmax(), 'month']})")
print(f"最低月销售额: {df['sales'].min()} ({df.loc[df['sales'].idxmin(), 'month']})")

print("\\n=== 利润率分析 ===")
print(f"平均利润率: {df['profit_margin'].mean():.2f}%")
print(f"最高利润率: {df['profit_margin'].max():.2f}%")
print(f"最低利润率: {df['profit_margin'].min():.2f}%")

# 季度分析
df['quarter'] = pd.cut(range(len(df)), bins=4, labels=['Q1', 'Q2', 'Q3', 'Q4'])
quarterly_stats = df.groupby('quarter').agg({
    'sales': 'sum',
    'profit': 'sum',
    'customers': 'sum'
}).round(2)

quarterly_stats['profit_margin'] = (quarterly_stats['profit'] / quarterly_stats['sales'] * 100).round(2)

print("\\n=== 季度统计 ===")
print(quarterly_stats)

# 客户分析
print("\\n=== 客户分析 ===")
print(f"总客户数: {df['customers'].sum():,}")
print(f"平均月客户数: {df['customers'].mean():.0f}")
print(f"客户转化率: {(df['sales'].sum() / df['customers'].sum()):.2f}")

# 趋势分析
df['sales_trend'] = df['sales'].pct_change() * 100
print("\\n=== 销售趋势 (环比增长率) ===")
for i, (month, trend) in enumerate(zip(df['month'], df['sales_trend'])):
    if not pd.isna(trend):
        print(f"{month}: {trend:+.1f}%")

# 输出分析结果
analysis_results = {
    'total_sales': df['sales'].sum(),
    'total_profit': df['profit'].sum(),
    'avg_profit_margin': df['profit_margin'].mean(),
    'best_month': df.loc[df['sales'].idxmax(), 'month'],
    'worst_month': df.loc[df['sales'].idxmin(), 'month'],
    'total_customers': df['customers'].sum(),
    'avg_customers_per_month': df['customers'].mean()
}

print("\\n=== 分析摘要 ===")
for key, value in analysis_results.items():
    if 'avg' in key or 'margin' in key:
        print(f"{key}: {value:.2f}")
    else:
        print(f"{key}: {value}")
"""
        result = await sandbox.execute_code(viz_code, filename="sales_analysis.py")
        print(f"Sales analysis result: {result}")

    finally:
        # Cleanup
        await sandbox.close()


if __name__ == "__main__":
    asyncio.run(main())
