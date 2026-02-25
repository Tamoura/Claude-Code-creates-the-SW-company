/**
 * HuggingFace Inference API Client
 *
 * Provides typed access to HuggingFace's Inference API for running
 * models hosted on the Hub. Supports text generation, embeddings,
 * classification, summarization, Q&A, image tasks, and more.
 *
 * Usage:
 *   const client = new InferenceClient({ apiKey: process.env.HF_API_KEY });
 *   const result = await client.textGeneration({
 *     model: 'meta-llama/Llama-3.1-8B-Instruct',
 *     inputs: 'The meaning of life is',
 *   });
 */

import {
  HuggingFaceError,
  type HuggingFaceConfig,
  HuggingFaceConfigSchema,
  type TextGenerationParams,
  type TextGenerationResult,
  type EmbeddingParams,
  type TextClassificationParams,
  type TextClassificationResult,
  type SummarizationParams,
  type SummarizationResult,
  type QuestionAnsweringParams,
  type QuestionAnsweringResult,
  type ImageClassificationParams,
  type ImageClassificationResult,
  type TextToImageParams,
  type SentenceSimilarityParams,
  type TokenClassificationParams,
  type TokenClassificationResult,
  type ZeroShotClassificationParams,
  type ZeroShotClassificationResult,
} from '../types/index.js';

export class InferenceClient {
  private readonly config: HuggingFaceConfig;

  constructor(options: {
    apiKey: string;
    inferenceBaseUrl?: string;
    timeoutMs?: number;
  }) {
    this.config = HuggingFaceConfigSchema.parse({
      apiKey: options.apiKey,
      inferenceBaseUrl: options.inferenceBaseUrl,
      timeoutMs: options.timeoutMs,
    });
  }

  // ─── Text Generation ──────────────────────────────────────────────────────

  async textGeneration(params: TextGenerationParams): Promise<TextGenerationResult[]> {
    return this.request<TextGenerationResult[]>(params.model, {
      inputs: params.inputs,
      parameters: params.parameters,
      options: params.options,
    });
  }

  // ─── Embeddings ───────────────────────────────────────────────────────────

  async embeddings(params: EmbeddingParams): Promise<number[][]> {
    return this.request<number[][]>(params.model, {
      inputs: params.inputs,
      options: params.options,
    });
  }

  // ─── Text Classification ──────────────────────────────────────────────────

  async textClassification(params: TextClassificationParams): Promise<TextClassificationResult[][]> {
    return this.request<TextClassificationResult[][]>(params.model, {
      inputs: params.inputs,
      options: params.options,
    });
  }

  // ─── Summarization ────────────────────────────────────────────────────────

  async summarization(params: SummarizationParams): Promise<SummarizationResult[]> {
    return this.request<SummarizationResult[]>(params.model, {
      inputs: params.inputs,
      parameters: params.parameters,
      options: params.options,
    });
  }

  // ─── Question Answering ───────────────────────────────────────────────────

  async questionAnswering(params: QuestionAnsweringParams): Promise<QuestionAnsweringResult> {
    return this.request<QuestionAnsweringResult>(params.model, {
      inputs: params.inputs,
      options: params.options,
    });
  }

  // ─── Image Classification ─────────────────────────────────────────────────

  async imageClassification(params: ImageClassificationParams): Promise<ImageClassificationResult[]> {
    const url = `${this.config.inferenceBaseUrl}/models/${params.model}`;
    return this.rawRequest<ImageClassificationResult[]>(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/octet-stream',
      },
      body: params.inputs,
    });
  }

  // ─── Text to Image ────────────────────────────────────────────────────────

  async textToImage(params: TextToImageParams): Promise<Buffer> {
    const url = `${this.config.inferenceBaseUrl}/models/${params.model}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: params.inputs,
          parameters: params.parameters,
          options: params.options,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        throw new HuggingFaceError(
          `Inference API error ${response.status}: ${text}`,
          response.status,
          'InferenceError',
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─── Sentence Similarity ──────────────────────────────────────────────────

  async sentenceSimilarity(params: SentenceSimilarityParams): Promise<number[]> {
    return this.request<number[]>(params.model, {
      inputs: params.inputs,
      options: params.options,
    });
  }

  // ─── Token Classification (NER) ───────────────────────────────────────────

  async tokenClassification(params: TokenClassificationParams): Promise<TokenClassificationResult[]> {
    return this.request<TokenClassificationResult[]>(params.model, {
      inputs: params.inputs,
      options: params.options,
    });
  }

  // ─── Zero-Shot Classification ─────────────────────────────────────────────

  async zeroShotClassification(params: ZeroShotClassificationParams): Promise<ZeroShotClassificationResult> {
    return this.request<ZeroShotClassificationResult>(params.model, {
      inputs: params.inputs,
      parameters: params.parameters,
      options: params.options,
    });
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────

  private async request<T>(model: string, body: Record<string, unknown>): Promise<T> {
    const url = `${this.config.inferenceBaseUrl}/models/${model}`;
    return this.rawRequest<T>(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  private async rawRequest<T>(url: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        throw new HuggingFaceError(
          `Inference API error ${response.status}: ${text}`,
          response.status,
          'InferenceError',
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
