# Lambda Sandbox - 安全沙箱代码执行框架

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue)](https://www.python.org/)
[![License](https://img.shields.io/badge/license-Apache%202.0-green)](LICENSE)

## 简介

Sandbox 是一个高性能、高安全的 Python 代码执行框架，提供：

- ✅ AWS Lambda Handler 规范兼容
- ✅ Bubblewrap 沙箱隔离
- ✅ 沙箱池化复用
- ✅ RESTful API 接口
- ✅ 标准化执行结果

## 快速开始

### 安装依赖
```bash
# 安装系统依赖
sudo apt-get install -y bubblewrap

# 安装 Python 依赖
pip install -r requirements.txt
```

### 启动服务
```bash
# 开发模式
python -m api.server

# 生产模式
uvicorn api.server:app --host 0.0.0.0 --port 8000 --workers 4
```

### 调用示例
```python
import requests

response = requests.post('http://localhost:8000/v1/execute_code', json={
    "handler_code": "def handler(event, context): return {'result': 42}",
    "event": {}
})

print(response.json())
```

## 文档

- [架构设计](docs/architecture.md)
- [API 文档](http://localhost:8000/docs)
- [OpenAPI 规范](docs/openapi.yaml)

## 许可证

Apache License 2.0