'use client';

import { useState } from 'react';
import { DIMENSIONS } from '../../../lib/dimensions';

export default function TimelinePage() {
  const [selectedDimension, setSelectedDimension] = useState<string>('all');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Timeline</h1>
        <p className="text-sm text-slate-500 mt-1">
          A chronological view of all observations.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedDimension('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedDimension === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All
        </button>
        {DIMENSIONS.map((dim) => (
          <button
            key={dim.slug}
            type="button"
            onClick={() => setSelectedDimension(dim.slug)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedDimension === dim.slug
                ? 'text-white'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
            style={
              selectedDimension === dim.slug
                ? { backgroundColor: dim.colour }
                : { backgroundColor: `${dim.colour}15` }
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${
                selectedDimension === dim.slug ? 'bg-white' : ''
              }`}
              style={
                selectedDimension !== dim.slug
                  ? { backgroundColor: dim.colour }
                  : {}
              }
              aria-hidden="true"
            />
            {dim.name}
          </button>
        ))}
      </div>

      {/* Empty State */}
      <div className="card text-center py-16">
        <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-sm font-medium text-slate-900 mb-1">
          No observations yet
        </h2>
        <p className="text-xs text-slate-500">
          Your child&apos;s timeline will appear here as you log observations.
        </p>
      </div>
    </div>
  );
}
