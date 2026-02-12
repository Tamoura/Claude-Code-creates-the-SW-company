import { RecomEngineApi } from './api';

export class RecomEngineTracker {
  private api: RecomEngineApi;
  private userId: string | null = null;
  private observer: IntersectionObserver | null = null;
  private trackedImpressions = new Set<string>();

  constructor(api: RecomEngineApi) {
    this.api = api;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  trackImpression(productId: string, placementId?: string): void {
    if (!this.userId) return;
    const key = `${productId}:${placementId || ''}`;
    if (this.trackedImpressions.has(key)) return;
    this.trackedImpressions.add(key);

    this.api.trackEvent('recommendation_impressed', this.userId, productId, {
      placementId,
    });
  }

  trackClick(productId: string, placementId?: string): void {
    if (!this.userId) return;
    this.api.trackEvent('recommendation_clicked', this.userId, productId, {
      placementId,
    });
  }

  observeImpressions(container: HTMLElement, placementId?: string): void {
    if (!('IntersectionObserver' in window)) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const productId = (entry.target as HTMLElement).dataset.productId;
            if (productId) {
              this.trackImpression(productId, placementId);
            }
          }
        }
      },
      { threshold: 0.5 }
    );

    const items = container.querySelectorAll('[data-product-id]');
    items.forEach((item) => this.observer!.observe(item));
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.trackedImpressions.clear();
  }
}
