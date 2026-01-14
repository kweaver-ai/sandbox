/**
 * 会话管理页面
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  Table,
  Modal,
  Form,
  Select,
  Tag,
  Space,
  Popconfirm,
  Card,
  Statistic,
  Upload,
  message,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { useSessions } from '@hooks/useSessions';
import { useTemplates } from '@hooks/useTemplates';
import { SESSION_STATUS_LABELS, RUNTIME_TYPE_LABELS, RESOURCE_OPTIONS } from '@constants/runtime';
import type { SessionResponse, CreateSessionRequest, DependencySpec } from '@apis/sessions';
import * as filesApi from '@apis/files';

export default function SessionsPage() {
  const navigate = useNavigate();
  const { sessions, stats, loading, fetchSessions, createSession, terminateSession } =
    useSessions();
  const { templates, fetchTemplates } = useTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailSession, setDetailSession] = useState<SessionResponse | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [dependencies, setDependencies] = useState<DependencySpec[]>([]);
  const [depInput, setDepInput] = useState('');
  const [form] = Form.useForm<CreateSessionRequest>();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSessionId, setUploadSessionId] = useState<string>('');
  const [uploadSessionName, setUploadSessionName] = useState<string>('');
  const [filePath, setFilePath] = useState<string>('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 初始加载和定时刷新
  useEffect(() => {
    fetchSessions();

    // 设置30秒定时刷新
    timerRef.current = setInterval(() => {
      fetchSessions();
    }, 30000);

    // 清理定时器
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fetchSessions]);

  // 打开创建模态框时获取模板列表
  const handleOpenCreateModal = async () => {
    await fetchTemplates();
    setShowCreateModal(true);
  };

  // 当选择模版时，自动带入配置
  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      // 自动填充资源配置
      form.setFieldsValue({
        cpu: template.default_cpu_cores.toString(),
        memory: `${template.default_memory_mb}Mi`,
        disk: `${template.default_disk_mb}Mi`,
        timeout: template.default_timeout_sec,
      });
    }
  };

  // 查看详情
  const handleViewDetail = (record: SessionResponse) => {
    setDetailSession(record);
    setShowDetailModal(true);
  };

  // 跳转到执行页面并选中会话
  const handleExecuteCode = (sessionId: string) => {
    navigate(`/execute?sessionId=${sessionId}`);
  };

  // 过滤会话
  const filteredSessions = sessions.filter(
    (s) =>
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.template_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 创建会话
  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const data: CreateSessionRequest = {
        ...values,
        dependencies: depInput
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => {
            const parts = line.trim().split(/==|>=|<=|>|~/);
            const name = parts[0]?.trim();
            const version = parts[1]?.trim();
            return { name: name!, version };
          })
          .filter((dep) => dep.name),
      };
      await createSession(data);
      setShowCreateModal(false);
      form.resetFields();
      setDepInput('');
      setDependencies([]);
    } catch (error) {
      // 表单验证失败或创建失败
    }
  };

  // 终止会话
  const handleTerminate = async (id: string) => {
    try {
      await terminateSession(id);
    } catch (error) {
      // 终止失败
    }
  };

  // 打开上传文件模态框
  const handleOpenUploadModal = (record: SessionResponse) => {
    setUploadSessionId(record.id);
    setUploadSessionName(record.id);
    setShowUploadModal(true);
  };

  // 处理文件上传
  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('请选择要上传的文件');
      return;
    }

    setUploading(true);
    try {
      for (const file of fileList) {
        if (file.originFileObj) {
          // 使用文件名作为默认路径，如果用户没有指定路径的话
          const uploadPath = filePath || file.name;
          await filesApi.uploadFile(uploadSessionId, file.originFileObj, uploadPath);
        }
      }
      message.success('文件上传成功');
      setFileList([]);
      setFilePath('');
      setShowUploadModal(false);
    } catch (error) {
      message.error('文件上传失败');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // 状态配置 - 支持小写状态值（API 返回小写）
  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      { color: string; icon: string; label: string }
    > = {
      PENDING: { color: 'warning', icon: '⏱', label: SESSION_STATUS_LABELS.PENDING },
      CREATING: { color: 'processing', icon: '🔄', label: SESSION_STATUS_LABELS.CREATING },
      STARTING: { color: 'processing', icon: '🔄', label: SESSION_STATUS_LABELS.STARTING },
      RUNNING: { color: 'processing', icon: '⚡', label: SESSION_STATUS_LABELS.RUNNING },
      COMPLETED: { color: 'success', icon: '✓', label: SESSION_STATUS_LABELS.COMPLETED },
      TERMINATED: { color: 'default', icon: '⏹', label: SESSION_STATUS_LABELS.TERMINATED },
      FAILED: { color: 'error', icon: '✗', label: SESSION_STATUS_LABELS.FAILED },
      TIMEOUT: { color: 'error', icon: '⏱', label: SESSION_STATUS_LABELS.TIMEOUT },
      // 支持小写（API 返回）
      pending: { color: 'warning', icon: '⏱', label: SESSION_STATUS_LABELS.PENDING },
      creating: { color: 'processing', icon: '🔄', label: SESSION_STATUS_LABELS.CREATING },
      starting: { color: 'processing', icon: '🔄', label: SESSION_STATUS_LABELS.STARTING },
      running: { color: 'processing', icon: '⚡', label: SESSION_STATUS_LABELS.RUNNING },
      completed: { color: 'success', icon: '✓', label: SESSION_STATUS_LABELS.COMPLETED },
      terminated: { color: 'default', icon: '⏹', label: SESSION_STATUS_LABELS.TERMINATED },
      failed: { color: 'error', icon: '✗', label: SESSION_STATUS_LABELS.FAILED },
      timeout: { color: 'error', icon: '⏱', label: SESSION_STATUS_LABELS.TIMEOUT },
    };
    return configs[status] || configs.PENDING;
  };

  // 表格列定义
  const columns = [
    {
      title: '会话ID',
      dataIndex: 'id',
      key: 'id',
      width: 180,
      render: (id: string) => <code>{id}</code>,
    },
    {
      title: '模版ID',
      dataIndex: 'template_id',
      key: 'template_id',
      width: 180,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.icon} {config.label}</Tag>;
      },
    },
    {
      title: '资源配置',
      key: 'resources',
      width: 200,
      render: (_: unknown, record: SessionResponse) =>
        record.resource_limit
          ? `${record.resource_limit.cpu}核 / ${record.resource_limit.memory} / ${record.resource_limit.disk}`
          : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, record: SessionResponse) => {
        // 判断是否可以终止（只有运行中/启动中的会话可以终止）
        const canTerminate =
          record.status === 'running' ||
          record.status === 'RUNNING' ||
          record.status === 'creating' ||
          record.status === 'CREATING' ||
          record.status === 'starting' ||
          record.status === 'STARTING';

        return (
          <Space size="small">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              title="查看详情"
              onClick={() => handleViewDetail(record)}
            />
            <Button
              type="text"
              icon={<UploadOutlined />}
              size="small"
              title="上传文件"
              onClick={() => handleOpenUploadModal(record)}
              disabled={
                record.status === 'terminated' ||
                record.status === 'TERMINATED' ||
                record.status === 'completed' ||
                record.status === 'COMPLETED'
              }
            />
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              size="small"
              title="执行代码"
              onClick={() => handleExecuteCode(record.id)}
              disabled={
                record.status === 'terminated' ||
                record.status === 'TERMINATED' ||
                record.status === 'completed' ||
                record.status === 'COMPLETED' ||
                record.status === 'failed' ||
                record.status === 'FAILED' ||
                record.status === 'timeout' ||
                record.status === 'TIMEOUT'
              }
            />
            {canTerminate && (
              <Popconfirm
                title="确认终止"
                description="确定要终止该会话吗？"
                onConfirm={() => handleTerminate(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="text"
                  danger
                  icon={<StopOutlined />}
                  size="small"
                  title="终止会话"
                />
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <div
            style={{
              width: 2,
              height: 18,
              backgroundColor: '#126ee3',
              borderRadius: 4,
              marginRight: 8,
            }}
          />
          <h2
            style={{
              fontSize: 15,
              fontWeight: 500,
              margin: 0,
              color: '#000000',
            }}
          >
            会话管理
          </h2>
        </div>
        <p style={{ fontSize: 13, color: '#677489', marginLeft: 12, marginTop: 0, marginBottom: 0 }}>
          创建和管理代码执行会话
        </p>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <Card
          style={{ flex: 1, borderRadius: 12, border: '1px solid #e7edf7' }}
          bodyStyle={{ padding: 24 }}
        >
          <Statistic title="总会话数（个）" value={stats.total} />
        </Card>
        <Card
          style={{ flex: 1, borderRadius: 12, border: '1px solid #e7edf7' }}
          bodyStyle={{ padding: 24 }}
        >
          <Statistic
            title="启动中（个）"
            value={stats.starting}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
        <Card
          style={{ flex: 1, borderRadius: 12, border: '1px solid #e7edf7' }}
          bodyStyle={{ padding: 24 }}
        >
          <Statistic
            title="运行中（个）"
            value={stats.running}
            valueStyle={{ color: '#126ee3' }}
          />
        </Card>
        <Card
          style={{ flex: 1, borderRadius: 12, border: '1px solid #e7edf7' }}
          bodyStyle={{ padding: 24 }}
        >
          <Statistic
            title="已终止（个）"
            value={stats.terminated}
            valueStyle={{ color: '#8c8c8c' }}
          />
        </Card>
      </div>

      {/* 会话列表 */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e7edf7',
          padding: 24,
        }}
      >
        {/* 搜索和操作栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <Input
            placeholder="搜索会话ID或模版ID"
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 320 }}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            创建会话
          </Button>
        </div>

        {/* 会话表格 */}
        <Table
          columns={columns}
          dataSource={filteredSessions}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
        />
      </div>

      {/* 创建会话对话框 */}
      <Modal
        title="创建新会话"
        open={showCreateModal}
        onOk={handleCreate}
        onCancel={() => {
          setShowCreateModal(false);
          form.resetFields();
          setDepInput('');
          setDependencies([]);
        }}
        width={600}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="template_id"
            label="选择模版"
            rules={[{ required: true, message: '请选择模版' }]}
          >
            <Select placeholder="请选择模版" onChange={handleTemplateChange}>
              {templates
                .filter((t) => t.is_active)
                .map((t) => (
                  <Select.Option key={t.id} value={t.id}>
                    {t.name} ({RUNTIME_TYPE_LABELS[t.runtime_type as keyof typeof RUNTIME_TYPE_LABELS] || t.runtime_type})
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="cpu"
              label="CPU"
              rules={[{ required: true, message: '请输入CPU' }]}
              initialValue="1"
            >
              <Select placeholder="例如: 1, 2">
                {RESOURCE_OPTIONS.CPU.map((cpu) => (
                  <Select.Option key={cpu} value={cpu}>
                    {cpu} 核
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="memory"
              label="内存"
              rules={[{ required: true, message: '请输入内存' }]}
              initialValue="512Mi"
            >
              <Select placeholder="例如: 512Mi, 1Gi">
                {RESOURCE_OPTIONS.MEMORY.map((mem) => (
                  <Select.Option key={mem} value={mem}>
                    {mem}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="disk"
              label="磁盘"
              rules={[{ required: true, message: '请输入磁盘' }]}
              initialValue="1Gi"
            >
              <Select placeholder="例如: 1Gi, 10Gi">
                {RESOURCE_OPTIONS.DISK.map((disk) => (
                  <Select.Option key={disk} value={disk}>
                    {disk}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="timeout"
              label="超时(秒)"
              rules={[{ required: true, message: '请输入超时时间' }]}
              initialValue={300}
            >
              <Select>
                <Select.Option value={60}>1 分钟</Select.Option>
                <Select.Option value={300}>5 分钟</Select.Option>
                <Select.Option value={600}>10 分钟</Select.Option>
                <Select.Option value={1800}>30 分钟</Select.Option>
                <Select.Option value={3600}>60 分钟</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item label="Python 依赖包（可选）">
            <Input.TextArea
              value={depInput}
              onChange={(e) => setDepInput(e.target.value)}
              placeholder="每行一个包，例如:&#10;requests==2.31.0&#10;pandas>=1.5.0"
              rows={4}
            />
            <div style={{ fontSize: 12, color: '#677489', marginTop: 8 }}>
              支持 ==、{'>='}、{'<='}、{'>'}、~ 等版本约束符号
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情模态框 */}
      <Modal
        title="会话详情"
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowDetailModal(false)}>
            关闭
          </Button>,
          <Button
            key="execute"
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => {
              setShowDetailModal(false);
              if (detailSession) {
                handleExecuteCode(detailSession.id);
              }
            }}
          >
            执行代码
          </Button>,
        ]}
        width={700}
      >
        {detailSession && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#677489' }}>会话ID</label>
              <div style={{ fontSize: 14, marginTop: 4 }}>
                <code>{detailSession.id}</code>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#677489' }}>模版ID</label>
              <div style={{ fontSize: 14, marginTop: 4 }}>{detailSession.template_id}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#677489' }}>状态</label>
              <div style={{ fontSize: 14, marginTop: 4 }}>
                {getStatusConfig(detailSession.status).label}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#677489' }}>运行时类型</label>
              <div style={{ fontSize: 14, marginTop: 4 }}>
                {RUNTIME_TYPE_LABELS[detailSession.runtime_type as keyof typeof RUNTIME_TYPE_LABELS] || detailSession.runtime_type}
              </div>
            </div>

            {detailSession.resource_limit && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#677489' }}>资源配置</label>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  {detailSession.resource_limit.cpu} 核 / {detailSession.resource_limit.memory} / {detailSession.resource_limit.disk}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#677489' }}>超时时间</label>
              <div style={{ fontSize: 14, marginTop: 4 }}>{detailSession.timeout} 秒</div>
            </div>

            {detailSession.workspace_path && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#677489' }}>工作空间</label>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  <code style={{ fontSize: 12 }}>{detailSession.workspace_path}</code>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#677489' }}>运行时节点</label>
              <div style={{ fontSize: 14, marginTop: 4 }}>{detailSession.runtime_node || '-'}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#677489' }}>容器ID</label>
              <div style={{ fontSize: 14, marginTop: 4 }}>
                <code style={{ fontSize: 12 }}>{detailSession.container_id || '-'}</code>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#677489' }}>创建时间</label>
              <div style={{ fontSize: 14, marginTop: 4 }}>{detailSession.created_at}</div>
            </div>

            {detailSession.completed_at && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#677489' }}>完成时间</label>
                <div style={{ fontSize: 14, marginTop: 4 }}>{detailSession.completed_at}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 上传文件模态框 */}
      <Modal
        title="上传文件"
        open={showUploadModal}
        onOk={handleUpload}
        onCancel={() => {
          setShowUploadModal(false);
          setFileList([]);
          setFilePath('');
        }}
        confirmLoading={uploading}
        okText="上传"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>会话：{uploadSessionName}</p>
          <p style={{ fontSize: 12, color: '#677489', margin: 0 }}>
            文件将上传到会话的工作空间目录
          </p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            文件路径 <span style={{ color: '#8c8c8c' }}>(可选，默认使用文件名)</span>
          </label>
          <Input
            placeholder="例如: data/input.csv 或 scripts/main.py"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 12, color: '#677489', marginTop: 8 }}>
            可指定文件在工作空间中的路径，留空则使用原文件名
          </div>
        </div>
        <Upload
          fileList={fileList}
          onChange={({ fileList }) => setFileList(fileList)}
          beforeUpload={() => false}
          onRemove={() => true}
          multiple
        >
          <Button icon={<UploadOutlined />}>选择文件</Button>
        </Upload>
      </Modal>
    </>
  );
}
