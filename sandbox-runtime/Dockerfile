# Use Python 3.10 as base image
FROM acr.aishu.cn/as/sailor-python:3.11-base

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install data-retrival==0.1.0 --no-cache-dir -i http://repohub.aishu.cn/repository/pip-hub/simple/  --trusted-host repohub.aishu.cn
RUN pip install --no-cache-dir -r requirements.txt

ARG TARGETARCH

# 更换为中科大镜像源，默认用 focal
RUN set -eux; \
    if [ "$TARGETARCH" = "arm64" ] || [ "$TARGETARCH" = "arm" ]; then \
        MIRROR_URL="https://mirrors.ustc.edu.cn/ubuntu-ports/"; \
    else \
        MIRROR_URL="https://mirrors.ustc.edu.cn/ubuntu/"; \
    fi; \
    mv /etc/apt/sources.list /etc/apt/sources.list.bak && \
    echo "deb ${MIRROR_URL} focal main restricted universe multiverse" > /etc/apt/sources.list && \
    echo "deb ${MIRROR_URL} focal-updates main restricted universe multiverse" >> /etc/apt/sources.list && \
    echo "deb ${MIRROR_URL} focal-backports main restricted universe multiverse" >> /etc/apt/sources.list && \
    echo "deb ${MIRROR_URL} focal-security main restricted universe multiverse" >> /etc/apt/sources.list

# 安装 bubblewrap 并清理缓存
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y bubblewrap && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 测试 bubblewrap 是否安装成功
RUN bwrap --version

# Copy the application code
COPY src/ /app/src/

# 设置Python路径
ENV PYTHONPATH=/app/src

# Expose the port the app runs on
EXPOSE 9101

# Command to run the application
CMD ["python", "src/sandbox_runtime/main.py"] 