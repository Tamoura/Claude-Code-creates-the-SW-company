/**
 * Enforce production-only startup requirements.
 *
 * Call this before buildApp() in the entry point.
 */
export function enforceProductionEncryption(): void {
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.WEBHOOK_ENCRYPTION_KEY
  ) {
    throw new Error(
      'WEBHOOK_ENCRYPTION_KEY is required in production. ' +
      'Webhook secrets must be encrypted at rest.'
    );
  }
}
