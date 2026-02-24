'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  projects as projectsApi,
  artifacts as artifactsApi,
  templates as templatesApi,
  type Project,
  type Artifact,
  type Template,
  ApiError,
} from '@/lib/api';

// ─── Framework / Type config ──────────────────────────────────────────────────

const FRAMEWORK_TYPES: Record<string, string[]> = {
  c4: ['c4_context', 'c4_container', 'c4_component', 'c4_code'],
  archimate: [
    'archimate_business',
    'archimate_application',
    'archimate_technology',
    'archimate_motivation',
    'archimate_strategy',
  ],
  togaf: ['togaf_business', 'togaf_data', 'togaf_application', 'togaf_technology'],
  bpmn: ['bpmn_process', 'bpmn_collaboration', 'bpmn_choreography'],
};

const FRAMEWORKS = Object.keys(FRAMEWORK_TYPES);

// ─── Generate Artifact Modal ──────────────────────────────────────────────────

interface GenerateModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (artifact: Artifact) => void;
}

function GenerateModal({ projectId, isOpen, onClose, onGenerated }: GenerateModalProps) {
  const [prompt, setPrompt] = useState('');
  const [framework, setFramework] = useState('c4');
  const [type, setType] = useState('c4_context');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableTypes = FRAMEWORK_TYPES[framework] ?? [];

  const handleFrameworkChange = (f: string) => {
    setFramework(f);
    setType(FRAMEWORK_TYPES[f]?.[0] ?? '');
  };

  const handleClose = () => {
    setPrompt('');
    setFramework('c4');
    setType('c4_context');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Please describe what you want to generate.');
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const artifact = await artifactsApi.generate(projectId, {
        prompt: prompt.trim(),
        framework,
        type,
      });
      onGenerated(artifact);
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Generate Artifact" size="lg">
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="gen-prompt" className="block text-sm font-medium text-gray-700 mb-1.5">
            Describe your system <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <textarea
            id="gen-prompt"
            rows={5}
            required
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            placeholder="E.g. An e-commerce platform with a React frontend, Node.js API gateway, separate microservices for orders, payments, and inventory, connected to PostgreSQL databases and a Redis cache…"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            Be specific: include components, technologies, relationships, and scale.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="gen-framework" className="block text-sm font-medium text-gray-700 mb-1.5">
              Framework
            </label>
            <select
              id="gen-framework"
              value={framework}
              onChange={(e) => handleFrameworkChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              {FRAMEWORKS.map((f) => (
                <option key={f} value={f}>
                  {f.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="gen-type" className="block text-sm font-medium text-gray-700 mb-1.5">
              Diagram type
            </label>
            <select
              id="gen-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose} className="btn-secondary text-sm px-4 py-2">
            Cancel
          </button>
          <button type="submit" disabled={isGenerating} className="btn-primary text-sm px-4 py-2">
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                Generating…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
                Generate
              </span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Template Picker Modal ────────────────────────────────────────────────────

interface TemplatePickerProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onInstantiated: (artifact: Artifact) => void;
}

function TemplatePickerModal({ projectId, isOpen, onClose, onInstantiated }: TemplatePickerProps) {
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [instantiating, setInstantiating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    templatesApi
      .list()
      .then((data) => setTemplateList(data.templates ?? []))
      .catch(() => setError('Failed to load templates.'))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const handleUse = async (templateId: string) => {
    setInstantiating(templateId);
    setError(null);
    try {
      const artifact = await templatesApi.instantiate(templateId, projectId);
      onInstantiated(artifact);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to instantiate template.');
    } finally {
      setInstantiating(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose a Template" size="lg">
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" label="Loading templates…" />
        </div>
      ) : templateList.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-8">No templates available.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {templateList.map((tpl) => (
            <div
              key={tpl.id}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50/30 transition-colors"
            >
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-900">{tpl.name}</span>
                  <Badge value={tpl.framework} variant="framework" />
                </div>
                <p className="text-xs text-gray-500 line-clamp-1">{tpl.description}</p>
              </div>
              <button
                onClick={() => handleUse(tpl.id)}
                disabled={instantiating === tpl.id}
                className="btn-primary text-xs px-3 py-1.5 flex-shrink-0"
              >
                {instantiating === tpl.id ? <LoadingSpinner size="sm" /> : 'Use'}
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─── Artifact Card ────────────────────────────────────────────────────────────

function ArtifactCard({ projectId, artifact }: { projectId: string; artifact: Artifact }) {
  const updatedAt = new Date(artifact.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      href={`/projects/${projectId}/artifacts/${artifact.id}`}
      className="block p-4 rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50/20 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">
          {artifact.name}
        </h4>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge value={artifact.framework} variant="framework" />
          <Badge value={artifact.status} variant="status" />
        </div>
      </div>
      <p className="text-xs text-gray-500">
        {artifact.type.replace(/_/g, ' ')} &middot; v{artifact.version} &middot; {updatedAt}
      </p>
    </Link>
  );
}

// ─── Project Content ──────────────────────────────────────────────────────────

function ProjectContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [artifactList, setArtifactList] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [proj, artsData] = await Promise.all([
        projectsApi.get(projectId),
        artifactsApi.list(projectId),
      ]);
      setProject(proj);
      setArtifactList(artsData.artifacts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load project.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleArtifactGenerated = (artifact: Artifact) => {
    router.push(`/projects/${projectId}/artifacts/${artifact.id}`);
  };

  const handleArtifactInstantiated = (artifact: Artifact) => {
    router.push(`/projects/${projectId}/artifacts/${artifact.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" label="Loading project…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div role="alert" className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
          <button onClick={loadData} className="ml-2 underline font-medium">Retry</button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
        <Link href="/dashboard" className="hover:text-gray-900 transition-colors">
          Dashboard
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-gray-900 font-medium">{project.name}</span>
      </nav>

      {/* Project Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <Badge value={project.framework} variant="framework" />
            <Badge value={project.status} variant="status" />
          </div>
          {project.description && (
            <p className="text-sm text-gray-500 max-w-xl">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="btn-secondary text-sm px-4 py-2"
          >
            From Template
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="btn-primary text-sm px-4 py-2"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
              Generate Artifact
            </span>
          </button>
        </div>
      </div>

      {/* Artifacts section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Artifacts
          {artifactList.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({artifactList.length})
            </span>
          )}
        </h2>

        {artifactList.length === 0 ? (
          <EmptyState
            title="No artifacts yet"
            message="Generate your first architecture diagram using AI or start from a template."
            action={{ label: 'Generate Artifact', onClick: () => setShowGenerateModal(true) }}
            icon={
              <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
              </svg>
            }
          />
        ) : (
          <div className="space-y-3">
            {artifactList.map((artifact) => (
              <ArtifactCard key={artifact.id} projectId={projectId} artifact={artifact} />
            ))}
          </div>
        )}
      </div>

      <GenerateModal
        projectId={projectId}
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerated={handleArtifactGenerated}
      />

      <TemplatePickerModal
        projectId={projectId}
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onInstantiated={handleArtifactInstantiated}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  return (
    <AuthGuard>
      <Layout>
        <ProjectContent />
      </Layout>
    </AuthGuard>
  );
}
