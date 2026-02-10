'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DIMENSIONS } from '../../lib/dimensions';
import DimensionCard from '../../components/dashboard/DimensionCard';

const RadarChart = dynamic(
  () => import('../../components/dashboard/RadarChart'),
  { ssr: false, loading: () => <div className="w-full h-80 bg-slate-100 rounded-2xl animate-pulse" /> }
);

export default function DashboardPage() {
  const scores = DIMENSIONS.map((d) => ({
    dimension: d.name,
    score: 0,
    fullMark: 100,
  }));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Your child&apos;s development at a glance.
          </p>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Development Overview
        </h2>
        <RadarChart scores={scores} />
        <p className="text-center text-xs text-slate-400 mt-2">
          Start logging observations to see your child&apos;s profile take shape.
        </p>
      </div>

      {/* Dimension Cards Grid */}
      <section aria-labelledby="dimensions-heading">
        <h2 id="dimensions-heading" className="text-lg font-semibold text-slate-900 mb-4">
          Dimensions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DIMENSIONS.map((dimension) => (
            <DimensionCard
              key={dimension.slug}
              dimension={dimension}
              score={0}
              observationCount={0}
            />
          ))}
        </div>
      </section>

      {/* Recent Observations - Empty State */}
      <section aria-labelledby="observations-heading">
        <h2 id="observations-heading" className="text-lg font-semibold text-slate-900 mb-4">
          Recent Observations
        </h2>
        <div className="card text-center py-12">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
