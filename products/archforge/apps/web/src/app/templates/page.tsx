'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import Badge from '@/components/Badge';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import {
  templates as templatesApi,
  projects as projectsApi,
  type Template,
  type Project,
  ApiError,
} from '@/lib/api';

// ─── Project Picker Modal ─────────────────────────────────────────────────────

interface ProjectPickerModalProps {
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
  onInstantiated: (projectId: string, artifactId: string) => void;
}

function ProjectPickerModal({
  template,
  isOpen,
  onClose,
  onInstantiated,
}: ProjectPickerModalProps) {
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [instantiating, setInstantiating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingProjects(true);
    setSelectedProjectId('');
    setError(null);
    projectsApi
      .list()
      .then((data) => {
        setProjectList(data.projects);
        if (data.projects.length > 0) {
          setSelectedProjectId(data.projects[0].id);
        }
      })
      .catch(() => setError('Failed to load projects.'))
      .finally(() => setIsLoadingProjects(false));
  }, [isOpen]);

  const handleInstantiate = async () => {
    if (!template || !selectedProjectId) return;
    setInstantiating(true);
    setError(null);
    try {
      const artifact = await templatesApi.instantiate(template.id, selectedProjectId);
      onInstantiated(selectedProjectId, artifact.id);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to use template.');
    } finally {
      setInstantiating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose Project" size="sm">
      {template && (
        <p className="text-sm text-gray-500 mb-4">
          Adding <strong className="text-gray-900">{template.name}</strong> to your project.
        </p>
      )}
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {isLoadingProjects ? (
        <div className="flex justify-center py-6">
          <LoadingSpinner size="md" label="Loading projects…" />
        </div>
      ) : projectList.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          No projects yet.{' '}
          <a href="/dashboard" className="text-primary-500 hover:text-primary-600 font-medium">
            Create one first.
          </a>
        </p>
      ) : (
        <>
          <div className="mb-5">
            <label htmlFor="project-pick" className="block text-sm font-medium text-gray-700 mb-1.5">
              Project
            </label>
            <select
              id="project-pick"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">
              Cancel
            </button>
            <button
              onClick={handleInstantiate}
              disabled={instantiating || !selectedProjectId}
              className="btn-primary text-sm px-4 py-2"
            >
              {instantiating ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Using…
                </span>
              ) : (
                'Use Template'
              )}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: Template;
  onUse: (template: Template) => void;
}

function TemplateCard({ template, onUse }: TemplateCardProps) {
  return (
    <div className="card hover:shadow-md transition-shadow flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 line-clamp-1">{template.name}</h3>
        <Badge value={template.framework} variant="framework" className="ml-2 flex-shrink-0" />
      </div>
      <p className="text-sm text-gray-500 leading-relaxed flex-1 mb-5 line-clamp-3">
        {template.description}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-mono">
          {template.type.replace(/_/g, ' ')}
        </span>
        <button
          onClick={() => onUse(template)}
          className="btn-primary text-xs px-3 py-1.5"
        >
          Use Template
        </button>
      </div>
    </div>
  );
}

// ─── Templates Content ────────────────────────────────────────────────────────

function TemplatesContent() {
  const router = useRouter();
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await templatesApi.list();
      setTemplateList(data.templates ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load templates.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const frameworks = [
    'all',
    ...Array.from(new Set(templateList.map((t) => t.framework))),
  ];

  const filtered =
    filter === 'all' ? templateList : templateList.filter((t) => t.framework === filter);

  const handleInstantiated = (projectId: string, artifactId: string) => {
    router.push(`/projects/${projectId}/artifacts/${artifactId}`);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Template Library</h1>
        <p className="text-sm text-gray-500">
          Pre-built architecture templates to jumpstart your projects
        </p>
      </div>

      {/* Framework filter */}
      {!isLoading && templateList.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {frameworks.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
          <button onClick={loadTemplates} className="ml-2 underline font-medium">Retry</button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" label="Loading templates…" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState
          title="No templates found"
          message={filter === 'all' ? 'No templates are available yet.' : `No ${filter.toUpperCase()} templates found.`}
          action={filter !== 'all' ? { label: 'Show all', onClick: () => setFilter('all') } : undefined}
        />
      )}

      {/* Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={setSelectedTemplate}
            />
          ))}
        </div>
      )}

      <ProjectPickerModal
        template={selectedTemplate}
        isOpen={!!selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        onInstantiated={handleInstantiated}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  return (
    <AuthGuard>
      <Layout>
        <TemplatesContent />
      </Layout>
    </AuthGuard>
  );
}
