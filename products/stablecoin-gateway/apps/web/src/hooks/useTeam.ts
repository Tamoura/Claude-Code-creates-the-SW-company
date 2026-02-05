import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  role: TeamRole;
  invited_by: string | null;
  joined_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  members: TeamMember[];
}

export interface OrganizationSummary {
  id: string;
  name: string;
  role: TeamRole;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

interface UseTeamReturn {
  organizations: OrganizationSummary[];
  currentOrg: Organization | null;
  isLoading: boolean;
  error: string | null;
  createOrganization: (name: string) => Promise<void>;
  selectOrganization: (orgId: string) => Promise<void>;
  clearCurrentOrg: () => void;
  addMember: (orgId: string, email: string, role: TeamRole) => Promise<void>;
  updateMemberRole: (orgId: string, memberId: string, role: TeamRole) => Promise<void>;
  removeMember: (orgId: string, memberId: string) => Promise<void>;
  leaveOrganization: (orgId: string) => Promise<void>;
}

export function useTeam(): UseTeamReturn {
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganizations = useCallback(async () => {
    try {
      setError(null);
      const result = await apiClient.listOrganizations();
      setOrganizations(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load organizations';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const clearCurrentOrg = useCallback(() => {
    setCurrentOrg(null);
  }, []);

  const selectOrganization = useCallback(async (orgId: string) => {
    try {
      setError(null);
      const org = await apiClient.getOrganization(orgId);
      setCurrentOrg(org);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load organization';
      setError(message);
    }
  }, []);

  const createOrganization = useCallback(async (name: string) => {
    setError(null);
    try {
      const org = await apiClient.createOrganization(name);
      // Refresh list
      await loadOrganizations();
      // Select the newly created org
      setCurrentOrg(org);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create organization';
      setError(message);
      throw err;
    }
  }, [loadOrganizations]);

  const addMember = useCallback(async (orgId: string, email: string, role: TeamRole) => {
    setError(null);
    try {
      await apiClient.addTeamMember(orgId, email, role);
      // Refresh org details
      const org = await apiClient.getOrganization(orgId);
      setCurrentOrg(org);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add member';
      setError(message);
      throw err;
    }
  }, []);

  const updateMemberRole = useCallback(async (orgId: string, memberId: string, role: TeamRole) => {
    setError(null);
    try {
      await apiClient.updateTeamMemberRole(orgId, memberId, role);
      // Refresh org details
      const org = await apiClient.getOrganization(orgId);
      setCurrentOrg(org);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update member role';
      setError(message);
      throw err;
    }
  }, []);

  const removeMember = useCallback(async (orgId: string, memberId: string) => {
    setError(null);
    try {
      await apiClient.removeTeamMember(orgId, memberId);
      // Refresh org details
      const org = await apiClient.getOrganization(orgId);
      setCurrentOrg(org);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove member';
      setError(message);
      throw err;
    }
  }, []);

  const leaveOrganization = useCallback(async (orgId: string) => {
    setError(null);
    try {
      await apiClient.leaveOrganization(orgId);
      setCurrentOrg(null);
      // Refresh list
      await loadOrganizations();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to leave organization';
      setError(message);
      throw err;
    }
  }, [loadOrganizations]);

  return {
    organizations,
    currentOrg,
    isLoading,
    error,
    createOrganization,
    selectOrganization,
    clearCurrentOrg,
    addMember,
    updateMemberRole,
    removeMember,
    leaveOrganization,
  };
}
