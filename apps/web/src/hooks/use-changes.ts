import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  Change,
  CreateChangeInput,
  UpdateChangeInput,
  PaginatedResponse,
} from '@/types';

export function useChanges(params?: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  priority?: string;
  requesterId?: string;
  assigneeId?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.type) queryParams.append('type', params.type);
  if (params?.priority) queryParams.append('priority', params.priority);
  if (params?.requesterId) queryParams.append('requesterId', params.requesterId);
  if (params?.assigneeId) queryParams.append('assigneeId', params.assigneeId);

  const queryString = queryParams.toString();
  const endpoint = `/changes${queryString ? `?${queryString}` : ''}`;

  return useQuery<PaginatedResponse<Change>>({
    queryKey: ['changes', params],
    queryFn: () => apiClient.get(endpoint),
  });
}

export function useChange(id: string) {
  return useQuery<Change>({
    queryKey: ['changes', id],
    queryFn: () => apiClient.get(`/changes/${id}`),
    enabled: !!id,
  });
}

export function useCreateChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChangeInput) => apiClient.post<Change>('/changes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changes'] });
    },
  });
}

export function useUpdateChange(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateChangeInput) =>
      apiClient.patch<Change>(`/changes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changes'] });
      queryClient.invalidateQueries({ queryKey: ['changes', id] });
    },
  });
}

export function useDeleteChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/changes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changes'] });
    },
  });
}

export function useSubmitChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.post<Change>(`/changes/${id}/submit`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changes'] });
    },
  });
}

export function useApproveChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approverId, notes }: { id: string; approverId: string; notes?: string }) =>
      apiClient.post<Change>(`/changes/${id}/approve`, { approverId, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changes'] });
    },
  });
}

export function useRejectChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, rejectedById, reason }: { id: string; rejectedById: string; reason: string }) =>
      apiClient.post<Change>(`/changes/${id}/reject`, { rejectedById, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changes'] });
    },
  });
}

export function useScheduleChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, scheduledStartAt, scheduledEndAt }: { id: string; scheduledStartAt: string; scheduledEndAt: string }) =>
      apiClient.post<Change>(`/changes/${id}/schedule`, { scheduledStartAt, scheduledEndAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changes'] });
    },
  });
}

export function useImplementChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, actualStartAt }: { id: string; actualStartAt?: string }) =>
      apiClient.post<Change>(`/changes/${id}/implement`, { actualStartAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changes'] });
    },
  });
}

export function useCompleteChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, actualEndAt, reviewNotes }: { id: string; actualEndAt?: string; reviewNotes?: string }) =>
      apiClient.post<Change>(`/changes/${id}/complete`, { actualEndAt, reviewNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changes'] });
    },
  });
}
