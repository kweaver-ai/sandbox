/**
 * API 相关常量
 */

/** API 基础 URL */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/** API 端点路径 */
export const API_ENDPOINTS = {
  // Health
  HEALTH: '/api/v1/health',
  HEALTH_DETAILED: '/api/v1/health/detailed',

  // Templates
  TEMPLATES: '/api/v1/templates',
  TEMPLATE: (id: string) => `/api/v1/templates/${id}`,

  // Sessions
  SESSIONS: '/api/v1/sessions',
  SESSION: (id: string) => `/api/v1/sessions/${id}`,

  // Executions
  EXECUTE: (sessionId: string) => `/api/v1/executions/sessions/${sessionId}/execute`,
  EXECUTION_STATUS: (id: string) => `/api/v1/executions/${id}/status`,
  EXECUTION_RESULT: (id: string) => `/api/v1/executions/${id}/result`,
  EXECUTIONS_BY_SESSION: (sessionId: string) =>
    `/api/v1/executions/sessions/${sessionId}/executions`,

  // Files
  UPLOAD_FILE: (sessionId: string) => `/api/v1/sessions/${sessionId}/files/upload`,
  DOWNLOAD_FILE: (sessionId: string, filePath: string) =>
    `/api/v1/sessions/${sessionId}/files/${filePath}`,
} as const;

/** 默认分页参数 */
export const DEFAULT_PAGINATION = {
  LIMIT: 50,
  OFFSET: 0,
} as const;

/** HTTP 超时时间（毫秒） */
export const HTTP_TIMEOUT = 30000;
