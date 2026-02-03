import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @clerk/remix before importing anything that uses it
vi.mock('@clerk/remix/ssr.server', () => ({
  rootAuthLoader: vi.fn((_args: any, handler?: any) => {
    if (typeof handler === 'function') {
      return handler({ userId: null, sessionId: null });
    }
    return { userId: null, sessionId: null };
  }),
  getAuth: vi.fn(() => ({ userId: null, sessionId: null })),
}));

vi.mock('@clerk/remix', () => ({
  ClerkApp: (component: any) => component,
  SignIn: () => null,
  SignUp: () => null,
}));

describe('Auth: Route Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect unauthenticated users from index to sign-in', async () => {
    const { getAuth } = await import('@clerk/remix/ssr.server');
    vi.mocked(getAuth).mockReturnValue({ userId: null, sessionId: null } as any);

    const { loader } = await import('../_index');
    const request = new Request('http://localhost:3110/');
    const response = await loader({
      request,
      params: {},
      context: { cloudflare: { env: {} } } as any,
    });

    // Unauthenticated user should get redirected
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/sign-in');
  });

  it('should allow authenticated users to access index', async () => {
    const { getAuth } = await import('@clerk/remix/ssr.server');
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user_123',
      sessionId: 'sess_123',
    } as any);

    const { loader } = await import('../_index');
    const request = new Request('http://localhost:3110/');
    const response = await loader({
      request,
      params: {},
      context: { cloudflare: { env: {} } } as any,
    });

    // Authenticated user should not be redirected
    expect(response.status).not.toBe(302);
  });

  it('should redirect unauthenticated users from chat route to sign-in', async () => {
    const { getAuth } = await import('@clerk/remix/ssr.server');
    vi.mocked(getAuth).mockReturnValue({ userId: null, sessionId: null } as any);

    const { loader } = await import('../chat.$id');
    const request = new Request('http://localhost:3110/chat/abc123');
    const response = await loader({
      request,
      params: { id: 'abc123' },
      context: { cloudflare: { env: {} } } as any,
    });

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/sign-in');
  });
});

describe('Auth: Sign-in Route', () => {
  it('should export a default component for sign-in', async () => {
    const signInModule = await import('../sign-in.$');
    expect(signInModule.default).toBeDefined();
    expect(typeof signInModule.default).toBe('function');
  });
});

describe('Auth: Sign-up Route', () => {
  it('should export a default component for sign-up', async () => {
    const signUpModule = await import('../sign-up.$');
    expect(signUpModule.default).toBeDefined();
    expect(typeof signUpModule.default).toBe('function');
  });
});
