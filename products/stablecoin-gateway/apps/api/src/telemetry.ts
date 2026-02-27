/**
 * OpenTelemetry SDK Baseline — stablecoin-gateway
 *
 * Initialises the OpenTelemetry Node.js SDK so framework hooks are in
 * place for future real exporter configuration. When
 * OTEL_EXPORTER_OTLP_ENDPOINT is set the SDK will ship traces to that
 * collector endpoint; otherwise the SDK runs with no trace exporter
 * (spans are created and propagated but discarded) so the process
 * stays silent in development and CI.
 *
 * IMPORTANT: This module MUST be imported at the very top of src/index.ts
 * (before any other import) so instrumentation patches apply before the
 * instrumented libraries are first required.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  serviceName: 'stablecoin-gateway',
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy fs instrumentation — not useful for this service
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

// Graceful shutdown on process exit so in-flight spans are flushed
process.on('SIGTERM', () => {
  sdk.shutdown().catch(() => {
    // Ignore shutdown errors — process is exiting anyway
  });
});
