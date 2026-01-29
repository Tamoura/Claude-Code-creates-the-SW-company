import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  Problem,
  CreateProblemInput,
  UpdateProblemInput,
  PaginatedResponse,
} from '@/types';

export function useProblems(params?: {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.priority) queryParams.append('priority', params.priority);

  const queryString = queryParams.toString();
  const endpoint = `/problems${queryString ? `?${queryString}` : ''}`;

  return useQuery<PaginatedResponse<Problem>>({
    queryKey: ['problems', params],
    queryFn: () => apiClient.get(endpoint),
  });
}

export function useProblem(id: string) {
  return useQuery<Problem>({
    queryKey: ['problems', id],
    queryFn: () => apiClient.get(`/problems/${id}`),
    enabled: !!id,
  });
}

export function useCreateProblem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProblemInput) => apiClient.post<Problem>('/problems', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
    },
  });
}

export function useUpdateProblem(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProblemInput) =>
      apiClient.patch<Problem>(`/problems/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      queryClient.invalidateQueries({ queryKey: ['problems', id] });
    },
  });
}

export function useDeleteProblem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/problems/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
    },
  });
}
