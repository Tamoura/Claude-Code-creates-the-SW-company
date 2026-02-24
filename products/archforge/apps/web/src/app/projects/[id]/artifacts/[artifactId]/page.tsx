'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import Badge from '@/components/Badge';
import LoadingSpinner from '@/components/LoadingSpinner';
import Modal from '@/components/Modal';
import MermaidRenderer from '@/components/MermaidRenderer';
import {
  artifacts as artifactsApi,
  type Artifact,
  type ArtifactElement,
  type ArtifactRelationship,
  type ValidationResult,
  ApiError,
} from '@/lib/api';

// ─── Validate Panel ───────────────────────────────────────────────────────────

function ValidationPanel({ result }: { result: ValidationResult }) {
  const gradeColor: Record<string, string> = {
    A: 'text-green-600 bg-green-50',
    B: 'text-blue-600 bg-blue-50',
    C: 'text-yellow-600 bg-yellow-50',
    D: 'text-orange-600 bg-orange-50',
    F: 'text-red-600 bg-red-50',
  };

  return (
    <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${gradeColor[result.grade] ?? 'text-gray-600 bg-gray-100'}`}>
          {result.grade}
        </div>
        <div>
          <p className="font-semibold text-gray-900">Validation Score</p>
          <p className="text-sm text-gray-500">{result.score}/100</p>
        </div>
      </div>
      <ul className="space-y-2">
        {result.rules.map((rule) => (
          <li key={rule.ruleId} className="flex items-start gap-2 text-sm">
            {rule.passed ? (
              <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            )}
            <span className={rule.passed ? 'text-gray-700' : 'text-gray-900 font-medium'}>
              {rule.message}
              {!rule.passed && (
                <span className={`ml-1.5 text-xs font-normal ${rule.severity === 'error' ? 'text-red-500' : 'text-yellow-600'}`}>
                  ({rule.severity})
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

interface DeleteModalProps {
  artifactName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function DeleteModal({ artifactName, isOpen, onClose, onConfirm }: DeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed.');
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Artifact" size="sm">
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      <p className="text-sm text-gray-600 mb-6">
        Are you sure you want to delete <strong className="text-gray-900">{artifactName}</strong>? This action cannot be undone.
      </p>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn-secondary text-sm px-4 py-2">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isDeleting}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
          {isDeleting ? <LoadingSpinner size="sm" /> : 'Delete'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Export dropdown ──────────────────────────────────────────────────────────

function ExportButton({ projectId, artifactId }: { projectId: string; artifactId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExport = async (format: 'json' | 'mermaid' | 'plantuml') => {
    setIsOpen(false);
    setExporting(true);
    try {
      const result = await artifactsApi.export(projectId, artifactId, format);
      const blob = new Blob([result.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename || `artifact.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silent — could add a toast here in a real app
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((o) => !o)}
        disabled={exporting}
        className="btn-secondary text-sm px-3 py-2 flex items-center gap-2"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {exporting ? (
          <LoadingSpinner size="sm" />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        )}
        Export
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20"
        >
          {(['json', 'mermaid', 'plantuml'] as const).map((fmt) => (
            <button
              key={fmt}
              role="menuitem"
              onClick={() => handleExport(fmt)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {fmt.charAt(0).toUpperCase() + fmt.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Artifact Detail Content ──────────────────────────────────────────────────

function ArtifactDetailContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const artifactId = params.artifactId as string;

  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [elements, setElements] = useState<ArtifactElement[]>([]);
  const [relationships, setRelationships] = useState<ArtifactRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'diagram' | 'elements' | 'relationships'>('diagram');

  const loadArtifact = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await artifactsApi.get(projectId, artifactId);
      setArtifact(data);
      setElements(data.elements ?? []);
      setRelationships(data.relationships ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load artifact.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, artifactId]);

  useEffect(() => {
    loadArtifact();
  }, [loadArtifact]);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const updated = await artifactsApi.regenerate(projectId, artifactId);
      setArtifact(updated);
      setElements(updated.elements ?? []);
      setRelationships(updated.relationships ?? []);
      setValidationResult(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Regeneration failed.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationError(null);
    setValidationResult(null);
    try {
      const result = await artifactsApi.validate(projectId, artifactId);
      setValidationResult(result);
    } catch (err) {
      setValidationError(err instanceof ApiError ? err.message : 'Validation failed.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDelete = async () => {
    await artifactsApi.delete(projectId, artifactId);
    router.push(`/projects/${projectId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" label="Loading artifact…" />
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <div className="p-8">
        <div role="alert" className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error ?? 'Artifact not found.'}
          <button onClick={loadArtifact} className="ml-2 underline font-medium">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
        <Link href="/dashboard" className="hover:text-gray-900 transition-colors">
          Dashboard
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/projects/${projectId}`} className="hover:text-gray-900 transition-colors">
          Project
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-gray-900 font-medium">{artifact.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-xl font-bold text-gray-900">{artifact.name}</h1>
            <Badge value={artifact.framework} variant="framework" />
            <Badge value={artifact.status} variant="status" />
            <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5 font-mono">v{artifact.version}</span>
          </div>
          <p className="text-sm text-gray-500">
            {artifact.type.replace(/_/g, ' ')}
            {artifact.prompt && (
              <span className="text-gray-400"> — &ldquo;{artifact.prompt.slice(0, 80)}{artifact.prompt.length > 80 ? '…' : ''}&rdquo;</span>
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="btn-secondary text-sm px-3 py-2 flex items-center gap-2"
          >
            {isValidating ? (
              <LoadingSpinner size="sm" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
              </svg>
            )}
            Validate
          </button>

          <ExportButton projectId={projectId} artifactId={artifactId} />

          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="btn-secondary text-sm px-3 py-2 flex items-center gap-2"
          >
            {isRegenerating ? (
              <LoadingSpinner size="sm" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            )}
            Regenerate
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
            aria-label="Delete artifact"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Validation result */}
      {validationError && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {validationError}
        </div>
      )}
      {validationResult && <ValidationPanel result={validationResult} />}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 mt-6">
        <nav className="-mb-px flex gap-6" aria-label="Artifact sections">
          {([
            { key: 'diagram', label: 'Diagram' },
            { key: 'elements', label: `Elements (${elements.length})` },
            { key: 'relationships', label: `Relationships (${relationships.length})` },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              aria-current={activeTab === tab.key ? 'page' : undefined}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'diagram' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-64">
          {artifact.mermaidDiagram ? (
            <MermaidRenderer diagram={artifact.mermaidDiagram} />
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-gray-400">
              No diagram available for this artifact.
            </div>
          )}
        </div>
      )}

      {activeTab === 'elements' && (
        <div>
          {elements.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No elements found.</p>
          ) : (
            <div className="space-y-2">
              {elements.map((el) => (
                <div key={el.id} className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-white">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">{el.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-mono">
                        {el.type}
                      </span>
                      {el.layer && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                          {el.layer}
                        </span>
                      )}
                    </div>
                    {el.description && (
                      <p className="text-xs text-gray-500">{el.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'relationships' && (
        <div>
          {relationships.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No relationships found.</p>
          ) : (
            <div className="space-y-2">
              {relationships.map((rel) => (
                <div key={rel.id} className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-white">
                  <span className="text-sm text-gray-900 font-medium flex-shrink-0">
                    {rel.sourceName ?? rel.sourceId}
                  </span>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1 h-px bg-gray-200" aria-hidden="true" />
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-mono flex-shrink-0">
                      {rel.type}{rel.label ? `: ${rel.label}` : ''}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" aria-hidden="true" />
                  </div>
                  <span className="text-sm text-gray-900 font-medium flex-shrink-0">
                    {rel.targetName ?? rel.targetId}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <DeleteModal
        artifactName={artifact.name}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArtifactDetailPage() {
  return (
    <AuthGuard>
      <Layout>
        <ArtifactDetailContent />
      </Layout>
    </AuthGuard>
  );
}
