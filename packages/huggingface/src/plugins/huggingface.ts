/**
 * HuggingFace Fastify Plugin
 *
 * Registers InferenceClient, HubClient, and DatasetLoader on the
 * Fastify instance for easy access from any route handler.
 *
 * Usage in a product's app.ts:
 *   import huggingfacePlugin from '@connectsw/huggingface/plugins/huggingface';
 *   fastify.register(huggingfacePlugin);
 *
 * Then in route handlers:
 *   const result = await fastify.hf.inference.textGeneration({ ... });
 *   const models = await fastify.hf.hub.searchModels({ ... });
 *   const rows = await fastify.hf.datasets.getRows('imdb', { split: 'train' });
 */

import { type FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { InferenceClient } from '../clients/inference.js';
import { HubClient } from '../clients/hub.js';
import { DatasetLoader } from '../utils/datasets.js';

export interface HuggingFaceServices {
  inference: InferenceClient;
  hub: HubClient;
  datasets: DatasetLoader;
}

declare module 'fastify' {
  interface FastifyInstance {
    hf: HuggingFaceServices;
  }
}

export interface HuggingFacePluginOptions {
  apiKey?: string;
  baseUrl?: string;
  inferenceBaseUrl?: string;
  timeoutMs?: number;
}

const huggingfacePlugin: FastifyPluginAsync<HuggingFacePluginOptions> = async (fastify, opts) => {
  const apiKey = opts.apiKey ?? process.env.HUGGINGFACE_API_KEY ?? process.env.HF_API_KEY ?? '';

  if (!apiKey) {
    fastify.log.warn(
      'HuggingFace API key not provided. Set HUGGINGFACE_API_KEY or HF_API_KEY env var, ' +
      'or pass apiKey in plugin options. Some operations may fail.',
    );
  }

  const inference = new InferenceClient({
    apiKey,
    inferenceBaseUrl: opts.inferenceBaseUrl,
    timeoutMs: opts.timeoutMs,
  });

  const hub = new HubClient({
    apiKey,
    baseUrl: opts.baseUrl,
    timeoutMs: opts.timeoutMs,
  });

  const datasets = new DatasetLoader({
    apiKey,
    timeoutMs: opts.timeoutMs,
  });

  fastify.decorate('hf', {
    inference,
    hub,
    datasets,
  });

  fastify.log.info('HuggingFace plugin registered successfully');
};

export default fp(huggingfacePlugin, {
  name: 'huggingface',
});
