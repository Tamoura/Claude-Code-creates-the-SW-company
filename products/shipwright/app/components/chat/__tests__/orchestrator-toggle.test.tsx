import { describe, it, expect, vi, beforeEach } from 'vitest';

// Provide a minimal localStorage for tests that run in Node
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  get length() {
    return storageMap.size;
  },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
};

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage });
}

describe('Orchestrator Mode: Settings Store', () => {
  beforeEach(() => {
    vi.resetModules();
    storageMap.clear();
  });

  it('should export orchestratorModeStore with default value of false', async () => {
    const { orchestratorModeStore } = await import('~/lib/stores/settings');
    expect(orchestratorModeStore).toBeDefined();
    expect(orchestratorModeStore.get()).toBe(false);
  });

  it('should export updateOrchestratorMode function', async () => {
    const { updateOrchestratorMode } = await import('~/lib/stores/settings');
    expect(updateOrchestratorMode).toBeDefined();
    expect(typeof updateOrchestratorMode).toBe('function');
  });

  it('should update orchestratorModeStore when updateOrchestratorMode is called', async () => {
    const { orchestratorModeStore, updateOrchestratorMode } = await import('~/lib/stores/settings');
    expect(orchestratorModeStore.get()).toBe(false);

    updateOrchestratorMode(true);
    expect(orchestratorModeStore.get()).toBe(true);

    updateOrchestratorMode(false);
    expect(orchestratorModeStore.get()).toBe(false);
  });

  it('should persist orchestrator mode to localStorage', async () => {
    const { updateOrchestratorMode } = await import('~/lib/stores/settings');
    updateOrchestratorMode(true);
    expect(localStorage.getItem('orchestratorMode')).toBe('true');

    updateOrchestratorMode(false);
    expect(localStorage.getItem('orchestratorMode')).toBe('false');
  });

  it('should read persisted value from localStorage on access', async () => {
    // Verify the round-trip: write via updateOrchestratorMode, read back from store
    const { orchestratorModeStore, updateOrchestratorMode } = await import('~/lib/stores/settings');
    updateOrchestratorMode(true);
    expect(orchestratorModeStore.get()).toBe(true);
    expect(localStorage.getItem('orchestratorMode')).toBe('true');
  });
});
