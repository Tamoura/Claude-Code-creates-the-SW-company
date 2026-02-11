'use client';

import { useEffect, useState, FormEvent } from 'react';
import { apiClient, type CareerSimulation, type LearningPath } from '../../../lib/api-client';

export default function CareerPage() {
  const [simulations, setSimulations] = useState<CareerSimulation[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [targetRole, setTargetRole] = useState('');
  const [targetLevel, setTargetLevel] = useState('');
  const [latestSimulation, setLatestSimulation] = useState<CareerSimulation | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [simsRes, pathsRes] = await Promise.all([
          apiClient.getSimulations(),
          apiClient.getLearningPaths(),
        ]);
        setSimulations(simsRes.simulations);
        setLearningPaths(pathsRes.learningPaths);
      } catch (err) {
        console.error('Failed to load career data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleSimulate(e: FormEvent) {
    e.preventDefault();
    setSimulating(true);
    try {
      const res = await apiClient.simulateCareer(targetRole, targetLevel);
      setLatestSimulation(res.simulation);
      setSimulations([res.simulation, ...simulations]);
      setTargetRole('');
      setTargetLevel('');
    } catch (err) {
      console.error('Failed to simulate career:', err);
    } finally {
      setSimulating(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Career Simulator</h1>
      <p className="text-gray-600 mb-8">Explore career paths and get personalized guidance.</p>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Simulate Career Path</h2>
        <form onSubmit={handleSimulate} className="space-y-4">
          <div>
            <label htmlFor="targetRole" className="block text-sm font-medium text-gray-700 mb-1">
              Target Role
            </label>
            <input
              id="targetRole"
              type="text"
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g., GRC Manager"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="targetLevel" className="block text-sm font-medium text-gray-700 mb-1">
              Target Level
            </label>
            <select
              id="targetLevel"
              required
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            >
              <option value="">Select level</option>
              <option value="MID">Mid Level</option>
              <option value="SENIOR">Senior</option>
              <option value="LEAD">Lead</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={simulating}
            className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {simulating ? 'Simulating...' : 'Simulate Career Path'}
          </button>
        </form>

        {latestSimulation && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Simulation Results</h3>
            <p className="text-sm text-blue-700 mb-4">
              Based on your current scores, here are the recommendations to reach {latestSimulation.targetRole} at {latestSimulation.targetLevel} level:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
              {latestSimulation.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {simulations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Previous Simulations</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y">
            {simulations.map((sim) => (
              <div key={sim.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{sim.targetRole}</h3>
                    <p className="text-sm text-gray-500">{sim.targetLevel} level</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(sim.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-600">{sim.recommendations[0]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {learningPaths.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Learning Paths</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {learningPaths.map((path) => (
              <div key={path.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 mb-2">{path.domain.replace(/_/g, ' ')}</h3>
                <p className="text-sm text-gray-600 mb-3">
                  {path.currentLevel} → {path.targetLevel}
                </p>
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{path.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-accent h-2 rounded-full transition-all"
                      style={{ width: `${path.progress}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">{path.estimatedHours} hours estimated</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
