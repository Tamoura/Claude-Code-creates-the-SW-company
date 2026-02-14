import { useState, useEffect, useCallback } from 'react';

export interface Plan {
  id: string;
  name: string;
  tier: string;
  priceMonthly: number;
  priceAnnual: number;
  features: Record<string, boolean | number | string>;
}

export interface Subscription {
  plan_id: string;
  tier: string;
  status: string;
  created_at?: string;
  changed_at?: string;
}

export interface SubscriptionApiClient {
  getSubscription(): Promise<{ subscription: Subscription; plan: Plan | null }>;
  getPlans(): Promise<{ data: Plan[] }>;
  changePlan(planId: string): Promise<{ subscription: Subscription; plan: Plan | null }>;
  cancel(): Promise<{ subscription: Subscription }>;
  getUsage?(): Promise<{ usage: Record<string, number>; limits: Record<string, number | string> }>;
}

export function useSubscription(apiClient: SubscriptionApiClient) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [limits, setLimits] = useState<Record<string, number | string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [subResult, plansResult] = await Promise.all([
        apiClient.getSubscription(),
        apiClient.getPlans(),
      ]);
      setSubscription(subResult.subscription);
      setCurrentPlan(subResult.plan);
      setPlans(plansResult.data);

      if (apiClient.getUsage) {
        const usageResult = await apiClient.getUsage();
        setUsage(usageResult.usage);
        setLimits(usageResult.limits);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    load();
  }, [load]);

  const changePlan = useCallback(async (planId: string) => {
    setError(null);
    try {
      const result = await apiClient.changePlan(planId);
      setSubscription(result.subscription);
      setCurrentPlan(result.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change plan');
      throw err;
    }
  }, [apiClient]);

  const cancel = useCallback(async () => {
    setError(null);
    try {
      const result = await apiClient.cancel();
      setSubscription(result.subscription);
      const freePlan = plans.find((p) => p.priceMonthly === 0) ?? null;
      setCurrentPlan(freePlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
      throw err;
    }
  }, [apiClient, plans]);

  return {
    subscription,
    currentPlan,
    plans,
    usage,
    limits,
    isLoading,
    error,
    changePlan,
    cancel,
    reload: load,
  };
}
