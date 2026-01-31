import { AssessmentResponse, Scores, ReportData } from '../types';

const API_BASE = '/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  id?: string;
  token?: string;
  aiAnalysis?: string;
  aiStatus?: string;
  aiGeneratedAt?: string;
  aiWordCount?: number;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || data.error || '请求失败',
      };
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      message: '网络错误，请检查连接',
    };
  }
}

export const api = {
  /**
   * Validate and activate a redemption code
   */
  validateCode: async (
    code: string,
    visitorId?: string
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    return fetchApi('/codes?action=validate', {
      method: 'POST',
      body: JSON.stringify({ code, visitorId }),
    });
  },

  /**
   * Save user progress
   */
  saveProgress: async (
    userId: string,
    _page: number,
    responses: AssessmentResponse
  ): Promise<void> => {
    await fetchApi('/progress', {
      method: 'POST',
      body: JSON.stringify({ userId, responses }),
    });
  },

  /**
   * Get saved progress
   */
  getProgress: async (
    userId: string
  ): Promise<{ responses: AssessmentResponse } | null> => {
    const result = await fetchApi<{ responses: AssessmentResponse }>(
      `/progress?userId=${encodeURIComponent(userId)}`
    );
    return result.success && result.data ? result.data : null;
  },

  /**
   * Submit completed assessment
   */
  submitAssessment: async (
    userId: string,
    code: string,
    responses: AssessmentResponse,
    scores: Scores
  ): Promise<{ success: boolean; id?: string; message?: string }> => {
    const result = await fetchApi<{ id: string }>('/assessments/submit', {
      method: 'POST',
      body: JSON.stringify({
        visitorId: userId,
        code,
        responses,
        scores,
      }),
    });

    return {
      success: result.success,
      id: result.success ? result.id || result.data?.id : undefined,
      message: result.message,
    };
  },

  /**
   * Update AI analysis status (kept for compatibility)
   */
  updateAIAnalysis: async (
    _id: string,
    _update: Partial<ReportData>
  ): Promise<void> => {
    // This is now handled by the backend AI endpoint
  },

  /**
   * Get assessment by ID
   */
  getAssessment: async (id: string): Promise<any | null> => {
    const result = await fetchApi(`/assessments/${id}`);
    return result.success ? result.data : null;
  },

  /**
   * Trigger AI analysis (calls secure backend endpoint)
   */
  triggerAIAnalysis: async (
    assessmentId: string,
    userData: any
  ): Promise<{
    success: boolean;
    aiAnalysis?: string;
    aiStatus?: string;
    aiGeneratedAt?: string;
    aiWordCount?: number;
    error?: string;
  }> => {
    const result = await fetchApi('/ai?action=analyze', {
      method: 'POST',
      body: JSON.stringify({ assessmentId, userData }),
    });

    if (result.success) {
      return {
        success: true,
        aiAnalysis: (result as any).aiAnalysis || (result.data as any)?.aiAnalysis,
        aiStatus: (result as any).aiStatus || (result.data as any)?.aiStatus || 'completed',
        aiGeneratedAt: (result as any).aiGeneratedAt || (result.data as any)?.aiGeneratedAt,
        aiWordCount: (result as any).aiWordCount || (result.data as any)?.aiWordCount,
      };
    }

    return {
      success: false,
      error: result.message || result.error,
    };
  },
};

// Admin API functions
export const adminApi = {
  /**
   * Admin login
   */
  login: async (
    username: string,
    password: string
  ): Promise<{ success: boolean; token?: string; error?: string }> => {
    const result = await fetchApi<{ token: string }>('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    return {
      success: result.success,
      token: result.success ? result.token || result.data?.token : undefined,
      error: result.message || result.error,
    };
  },

  /**
   * Get auth headers
   */
  getAuthHeaders: (): HeadersInit => {
    const token = localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  /**
   * List redemption codes
   */
  listCodes: async (params: {
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<any> => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    return fetchApi(`/codes?action=list&${query}`, {
      headers: adminApi.getAuthHeaders(),
    });
  },

  /**
   * Create redemption codes
   */
  createCodes: async (params: {
    count?: number;
    packageType?: string;
    prefix?: string;
    expiresInDays?: number;
  }): Promise<any> => {
    return fetchApi('/codes?action=create', {
      method: 'POST',
      headers: adminApi.getAuthHeaders(),
      body: JSON.stringify(params),
    });
  },

  /**
   * Revoke a redemption code
   */
  revokeCode: async (code: string): Promise<any> => {
    return fetchApi('/codes?action=revoke', {
      method: 'POST',
      headers: adminApi.getAuthHeaders(),
      body: JSON.stringify({ code }),
    });
  },

  /**
   * List assessments
   */
  listAssessments: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    code?: string;
  } = {}): Promise<any> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.status) query.set('status', params.status);
    if (params.code) query.set('code', params.code);

    return fetchApi(`/assessments/list?${query}`, {
      headers: adminApi.getAuthHeaders(),
    });
  },

  /**
   * Export assessments
   */
  exportAssessments: async (params: {
    format?: 'json' | 'xlsx';
    ids?: string[];
  } = {}): Promise<any> => {
    const query = new URLSearchParams();
    if (params.format) query.set('format', params.format);
    if (params.ids?.length) query.set('ids', params.ids.join(','));

    if (params.format === 'xlsx') {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE}/assessments/export?${query}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assessments-${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        return { success: true };
      }

      return { success: false, error: '导出失败' };
    }

    return fetchApi(`/assessments/export?${query}`, {
      headers: adminApi.getAuthHeaders(),
    });
  },
};

export default api;
