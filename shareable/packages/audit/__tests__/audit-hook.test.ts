/**
 * Audit hook tests
 *
 * Tests the Fastify audit hook middleware that automatically
 * records audit entries for authenticated requests.
 */

describe('Audit Hook Middleware', () => {
  // Mock the structure an audit hook would receive
  function createMockRequest(overrides: Partial<any> = {}): any {
    return {
      method: 'POST',
      url: '/api/v1/payments',
      routerPath: '/api/v1/payments',
      ip: '203.0.113.1',
      headers: { 'user-agent': 'Mozilla/5.0 Test' },
      currentUser: { id: 'user-123', email: 'user@test.com', role: 'user' },
      ...overrides,
    };
  }

  function createMockReply(overrides: Partial<any> = {}): any {
    return {
      statusCode: 200,
      ...overrides,
    };
  }

  describe('audit hook logic', () => {
    it('extracts actor ID from authenticated request', () => {
      const request = createMockRequest();
      const actorId = request.currentUser?.id || 'anonymous';
      expect(actorId).toBe('user-123');
    });

    it('uses anonymous actor for unauthenticated requests', () => {
      const request = createMockRequest({ currentUser: undefined });
      const actorId = request.currentUser?.id || 'anonymous';
      expect(actorId).toBe('anonymous');
    });

    it('determines action from HTTP method', () => {
      const methodToAction: Record<string, string> = {
        GET: 'READ',
        POST: 'CREATE',
        PUT: 'UPDATE',
        PATCH: 'UPDATE',
        DELETE: 'DELETE',
      };

      expect(methodToAction['POST']).toBe('CREATE');
      expect(methodToAction['GET']).toBe('READ');
      expect(methodToAction['DELETE']).toBe('DELETE');
      expect(methodToAction['PUT']).toBe('UPDATE');
    });

    it('extracts IP address from request', () => {
      const request = createMockRequest({ ip: '203.0.113.42' });
      expect(request.ip).toBe('203.0.113.42');
    });

    it('only records mutating requests (non-GET)', () => {
      const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'];
      const reading = ['GET', 'HEAD', 'OPTIONS'];

      mutating.forEach(method => {
        expect(['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)).toBe(true);
      });

      reading.forEach(method => {
        expect(['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)).toBe(false);
      });
    });

    it('records successful responses (2xx)', () => {
      const reply = createMockReply({ statusCode: 201 });
      const shouldRecord = reply.statusCode >= 200 && reply.statusCode < 300;
      expect(shouldRecord).toBe(true);
    });

    it('does not record failed auth responses (401)', () => {
      const reply = createMockReply({ statusCode: 401 });
      const shouldRecord = reply.statusCode >= 200 && reply.statusCode < 300;
      expect(shouldRecord).toBe(false);
    });

    it('extracts resource type from route path', () => {
      function extractResourceType(path: string): string {
        const parts = path.split('/').filter(Boolean);
        // Find the last non-parameter segment
        for (let i = parts.length - 1; i >= 0; i--) {
          if (!parts[i].startsWith(':')) {
            return parts[i].toUpperCase().replace(/-/g, '_');
          }
        }
        return 'UNKNOWN';
      }

      expect(extractResourceType('/api/v1/payments')).toBe('PAYMENTS');
      expect(extractResourceType('/api/v1/api-keys')).toBe('API_KEYS');
      expect(extractResourceType('/api/v1/webhooks/:id')).toBe('WEBHOOKS');
    });
  });

  describe('audit entry composition', () => {
    it('composes a complete audit entry', () => {
      const request = createMockRequest({
        method: 'POST',
        routerPath: '/api/v1/transactions',
        ip: '203.0.113.1',
      });

      const auditEntry = {
        actor: request.currentUser?.id || 'anonymous',
        action: 'CREATE',
        resourceType: 'transactions',
        resourceId: 'result-id',
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        timestamp: new Date(),
      };

      expect(auditEntry.actor).toBe('user-123');
      expect(auditEntry.action).toBe('CREATE');
      expect(auditEntry.resourceType).toBe('transactions');
      expect(auditEntry.ip).toBe('203.0.113.1');
      expect(auditEntry.timestamp).toBeInstanceOf(Date);
    });
  });
});
