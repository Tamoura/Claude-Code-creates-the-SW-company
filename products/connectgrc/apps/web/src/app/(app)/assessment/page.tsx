'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, type Assessment } from '../../../lib/api-client';

const DOMAINS = [
  { id: 'GOVERNANCE_STRATEGY', name: 'Governance & Strategy', description: 'Framework implementation and strategic alignment' },
  { id: 'RISK_MANAGEMENT', name: 'Risk Management', description: 'Risk assessment, mitigation, and monitoring' },
  { id: 'COMPLIANCE_REGULATORY', name: 'Compliance & Regulatory', description: 'Regulatory compliance and audit management' },
  { id: 'INFORMATION_SECURITY', name: 'Information Security', description: 'Security controls and cyber defense' },
  { id: 'AUDIT_ASSURANCE', name: 'Audit & Assurance', description: 'Internal audit and quality assurance' },
  { id: 'BUSINESS_CONTINUITY', name: 'Business Continuity', description: 'Disaster recovery and resilience planning' },
];

export default function AssessmentPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    async function loadAssessments() {
      try {
        const res = await apiClient.getAssessments();
        setAssessments(res.assessments);
      } catch (err) {
        console.error('Failed to load assessments:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAssessments();
  }, []);

  async function handleStart(domain: string) {
    setStarting(domain);
    try {
      const res = await apiClient.startAssessment(domain);
      router.push(`/assessment/${res.assessment.id}`);
    } catch (err) {
      console.error('Failed to start assessment:', err);
      setStarting(null);
    }
  }

  const pastAssessments = assessments.filter((a) => a.status === 'COMPLETED');

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Assessment</h1>
      <p className="text-gray-600 mb-8">Take an AI-powered assessment to evaluate your GRC knowledge.</p>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose a Domain</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {DOMAINS.map((domain) => (
          <div key={domain.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">{domain.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{domain.description}</p>
            <button
              onClick={() => handleStart(domain.id)}
              disabled={starting === domain.id}
              className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {starting === domain.id ? 'Starting...' : 'Start Assessment'}
            </button>
          </div>
        ))}
      </div>

      {pastAssessments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Assessments</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y">
            {pastAssessments.map((assessment) => (
              <div key={assessment.id} className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-900">{assessment.domain.replace(/_/g, ' ')}</h3>
                  <p className="text-sm text-gray-500">
                    Completed {new Date(assessment.completedAt!).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{assessment.score}%</p>
                  <p className="text-sm text-gray-500">{assessment.tier}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
