#!/bin/bash

# 获取用户信息
USER_HOME="$HOME"
USER_NAME=$(whoami)
SANDBOX_DIR="/tmp/sandbox_ssh_${USER_NAME}"

# 创建 Firejail 配置文件
FIREJAIL_PROFILE="$SANDBOX_DIR/firejail.profile"
mkdir -p "$SANDBOX_DIR"

cat > "$FIREJAIL_PROFILE" << EOF
# Firejail profile for restricted shell
include /etc/firejail/default.profile

# 允许访问沙箱目录
whitelist ${SANDBOX_DIR}

# 限制网络访问
net none

# 限制系统目录访问
blacklist /bin
blacklist /sbin
blacklist /usr/bin
blacklist /usr/sbin
blacklist /usr/local/bin
blacklist /usr/local/sbin

# 限制用户目录访问
blacklist ~
blacklist /home

# 限制资源使用
cpu 1
rlimit-nproc 10
rlimit-as 50M
rlimit-fsize 50M

# 限制设备访问
nodvd
nodvdrw
noinput
nooutput
notv
novideo
nox11

# 限制系统信息访问
private-dev
private-etc
private-tmp
private-var

# 允许的基本命令
shell /bin/bash
shell /bin/ls
shell /bin/cd
shell /bin/pwd
shell /bin/cat
shell /bin/grep
shell /bin/head
shell /bin/tail
shell /bin/less
shell /bin/more
shell /usr/bin/vim
shell /usr/bin/nano
shell /usr/bin/python3
shell /usr/bin/pip3
EOF

# 创建 Python 环境
mkdir -p "$SANDBOX_DIR"/{lib/python/site-packages,bin,usr,etc}

# 设置环境变量
export PATH="/usr/local/bin:/usr/bin:/bin"
export HOME="$SANDBOX_DIR"
export PYTHONPATH="$SANDBOX_DIR/lib/python"
export PYTHONHOME="$SANDBOX_DIR"
export PYTHONIOENCODING="utf-8"
export PIP_TARGET="$SANDBOX_DIR/lib/python/site-packages"
export PIP_NO_CACHE_DIR=1

# 显示欢迎信息
echo "欢迎使用受限 shell"
echo "您只能访问 $SANDBOX_DIR 目录"
echo "Python 环境已配置，可以使用 python 和 pip 命令"
echo "输入 'exit' 或 'logout' 退出"

# 使用 Firejail 启动受限 shell
exec firejail \
    --profile="$FIREJAIL_PROFILE" \
    --private="$SANDBOX_DIR" \
    --shell=/bin/bash \
    --rcfile <(echo "source $BASH_SOURCE") \
    -i 