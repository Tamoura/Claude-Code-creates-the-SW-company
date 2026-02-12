export interface WidgetConfig {
  layout?: string;
  columns?: number;
  showPrice?: boolean;
  ctaText?: string;
  maxItems?: number;
  theme?: { primaryColor?: string; fontFamily?: string };
}

export interface RecommendationItem {
  productId: string;
  name?: string;
  imageUrl?: string;
  price?: number;
  score?: number;
  reason?: string;
}

export function renderWidget(
  container: HTMLElement,
  items: RecommendationItem[],
  config: WidgetConfig,
  onClickProduct: (productId: string) => void
): void {
  const layout = config.layout || 'grid';
  const columns = config.columns || 4;
  const showPrice = config.showPrice !== false;
  const ctaText = config.ctaText || 'View Product';
  const primaryColor = config.theme?.primaryColor || '#2563EB';
  const fontFamily = config.theme?.fontFamily || 'inherit';

  container.innerHTML = '';
  container.style.fontFamily = fontFamily;

  const wrapper = document.createElement('div');
  wrapper.className = 'recomengine-widget';

  if (layout === 'grid') {
    wrapper.style.display = 'grid';
    wrapper.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    wrapper.style.gap = '16px';
  } else if (layout === 'carousel') {
    wrapper.style.display = 'flex';
    wrapper.style.overflowX = 'auto';
    wrapper.style.gap = '16px';
    wrapper.style.scrollSnapType = 'x mandatory';
  } else {
    // list
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '12px';
  }

  for (const item of items) {
    const card = document.createElement('div');
    card.dataset.productId = item.productId;
    card.style.border = '1px solid #e5e7eb';
    card.style.borderRadius = '8px';
    card.style.overflow = 'hidden';
    card.style.background = '#fff';
    card.style.cursor = 'pointer';

    if (layout === 'carousel') {
      card.style.minWidth = '200px';
      card.style.scrollSnapAlign = 'start';
    }

    if (layout === 'list') {
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.gap = '12px';
    }

    // Image
    if (item.imageUrl) {
      const img = document.createElement('img');
      img.src = item.imageUrl;
      img.alt = item.name || 'Product';
      img.style.width = '100%';
      img.style.height = layout === 'list' ? '80px' : '160px';
      img.style.objectFit = 'cover';
      if (layout === 'list') img.style.width = '80px';
      card.appendChild(img);
    }

    const content = document.createElement('div');
    content.style.padding = '12px';

    if (item.name) {
      const name = document.createElement('div');
      name.textContent = item.name;
      name.style.fontWeight = '600';
      name.style.fontSize = '14px';
      name.style.marginBottom = '4px';
      content.appendChild(name);
    }

    if (showPrice && item.price != null) {
      const price = document.createElement('div');
      price.textContent = `$${item.price.toFixed(2)}`;
      price.style.color = '#6b7280';
      price.style.fontSize = '14px';
      price.style.marginBottom = '8px';
      content.appendChild(price);
    }

    const cta = document.createElement('button');
    cta.textContent = ctaText;
    cta.style.background = primaryColor;
    cta.style.color = '#fff';
    cta.style.border = 'none';
    cta.style.padding = '6px 12px';
    cta.style.borderRadius = '4px';
    cta.style.fontSize = '12px';
    cta.style.cursor = 'pointer';
    cta.style.width = '100%';
    content.appendChild(cta);

    card.appendChild(content);

    card.addEventListener('click', () => {
      onClickProduct(item.productId);
    });

    wrapper.appendChild(card);
  }

  container.appendChild(wrapper);
}
