# Quick Start Guide

Get the Stablecoin Gateway widget running in 5 minutes.

## Step 1: Add the Script (30 seconds)

```html
<script src="https://gateway.io/widget.js"></script>
```

## Step 2: Add a Container (10 seconds)

```html
<div id="pay-button"></div>
```

## Step 3: Initialize (1 minute)

```html
<script>
  StablecoinGateway.render('pay-button', {
    paymentLinkId: 'your-link-id',
    onComplete: (data) => {
      console.log('Payment successful!', data);
    }
  });
</script>
```

## That's It!

You now have a working crypto payment button on your site.

---

## Common Use Cases

### Use Case 1: E-commerce Product

**Scenario**: Sell a product for a fixed price

```html
<div id="product-checkout"></div>

<script src="https://gateway.io/widget.js"></script>
<script>
  StablecoinGateway.render('product-checkout', {
    apiUrl: 'https://api.gateway.io',
    amount: 99.99,
    currency: 'USD',
    merchantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    buttonText: 'Buy Now - $99.99',
    primaryColor: '#10B981',
    onComplete: (data) => {
      // Verify payment server-side
      fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: data.paymentId,
          txHash: data.txHash
        })
      }).then(() => {
        window.location = '/thank-you';
      });
    },
    onFailed: (error) => {
      alert('Payment failed: ' + error.message);
    }
  });
</script>
```

### Use Case 2: Subscription Service

**Scenario**: Monthly subscription with payment link

```html
<div id="subscribe-btn"></div>

<script src="https://gateway.io/widget.js"></script>
<script>
  StablecoinGateway.render('subscribe-btn', {
    paymentLinkId: 'monthly-subscription-29',
    buttonText: 'Subscribe - $29/month',
    primaryColor: '#4F46E5',
    onComplete: async (data) => {
      // Activate subscription
      await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: data.paymentId,
          plan: 'monthly'
        })
      });

      // Show success
      alert('Subscription activated! Welcome aboard.');
    }
  });
</script>
```

### Use Case 3: Donation Widget

**Scenario**: Multiple donation amounts

```html
<div id="donations">
  <h3>Support Our Cause</h3>
  <div id="donate-10"></div>
  <div id="donate-25"></div>
  <div id="donate-50"></div>
  <div id="donate-100"></div>
</div>

<script src="https://gateway.io/widget.js"></script>
<script>
  const amounts = [10, 25, 50, 100];
  const merchantAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

  amounts.forEach(amount => {
    StablecoinGateway.render(`donate-${amount}`, {
      apiUrl: 'https://api.gateway.io',
      amount: amount,
      merchantAddress: merchantAddress,
      buttonText: `Donate $${amount}`,
      primaryColor: '#FF6B6B',
      onComplete: (data) => {
        console.log(`Thank you for your $${amount} donation!`);
        // Track donation
        gtag('event', 'donation', {
          value: amount,
          currency: 'USD'
        });
      }
    });
  });
</script>
```

### Use Case 4: Modal Trigger

**Scenario**: Open checkout from your own button

```html
<button id="custom-checkout-btn" class="btn btn-primary">
  Checkout with Crypto
</button>

<script src="https://gateway.io/widget.js"></script>
<script>
  document.getElementById('custom-checkout-btn').addEventListener('click', () => {
    StablecoinGateway.openModal({
      apiUrl: 'https://api.gateway.io',
      amount: 149.99,
      merchantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      primaryColor: '#8B5CF6',
      onComplete: (data) => {
        // Process order
        processOrder(data.paymentId);
      },
      onCancel: () => {
        console.log('User cancelled payment');
      }
    });
  });
</script>
```

### Use Case 5: Dynamic Pricing

**Scenario**: Calculate amount based on cart

```html
<div id="cart-checkout"></div>

<script src="https://gateway.io/widget.js"></script>
<script>
  // Get cart total
  const cartTotal = calculateCartTotal(); // Your function

  StablecoinGateway.render('cart-checkout', {
    apiUrl: 'https://api.gateway.io',
    amount: cartTotal,
    merchantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    buttonText: `Pay $${cartTotal.toFixed(2)}`,
    primaryColor: '#F59E0B',
    onComplete: (data) => {
      // Send order to backend
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: data.paymentId,
          txHash: data.txHash,
          amount: cartTotal,
          items: getCartItems() // Your function
        })
      }).then(response => response.json())
        .then(order => {
          window.location = `/orders/${order.id}`;
        });
    }
  });
</script>
```

---

## Configuration Cheat Sheet

### Minimal Config (Payment Link)

```javascript
{
  paymentLinkId: 'your-link-id'
}
```

### Minimal Config (Dynamic Amount)

```javascript
{
  amount: 99.99,
  merchantAddress: '0x...'
}
```

### Full Config Example

```javascript
{
  apiUrl: 'https://api.gateway.io',     // Gateway API URL
  paymentLinkId: 'link-123',             // OR use amount + merchantAddress
  amount: 99.99,                         // Payment amount (USD)
  currency: 'USD',                       // Currency code
  merchantAddress: '0x...',              // Your wallet address
  network: 'polygon',                    // polygon or ethereum
  token: 'USDC',                         // USDC or USDT
  theme: 'light',                        // light or dark
  primaryColor: '#4F46E5',               // Brand color
  buttonText: 'Pay with Crypto',         // Button label
  onComplete: (data) => { },             // Success callback
  onFailed: (error) => { },              // Failure callback
  onCancel: () => { }                    // Cancel callback
}
```

---

## Server-Side Verification (CRITICAL!)

**Never trust client-side events alone.** Always verify payments server-side.

### Option 1: Webhooks (Recommended)

```javascript
// Client-side: Show success immediately
onComplete: (data) => {
  showSuccessMessage();
  window.location = '/thank-you?payment=' + data.paymentId;
}

// Server-side: Verify via webhook
app.post('/webhooks/payment', async (req, res) => {
  const { paymentId, txHash, signature } = req.body;

  // 1. Verify webhook signature
  const isValid = verifySignature(req.body, signature);
  if (!isValid) return res.status(401).send('Invalid signature');

  // 2. Check transaction on blockchain
  const tx = await verifyTransaction(txHash);
  if (!tx.confirmed) return res.status(400).send('Not confirmed');

  // 3. Fulfill order
  await fulfillOrder(paymentId);

  res.sendStatus(200);
});
```

### Option 2: Client-Initiated Verification

```javascript
// Client-side: Trigger verification
onComplete: async (data) => {
  const response = await fetch('/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentId: data.paymentId,
      txHash: data.txHash
    })
  });

  if (response.ok) {
    window.location = '/success';
  } else {
    alert('Payment verification failed. Contact support.');
  }
}

// Server-side: Verify on-demand
app.post('/api/verify-payment', async (req, res) => {
  const { paymentId, txHash } = req.body;

  // Query gateway API
  const payment = await gatewayAPI.getPayment(paymentId);

  // Verify transaction
  const tx = await blockchain.getTransaction(txHash);

  if (payment.status === 'completed' && tx.confirmed) {
    await fulfillOrder(paymentId);
    res.json({ verified: true });
  } else {
    res.status(400).json({ verified: false });
  }
});
```

---

## Testing Locally

### Quick Test

```bash
# 1. Clone widget
git clone https://github.com/connectsw/stablecoin-gateway.git
cd stablecoin-gateway/packages/checkout-widget

# 2. Install & build
npm install
npm run build

# 3. Start demo server
npm run serve

# 4. Open browser
open http://localhost:8080/demo.html
```

### Test with Your Site

```bash
# 1. Build widget
npm run build:dev

# 2. Copy to your project
cp dist/widget.js /path/to/your/site/public/

# 3. Include in your HTML
<script src="/widget.js"></script>
```

---

## Customization Examples

### Custom Colors

```javascript
StablecoinGateway.render('pay-btn', {
  paymentLinkId: 'link-123',
  primaryColor: '#10B981',  // Green button
  theme: 'dark'              // Dark theme
});
```

### Custom Button Text

```javascript
StablecoinGateway.render('pay-btn', {
  paymentLinkId: 'link-123',
  buttonText: '🚀 Launch Payment'  // Emoji + text
});
```

### Different Networks

```javascript
// Polygon (fast & cheap)
StablecoinGateway.render('pay-polygon', {
  amount: 99,
  merchantAddress: '0x...',
  network: 'polygon',
  token: 'USDC'
});

// Ethereum (more secure)
StablecoinGateway.render('pay-ethereum', {
  amount: 99,
  merchantAddress: '0x...',
  network: 'ethereum',
  token: 'USDT'
});
```

---

## Troubleshooting

### Button Doesn't Render

**Check**:
1. Container exists: `document.getElementById('pay-button')`
2. Script loaded: `console.log(window.StablecoinGateway)`
3. Console errors: Open DevTools → Console tab

**Solution**:
```javascript
// Wait for DOM ready
document.addEventListener('DOMContentLoaded', () => {
  StablecoinGateway.render('pay-button', { ... });
});
```

### Modal Doesn't Open

**Check**:
1. Button click listener attached
2. Modal not already open
3. Browser console for errors

**Solution**: Try programmatic open
```javascript
StablecoinGateway.openModal({ ... });
```

### Callbacks Not Firing

**Check**:
1. Callback functions defined correctly
2. Browser console for errors
3. Correct API URL set

**Debug**:
```javascript
onComplete: (data) => {
  console.log('COMPLETE:', data);  // Add logging
},
onFailed: (error) => {
  console.log('FAILED:', error);
},
onCancel: () => {
  console.log('CANCELLED');
}
```

### CORS Errors

**Issue**: Widget can't load from CDN

**Solution**: Use same protocol (http vs https)
```html
<!-- Wrong (if site is HTTPS) -->
<script src="http://gateway.io/widget.js"></script>

<!-- Right -->
<script src="https://gateway.io/widget.js"></script>
```

---

## Next Steps

1. **Read Full Docs**: See `README.md` for complete API reference
2. **Integration Guide**: See `INTEGRATION.md` for production setup
3. **Production Checklist**: See `MERCHANT-CHECKLIST.md` before launch
4. **Architecture**: See `ARCHITECTURE.md` for how it works

---

## Support

- **Docs**: https://docs.gateway.io
- **Email**: support@gateway.io
- **GitHub**: https://github.com/connectsw/stablecoin-gateway
- **Status**: https://status.gateway.io

---

**Version**: 1.0.0
**Last Updated**: 2026-02-02
