'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient, type Assessment, type DomainScore } from '../../../lib/api-client';

export default function DashboardPage() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [domainScores, setDomainScores] = useState<DomainScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [assessmentsRes, domainScoresRes] = await Promise.all([
          apiClient.getAssessments(),
          apiClient.getDomainScores(),
        ]);
        setAssessments(assessmentsRes.assessments);
        setDomainScores(domainScoresRes.domainScores);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const highestTier = domainScores.length > 0
    ? domainScores.reduce((prev, current) => (prev.tier > current.tier ? prev : current)).tier
    : '--';

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome back, {user?.name || 'User'}!</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Highest Tier</h3>
          <p className="text-2xl font-bold text-primary">{highestTier}</p>
          <p className="text-sm text-gray-400 mt-1">
            {domainScores.length === 0 ? 'Complete an assessment to get placed' : 'Across all domains'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Assessments Taken</h3>
          <p className="text-2xl font-bold text-gray-900">{assessments.length}</p>
          <p className="text-sm text-gray-400 mt-1">
            {assessments.length === 0 ? 'No assessments yet' : 'Total completed'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Domain Scores</h3>
          <p className="text-2xl font-bold text-secondary">{domainScores.length}</p>
          <p className="text-sm text-gray-400 mt-1">
            {domainScores.length === 0 ? 'Complete your profile to get started' : 'Domains evaluated'}
          </p>
        </div>
      </div>

      {domainScores.length > 0 && (
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Domain Performance</h2>
          <div className="space-y-4">
            {domainScores.map((ds) => (
              <div key={ds.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{ds.domain.replace(/_/g, ' ')}</span>
                  <span className="text-gray-500">{ds.score}% - {ds.tier}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${ds.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
        <div className="space-y-3">
          <Link href="/profile" className="flex items-center gap-3 text-sm text-gray-600 hover:text-primary transition-colors">
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />
            <span>Complete your professional profile</span>
          </Link>
          <Link href="/assessment" className="flex items-center gap-3 text-sm text-gray-600 hover:text-primary transition-colors">
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />
            <span>Take your first assessment</span>
          </Link>
          <Link href="/career" className="flex items-center gap-3 text-sm text-gray-600 hover:text-primary transition-colors">
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />
            <span>Explore career paths in the simulator</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
