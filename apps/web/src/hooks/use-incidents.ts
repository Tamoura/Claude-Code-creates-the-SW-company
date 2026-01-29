import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  Incident,
  CreateIncidentInput,
  UpdateIncidentInput,
  PaginatedResponse,
} from '@/types';

export function useIncidents(params?: {
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
  const endpoint = `/incidents${queryString ? `?${queryString}` : ''}`;

  return useQuery<PaginatedResponse<Incident>>({
    queryKey: ['incidents', params],
    queryFn: () => apiClient.get(endpoint),
  });
}

export function useIncident(id: string) {
  return useQuery<Incident>({
    queryKey: ['incidents', id],
    queryFn: () => apiClient.get(`/incidents/${id}`),
    enabled: !!id,
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateIncidentInput) => apiClient.post<Incident>('/incidents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

export function useUpdateIncident(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateIncidentInput) =>
      apiClient.patch<Incident>(`/incidents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incidents', id] });
    },
  });
}

export function useDeleteIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/incidents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}
