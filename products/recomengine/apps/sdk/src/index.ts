import { RecomEngineApi } from './api';
import { RecomEngineTracker } from './tracker';
import { renderWidget, WidgetConfig, RecommendationItem } from './renderer';
import { getConfigFromScript, RecomEngineConfig } from './config';

class RecomEngine {
  private api: RecomEngineApi | null = null;
  private tracker: RecomEngineTracker | null = null;
  private config: RecomEngineConfig | null = null;
  private initialized = false;

  init(config?: Partial<RecomEngineConfig>): void {
    const scriptConfig = getConfigFromScript();
    this.config = { ...scriptConfig, ...config } as RecomEngineConfig;

    if (!this.config?.apiKey || !this.config?.apiUrl) {
      console.warn('[RecomEngine] Missing apiKey or apiUrl. SDK will not function.');
      return;
    }

    this.api = new RecomEngineApi(this.config.apiUrl, this.config.apiKey);
    this.tracker = new RecomEngineTracker(this.api);

    if (this.config.userId) {
      this.tracker.setUserId(this.config.userId);
    }

    this.initialized = true;

    // Auto-discover and render placements
    if (this.config.autoTrack !== false) {
      this.autoRender();
    }
  }

  setUserId(userId: string): void {
    this.config = { ...this.config!, userId };
    this.tracker?.setUserId(userId);
  }

  async getRecommendations(
    userId: string,
    options: { limit?: number; strategy?: string; productId?: string; placementId?: string } = {}
  ): Promise<RecommendationItem[]> {
    if (!this.api) return [];
    const result = await this.api.getRecommendations(userId, options);
    return result.data;
  }

  async renderPlacement(
    container: HTMLElement,
    options: { userId?: string; placementId?: string; strategy?: string; productId?: string; config?: WidgetConfig } = {}
  ): Promise<void> {
    if (!this.api || !this.tracker) return;

    const userId = options.userId || this.config?.userId;
    if (!userId) return;

    const placementId = options.placementId || container.dataset.recomenginePlace;

    try {
      const result = await this.api.getRecommendations(userId, {
        limit: options.config?.maxItems || 8,
        strategy: options.strategy,
        productId: options.productId,
        placementId,
      });

      if (result.data.length === 0) return;

      const widgetConfig: WidgetConfig = options.config || {
        layout: 'grid',
        columns: 4,
        showPrice: true,
        ctaText: 'View Product',
      };

      renderWidget(container, result.data, widgetConfig, (productId) => {
        this.tracker!.trackClick(productId, placementId);
      });

      // Observe impressions
      this.tracker.observeImpressions(container, placementId);
    } catch {
      // Fail silently — don't break the merchant's page
    }
  }

  trackEvent(eventType: string, productId: string, metadata?: Record<string, unknown>): void {
    if (!this.api || !this.config?.userId) return;
    this.api.trackEvent(eventType, this.config.userId, productId, metadata);
  }

  destroy(): void {
    this.tracker?.destroy();
    this.api = null;
    this.tracker = null;
    this.initialized = false;
  }

  private autoRender(): void {
    if (typeof document === 'undefined') return;

    // Wait for DOM to be ready
    const discover = () => {
      const placements = document.querySelectorAll<HTMLElement>('[data-recomengine-placement]');
      placements.forEach((el) => {
        this.renderPlacement(el, {
          placementId: el.dataset.recomenginePlace || el.dataset.recomengineId,
        });
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', discover);
    } else {
      discover();
    }
  }
}

// IIFE: expose as window.RecomEngine
const instance = new RecomEngine();

if (typeof window !== 'undefined') {
  (window as any).RecomEngine = instance;

  // Auto-initialize if script tag has data-api-key
  const config = getConfigFromScript();
  if (config?.apiKey) {
    instance.init(config);
  }
}

export default instance;
