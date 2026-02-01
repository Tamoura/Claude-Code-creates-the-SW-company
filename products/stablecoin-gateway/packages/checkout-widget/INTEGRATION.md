# Widget Integration Guide

## Quick Start

The checkout widget is a 4.3KB JavaScript bundle that can be embedded on any website.

## Building the Widget

```bash
cd packages/checkout-widget
npm install
npm run build
```

This creates `dist/widget.js` which can be served via CDN or included directly.

## Integration Steps

### 1. Serve the Widget

Add to your static file server or CDN:

```bash
# Copy to public assets
cp dist/widget.js /path/to/public/assets/widget.js
```

### 2. Embed on Website

```html
<!-- Load the widget -->
<script src="https://your-domain.com/widget.js"></script>

<!-- Add a container -->
<div id="crypto-payment"></div>

<!-- Initialize -->
<script>
  StablecoinGateway.render('crypto-payment', {
    apiUrl: 'https://api.your-gateway.com',
    paymentLinkId: 'link_abc123',
    primaryColor: '#4F46E5',
    onComplete: (data) => {
      // Payment successful - verify server-side
      fetch('/api/verify-payment', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  });
</script>
```

### 3. Handle Callbacks

**Server-side verification is critical.** Never trust client-side events alone.

```javascript
// Client-side: User experience
onComplete: (data) => {
  showSuccessMessage();
  redirectToThankYouPage();
},

// Server-side: Verify via webhook or API
app.post('/webhooks/payment', (req, res) => {
  const { paymentId, txHash } = req.body;

  // Verify transaction on-chain
  const verified = await verifyTransaction(txHash);

  if (verified) {
    // Fulfill order
    await fulfillOrder(paymentId);
  }

  res.sendStatus(200);
});
```

## Testing Locally

1. Build the widget: `npm run build`
2. Start the API: `cd ../../apps/api && npm run dev`
3. Open `demo.html` in a browser
4. Click any payment button to test the flow

## Production Checklist

- [ ] Widget served from CDN with caching headers
- [ ] HTTPS only for all domains
- [ ] Server-side payment verification implemented
- [ ] Webhook endpoint secured with signatures
- [ ] Error handling and retry logic
- [ ] Analytics tracking (optional)

## Customization Examples

### E-commerce Product Page

```html
<button id="buy-now">Buy Now - $99</button>

<script src="/widget.js"></script>
<script>
  document.getElementById('buy-now').onclick = () => {
    StablecoinGateway.openModal({
      apiUrl: 'https://api.gateway.com',
      amount: 99,
      currency: 'USD',
      merchantAddress: '0x...',
      onComplete: (data) => {
        window.location = '/order-success?payment=' + data.paymentId;
      }
    });
  };
</script>
```

### Subscription Payment

```html
<div id="subscribe-btn"></div>

<script src="/widget.js"></script>
<script>
  StablecoinGateway.render('subscribe-btn', {
    apiUrl: 'https://api.gateway.com',
    paymentLinkId: 'subscription_monthly',
    buttonText: 'Subscribe - $29/month',
    primaryColor: '#10B981',
    onComplete: async (data) => {
      // Activate subscription
      await fetch('/api/subscriptions/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: data.paymentId,
          txHash: data.txHash
        })
      });

      alert('Subscription activated!');
    }
  });
</script>
```

### Donation Widget

```html
<div id="donate"></div>

<script src="/widget.js"></script>
<script>
  const amounts = [10, 25, 50, 100];

  amounts.forEach(amount => {
    const container = document.createElement('div');
    container.id = 'donate-' + amount;
    document.getElementById('donate').appendChild(container);

    StablecoinGateway.render('donate-' + amount, {
      apiUrl: 'https://api.gateway.com',
      amount: amount,
      merchantAddress: '0x...',
      buttonText: `Donate $${amount}`,
      primaryColor: '#FF6B6B',
      onComplete: (data) => {
        console.log(`Thank you for your $${amount} donation!`);
      }
    });
  });
</script>
```

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security Notes

1. **Origin Verification**: The widget verifies postMessage events match the `apiUrl` origin
2. **HTTPS Required**: All production deployments must use HTTPS
3. **No PII Storage**: The widget doesn't store any personal or payment data
4. **Iframe Isolation**: Checkout happens in an isolated iframe

## Support

For issues or questions:
- GitHub Issues: https://github.com/connectsw/stablecoin-gateway/issues
- Email: support@gateway.io
