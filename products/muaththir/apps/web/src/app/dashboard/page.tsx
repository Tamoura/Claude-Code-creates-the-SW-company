'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DIMENSIONS, getDimensionBySlug } from '../../lib/dimensions';
import DimensionCard from '../../components/dashboard/DimensionCard';
import ObservationCard from '../../components/dashboard/ObservationCard';
import { apiClient, type DashboardData, type Child, type Observation } from '../../lib/api-client';

const RadarChart = dynamic(
  () => import('../../components/dashboard/RadarChart'),
  { ssr: false, loading: () => <div className="w-full h-80 bg-slate-100 rounded-2xl animate-pulse" /> }
);

export default function DashboardPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load children on mount
  useEffect(() => {
    const loadChildren = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getChildren(1, 50);
        setChildren(response.data);

        // Auto-select first child if available
        if (response.data.length > 0) {
          setSelectedChildId(response.data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load children');
      } finally {
        setLoading(false);
      }
    };

    loadChildren();
  }, []);

  // Load dashboard data and observations when child is selected
  useEffect(() => {
    if (!selectedChildId) return;

    const loadChildData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch dashboard data and recent observations in parallel
        const [dashData, obsResponse] = await Promise.all([
          apiClient.getDashboard(selectedChildId),
          apiClient.getObservations(selectedChildId, { limit: 5 }),
        ]);

        setDashboardData(dashData);
        setObservations(obsResponse.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadChildData();
  }, [selectedChildId]);

  // Transform dashboard data to radar chart format
  const radarScores = dashboardData
    ? dashboardData.dimensions.map((d) => ({
        dimension: getDimensionBySlug(d.dimension)?.name || d.dimension,
        score: Math.round(d.score),
        fullMark: 100,
      }))
    : DIMENSIONS.map((d) => ({
        dimension: d.name,
        score: 0,
        fullMark: 100,
      }));

  // Show "No children" state
  if (!loading && children.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Add Your First Child
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Create a child profile to start tracking their development journey.
          </p>
          <Link href="/onboarding/child" className="btn-primary">
            Add Child Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            {dashboardData
              ? `${dashboardData.childName}'s development at a glance.`
              : 'Your child\'s development at a glance.'}
          </p>
        </div>

        {/* Child Selector (if multiple children) */}
        {children.length > 1 && (
          <select
            value={selectedChildId || ''}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Select child"
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="card bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Radar Chart */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Development Overview
        </h2>
        {loading ? (
          <div className="w-full h-80 bg-slate-100 rounded-2xl animate-pulse" />
        ) : (
          <>
            <RadarChart scores={radarScores} />
            {dashboardData && dashboardData.overallScore === 0 ? (
              <p className="text-center text-xs text-slate-400 mt-2">
                Start logging observations to see your child&apos;s profile take shape.
              </p>
            ) : (
              <p className="text-center text-xs text-slate-500 mt-2">
                Overall development score: {dashboardData?.overallScore.toFixed(1) || 0}
              </p>
            )}
          </>
        )}
      </div>

      {/* Dimension Cards Grid */}
      <section aria-labelledby="dimensions-heading">
        <h2 id="dimensions-heading" className="text-lg font-semibold text-slate-900 mb-4">
          Dimensions
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DIMENSIONS.map((dimension) => (
              <div
                key={dimension.slug}
                className="h-40 bg-slate-100 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DIMENSIONS.map((dimension) => {
              const dimensionData = dashboardData?.dimensions.find(
                (d) => d.dimension === dimension.slug
              );
              return (
                <DimensionCard
                  key={dimension.slug}
                  dimension={dimension}
                  score={dimensionData ? Math.round(dimensionData.score) : 0}
                  observationCount={dimensionData?.observationCount || 0}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Observations */}
      <section aria-labelledby="observations-heading">
        <h2 id="observations-heading" className="text-lg font-semibold text-slate-900 mb-4">
          Recent Observations
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-slate-100 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : observations.length > 0 ? (
          <div className="space-y-3">
            {observations.map((obs) => (
              <ObservationCard
                key={obs.id}
                observation={{
                  id: obs.id,
                  dimension: obs.dimension,
                  text: obs.content,
                  sentiment: obs.sentiment as 'positive' | 'neutral' | 'needs_attention',
                  observedAt: obs.observedAt,
                  tags: obs.tags,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-slate-900 mb-1">
              No observations yet
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Log your first observation to start building your child&apos;s
              development profile.
            </p>
            <Link
              href="/dashboard/observe"
              className="btn-primary text-sm py-2 px-4"
            >
              Log First Observation
            </Link>
          </div>
        )}
      </section>

      {/* Milestones Due - Empty State */}
      <section aria-labelledby="milestones-heading">
        <h2 id="milestones-heading" className="text-lg font-semibold text-slate-900 mb-4">
          Milestones Due
        </h2>
        <div className="card text-center py-12">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-slate-900 mb-1">
            No milestones loaded
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Create a child profile to see age-appropriate milestones.
          </p>
          <Link
            href="/dashboard/milestones"
            className="btn-secondary text-sm py-2 px-4"
          >
            View Milestones
          </Link>
        </div>
      </section>

      {/* Floating Action Button - Log Observation */}
      <Link
        href="/dashboard/observe"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-colors flex items-center justify-center z-40"
        aria-label="Log new observation"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Link>
    </div>
  );
}
