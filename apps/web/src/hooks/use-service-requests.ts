import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  ServiceRequest,
  ServiceCatalogItem,
  CreateServiceRequestInput,
  UpdateServiceRequestInput,
  CreateCatalogItemInput,
  UpdateCatalogItemInput,
  PaginatedResponse,
} from '@/types';

// Service Request Hooks

export function useServiceRequests(params?: {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  requesterId?: string;
  fulfillerId?: string;
  catalogItemId?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.priority) queryParams.append('priority', params.priority);
  if (params?.requesterId) queryParams.append('requesterId', params.requesterId);
  if (params?.fulfillerId) queryParams.append('fulfillerId', params.fulfillerId);
  if (params?.catalogItemId) queryParams.append('catalogItemId', params.catalogItemId);

  const queryString = queryParams.toString();
  const endpoint = `/service-requests${queryString ? `?${queryString}` : ''}`;

  return useQuery<PaginatedResponse<ServiceRequest>>({
    queryKey: ['service-requests', params],
    queryFn: () => apiClient.get(endpoint),
  });
}

export function useServiceRequest(id: string) {
  return useQuery<ServiceRequest>({
    queryKey: ['service-requests', id],
    queryFn: () => apiClient.get(`/service-requests/${id}`),
    enabled: !!id,
  });
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceRequestInput) =>
      apiClient.post<ServiceRequest>('/service-requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
  });
}

export function useUpdateServiceRequest(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateServiceRequestInput) =>
      apiClient.patch<ServiceRequest>(`/service-requests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['service-requests', id] });
    },
  });
}

export function useDeleteServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/service-requests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
  });
}

export function useApproveServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approverId, notes }: { id: string; approverId: string; notes?: string }) =>
      apiClient.post<ServiceRequest>(`/service-requests/${id}/approve`, { approverId, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
  });
}

export function useRejectServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      rejectedById,
      reason,
    }: {
      id: string;
      rejectedById: string;
      reason: string;
    }) => apiClient.post<ServiceRequest>(`/service-requests/${id}/reject`, { rejectedById, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
  });
}

export function useFulfillServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, fulfillerId, notes }: { id: string; fulfillerId: string; notes?: string }) =>
      apiClient.post<ServiceRequest>(`/service-requests/${id}/fulfill`, { fulfillerId, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
  });
}

export function useCompleteServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      apiClient.post<ServiceRequest>(`/service-requests/${id}/complete`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
  });
}

// Service Catalog Hooks

export function useCatalogItems(params?: {
  page?: number;
  limit?: number;
  categoryId?: string;
  isActive?: boolean;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
  if (params?.isActive !== undefined)
    queryParams.append('isActive', params.isActive.toString());

  const queryString = queryParams.toString();
  const endpoint = `/catalog${queryString ? `?${queryString}` : ''}`;

  return useQuery<PaginatedResponse<ServiceCatalogItem>>({
    queryKey: ['catalog', params],
    queryFn: () => apiClient.get(endpoint),
  });
}

export function useCatalogItem(id: string) {
  return useQuery<ServiceCatalogItem>({
    queryKey: ['catalog', id],
    queryFn: () => apiClient.get(`/catalog/${id}`),
    enabled: !!id,
  });
}

export function useCreateCatalogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCatalogItemInput) =>
      apiClient.post<ServiceCatalogItem>('/catalog', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

export function useUpdateCatalogItem(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCatalogItemInput) =>
      apiClient.patch<ServiceCatalogItem>(`/catalog/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['catalog', id] });
    },
  });
}
