interface WidgetConfig {
  apiUrl: string;
  paymentLinkId?: string;
  amount?: number;
  currency?: string;
  merchantAddress?: string;
  network?: string;
  token?: string;
  theme?: 'light' | 'dark';
  primaryColor?: string;
  buttonText?: string;
  onComplete?: (data: { paymentId: string; txHash: string }) => void;
  onFailed?: (error: { message: string }) => void;
  onCancel?: () => void;
}

interface PaymentData {
  paymentId: string;
  txHash: string;
}

interface ErrorData {
  message: string;
}

// RISK-081: Validate color strings to prevent XSS via inline styles.
// Only allows hex colors (#RGB, #RRGGBB, #RRGGBBAA) and named CSS colors.
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const CSS_NAMED_COLOR_RE = /^[a-zA-Z]{1,30}$/;

function sanitizeColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  if (HEX_COLOR_RE.test(color)) return color;
  if (CSS_NAMED_COLOR_RE.test(color)) return color;
  return fallback;
}

class StablecoinWidget {
  private config: WidgetConfig;
  private modal: HTMLElement | null = null;
  private iframe: HTMLIFrameElement | null = null;

  constructor(config: Partial<WidgetConfig>) {
    this.config = {
      apiUrl: config.apiUrl || 'https://pay.gateway.io',
      theme: config.theme || 'light',
      buttonText: config.buttonText || 'Pay with Crypto',
      primaryColor: sanitizeColor(config.primaryColor, '#4F46E5'),
      currency: config.currency || 'USD',
      network: config.network || 'polygon',
      token: config.token || 'USDC',
      ...config,
      // RISK-081: Re-sanitize after spread to prevent override
      primaryColor: sanitizeColor(config.primaryColor, '#4F46E5'),
    };

    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      // Verify origin matches apiUrl
      const apiOrigin = new URL(this.config.apiUrl).origin;
      if (event.origin !== apiOrigin) return;

      const { type, data } = event.data;

      switch (type) {
        case 'payment.completed':
          this.handleComplete(data);
          break;
        case 'payment.failed':
          this.handleFailed(data);
          break;
        case 'payment.cancelled':
          this.handleCancel();
          break;
      }
    });
  }

  private handleComplete(data: PaymentData): void {
    if (this.config.onComplete) {
      this.config.onComplete(data);
    }
    this.closeModal();
  }

  private handleFailed(error: ErrorData): void {
    if (this.config.onFailed) {
      this.config.onFailed(error);
    }
    this.closeModal();
  }

  private handleCancel(): void {
    if (this.config.onCancel) {
      this.config.onCancel();
    }
    this.closeModal();
  }

  private buildCheckoutUrl(): string {
    const { apiUrl, paymentLinkId, amount, currency, merchantAddress, network, token } = this.config;

    if (paymentLinkId) {
      return `${apiUrl}/pay/${paymentLinkId}`;
    }

    const params = new URLSearchParams();
    if (amount) params.set('amount', amount.toString());
    if (currency) params.set('currency', currency);
    if (merchantAddress) params.set('merchant', merchantAddress);
    if (network) params.set('network', network);
    if (token) params.set('token', token);

    return `${apiUrl}/checkout?${params.toString()}`;
  }

  private createButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = this.config.buttonText!;
    button.style.cssText = `
      background-color: ${this.config.primaryColor};
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.opacity = '0.9';
      button.style.transform = 'translateY(-1px)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.opacity = '1';
      button.style.transform = 'translateY(0)';
    });

    button.addEventListener('click', () => this.openModal());

    return button;
  }

  private createModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      opacity: 0;
      transition: opacity 0.3s;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      width: 90%;
      max-width: 480px;
      height: 80%;
      max-height: 720px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      transform: scale(0.95);
      transition: transform 0.3s;
    `;

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(0, 0, 0, 0.1);
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      font-size: 24px;
      cursor: pointer;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      transition: all 0.2s;
    `;

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'rgba(0, 0, 0, 0.2)';
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'rgba(0, 0, 0, 0.1)';
    });

    closeButton.addEventListener('click', () => this.closeModal());

    this.iframe = document.createElement('iframe');
    this.iframe.src = this.buildCheckoutUrl();
    this.iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 16px;
    `;

    container.appendChild(closeButton);
    container.appendChild(this.iframe);
    modal.appendChild(container);

    // Animate in
    setTimeout(() => {
      modal.style.opacity = '1';
      container.style.transform = 'scale(1)';
    }, 10);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal();
      }
    });

    return modal;
  }

  render(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`StablecoinWidget: Container #${containerId} not found`);
      return;
    }

    const button = this.createButton();
    container.appendChild(button);
  }

  openModal(): void {
    if (this.modal) return;

    this.modal = this.createModal();
    document.body.appendChild(this.modal);
  }

  closeModal(): void {
    if (!this.modal) return;

    this.modal.style.opacity = '0';
    const container = this.modal.firstElementChild as HTMLElement;
    if (container) {
      container.style.transform = 'scale(0.95)';
    }

    setTimeout(() => {
      if (this.modal && this.modal.parentNode) {
        this.modal.parentNode.removeChild(this.modal);
      }
      this.modal = null;
      this.iframe = null;
    }, 300);
  }
}

// Global API
declare global {
  interface Window {
    StablecoinGateway: {
      render: (containerId: string, config: Partial<WidgetConfig>) => void;
      openModal: (config: Partial<WidgetConfig>) => void;
    };
  }
}

window.StablecoinGateway = {
  render: (containerId: string, config: Partial<WidgetConfig>) => {
    const widget = new StablecoinWidget(config);
    widget.render(containerId);
  },
  openModal: (config: Partial<WidgetConfig>) => {
    const widget = new StablecoinWidget(config);
    widget.openModal();
  },
};
