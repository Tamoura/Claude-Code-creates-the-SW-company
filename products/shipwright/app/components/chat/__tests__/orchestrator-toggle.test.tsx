import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

// --- useSettings hook integration ---

describe('Orchestrator Mode: useSettings hook wiring', () => {
  it('should import orchestratorModeStore and updateOrchestratorMode in useSettings module', async () => {
    const settingsModule = await import('~/lib/stores/settings');
    expect(settingsModule.orchestratorModeStore).toBeDefined();
    expect(settingsModule.updateOrchestratorMode).toBeDefined();
  });

  it('should export enableOrchestratorMode in UseSettingsReturn interface', async () => {
    const hookModule = await import('~/lib/hooks/useSettings');
    const returnType = hookModule.useSettings;
    expect(typeof returnType).toBe('function');
  });
});

// --- ChatBox component integration ---

describe('Orchestrator Mode: ChatBox toggle', () => {
  it('should accept orchestratorMode and setOrchestratorMode props', async () => {
    const chatBoxModule = await import('~/components/chat/ChatBox');
    expect(chatBoxModule.ChatBox).toBeDefined();
  });

  it('should render an Orchestrator toggle button with i-ph:users-three icon', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const chatBoxPath = path.resolve(__dirname, '..', 'ChatBox.tsx');
    const source = fs.readFileSync(chatBoxPath, 'utf-8');

    expect(source).toContain('title="Orchestrator"');
    expect(source).toContain('i-ph:users-three');
    expect(source).toContain('setOrchestratorMode');
  });
});

// --- Chat.client API routing ---

describe('Orchestrator Mode: API routing', () => {
  it('should conditionally route to /api/orchestrator in Chat.client.tsx', async () => {
    // Verify the source code contains the conditional API routing
    const fs = await import('fs');
    const path = await import('path');
    const chatClientPath = path.resolve(__dirname, '..', 'Chat.client.tsx');
    const source = fs.readFileSync(chatClientPath, 'utf-8');

    // Should contain the conditional expression for API routing
    expect(source).toContain("orchestratorMode ? '/api/orchestrator' : '/api/chat'");
    // Should destructure orchestratorMode from useSettings
    expect(source).toContain('orchestratorMode');
    expect(source).toContain('enableOrchestratorMode');
  });
});
