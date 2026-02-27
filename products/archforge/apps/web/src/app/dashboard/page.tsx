'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import LoadingSpinner from '@/components/LoadingSpinner';
import { projects as projectsApi, type Project, ApiError } from '@/lib/api';

const FRAMEWORKS = ['c4', 'archimate', 'togaf', 'bpmn'];

// ─── Create Project Modal ─────────────────────────────────────────────────────

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (project: Project) => void;
}

function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [framework, setFramework] = useState('c4');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setName('');
    setDescription('');
    setFramework('c4');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const project = await projectsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        frameworkPreference: framework,
      });
      onCreate(project);
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Project" size="md">
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="proj-name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Project name <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="proj-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="E-commerce Platform"
          />
        </div>

        <div>
          <label htmlFor="proj-desc" className="block text-sm font-medium text-gray-700 mb-1.5">
            Description
          </label>
          <textarea
            id="proj-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            placeholder="What is this project about?"
          />
        </div>

        <div>
          <label htmlFor="proj-framework" className="block text-sm font-medium text-gray-700 mb-1.5">
            Primary framework
          </label>
          <select
            id="proj-framework"
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            {FRAMEWORKS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary text-sm px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary text-sm px-4 py-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                Creating…
              </span>
            ) : (
              'Create project'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: Project }) {
  const updatedAt = new Date(project.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block card hover:shadow-md hover:border-primary-200 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">
          {project.name}
        </h3>
        <Badge value={project.frameworkPreference} variant="framework" className="ml-2 flex-shrink-0" />
      </div>
      {project.description && (
        <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      )}
      <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-2 border-t border-gray-100">
        <span className="flex items-center gap-1">
          <Badge value={project.status} variant="status" />
        </span>
        <span>Updated {updatedAt}</span>
      </div>
    </Link>
  );
}

// ─── Dashboard Content ────────────────────────────────────────────────────────

function DashboardContent() {
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectsApi.list();
      setProjectList(data.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load projects.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectCreated = (project: Project) => {
    setProjectList((prev) => [project, ...prev]);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your enterprise architecture projects
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary text-sm px-4 py-2.5"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Project
          </span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
          <button onClick={fetchProjects} className="ml-2 underline font-medium">Retry</button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" label="Loading projects…" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && projectList.length === 0 && (
        <EmptyState
          title="No projects yet"
          message="Create your first project to start generating AI-powered architecture diagrams."
          action={{ label: 'Create Project', onClick: () => setShowCreateModal(true) }}
        />
      )}

      {/* Project grid */}
      {!isLoading && projectList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projectList.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleProjectCreated}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Layout>
        <DashboardContent />
      </Layout>
    </AuthGuard>
  );
}
