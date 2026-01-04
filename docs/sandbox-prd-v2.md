产品需求文档
项目背景
[1]随着具有自主决策能力的 AI 代理（Agent）的出现，它们能够动态生成并执行代码，这在带来便利的同时也引入了安全性挑战：如何在运行时安全地让代理执行未验证的、潜在不受信任的代码，并控制其对系统和数据的访问[1]。传统的执行环境难以满足这一需求，因此需要专门设计的隔离沙箱系统，确保即使代理运行恶意或错误代码，也不会影响宿主系统的稳定性和安全性。此外，AI 代理通常会快速迭代地进行操作（如检查文件、运行计算、查询 API 等），每次调用都需要在独立的沙箱环境中完成，否则安全隔离要求会成为整体应用的性能瓶颈[2]。在大规模应用场景下，还需要支持海量并发的沙箱实例：企业级平台需支持成千上万个并行沙箱，每秒处理数千个请求，这要求系统在保证隔离性的同时具备 Kubernetes 级别的扩展能力[3]。因此，本项目旨在基于现代云原生技术，构建一个 Python 实现的沙箱管理系统，实现管理中心与运行时解耦、高效调度，以及灵活可扩展的运行模式。
目标
1. 为 AI 代理执行场景提供安全隔离的执行环境，使每个代理请求都在独立沙箱中运行，避免跨会话干扰和越权访问。
2. 定义管理中心与运行时之间的统一协议（类似 OpenSandbox 的 OAS 协议[4]），涵盖会话创建、执行请求、状态同步、结果上传等全生命周期管理接口。
3. 支持两种运行时模式：本地 Docker 模式（每个沙箱实例为独立容器）、Kubernetes 模式（运行时 Pod 动态创建、自动扩缩容）。
4. 管理中心需智能调度两种模式下的任务，具备资源探针、心跳检测、负载报告、运行时池管理、故障自动摘除等机制，保证高可用性与资源利用率。
5. 系统全部采用 Python 开发，推荐使用 FastAPI + asyncio 等现代异步框架构建 API 服务和调度系统，以实现高性能的并发处理。
核心功能需求
· 协议设计：管理中心与运行时之间必须基于 RESTful 或类似机制定义标准协议，支持创建会话、执行命令或代码、查询状态、上报结果等接口。该协议应明确请求格式和数据模型，方便扩展和互操作（参考 OpenSandbox 定义的沙箱生命周期管理 API[4]）。
· 会话管理：支持会话（Session）概念，即沙箱实例。会话由管理中心创建并由运行时启动，可承载多条指令和多轮交互。每个会话可基于沙箱模板（Template）创建，模板定义基础镜像、依赖配置、资源限制和安全策略[5]。系统应支持会话的生命周期管理，包括创建、执行、挂起/恢复、终止等操作。
· 运行模式：
· 本地 Docker 模式：在单机环境中，管理中心直接控制 Docker 容器启动，每个容器内使用 bubblewrap 等机制进一步隔离进程、文件系统和网络。
· Kubernetes 模式：管理中心部署于 Kubernetes 上，通过自定义资源（CRD）或控制器调度任务至对应的 Runtime 服务。支持动态创建 Pod、自动扩缩容以及 Warm Pool（预热实例）机制，以保证沙箱实例的快速启动[6][7]。
· 调度与监控：管理中心需对运行时节点或服务池执行资源探针和心跳检测，实时收集负载（CPU、内存、会话数等）信息。根据负载智能调度新任务或回收空闲实例。对于异常或不响应的运行时，自动摘除并进行故障转移，保证系统可靠性。
· 执行环境：每个沙箱实例应具备独立的文件系统和网络访问控制，可以通过两阶段加载（先加载基础环境，再按需安装依赖）等方式加速启动。支持在沙箱内执行 shell 命令、脚本或代码（Python、JavaScript 等），并提供标准化的输入输出采集。
· 结果上传：运行时在任务完成后需将执行结果（日志、输出、生成文件等）通过 API 上报给管理中心。管理中心应对结果进行收集、存储，并提供给上层系统（如 Agent 控制器）查询与分析。
非功能性需求
· 可扩展性：系统须支持水平扩展，能在 Kubernetes 集群上无缝扩张，以应对大规模并发需求[8]。支持 Warm Pool 机制预热实例，减少冷启动延迟[6][7]。管理中心设计为无状态服务，可水平部署；运行时节点池支持动态伸缩。
· 安全性：利用多层隔离技术保障安全。沙箱内部使用 container+bubblewrap 强化隔离，部署 gVisor/Kata 等隔离后端可选[9]。默认采用非特权用户、无新权限（no-new-privileges）、删除所有 Linux Capabilities 的容器配置[10][9]。网络流量可通过安全策略或代理隔离，敏感凭据使用环境变量传递，避免代码内部泄露。
· 性能与低时延：针对交互式 Agent 需求优化性能。通过 Warm Pool、Pod 快照等技术减少实例启动时间[6][7]。依赖两阶段加载策略：先启动基础环境，然后增量安装用户代码依赖，以加速首次响应。所有网络/磁盘访问尽量使用异步 I/O（FastAPI + asyncio）并行处理，提高并发吞吐。
· 稳定性与可靠性：管理中心需记录关键日志、异常和指标，并对任务执行过程进行监控。故障恢复机制包括自动重启失败任务和剔除挂起实例。对长时间未响应的会话提供超时机制（类似 Agent Sandbox 的 Shutdown Time 特性[11]），避免资源泄漏。
· 兼容性：系统用 Python 开发并遵循标准协议，对上层 Agent 框架（如 LangChain、CrewAI 等）友好。提供 Python SDK（类似 Agent Sandbox 提供的 Python API/SDK[12]）供开发者调用。与现有沙箱系统（如 AIO Sandbox、OpenSandbox）协议兼容，便于集成第三方工具。
系统架构
系统采用管理中心（Control Plane）和运行时（Runtime）分离的架构：管理中心负责接收任务请求、调度资源、维护全局状态；运行时负责具体的沙箱执行环境。管理中心组件通过 FastAPI 提供统一 RESTful API 和内部调度逻辑，可部署多实例以实现高可用。运行时组件支持两种部署模式：
- Docker 模式：以容器为单位管理沙箱环境。每个会话启动一个隔离容器，容器内使用 Bubblewrap 强化内核命名空间隔离。管理中心在容器宿主机上运行探针和守护进程，对容器池进行监控和调度[13][10]。
- Kubernetes 模式：管理中心作为 K8s 控制器（或使用 Operator）管理自定义资源 Sandbox、SandboxTemplate 和 SandboxClaim[14]。其中，SandboxTemplate 定义沙箱环境原型（基础镜像、资源上限、安全策略）；SandboxClaim 用于申请执行环境；Sandbox 表示具体的运行实例。管理中心根据任务需求创建对应的 SandboxClaim，Kubernetes 调度器会根据声明生成 Pod，Pod 中运行容器执行任务[14]。通过 Kubernetes 可以利用原生的扩缩容、资源预留和卷挂载等机制提高效率。
管理中心还引入 Warm Pool（预热池）技术，在运行时预先保持一组空闲 Pod 实例，以实现秒级响应[6][7]。任务完成后，结果被推送至管理中心，并可通过外部存储进行持久化。整个系统采用分层设计，管理中心可与外部Agent系统（如 Agent 逻辑控制器）解耦，通过标准化 API 交互。
关键交互协议（API）
管理中心与运行时之间的交互采用统一的 HTTP/JSON 协议（可参考 OpenAPI 规范）。主要接口包括：
- 会话创建 (POST /sessions)：管理中心发送请求启动新会话，包含模板 ID、会话配置（如超时、资源限制）等。运行时返回会话 ID。
- 执行请求 (POST /sessions/{session_id}/execute)：向指定会话发送执行命令或代码，参数包括命令字符串、输入数据、语言环境、是否异步等。运行时立即返回调用是否成功，实际输出通过后续接口获取。
- 状态查询 (GET /sessions/{session_id}/status)：查询会话当前状态（如运行中、完成、失败等），以及资源使用情况（CPU、内存、运行时长等）。
- 结果上传 (POST /sessions/{session_id}/result)：运行时任务完成后，向管理中心上传执行结果数据，包括标准输出、标准错误、退出码、生成文件路径等。管理中心存储后上层系统可查询。
- 控制操作 (POST /sessions/{session_id}/terminate)：可用于主动终止会话或强制清理资源，防止会话滞留。
以上接口均返回规范化的响应模型（状态码、消息、数据结构），并支持异步处理和回调。协议设计要留有扩展空间，例如可以添加会话复用、权限控制字段，或通过WebSocket 支持实时日志流转。总之，该协议类似于 OpenSandbox 提出的 “沙箱生命周期管理 API”[4]和 Agent Sandbox 使用的资源 API，旨在简化多语言 SDK 的开发和第三方运行时集成。
关键对象说明
· 会话（Session）：表示一次独立的执行环境实例，对应一个容器或 Pod。会话在创建时关联一个模板，用于初始化环境；会话生命周期内可以执行多条指令、上传或下载文件，并支持多轮交互。会话支持临时（Ephemeral）模式和持久（Persistent）模式，以满足交互式 Agent 的需要[15]；后者可保留历史状态，便于多次调用时复用同一环境。
· 模板（Template）：定义沙箱环境的蓝图，包括基础镜像、预安装软件包、资源配额和安全策略等信息。在 Kubernetes 模式下，对应 SandboxTemplate 资源[14]。模板提供隔离环境的基本配置，减少每次会话启动时的重复准备成本。
· 执行结果（Execution Result）：会话执行任务后产生的输出数据，包括标准输出/错误文本、返回值、生成的文件或数据、执行日志等。结果通过统一的接口结构返回给管理中心，可包括分段流（streaming）或批量形式。系统需记录每次执行的结果元数据，便于上层 Agent 系统查看和分析。
[5]当 Agent 发起执行时，管理中心会“从沙箱模板创建隔离沙箱实例”，在该实例中执行代码或命令，然后将处理结果返回[5]。整个过程确保每个任务在独立会话中运行，互不干扰。同时，会话和模板的分离设计使得环境定义和会话生命周期解耦，可灵活复用和扩展。
兼容性与可扩展性说明
本系统采用 Python 开发，并提供 Python SDK/API 供上层调用，便于与各种 Agent 框架集成[12]。管理中心和运行时都可部署在云原生环境中，兼容 Docker 和 Kubernetes 平台。在 Kubernetes 模式下，系统使用标准的 CRD/API 扩展（类似 Agent Sandbox 的方式），支持接入其它隔离后端（如 gVisor、Kata）[9]。管理中心逻辑与具体运行时实现分离，未来可通过插件方式增加新的调度策略或环境类型。由于协议和数据模型采用开放规范（OpenAPI/JSON），第三方工具也可以方便集成；同时，系统设计预留了多语言 SDK 和外部集成的接口，支持不同编程语言和工具链访问。同样，管理中心支持水平扩展和多租户，可轻松扩展到大规模集群部署，以满足业务增长需求。
参考资料：本需求文档参考了 OpenSandbox 平台关于沙箱协议的设计理念[4]，以及 Google Agent Sandbox 对 AI 代理沙箱的新架构提案[2][14]。另外，行业实践指出通过容器和 OS 级隔离（如 Bubblewrap）能够实现快速、安全的执行环境[10]，并可利用预热池机制进一步降低冷启动延迟[6][7]。综上所述，本方案在安全隔离、性能和可扩展性上进行了充分权衡设计。

[1] [2] [3] [6] [8] [9] [11] [12] [14] Unleashing autonomous AI agents: Why Kubernetes needs a new standard for agent execution | Google Open Source Blog
https://opensource.googleblog.com/2025/11/unleashing-autonomous-ai-agents-why-kubernetes-needs-a-new-standard-for-agent-execution.html
[4] [13] GitHub - alibaba/OpenSandbox: A universal sandbox platform for AI application scenarios, providing multi-language SDKs, unified sandbox protocols, and sandbox runtimes for LLM-related capabilities.
https://github.com/alibaba/OpenSandbox
[5] Overview - Documentation
https://novita.ai/docs/guides/sandbox-agent-runtime-introduction
[7] [10] [15] Agent Sandbox Execution Environments: Architectures, Security, Applications, and Future Trends
https://mgx.dev/insights/agent-sandbox-execution-environments-architectures-security-applications-and-future-trends/3e156ec564934dccb3aeaf2d8eeaa449