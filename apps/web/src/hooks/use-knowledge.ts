import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  KnowledgeArticle,
  CreateKnowledgeArticleInput,
  UpdateKnowledgeArticleInput,
  PaginatedResponse,
} from '@/types';

export function useKnowledgeArticles(params?: {
  page?: number;
  limit?: number;
  status?: string;
  categoryId?: string;
  authorId?: string;
  keyword?: string;
  search?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
  if (params?.authorId) queryParams.append('authorId', params.authorId);
  if (params?.keyword) queryParams.append('keyword', params.keyword);
  if (params?.search) queryParams.append('search', params.search);

  const queryString = queryParams.toString();
  const endpoint = `/knowledge${queryString ? `?${queryString}` : ''}`;

  return useQuery<PaginatedResponse<KnowledgeArticle>>({
    queryKey: ['knowledge', params],
    queryFn: () => apiClient.get(endpoint),
  });
}

export function useKnowledgeArticle(id: string) {
  return useQuery<KnowledgeArticle>({
    queryKey: ['knowledge', id],
    queryFn: () => apiClient.get(`/knowledge/${id}`),
    enabled: !!id,
  });
}

export function useCreateKnowledgeArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateKnowledgeArticleInput) =>
      apiClient.post<KnowledgeArticle>('/knowledge', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
    },
  });
}

export function useUpdateKnowledgeArticle(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateKnowledgeArticleInput) =>
      apiClient.patch<KnowledgeArticle>(`/knowledge/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge', id] });
    },
  });
}

export function useDeleteKnowledgeArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/knowledge/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
    },
  });
}

export function usePublishKnowledgeArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, publisherId }: { id: string; publisherId: string }) =>
      apiClient.post<KnowledgeArticle>(`/knowledge/${id}/publish`, { publisherId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
    },
  });
}

export function useArchiveKnowledgeArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.post<KnowledgeArticle>(`/knowledge/${id}/archive`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
    },
  });
}

export function useRateKnowledgeArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      userId,
      rating,
      comment,
    }: {
      id: string;
      userId: string;
      rating: number;
      comment?: string;
    }) => apiClient.post(`/knowledge/${id}/rate`, { userId, rating, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
    },
  });
}
