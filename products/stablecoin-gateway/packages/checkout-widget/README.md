# Stablecoin Gateway - Checkout Widget

Embeddable JavaScript widget for accepting stablecoin payments on any website.

## Installation

### CDN (Recommended)

```html
<script src="https://gateway.io/widget.js"></script>
```

### NPM

```bash
npm install @stablecoin-gateway/checkout-widget
```

## Usage

### Basic Usage with Payment Link

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Store</title>
</head>
<body>
  <div id="payment-button"></div>

  <script src="https://gateway.io/widget.js"></script>
  <script>
    StablecoinGateway.render('payment-button', {
      paymentLinkId: 'abc12345',
      primaryColor: '#4F46E5',
      onComplete: (data) => {
        console.log('Payment completed!', data);
        // { paymentId: 'pay_xxx', txHash: '0x...' }
      },
      onFailed: (error) => {
        console.error('Payment failed:', error.message);
      },
      onCancel: () => {
        console.log('Payment cancelled');
      }
    });
  </script>
</body>
</html>
```

### Dynamic Amount (No Payment Link)

```html
<div id="payment-button"></div>

<script src="https://gateway.io/widget.js"></script>
<script>
  StablecoinGateway.render('payment-button', {
    apiUrl: 'https://pay.gateway.io',
    amount: 99.99,
    currency: 'USD',
    merchantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    network: 'polygon',
    token: 'USDC',
    buttonText: 'Pay $99.99',
    primaryColor: '#10B981',
    theme: 'light',
    onComplete: (data) => {
      // Handle successful payment
      fetch('/api/orders/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }
  });
</script>
```

### Modal Mode (No Button)

Open the checkout modal programmatically without rendering a button:

```javascript
document.getElementById('checkout-btn').addEventListener('click', () => {
  StablecoinGateway.openModal({
    paymentLinkId: 'abc12345',
    primaryColor: '#FF6B6B',
    onComplete: (data) => console.log('Paid!', data)
  });
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | `string` | `https://pay.gateway.io` | Gateway API base URL |
| `paymentLinkId` | `string` | - | Pre-configured payment link ID |
| `amount` | `number` | - | Payment amount (USD) |
| `currency` | `string` | `USD` | Payment currency |
| `merchantAddress` | `string` | - | Ethereum address to receive payment |
| `network` | `string` | `polygon` | Blockchain network (`polygon` or `ethereum`) |
| `token` | `string` | `USDC` | Stablecoin token (`USDC` or `USDT`) |
| `theme` | `'light' \| 'dark'` | `light` | Widget theme |
| `primaryColor` | `string` | `#4F46E5` | Brand color (hex) |
| `buttonText` | `string` | `Pay with Crypto` | Button label text |

## Events

### onComplete

Triggered when payment is successful.

```javascript
onComplete: (data) => {
  console.log(data.paymentId); // 'pay_abc123'
  console.log(data.txHash);    // '0x123...'
}
```

### onFailed

Triggered when payment fails.

```javascript
onFailed: (error) => {
  console.error(error.message); // 'Insufficient balance'
}
```

### onCancel

Triggered when user closes the checkout modal.

```javascript
onCancel: () => {
  console.log('User cancelled payment');
}
```

## Styling

The widget applies minimal styling and adapts to your site's design. You can customize:

- **Button color**: Set `primaryColor` to match your brand
- **Button text**: Set `buttonText` to customize the call-to-action
- **Theme**: Choose `light` or `dark` mode

## Security

- All payment data is transmitted over HTTPS
- The widget uses an iframe to isolate the checkout experience
- No sensitive data is stored in localStorage or cookies
- PostMessage communication is origin-verified

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Build with sourcemaps
npm run build:dev

# Watch mode
npm run watch
```

## Support

For issues or questions:
- Documentation: https://docs.gateway.io
- Support: support@gateway.io
- GitHub: https://github.com/connectsw/stablecoin-gateway

## License

MIT
