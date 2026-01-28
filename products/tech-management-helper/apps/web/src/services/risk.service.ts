import { apiClient } from '@/lib/api-client';
import type {
  Risk,
  RiskListResponse,
  RiskDetailResponse,
  CreateRiskInput,
  UpdateRiskInput,
  RiskFilters,
} from '@/types/risk';

export class RiskService {
  /**
   * Get list of risks with optional filters
   */
  async getRisks(filters?: RiskFilters): Promise<RiskListResponse> {
    const params = new URLSearchParams();

    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sort) params.append('sort', filters.sort);
    if (filters?.order) params.append('order', filters.order);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.minScore) params.append('minScore', filters.minScore.toString());
    if (filters?.maxScore) params.append('maxScore', filters.maxScore.toString());
    if (filters?.owner) params.append('owner', filters.owner);

    const queryString = params.toString();
    const endpoint = queryString ? `/api/v1/risks?${queryString}` : '/api/v1/risks';

    return apiClient.get<RiskListResponse>(endpoint);
  }

  /**
   * Get single risk by ID
   */
  async getRisk(id: string): Promise<RiskDetailResponse> {
    return apiClient.get<RiskDetailResponse>(`/api/v1/risks/${id}`);
  }

  /**
   * Create a new risk
   */
  async createRisk(data: CreateRiskInput): Promise<RiskDetailResponse> {
    return apiClient.post<RiskDetailResponse>('/api/v1/risks', data);
  }

  /**
   * Update an existing risk
   */
  async updateRisk(id: string, data: UpdateRiskInput): Promise<RiskDetailResponse> {
    return apiClient.put<RiskDetailResponse>(`/api/v1/risks/${id}`, data);
  }

  /**
   * Delete a risk
   */
  async deleteRisk(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/v1/risks/${id}`);
  }

  /**
   * Link a control to a risk
   */
  async linkControl(riskId: string, controlId: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/api/v1/risks/${riskId}/controls`, {
      controlId,
    });
  }

  /**
   * Unlink a control from a risk
   */
  async unlinkControl(riskId: string, controlId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(
      `/api/v1/risks/${riskId}/controls/${controlId}`
    );
  }

  /**
   * Link an asset to a risk
   */
  async linkAsset(riskId: string, assetId: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/api/v1/risks/${riskId}/assets`, {
      assetId,
    });
  }

  /**
   * Unlink an asset from a risk
   */
  async unlinkAsset(riskId: string, assetId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/v1/risks/${riskId}/assets/${assetId}`);
  }
}

export const riskService = new RiskService();
