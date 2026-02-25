/**
 * HuggingFace Dataset Utilities
 *
 * Provides helpers for loading, streaming, and processing datasets
 * from the HuggingFace Hub via the datasets-server API.
 *
 * Usage:
 *   const loader = new DatasetLoader({ apiKey: process.env.HF_API_KEY });
 *   const slice = await loader.getRows('imdb', { split: 'train', offset: 0, length: 100 });
 *   const info = await loader.getDatasetInfo('imdb');
 */

import {
  HuggingFaceError,
  type HuggingFaceConfig,
  HuggingFaceConfigSchema,
  type DatasetSlice,
  type DatasetRow,
} from '../types/index.js';

export interface DatasetSplitInfo {
  dataset: string;
  config: string;
  split: string;
  num_rows: number;
  num_bytes: number;
}

export interface DatasetInfoResponse {
  dataset_info: Record<string, {
    config_name: string;
    splits: Record<string, {
      name: string;
      num_bytes: number;
      num_examples: number;
    }>;
    download_size: number;
    dataset_size: number;
  }>;
}

export interface DatasetParquetInfo {
  parquet_files: Array<{
    dataset: string;
    config: string;
    split: string;
    url: string;
    filename: string;
    size: number;
  }>;
}

export class DatasetLoader {
  private readonly config: HuggingFaceConfig;
  private readonly datasetsServerUrl = 'https://datasets-server.huggingface.co';

  constructor(options: {
    apiKey: string;
    timeoutMs?: number;
  }) {
    this.config = HuggingFaceConfigSchema.parse({
      apiKey: options.apiKey,
      timeoutMs: options.timeoutMs,
    });
  }

  // ─── Dataset Info ─────────────────────────────────────────────────────────

  async getDatasetInfo(datasetId: string): Promise<DatasetInfoResponse> {
    return this.request<DatasetInfoResponse>(
      `/info?dataset=${encodeURIComponent(datasetId)}`,
    );
  }

  async getSplits(datasetId: string): Promise<{ splits: DatasetSplitInfo[] }> {
    return this.request<{ splits: DatasetSplitInfo[] }>(
      `/splits?dataset=${encodeURIComponent(datasetId)}`,
    );
  }

  // ─── Row Access ───────────────────────────────────────────────────────────

  async getRows(
    datasetId: string,
    options: {
      config?: string;
      split?: string;
      offset?: number;
      length?: number;
    } = {},
  ): Promise<DatasetSlice> {
    const query = new URLSearchParams();
    query.set('dataset', datasetId);
    if (options.config) query.set('config', options.config);
    query.set('split', options.split ?? 'train');
    if (options.offset !== undefined) query.set('offset', String(options.offset));
    if (options.length !== undefined) query.set('length', String(options.length));

    return this.request<DatasetSlice>(`/rows?${query.toString()}`);
  }

  async getFirstRows(
    datasetId: string,
    options: {
      config?: string;
      split?: string;
    } = {},
  ): Promise<DatasetSlice> {
    const query = new URLSearchParams();
    query.set('dataset', datasetId);
    if (options.config) query.set('config', options.config);
    query.set('split', options.split ?? 'train');

    return this.request<DatasetSlice>(`/first-rows?${query.toString()}`);
  }

  // ─── Parquet Access ───────────────────────────────────────────────────────

  async getParquetFiles(datasetId: string): Promise<DatasetParquetInfo> {
    return this.request<DatasetParquetInfo>(
      `/parquet?dataset=${encodeURIComponent(datasetId)}`,
    );
  }

  // ─── Search within Dataset ────────────────────────────────────────────────

  async searchRows(
    datasetId: string,
    query: string,
    options: {
      config?: string;
      split?: string;
      offset?: number;
      length?: number;
    } = {},
  ): Promise<DatasetSlice> {
    const params = new URLSearchParams();
    params.set('dataset', datasetId);
    params.set('query', query);
    if (options.config) params.set('config', options.config);
    params.set('split', options.split ?? 'train');
    if (options.offset !== undefined) params.set('offset', String(options.offset));
    if (options.length !== undefined) params.set('length', String(options.length));

    return this.request<DatasetSlice>(`/search?${params.toString()}`);
  }

  // ─── Batch Processing ─────────────────────────────────────────────────────

  async *iterateRows(
    datasetId: string,
    options: {
      config?: string;
      split?: string;
      batchSize?: number;
    } = {},
  ): AsyncGenerator<DatasetRow[], void, unknown> {
    const batchSize = options.batchSize ?? 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const slice = await this.getRows(datasetId, {
        config: options.config,
        split: options.split,
        offset,
        length: batchSize,
      });

      if (slice.rows.length === 0) {
        hasMore = false;
      } else {
        yield slice.rows;
        offset += slice.rows.length;

        if (slice.rows.length < batchSize || offset >= slice.num_rows_total) {
          hasMore = false;
        }
      }
    }
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────

  private async request<T>(path: string): Promise<T> {
    const url = `${this.datasetsServerUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        throw new HuggingFaceError(
          `Datasets API error ${response.status}: ${text}`,
          response.status,
          'DatasetsApiError',
        );
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      if (error instanceof HuggingFaceError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HuggingFaceError(
          `Request timed out after ${this.config.timeoutMs}ms`,
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
