# 标准化函数调用框架 + 安全沙箱隔离环境 技术设计文档
## 1. 文档概述
### 1.1 背景与目标
随着 AI Agent、微服务等场景对函数调用的标准化、安全性、高性能需求日益提升,本框架旨在构建具备以下特性的函数执行系统:

+ **函数定义标准化**: 借鉴 [AWS Lambda handler 规范](https://docs.aws.amazon.com/zh_cn/lambda/latest/dg/python-handler.html), 避免重复造轮子
+ **强安全隔离**: 基于轻量级沙箱实现强隔离,杜绝恶意代码风险
+ **无文件依赖**: 避免文件生命周期管理复杂度
+ **高性能复用**: 支持沙箱池化复用,提升高并发执行效率
+ **标准化输出**: 统一返回格式,适配上游系统确定性解析需求

### 1.2 核心价值
+ **标准化**: 统一函数入口、参数格式、返回结构
+ **高安全**: 沙箱隔离 + ~~权限限制~~ + 资源管控三重防护
+ **高性能**: 沙箱池化减少冷启动
+ **易集成**: 标准化接口,支持与 AI Agent、算子平台等系统无缝对接

---

## 2. 总体架构设计
### 2.1 架构分层
框架采用三层架构,职责清晰、解耦性强:

```plain
┌─────────────────────────────────────┐
│        上游调用方                    │
│   (AI Agent / API Gateway)          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      标准化层 (Standardization)      │
│  - Handler 规范定义                  │
│  - 参数/返回值标准化                 │
│  - 错误码规范                        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   运行时与池化层 (Runtime & Pool)    │
│  - 沙箱池管理                        │
│  - 任务调度                          │
│  - 性能监控                          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   沙箱隔离层 (Sandbox Isolation)     │
│  - Bubblewrap 沙箱                   │
│  - 资源限制                          │
│  - 权限控制                          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      函数执行环境                    │
└─────────────────────────────────────┘
```





### 2.2 核心设计原则
1. **规范对齐**: 借鉴 AWS Lambda handler 规范，定义清晰、明确的函数规范
2. **安全优先**: 默认禁用网络、文件写权限,最小化攻击面
3. **无状态设计**: 函数执行不依赖本地存储,支持水平扩展
4. **可观测性**: 采集执行耗时、内存占用等核心指标
5. **资源可控**: 通过 CPU、内存配额限制,避免资源滥用







### 2.3 项目结构设计
```plain
sandbox/
├── core/
│   ├── __init__.py
│   ├── context.py           # Context 上下文对象
│   ├── executor.py          # 核心执行器
│   ├── result.py            # 标准化返回结果
│   └── errors.py            # 错误码定义
├── sandbox/
│   ├── __init__.py
│   ├── wrapper.py           # Bubblewrap 封装
│   ├── pool.py              # 沙箱池管理
│   ├── instance.py          # 沙箱实例
│   └── daemon.py            # 沙箱守护进程
├── utils/
│   ├── __init__.py
│   ├── serialization.py     # 序列化工具
│   ├── monitoring.py        # 性能监控
│   └── validation.py        # 参数校验
├── config/
│   ├── __init__.py
│   └── settings.py          # 配置管理
└── tests/
    ├── test_executor.py
    ├── test_sandbox.py
    └── test_pool.py
```

---

## 3. 核心模块设计
### 3.1 标准化层设计
#### 3.1.1 Handler 函数规范
+ **入口函数**: 强制定义 `handler(event)` 作为唯一入口
+ **参数格式**: 
    - `event`: 业务输入数据 (JSON 可序列化类型)
+ **返回要求**: 返回值必须支持 JSON 序列化




#### 3.1.3 标准化返回格式
**StandardExecutionResult 结构**:

```json
{
  "stdout": "Processing complete.\n",
  "stderr": "",
  "result": {
    "status": "ok",
    "data": [1, 2, 3]
  },
  "metrics": {
    "duration_ms": 75.23,
    "memory_peak_mb": 42.5
  }
}
```

**字段说明**:

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| stdout | str | 标准输出流内容 |
| stderr | str | 标准错误流内容 |
| result | any | 函数业务返回值 |
| metrics | object | 性能指标 |


#### 3.1.4 错误码规范
| 错误码 | 含义 | HTTP Code | 应用场景 |
| --- | --- | --- | --- |
| Sandbox.InvalidParameter | 不合法的请求参数 | 400 | 语法错误、无 handler 函数、handler_code 为空字符串、event 无法序列化 |
| Sandbox.ExecException | handler 执行异常 | 500 | 业务逻辑抛出异常 |
| Sandbox.TooManyRequestsExection | 无可用沙箱 | 503 | 沙箱池已满或创建失败 |
| Sandbox.ExecTimeout | 执行超时 | 500 | 超过时间限制 |
| Sandbox.InternalError | 系统错误 | 500 | 沙箱启动失败等 |


### 3.2 沙箱隔离层设计
#### 3.2.1 技术选型: Bubblewrap
采用 bubblewrap (bwrap) 作为沙箱载体:

+ **轻量级**: 基于 Linux namespaces,启动开销低 (毫秒级)
+ **强隔离**: 支持文件系统、网络、PID 等多维度隔离
+ **资源可控**: 原生支持 CPU 配额、内存限制
+ **权限最小化**: 灵活禁用系统调用、丢弃 capabilities

#### 3.2.2 沙箱配置参数
| 配置项 | 类型 | 描述 | 默认值 |
| --- | --- | --- | --- |
| cpu_quota | int | 允许使用的 CPU 核心数 | 1 |
| memory_limit | int | 内存限制 (MB) | 256 |
| allow_network | bool | 是否允许网络访问 | False |
| max_idle_time | int | 最大空闲时间 (秒) | 300 |
| max_task_count | int | 单个沙箱最大任务数 | 100 |


#### 3.2.3 安全隔离策略
**资源隔离:**

+ <font style="color:rgba(0, 0, 0, 0.85) !important;">网络命名空间隔离</font> (`--unshare-net`)： <font style="color:rgba(0, 0, 0, 0.85);">沙箱有独立的网络栈（仅含 lo 回环网卡），无法访问主机公网网络 （需配合 </font>`<font style="color:rgb(0, 0, 0);">--proc /proc</font>`<font style="color:rgba(0, 0, 0, 0.85);"> 使用，否则沙箱内 </font>`<font style="color:rgb(0, 0, 0);">ps</font>`<font style="color:rgba(0, 0, 0, 0.85);">/</font>`<font style="color:rgb(0, 0, 0);">top</font>`<font style="color:rgba(0, 0, 0, 0.85);"> 等工具无法正常工作）</font>
+ PID 命名空间隔离（`<font style="color:rgb(0, 0, 0);">--unshare-pid</font>`） :<font style="color:rgba(0, 0, 0, 0.85) !important;">沙箱内进程有独立的 PID 编号（沙箱内第一个进程为 PID 1），无法看到主机 / 其他沙箱的进程</font>
+ <font style="color:rgba(0, 0, 0, 0.85);">挂载命名空间隔离（</font><font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0.06);"> --unshare-mount）</font>：<font style="color:rgba(0, 0, 0, 0.85);">沙箱内的文件系统挂载（如 </font>`<font style="color:rgb(0, 0, 0);">mount</font>`<font style="color:rgba(0, 0, 0, 0.85);">/</font>`<font style="color:rgb(0, 0, 0);">umount</font>`<font style="color:rgba(0, 0, 0, 0.85);">）仅对沙箱生效，不影响主机 （如 </font>`<font style="color:rgb(0, 0, 0);">--ro-bind</font>`<font style="color:rgba(0, 0, 0, 0.85);">/</font>`<font style="color:rgb(0, 0, 0);">--tmpfs</font>`<font style="color:rgba(0, 0, 0, 0.85);"> 等挂载参数需依赖此隔离）</font>



**Linux Capabilities 限制：**

+ 丢弃所有 Capabilities(`--cap-drop all`) ：<font style="color:rgb(0, 0, 0) !important;">显式丢弃沙箱内进程的所有 Linux 内核 Capabilities（特权能力）</font><font style="color:rgba(0, 0, 0, 0.85);">，让沙箱内的进程即使是 root 用户，也仅拥有普通用户的权限，彻底遵循 “最小权限原则”。</font> 

<details class="lake-collapse"><summary id="u76d00f52"><span class="ne-text" style="color: rgb(0, 0, 0)">补充背景：Linux Capabilities</span></summary><p id="uf2a7bfda" class="ne-p"><span class="ne-text" style="color: rgb(0, 0, 0); font-size: 12px">Linux Capabilities 是将传统的 root 特权拆分为细粒度的权限集合（如 </span><code class="ne-code"><span class="ne-text" style="color: rgba(0, 0, 0, 0.85) !important; font-size: 12px">CAP_NET_ADMIN</span></code><span class="ne-text" style="color: rgb(0, 0, 0); font-size: 12px"> 允许配置网络、</span><code class="ne-code"><span class="ne-text" style="color: rgba(0, 0, 0, 0.85) !important; font-size: 12px">CAP_SYS_ADMIN</span></code><span class="ne-text" style="color: rgb(0, 0, 0); font-size: 12px"> 允许系统管理操作）。默认情况下，root 进程拥有所有 Capabilities，普通进程仅拥有少数基础 Capabilities。</span><span class="ne-text"><br /></span></p></details>
+ 可通过配置选择性开放



**文件系统隔离**:

+ 开放临时目录可写 (`--tmpfs /tmp`)
+ 挂载系统依赖（python 解释器、libc、libdl等）（`--proc /proc  --ro-bind /lib /lib -ro-bind /lib64 /lib64`）
+ 禁止访问其他主机目录



**进程控制：**

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0.06);">--die-with-parent  ：</font><font style="color:rgba(0, 0, 0, 0.85);">沙箱进程随 Bubblewrap 父进程退出而终止</font>

**资源限制**:

基于ulimit 实现进程级资源限制

| **<font style="color:rgb(0, 0, 0) !important;">资源类型</font>** | **<font style="color:rgb(0, 0, 0) !important;">ulimit 参数</font>** | **<font style="color:rgb(0, 0, 0) !important;">含义</font>** | **<font style="color:rgb(0, 0, 0) !important;">单位</font>** | **<font style="color:rgb(0, 0, 0) !important;">示例</font>** | **<font style="color:rgb(0, 0, 0) !important;">默认配置</font>** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| <font style="color:rgba(0, 0, 0, 0.85) !important;">内存限制</font> | `<font style="color:rgb(0, 0, 0);">-v</font>`<br/><font style="color:rgba(0, 0, 0, 0.85) !important;"> </font><font style="color:rgba(0, 0, 0, 0.85) !important;">(virtual memory)</font> | <font style="color:rgba(0, 0, 0, 0.85) !important;">限制进程可用的虚拟内存总量（包含物理内存 + swap）</font> | <font style="color:rgba(0, 0, 0, 0.85) !important;">千字节（KB）</font> | `<font style="color:rgb(0, 0, 0);">ulimit -v 524288</font>`<br/><font style="color:rgba(0, 0, 0, 0.85) !important;"> </font><font style="color:rgba(0, 0, 0, 0.85) !important;">→ 限制 512MB</font> | 32MB |
| <font style="color:rgba(0, 0, 0, 0.85) !important;">CPU 时间</font> | `<font style="color:rgb(0, 0, 0);">-t</font>`<br/><font style="color:rgba(0, 0, 0, 0.85) !important;"> </font><font style="color:rgba(0, 0, 0, 0.85) !important;">(CPU time)</font> | <font style="color:rgba(0, 0, 0, 0.85) !important;">限制进程可用的总 CPU 时间（超出后进程被终止）</font> | <font style="color:rgba(0, 0, 0, 0.85) !important;">秒（s）</font> | `<font style="color:rgb(0, 0, 0);">ulimit -t 60</font>`<br/><font style="color:rgba(0, 0, 0, 0.85) !important;"> </font><font style="color:rgba(0, 0, 0, 0.85) !important;">→ 限制 60 秒 CPU 时间</font> | 300S |
| <font style="color:rgba(0, 0, 0, 0.85) !important;">进程数</font> | `<font style="color:rgb(0, 0, 0);">-u</font>`<br/><font style="color:rgba(0, 0, 0, 0.85) !important;"> </font><font style="color:rgba(0, 0, 0, 0.85) !important;">(max user processes)</font> | <font style="color:rgba(0, 0, 0, 0.85) !important;">限制容器内可创建的最大进程数</font> | <font style="color:rgba(0, 0, 0, 0.85) !important;">个数</font> | `<font style="color:rgb(0, 0, 0);">ulimit -u 100</font>`<br/><font style="color:rgba(0, 0, 0, 0.85) !important;"> </font><font style="color:rgba(0, 0, 0, 0.85) !important;">→ 最多 100 个进程</font> | 10 |
| ~~<font style="color:rgba(0, 0, 0, 0.85) !important;">堆内存</font>~~ | `~~<font style="color:rgb(0, 0, 0);">-d</font>~~`<br/>~~<font style="color:rgba(0, 0, 0, 0.85) !important;"> </font>~~~~<font style="color:rgba(0, 0, 0, 0.85) !important;">(data seg size)</font>~~ | ~~<font style="color:rgba(0, 0, 0, 0.85) !important;">限制进程数据段（堆）的最大大小</font>~~ | ~~<font style="color:rgba(0, 0, 0, 0.85) !important;">千字节（KB）</font>~~ | `~~<font style="color:rgb(0, 0, 0);">ulimit -d 262144</font>~~`<br/>~~<font style="color:rgba(0, 0, 0, 0.85) !important;"> </font>~~~~<font style="color:rgba(0, 0, 0, 0.85) !important;">→ 限制 256MB</font>~~ | ~~~~ |




#### 3.2.4 BubbleWrap 配置示例
```json
# 沙箱中运行 Python 脚本的核心配置
bwrap \                            
  --die-with-parent \              # 沙箱进程随 Bubblewrap 父进程退出而终止
  --unshare-pid --unshare-mount \  # 隔离 PID 和挂载命名空间
  --cap-drop all \                 # 严格权限控制
  --ro-bind /usr /usr \            # 只读挂载系统依赖（Python 解释器所在路径）
  --ro-bind /lib /lib \
  --ro-bind /lib64 /lib64 \
  --tmpfs /tmp \                   # 临时文件系统（Python 缓存/临时文件）
  --proc /proc \                   # 必须挂载：Python 依赖 /proc
  --dev /dev \                     # 挂载设备文件（如 /dev/null）
  # 核心：通过bash -c先设置ulimit，再执行Python
  bash -c "        # 资源限制配置（根据需求调整）
    ulimit -v 32768  # 限制虚拟内存：32MB（32*1024 KB）
    ulimit -t 300       # 限制CPU时间：300秒（累计占用，超出终止）
    ulimit -u 10       # 限制最大进程数：10个
    python3 -c "{pthon_code}"                # 执行 Python 脚本
  "
```

#### 3.2.5 无文件依赖执行机制
摒弃传统文件加载,采用内存级代码执行:

```python
# 核心实现逻辑
user_namespace = {}
exec(handler_code, user_namespace)  # 动态执行代码字符串

if 'handler' not in user_namespace:
    raise ValueError("必须定义 handler(event) 函数")

handler_func = user_namespace['handler']
result = handler_func(event)
```



### 3.3 运行时与池化层设计
#### 3.3.1 沙箱池化架构
**核心组件**:

+ **空闲沙箱队列**: 存储可用沙箱实例 (FIFO 调度)
+ **忙碌沙箱字典**: 记录执行中的沙箱实例
+ **池管理线程**: 负责沙箱创建、销毁、健康检查

#### 3.3.2 沙箱生命周期管理
1. **初始化**: 框架启动时预热创建指定数量沙箱
2. **分配**: 从空闲队列取出沙箱,标记为忙碌
3. **复用**: 任务完成后重置状态,放回空闲队列
4. **销毁**: 满足以下条件之一时销毁: 
    - 沙箱进程退出或异常
    - 空闲时间超过 `max_idle_time`
    - 执行任务数达到 `max_task_count`
    - 框架关闭

#### 3.3.3 沙箱通信机制
**基于 TCP Socket 的通信流程**:

1. 沙箱启动时启动 TCP 守护进程,监听随机端口
2. 主进程通过端口与沙箱建立连接
3. 主进程将任务数据 (handler_code + event) 序列化发送
4. 沙箱执行任务,将结果序列化返回
5. 连接关闭,沙箱等待下一个任务

#### 3.3.4 性能监控采集
+ **耗时统计**: 记录任务从分配到返回的总耗时
+ **内存监控**: 通过 psutil 实时采样进程内存,记录峰值
+ **采样频率**: 1ms 采样间隔,兼顾精度与性能

### 3.4 核心执行流程
```plain
上游调用方发起请求
        ↓
框架入口 invoke 接口
        ↓
    参数校验 ──→ [失败] ──→ 返回标准化错误结果
        ↓ [成功]
从沙箱池获取空闲沙箱 ──→ [无可用沙箱] ──→ 返回错误
        ↓ [获取成功]
通过 Socket 发送任务数据
        ↓
沙箱动态执行 handler 代码
        ↓
捕获 stdout/stderr 与执行结果
        ↓
    返回结果给主进程
        ↓
    采集性能指标
        ↓
沙箱放回空闲池/销毁
        ↓
返回标准化执行结果
```

### 3.5 沙箱守护进程
沙箱守护进程的完整调用链路如下:

```plain
主进程 (executor.py)                沙箱进程 (daemon.py)
      │                                    │
      │ 1. 启动沙箱进程                    │
      ├──────────────────────────────────>│
      │                                    │ 2. start_daemon() 启动
      │                                    │    - 创建 TCP Socket
      │                                    │    - 监听随机端口
      │                                    │    - 输出端口号
      │                                    │
      │ 3. 读取端口号                      │
      │<──────────────────────────────────┤
      │   "SANDBOX_PORT:12345"             │
      │                                    │
      │ 4. 建立 Socket 连接                │
      ├──────────────────────────────────>│
      │                                    │ 5. accept() 接受连接
      │                                    │
      │ 6. 发送任务数据                    │
      │   {handler_code, event}   │
      ├──────────────────────────────────>│
      │                                    │ 7. recv() 接收任务数据
      │                                    │
      │                                    │ 8. 解析 JSON
      │                                    │    task_data = json.loads(data)
      │                                    │
      │                                    │ 9. 调用 execute_handler()
      │                                    │    - 执行用户代码
      │                                    │    - 捕获 stdout/stderr
      │                                    │    - 返回执行结果
      │                                    │
      │ 10. 接收执行结果                   │
      │<──────────────────────────────────┤
      │   {exit_code, stdout, stderr,      │
      │    result, cpu_time_ms}            │
      │                                    │
      │ 11. 关闭连接                       │
      │                                    │ 12. 等待下一个连接
      │                                    │    (循环回到步骤5)
```

---

## 4. 关键技术实现
### 4.1 动态代码执行与隔离
+ 采用 `exec` 函数执行代码字符串,避免文件 I/O
+ 每个任务使用独立命名空间 (`user_namespace`),防止变量污染
+ 重定向沙箱内 stdout/stderr,确保输出捕获完整性

### 4.2 沙箱复用关键技术
+ **随机端口分配**: `socket.bind(("", 0))` 避免端口冲突
+ **守护进程设计**: 沙箱内长期运行的 TCP 守护进程
+ **有效性校验**: 复用前检查进程状态、空闲时间、任务计数
+ **状态重置**: 任务完成后清空临时数据,恢复初始状态

### 4.3 安全防护增强
+ **代码静态检测**: (扩展点) 禁止 `os.system`、`subprocess` 等危险函数
+ **超时强制终止**: 任务超时后强制终止沙箱进程
+ **异常隔离**: 单个沙箱异常不影响其他沙箱,自动销毁并重建

---

## 5. 接口规范
![](https://cdn.nlark.com/yuque/0/2025/png/1904465/1765260240221-d53bc12f-07a8-4772-afb6-5f3b9389ad9c.png)

---

## 6. 测试与验证
### 6.1 核心测试场景
| 测试场景 | 测试目标 | 预期结果 |
| --- | --- | --- |
| 正常执行 | 验证框架基础功能 | http code=200,返回正确业务结果 |
| handler 异常 | 验证异常捕获机制 | http code=500,stderr 包含异常信息 |
| 代码无 handler | 验证代码校验机制 | http code=400,提示"Handler 函数未找到" |
| 执行超时 | 验证超时控制 | http code=500,stderr 提示超时信息 |
| 高并发调用 | 验证沙箱复用性能<br/>无可用沙箱 | 复用时耗时降低 80% 以上<br/>http code=503 |
| 恶意代码执行 | 验证安全隔离 | 禁止网络/文件写入,无系统影响 |


### 6.2 性能指标基准
| 指标 | 冷启动 (首次调用) | 热启动 (沙箱复用) |
| --- | --- | --- |
| 平均耗时 | 50-100ms | 5-15ms |
| 内存占用 | 初始约 30MB | 稳定在 40-60MB |
| 并发支持 | 根据池大小配置 | 高效复用 |


---

## 7. 总结
本框架通过标准化设计、沙箱隔离、池化复用三大核心技术,实现了高安全、高性能、易集成的函数执行环境,满足 AI Agent、微服务等场景的函数调用需求。关键特性包括:

+ ✅ **AWS Lambda 兼容**: 降低用户迁移成本
+ ✅ **强安全隔离**: 三重防护机制保障执行安全
+ ✅ **高性能执行**: 沙箱复用将热启动耗时降低至 5-15ms
+ ✅ **标准化输出**: 统一返回格式便于上游系统解析
+ ✅ **可扩展设计**: 支持水平扩展和功能扩展

框架适用于需要动态执行用户代码、对安全性和性能有高要求的场景,为构建可信赖的函数即服务 (FaaS) 平台提供坚实基础。

