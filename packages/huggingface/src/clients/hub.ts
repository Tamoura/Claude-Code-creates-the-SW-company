/**
 * HuggingFace Hub API Client
 *
 * Provides typed access to the HuggingFace Hub for browsing, searching,
 * and managing models and datasets. Use this to discover models for
 * inference or find datasets for training/fine-tuning.
 *
 * Usage:
 *   const hub = new HubClient({ apiKey: process.env.HF_API_KEY });
 *   const models = await hub.searchModels({ search: 'text-generation', limit: 10 });
 *   const datasets = await hub.searchDatasets({ search: 'sentiment', limit: 5 });
 */

import {
  HuggingFaceError,
  type HuggingFaceConfig,
  HuggingFaceConfigSchema,
  type ModelInfo,
  type DatasetInfo,
  type ModelSearchParams,
  type DatasetSearchParams,
  type RepoFile,
} from '../types/index.js';

export class HubClient {
  private readonly config: HuggingFaceConfig;

  constructor(options: {
    apiKey: string;
    baseUrl?: string;
    timeoutMs?: number;
  }) {
    this.config = HuggingFaceConfigSchema.parse({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      timeoutMs: options.timeoutMs,
    });
  }

  // ─── Models ───────────────────────────────────────────────────────────────

  async searchModels(params: ModelSearchParams = {}): Promise<ModelInfo[]> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.author) query.set('author', params.author);
    if (params.filter) query.set('filter', params.filter);
    if (params.sort) query.set('sort', params.sort);
    if (params.direction) query.set('direction', params.direction === 'asc' ? '1' : '-1');
    if (params.limit) query.set('limit', String(params.limit));
    if (params.pipeline_tag) query.set('pipeline_tag', params.pipeline_tag);
    if (params.library) query.set('library', params.library);

    return this.request<ModelInfo[]>(`/api/models?${query.toString()}`);
  }

  async getModel(modelId: string): Promise<ModelInfo> {
    return this.request<ModelInfo>(`/api/models/${modelId}`);
  }

  async listModelFiles(modelId: string, revision?: string): Promise<RepoFile[]> {
    const path = revision
      ? `/api/models/${modelId}/tree/${revision}`
      : `/api/models/${modelId}/tree/main`;
    return this.request<RepoFile[]>(path);
  }

  async getModelsByPipeline(pipelineTag: string, limit: number = 20): Promise<ModelInfo[]> {
    return this.searchModels({ pipeline_tag: pipelineTag, limit, sort: 'downloads', direction: 'desc' });
  }

  // ─── Datasets ─────────────────────────────────────────────────────────────

  async searchDatasets(params: DatasetSearchParams = {}): Promise<DatasetInfo[]> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.author) query.set('author', params.author);
    if (params.filter) query.set('filter', params.filter);
    if (params.sort) query.set('sort', params.sort);
    if (params.direction) query.set('direction', params.direction === 'asc' ? '1' : '-1');
    if (params.limit) query.set('limit', String(params.limit));

    return this.request<DatasetInfo[]>(`/api/datasets?${query.toString()}`);
  }

  async getDataset(datasetId: string): Promise<DatasetInfo> {
    return this.request<DatasetInfo>(`/api/datasets/${datasetId}`);
  }

  async listDatasetFiles(datasetId: string, revision?: string): Promise<RepoFile[]> {
    const path = revision
      ? `/api/datasets/${datasetId}/tree/${revision}`
      : `/api/datasets/${datasetId}/tree/main`;
    return this.request<RepoFile[]>(path);
  }

  // ─── Popular / Curated ────────────────────────────────────────────────────

  async trendingModels(limit: number = 20): Promise<ModelInfo[]> {
    return this.searchModels({ sort: 'likes', direction: 'desc', limit });
  }

  async trendingDatasets(limit: number = 20): Promise<DatasetInfo[]> {
    return this.searchDatasets({ sort: 'likes', direction: 'desc', limit });
  }

  async modelsByTask(task: string, limit: number = 20): Promise<ModelInfo[]> {
    return this.searchModels({ pipeline_tag: task, sort: 'downloads', direction: 'desc', limit });
  }

  // ─── Download ─────────────────────────────────────────────────────────────

  async downloadFile(
    repoType: 'model' | 'dataset',
    repoId: string,
    filename: string,
    revision: string = 'main',
  ): Promise<Buffer> {
    const prefix = repoType === 'model' ? '' : 'datasets/';
    const url = `${this.config.baseUrl}/${prefix}${repoId}/resolve/${revision}/${filename}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        throw new HuggingFaceError(
          `Hub download error ${response.status}: ${text}`,
          response.status,
          'HubDownloadError',
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: unknown) {
      if (error instanceof HuggingFaceError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HuggingFaceError(
          `Download timed out after ${this.config.timeoutMs}ms`,
          408,
          'TimeoutError',
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────

  private async request<T>(path: string): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        throw new HuggingFaceError(
          `Hub API error ${response.status}: ${text}`,
          response.status,
          'HubApiError',
        );
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      if (error instanceof HuggingFaceError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HuggingFaceError(
          `Request to ${url} timed out after ${this.config.timeoutMs}ms`,
          408,
          'TimeoutError',
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
