// ─── Clients ──────────────────────────────────────────────────────────────────
export { InferenceClient } from './clients/inference.js';
export { HubClient } from './clients/hub.js';

// ─── Utilities ────────────────────────────────────────────────────────────────
export { DatasetLoader } from './utils/datasets.js';
export type { DatasetSplitInfo, DatasetInfoResponse, DatasetParquetInfo } from './utils/datasets.js';

// ─── Plugin ───────────────────────────────────────────────────────────────────
export { default as huggingfacePlugin } from './plugins/huggingface.js';
export type { HuggingFaceServices, HuggingFacePluginOptions } from './plugins/huggingface.js';

// ─── Types ────────────────────────────────────────────────────────────────────
export {
  HuggingFaceConfigSchema,
  HuggingFaceError,
} from './types/index.js';

export type {
  HuggingFaceConfig,
  TextGenerationParams,
  TextGenerationResult,
  EmbeddingParams,
  TextClassificationParams,
  TextClassificationResult,
  SummarizationParams,
  SummarizationResult,
  QuestionAnsweringParams,
  QuestionAnsweringResult,
  ImageClassificationParams,
  ImageClassificationResult,
  TextToImageParams,
  SentenceSimilarityParams,
  TokenClassificationParams,
  TokenClassificationResult,
  ZeroShotClassificationParams,
  ZeroShotClassificationResult,
  ModelInfo,
  DatasetInfo,
  ModelSearchParams,
  DatasetSearchParams,
  RepoFile,
  DatasetLoadOptions,
  DatasetRow,
  DatasetSlice,
} from './types/index.js';
