import { z } from 'zod';

// ─── Configuration ────────────────────────────────────────────────────────────

export const HuggingFaceConfigSchema = z.object({
  apiKey: z.string().min(1, 'HuggingFace API key is required'),
  baseUrl: z.string().url().default('https://huggingface.co'),
  inferenceBaseUrl: z.string().url().default('https://api-inference.huggingface.co'),
  timeoutMs: z.number().int().positive().default(60000),
});

export type HuggingFaceConfig = z.infer<typeof HuggingFaceConfigSchema>;

// ─── Inference Types ──────────────────────────────────────────────────────────

export interface TextGenerationParams {
  model: string;
  inputs: string;
  parameters?: {
    max_new_tokens?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repetition_penalty?: number;
    do_sample?: boolean;
    return_full_text?: boolean;
    stop?: string[];
  };
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface TextGenerationResult {
  generated_text: string;
}

export interface EmbeddingParams {
  model: string;
  inputs: string | string[];
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface TextClassificationParams {
  model: string;
  inputs: string;
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface TextClassificationResult {
  label: string;
  score: number;
}

export interface SummarizationParams {
  model: string;
  inputs: string;
  parameters?: {
    max_length?: number;
    min_length?: number;
  };
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface SummarizationResult {
  summary_text: string;
}

export interface QuestionAnsweringParams {
  model: string;
  inputs: {
    question: string;
    context: string;
  };
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface QuestionAnsweringResult {
  answer: string;
  score: number;
  start: number;
  end: number;
}

export interface ImageClassificationParams {
  model: string;
  inputs: Buffer;
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface ImageClassificationResult {
  label: string;
  score: number;
}

export interface TextToImageParams {
  model: string;
  inputs: string;
  parameters?: {
    negative_prompt?: string;
    width?: number;
    height?: number;
    num_inference_steps?: number;
    guidance_scale?: number;
  };
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface SentenceSimilarityParams {
  model: string;
  inputs: {
    source_sentence: string;
    sentences: string[];
  };
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface TokenClassificationParams {
  model: string;
  inputs: string;
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface TokenClassificationResult {
  entity_group: string;
  score: number;
  word: string;
  start: number;
  end: number;
}

export interface ZeroShotClassificationParams {
  model: string;
  inputs: string;
  parameters: {
    candidate_labels: string[];
    multi_label?: boolean;
  };
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface ZeroShotClassificationResult {
  sequence: string;
  labels: string[];
  scores: number[];
}

// ─── Hub Types ────────────────────────────────────────────────────────────────

export interface ModelInfo {
  id: string;
  modelId: string;
  sha: string;
  lastModified: string;
  tags: string[];
  pipeline_tag?: string;
  library_name?: string;
  private: boolean;
  author?: string;
  downloads: number;
  likes: number;
  cardData?: Record<string, unknown>;
}

export interface DatasetInfo {
  id: string;
  sha: string;
  lastModified: string;
  tags: string[];
  private: boolean;
  author?: string;
  downloads: number;
  likes: number;
  cardData?: Record<string, unknown>;
  description?: string;
}

export interface ModelSearchParams {
  search?: string;
  author?: string;
  filter?: string;
  sort?: 'downloads' | 'likes' | 'lastModified';
  direction?: 'asc' | 'desc';
  limit?: number;
  pipeline_tag?: string;
  library?: string;
}

export interface DatasetSearchParams {
  search?: string;
  author?: string;
  filter?: string;
  sort?: 'downloads' | 'likes' | 'lastModified';
  direction?: 'asc' | 'desc';
  limit?: number;
}

export interface RepoFile {
  rfilename: string;
  size?: number;
  blobId?: string;
  lfs?: {
    size: number;
    sha256: string;
    pointer_size: number;
  };
}

// ─── Dataset Utilities Types ──────────────────────────────────────────────────

export interface DatasetLoadOptions {
  split?: string;
  revision?: string;
  streaming?: boolean;
}

export interface DatasetRow {
  [key: string]: unknown;
}

export interface DatasetSlice {
  features: Record<string, string>;
  rows: DatasetRow[];
  num_rows_total: number;
  num_rows_per_page: number;
  partial: boolean;
}

// ─── Error Types ──────────────────────────────────────────────────────────────

export class HuggingFaceError extends Error {
  public readonly statusCode: number;
  public readonly errorType: string;

  constructor(message: string, statusCode: number, errorType: string = 'HuggingFaceError') {
    super(message);
    this.name = 'HuggingFaceError';
    this.statusCode = statusCode;
    this.errorType = errorType;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorType: this.errorType,
    };
  }
}
