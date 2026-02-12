'use client';

import { useEffect, useState } from 'react';
import { apiClient, type Job, type JobApplication } from '../../../lib/api-client';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState('');
  const [remoteFilter, setRemoteFilter] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    async function loadData() {
      try {
        const [jobsRes, appsRes] = await Promise.all([
          apiClient.getJobs({ domain: domainFilter || undefined, remote: remoteFilter }),
          apiClient.getApplications(),
        ]);
        setJobs(jobsRes.data);
        setApplications(appsRes.applications);
      } catch (err) {
        console.error('Failed to load jobs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [domainFilter, remoteFilter]);

  async function handleApply(jobId: string) {
    setApplying(jobId);
    try {
      const res = await apiClient.applyToJob(jobId);
      setApplications([...applications, res.application]);
    } catch (err) {
      console.error('Failed to apply:', err);
    } finally {
      setApplying(null);
    }
  }

  const appliedJobIds = new Set(applications.map((app) => app.jobId));

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Jobs</h1>
      <p className="text-gray-600 mb-8">Find GRC opportunities that match your skills.</p>

      <div className="mb-6 flex gap-4">
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          <option value="">All Domains</option>
          <option value="GOVERNANCE_STRATEGY">Governance & Strategy</option>
          <option value="RISK_MANAGEMENT">Risk Management</option>
          <option value="COMPLIANCE_REGULATORY">Compliance</option>
          <option value="INFORMATION_SECURITY">Information Security</option>
          <option value="AUDIT_ASSURANCE">Audit & Assurance</option>
          <option value="BUSINESS_CONTINUITY">Business Continuity</option>
        </select>
        <select
          value={remoteFilter === undefined ? '' : String(remoteFilter)}
          onChange={(e) => setRemoteFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          <option value="">All Locations</option>
          <option value="true">Remote Only</option>
          <option value="false">On-site Only</option>
        </select>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No jobs found matching your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const hasApplied = appliedJobIds.has(job.id);
            return (
              <div key={job.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-600">
                      {job.location} {job.remote && '(Remote)'}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-primary-50 text-primary text-xs font-medium rounded-full">
                    {job.requiredTier}+
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-4">{job.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {job.requiredDomains.map((domain) => (
                    <span key={domain} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {domain.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                {job.salaryMin && job.salaryMax && (
                  <p className="text-sm text-gray-600 mb-4">
                    ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()} per year
                  </p>
                )}
                <button
                  onClick={() => handleApply(job.id)}
                  disabled={hasApplied || applying === job.id}
                  className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hasApplied ? 'Applied' : applying === job.id ? 'Applying...' : 'Quick Apply'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
