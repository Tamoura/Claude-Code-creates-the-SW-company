export class RecomEngineApi {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async getRecommendations(
    userId: string,
    options: { limit?: number; strategy?: string; productId?: string; placementId?: string } = {}
  ): Promise<{ data: Array<{ productId: string; name: string; imageUrl: string; price: number; score: number; reason: string }>; meta: Record<string, unknown> }> {
    const params = new URLSearchParams({ userId });
    if (options.limit) params.set('limit', String(options.limit));
    if (options.strategy) params.set('strategy', options.strategy);
    if (options.productId) params.set('productId', options.productId);
    if (options.placementId) params.set('placementId', options.placementId);

    const response = await fetch(`${this.baseUrl}/api/v1/recommendations?${params}`, {
      headers: { 'X-API-Key': this.apiKey },
    });

    if (!response.ok) return { data: [], meta: {} };
    return response.json();
  }

  async trackEvent(
    eventType: string,
    userId: string,
    productId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({ eventType, userId, productId, metadata }),
      });
    } catch {
      // Fail silently - events are best-effort
    }
  }

  async getWidgetConfig(tenantId: string, placementId: string): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/tenants/${tenantId}/widgets?placementId=${placementId}`,
        { headers: { 'X-API-Key': this.apiKey } }
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.data?.[0] || null;
    } catch {
      return null;
    }
  }
}
