-- ================================================================
-- Sandbox Control Plane Database Schema for MariaDB
-- Version: 0.2.0
-- Database: adp
--
-- 数据表命名规范:
-- - 表名: t_{module}_{entity} (小写 + 下划线)
-- - 字段名: f_{field_name} (小写 + 下划线)
-- - 时间戳: BIGINT (毫秒级时间戳)
-- - 索引名: t_{table}_idx_{field} / t_{table}_uk_{field}
--
-- 表说明:
-- - t_sandbox_session: 沙箱会话管理表
-- - t_sandbox_execution: 代码执行记录表
-- - t_sandbox_template: 沙箱模板定义表
-- - t_sandbox_runtime_node: 运行时节点注册表
-- ================================================================

USE adp;

-- ================================================================
-- Table: t_sandbox_template
-- ================================================================
-- 沙箱模板定义表（基础表，被 session 引用，先创建）
CREATE TABLE IF NOT EXISTS t_sandbox_template
(
    f_id                  VARCHAR(40 CHAR)  NOT NULL COMMENT '模板唯一标识符',
    f_name                VARCHAR(128 CHAR) NOT NULL COMMENT '模板名称',
    f_description         VARCHAR(500 CHAR) NOT NULL DEFAULT '' COMMENT '模板描述',
    f_image_url           VARCHAR(512 CHAR) NOT NULL COMMENT '容器镜像URL',
    f_base_image          VARCHAR(256 CHAR) NOT NULL DEFAULT '' COMMENT '基础镜像',
    f_runtime_type        VARCHAR(30 CHAR)  NOT NULL COMMENT '运行时类型(python3.11,nodejs20,java17,go1.21)',
    f_default_cpu_cores   DECIMAL(3,1)     NOT NULL DEFAULT 0.5 COMMENT '默认CPU核数',
    f_default_memory_mb   INT              NOT NULL DEFAULT 512 COMMENT '默认内存MB',
    f_default_disk_mb     INT              NOT NULL DEFAULT 1024 COMMENT '默认磁盘MB',
    f_default_timeout_sec INT              NOT NULL DEFAULT 300 COMMENT '默认超时秒数',
    f_pre_installed_packages TEXT          NOT NULL COMMENT '预装包列表JSON',
    f_default_env_vars    TEXT             NOT NULL COMMENT '默认环境变量JSON',
    f_security_context    TEXT             NOT NULL COMMENT '安全策略JSON',
    f_is_active           TINYINT          NOT NULL DEFAULT 1 COMMENT '是否激活(0:否,1:是)',
    f_created_at          BIGINT           NOT NULL DEFAULT 0 COMMENT '创建时间(毫秒时间戳)',
    f_created_by          VARCHAR(40 CHAR) NOT NULL DEFAULT '' COMMENT '创建人',
    f_updated_at          BIGINT           NOT NULL DEFAULT 0 COMMENT '更新时间(毫秒时间戳)',
    f_updated_by          VARCHAR(40 CHAR) NOT NULL DEFAULT '' COMMENT '更新人',
    f_deleted_at          BIGINT           NOT NULL DEFAULT 0 COMMENT '删除时间(毫秒时间戳,0:未删除)',
    f_deleted_by          VARCHAR(36 CHAR) NOT NULL DEFAULT '' COMMENT '删除人',
    PRIMARY KEY (f_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='沙箱模板定义表';

-- Indexes for t_sandbox_template
CREATE UNIQUE INDEX IF NOT EXISTS t_sandbox_template_uk_name_deleted_at ON t_sandbox_template(f_name, f_deleted_at);
CREATE INDEX IF NOT EXISTS t_sandbox_template_idx_runtime_type ON t_sandbox_template(f_runtime_type);
CREATE INDEX IF NOT EXISTS t_sandbox_template_idx_is_active ON t_sandbox_template(f_is_active);
CREATE INDEX IF NOT EXISTS t_sandbox_template_idx_created_at ON t_sandbox_template(f_created_at);
CREATE INDEX IF NOT EXISTS t_sandbox_template_idx_deleted_at ON t_sandbox_template(f_deleted_at);

-- ================================================================
-- Table: t_sandbox_runtime_node
-- ================================================================
-- 运行时节点注册表
CREATE TABLE IF NOT EXISTS t_sandbox_runtime_node
(
    f_node_id             VARCHAR(40 CHAR)  NOT NULL COMMENT '节点唯一标识符',
    f_hostname            VARCHAR(128 CHAR) NOT NULL COMMENT '主机名',
    f_runtime_type        VARCHAR(20 CHAR)  NOT NULL COMMENT '运行时类型(docker,kubernetes)',
    f_ip_address          VARCHAR(45 CHAR)  NOT NULL COMMENT 'IP地址(IPv4/IPv6)',
    f_api_endpoint        VARCHAR(512 CHAR) NOT NULL DEFAULT '' COMMENT 'API端点URL',
    f_status              VARCHAR(20 CHAR)  NOT NULL DEFAULT 'online' COMMENT '节点状态(online,offline,draining,maintenance)',
    f_total_cpu_cores     DECIMAL(5,1)     NOT NULL COMMENT '总CPU核数',
    f_total_memory_mb     INT              NOT NULL COMMENT '总内存MB',
    f_allocated_cpu_cores DECIMAL(5,1)     NOT NULL DEFAULT 0.0 COMMENT '已分配CPU核数',
    f_allocated_memory_mb INT              NOT NULL DEFAULT 0 COMMENT '已分配内存MB',
    f_running_containers  INT              NOT NULL DEFAULT 0 COMMENT '运行容器数',
    f_max_containers      INT              NOT NULL COMMENT '最大容器数',
    f_cached_images       TEXT             NOT NULL COMMENT '缓存镜像列表JSON',
    f_labels              TEXT             NOT NULL COMMENT '节点标签JSON',
    f_last_heartbeat_at   BIGINT           NOT NULL DEFAULT 0 COMMENT '最后心跳时间(毫秒时间戳)',
    f_created_at          BIGINT           NOT NULL DEFAULT 0 COMMENT '创建时间(毫秒时间戳)',
    f_created_by          VARCHAR(40 CHAR) NOT NULL DEFAULT '' COMMENT '创建人',
    f_updated_at          BIGINT           NOT NULL DEFAULT 0 COMMENT '更新时间(毫秒时间戳)',
    f_updated_by          VARCHAR(40 CHAR) NOT NULL DEFAULT '' COMMENT '更新人',
    f_deleted_at          BIGINT           NOT NULL DEFAULT 0 COMMENT '删除时间(毫秒时间戳,0:未删除)',
    f_deleted_by          VARCHAR(36 CHAR) NOT NULL DEFAULT '' COMMENT '删除人',
    PRIMARY KEY (f_node_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='运行时节点注册表';

-- Indexes for t_sandbox_runtime_node
CREATE UNIQUE INDEX IF NOT EXISTS t_sandbox_runtime_node_uk_hostname_deleted_at ON t_sandbox_runtime_node(f_hostname, f_deleted_at);
CREATE INDEX IF NOT EXISTS t_sandbox_runtime_node_idx_status ON t_sandbox_runtime_node(f_status);
CREATE INDEX IF NOT EXISTS t_sandbox_runtime_node_idx_runtime_type ON t_sandbox_runtime_node(f_runtime_type);
CREATE INDEX IF NOT EXISTS t_sandbox_runtime_node_idx_created_at ON t_sandbox_runtime_node(f_created_at);
CREATE INDEX IF NOT EXISTS t_sandbox_runtime_node_idx_deleted_at ON t_sandbox_runtime_node(f_deleted_at);

-- ================================================================
-- Table: t_sandbox_session
-- ================================================================
-- 沙箱会话管理表（含依赖安装支持）
CREATE TABLE IF NOT EXISTS t_sandbox_session
(
    f_id                          VARCHAR(40 CHAR)  NOT NULL COMMENT '会话唯一标识符',
    f_template_id                 VARCHAR(40 CHAR)  NOT NULL COMMENT '模板ID引用',
    f_status                      VARCHAR(20 CHAR)  NOT NULL DEFAULT 'creating' COMMENT '会话状态(creating,running,completed,failed,timeout,terminated)',
    f_runtime_type                VARCHAR(20 CHAR)  NOT NULL COMMENT '运行时类型(python3.11,nodejs20,java17,go1.21)',
    f_runtime_node                VARCHAR(128 CHAR) NOT NULL DEFAULT '' COMMENT '当前运行节点',
    f_container_id                VARCHAR(128 CHAR) NOT NULL DEFAULT '' COMMENT '容器ID',
    f_pod_name                    VARCHAR(128 CHAR) NOT NULL DEFAULT '' COMMENT 'Pod名称',
    f_workspace_path              VARCHAR(256 CHAR) NOT NULL DEFAULT '' COMMENT '工作区路径(S3)',
    f_resources_cpu               VARCHAR(16 CHAR)  NOT NULL COMMENT 'CPU分配(如:1,2)',
    f_resources_memory            VARCHAR(16 CHAR)  NOT NULL COMMENT '内存分配(如:512Mi,1Gi)',
    f_resources_disk              VARCHAR(16 CHAR)  NOT NULL COMMENT '磁盘分配(如:1Gi,10Gi)',
    f_env_vars                    TEXT             NOT NULL COMMENT '环境变量JSON',
    f_timeout                     INT              NOT NULL DEFAULT 300 COMMENT '超时时间(秒)',
    f_last_activity_at            BIGINT           NOT NULL DEFAULT 0 COMMENT '最后活动时间(毫秒时间戳)',
    f_completed_at                BIGINT           NOT NULL DEFAULT 0 COMMENT '完成时间(毫秒时间戳,0:未完成)',

    -- 依赖安装字段
    f_requested_dependencies      TEXT             NOT NULL COMMENT '请求的依赖包JSON',
    f_installed_dependencies      TEXT             NOT NULL COMMENT '已安装的依赖包JSON',
    f_dependency_install_status   VARCHAR(20 CHAR) NOT NULL DEFAULT 'pending' COMMENT '依赖安装状态(pending,installing,completed,failed)',
    f_dependency_install_error    TEXT             NOT NULL COMMENT '依赖安装错误信息',
    f_dependency_install_started_at   BIGINT       NOT NULL DEFAULT 0 COMMENT '依赖安装开始时间(毫秒时间戳)',
    f_dependency_install_completed_at BIGINT       NOT NULL DEFAULT 0 COMMENT '依赖安装完成时间(毫秒时间戳)',

    -- 审计字段
    f_created_at                  BIGINT           NOT NULL DEFAULT 0 COMMENT '创建时间(毫秒时间戳)',
    f_created_by                  VARCHAR(40 CHAR) NOT NULL DEFAULT '' COMMENT '创建人',
    f_updated_at                  BIGINT           NOT NULL DEFAULT 0 COMMENT '更新时间(毫秒时间戳)',
    f_updated_by                  VARCHAR(40 CHAR) NOT NULL DEFAULT '' COMMENT '更新人',
    f_deleted_at                  BIGINT           NOT NULL DEFAULT 0 COMMENT '删除时间(毫秒时间戳,0:未删除)',
    f_deleted_by                  VARCHAR(36 CHAR) NOT NULL DEFAULT '' COMMENT '删除人',
    PRIMARY KEY (f_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='沙箱会话管理表';

-- Indexes for t_sandbox_session
CREATE INDEX IF NOT EXISTS t_sandbox_session_idx_template_id ON t_sandbox_session(f_template_id);
CREATE INDEX IF NOT EXISTS t_sandbox_session_idx_status ON t_sandbox_session(f_status);
CREATE INDEX IF NOT EXISTS t_sandbox_session_idx_runtime_node ON t_sandbox_session(f_runtime_node);
CREATE INDEX IF NOT EXISTS t_sandbox_session_idx_last_activity_at ON t_sandbox_session(f_last_activity_at);
CREATE INDEX IF NOT EXISTS t_sandbox_session_idx_dependency_install_status ON t_sandbox_session(f_dependency_install_status);
CREATE INDEX IF NOT EXISTS t_sandbox_session_idx_created_at ON t_sandbox_session(f_created_at);
CREATE INDEX IF NOT EXISTS t_sandbox_session_idx_deleted_at ON t_sandbox_session(f_deleted_at);
CREATE INDEX IF NOT EXISTS t_sandbox_session_idx_created_by ON t_sandbox_session(f_created_by);

-- ================================================================
-- Table: t_sandbox_execution
-- ================================================================
-- 代码执行记录表
CREATE TABLE IF NOT EXISTS t_sandbox_execution
(
    f_id              VARCHAR(40 CHAR)  NOT NULL COMMENT '执行唯一标识符',
    f_session_id      VARCHAR(40 CHAR)  NOT NULL COMMENT '会话ID引用',
    f_status          VARCHAR(20 CHAR)  NOT NULL DEFAULT 'pending' COMMENT '执行状态(pending,running,completed,failed,timeout,crashed)',
    f_code            TEXT              NOT NULL COMMENT '源代码',
    f_language        VARCHAR(32 CHAR)  NOT NULL COMMENT '编程语言',
    f_entrypoint      VARCHAR(255 CHAR) NOT NULL DEFAULT '' COMMENT '入口函数',
    f_event_data      TEXT              NOT NULL COMMENT '事件数据JSON',
    f_timeout_sec     INT               NOT NULL COMMENT '超时时间(秒)',
    f_return_value    TEXT              NOT NULL COMMENT '返回值JSON',
    f_stdout          TEXT              NOT NULL COMMENT '标准输出',
    f_stderr          TEXT              NOT NULL COMMENT '标准错误',
    f_exit_code       INT               NOT NULL DEFAULT 0 COMMENT '退出码',
    f_metrics         TEXT              NOT NULL COMMENT '性能指标JSON',
    f_error_message   TEXT              NOT NULL COMMENT '错误信息',
    f_started_at      BIGINT            NOT NULL DEFAULT 0 COMMENT '执行开始时间(毫秒时间戳)',
    f_completed_at    BIGINT            NOT NULL DEFAULT 0 COMMENT '执行完成时间(毫秒时间戳)',

    -- 审计字段
    f_created_at      BIGINT            NOT NULL DEFAULT 0 COMMENT '创建时间(毫秒时间戳)',
    f_created_by      VARCHAR(40 CHAR)  NOT NULL DEFAULT '' COMMENT '创建人',
    f_updated_at      BIGINT            NOT NULL DEFAULT 0 COMMENT '更新时间(毫秒时间戳)',
    f_updated_by      VARCHAR(40 CHAR)  NOT NULL DEFAULT '' COMMENT '更新人',
    f_deleted_at      BIGINT            NOT NULL DEFAULT 0 COMMENT '删除时间(毫秒时间戳,0:未删除)',
    f_deleted_by      VARCHAR(36 CHAR)  NOT NULL DEFAULT '' COMMENT '删除人',
    PRIMARY KEY (f_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代码执行记录表';

-- Indexes for t_sandbox_execution
CREATE INDEX IF NOT EXISTS t_sandbox_execution_idx_session_id ON t_sandbox_execution(f_session_id);
CREATE INDEX IF NOT EXISTS t_sandbox_execution_idx_status ON t_sandbox_execution(f_status);
CREATE INDEX IF NOT EXISTS t_sandbox_execution_idx_created_at ON t_sandbox_execution(f_created_at);
CREATE INDEX IF NOT EXISTS t_sandbox_execution_idx_deleted_at ON t_sandbox_execution(f_deleted_at);
CREATE INDEX IF NOT EXISTS t_sandbox_execution_idx_created_by ON t_sandbox_execution(f_created_by);
