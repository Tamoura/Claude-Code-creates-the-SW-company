'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api-client';
import StatCard from '../../../../components/dashboard/StatCard';

interface Tenant {
  id: string;
  name: string;
  status: string;
  config: Record<string, unknown>;
  createdAt: string;
}

interface Overview {
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  revenue: number;
  period: { from: string; to: string };
}

export default function TenantDetailPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ data: Tenant }>(`/api/v1/tenants/${tenantId}`),
      api.get<{ data: Overview }>(`/api/v1/tenants/${tenantId}/analytics/overview?period=30d`).catch(() => null),
    ]).then(([tenantRes, analyticsRes]) => {
      setTenant(tenantRes.data);
      if (analyticsRes) setOverview(analyticsRes.data);
      setLoading(false);
    });
  }, [tenantId]);

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!tenant) return <div className="text-red-500">Tenant not found</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <p className="text-sm text-gray-500">ID: {tenant.id}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          tenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {tenant.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Impressions" value={overview?.impressions?.toLocaleString() || '0'} />
        <StatCard title="Clicks" value={overview?.clicks?.toLocaleString() || '0'} />
        <StatCard
          title="CTR"
          value={`${((overview?.ctr || 0) * 100).toFixed(2)}%`}
        />
        <StatCard
          title="Revenue"
          value={`$${(overview?.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold mb-4">Configuration</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Default Strategy</dt>
              <dd className="font-medium">{(tenant.config as any)?.defaultStrategy || 'trending'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Exclude Purchased</dt>
              <dd className="font-medium">{(tenant.config as any)?.excludePurchased ? 'Yes' : 'No'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Max API Keys</dt>
              <dd className="font-medium">{(tenant.config as any)?.maxApiKeys || 10}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold mb-4">Quick Start</h3>
          <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
            <li>Generate an API key from the API Keys tab</li>
            <li>Upload your product catalog via the Catalog tab</li>
            <li>Add the SDK script tag to your site</li>
            <li>Start tracking events and viewing recommendations</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
