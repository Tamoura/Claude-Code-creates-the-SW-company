# Merchant Integration Checklist

Use this checklist when integrating the Stablecoin Gateway checkout widget on your website.

## Pre-Integration

- [ ] **Gateway Account**: Sign up at gateway.io and complete KYC
- [ ] **Merchant Address**: Set up Ethereum/Polygon wallet for receiving payments
- [ ] **Payment Links**: Create payment links in gateway dashboard (optional)
- [ ] **Test Environment**: Get test API credentials for sandbox testing

## Development Setup

- [ ] **Download Widget**: Get latest widget.js from CDN or npm
- [ ] **Add Script Tag**: Include widget script in your HTML
- [ ] **Container Element**: Add div with unique ID for button placement
- [ ] **Configuration**: Set up widget config with your merchant details
- [ ] **Event Handlers**: Implement onComplete, onFailed, onCancel callbacks

## Testing Phase

### Functional Tests
- [ ] Button renders correctly on page load
- [ ] Modal opens when button is clicked
- [ ] Modal closes when X button is clicked
- [ ] Modal closes when backdrop is clicked
- [ ] Payment completion triggers onComplete callback
- [ ] Payment failure triggers onFailed callback
- [ ] User cancellation triggers onCancel callback

### Cross-Browser Tests
- [ ] Chrome (Windows/Mac)
- [ ] Firefox (Windows/Mac)
- [ ] Safari (Mac/iOS)
- [ ] Edge (Windows)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Responsive Tests
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Mobile landscape

### Security Tests
- [ ] Widget loads over HTTPS in production
- [ ] postMessage events are origin-verified
- [ ] No sensitive data in localStorage/cookies
- [ ] CSP headers don't block widget functionality

## Backend Integration

### Server-Side Verification
- [ ] **Webhook Endpoint**: Set up POST endpoint for payment notifications
- [ ] **Signature Verification**: Verify webhook signatures from gateway
- [ ] **Transaction Verification**: Check on-chain transaction status
- [ ] **Idempotency**: Handle duplicate webhook deliveries
- [ ] **Error Handling**: Implement retry logic for failed verifications

### Database Updates
- [ ] Store payment ID for order tracking
- [ ] Store transaction hash for proof of payment
- [ ] Update order status to "paid" after verification
- [ ] Log payment events for auditing

### Order Fulfillment
- [ ] Only fulfill orders after server-side verification
- [ ] Never trust client-side onComplete alone
- [ ] Send confirmation email after payment
- [ ] Update inventory/subscription status

## Production Deployment

### Pre-Launch
- [ ] Switch from test API to production API
- [ ] Update merchant address to production wallet
- [ ] Test with small real transaction (< $10)
- [ ] Verify funds received in wallet
- [ ] Check webhook notifications arrive correctly

### Launch Day
- [ ] Monitor error logs for widget issues
- [ ] Track payment success/failure rates
- [ ] Set up alerts for webhook failures
- [ ] Have rollback plan ready

### Post-Launch
- [ ] Monitor conversion rates
- [ ] Collect user feedback
- [ ] Review transaction confirmations times
- [ ] Optimize based on analytics

## Security Checklist

- [ ] **HTTPS Only**: Enforce HTTPS in production
- [ ] **API Key Security**: Never expose API keys in frontend code
- [ ] **Webhook Security**: Validate all webhook signatures
- [ ] **Rate Limiting**: Implement rate limits on payment endpoints
- [ ] **Fraud Detection**: Monitor for suspicious payment patterns
- [ ] **PII Protection**: Don't store unnecessary customer data
- [ ] **Logging**: Log security events (failed verifications, etc.)

## Performance Checklist

- [ ] **Widget Size**: Confirm widget.js is under 10KB
- [ ] **Load Time**: Widget loads in under 500ms
- [ ] **CDN**: Serve widget from CDN with caching
- [ ] **Lazy Loading**: Load widget only when needed (optional)
- [ ] **Bundle Analysis**: No unnecessary dependencies included

## Compliance Checklist

### Legal
- [ ] **Terms of Service**: Update ToS to mention crypto payments
- [ ] **Privacy Policy**: Disclose payment data handling
- [ ] **Refund Policy**: Define refund process for crypto payments
- [ ] **Tax Compliance**: Consult accountant on crypto revenue

### Regulatory
- [ ] **KYC/AML**: Ensure gateway handles compliance
- [ ] **Customer Identification**: Store customer info if required
- [ ] **Transaction Monitoring**: Gateway monitors for fraud
- [ ] **Reporting**: Understand tax reporting obligations

## User Experience Checklist

- [ ] **Clear Pricing**: Display amount in USD before crypto conversion
- [ ] **Payment Options**: Show crypto payment alongside other methods
- [ ] **Loading States**: Show spinner while wallet connects
- [ ] **Error Messages**: Display user-friendly error messages
- [ ] **Success Confirmation**: Show clear success message after payment
- [ ] **Email Receipt**: Send payment confirmation email
- [ ] **Support Link**: Provide help link for payment issues

## Monitoring & Analytics

- [ ] **Payment Metrics**: Track success/failure/abandonment rates
- [ ] **Error Tracking**: Monitor widget JavaScript errors
- [ ] **Performance Monitoring**: Track widget load time
- [ ] **Conversion Funnel**: Analyze checkout drop-off points
- [ ] **Revenue Tracking**: Monitor crypto payment revenue
- [ ] **Customer Feedback**: Collect user feedback on crypto checkout

## Maintenance Checklist

### Weekly
- [ ] Review payment success rates
- [ ] Check webhook delivery rates
- [ ] Monitor error logs

### Monthly
- [ ] Update widget to latest version
- [ ] Review security advisories
- [ ] Analyze payment trends
- [ ] Test payment flow end-to-end

### Quarterly
- [ ] Audit payment records
- [ ] Review compliance requirements
- [ ] Optimize based on analytics
- [ ] Plan feature enhancements

## Support Checklist

- [ ] **Documentation**: Link to widget docs in help center
- [ ] **Contact Support**: Provide support email/chat
- [ ] **FAQ**: Create FAQ for common crypto payment questions
- [ ] **Troubleshooting**: Document common issues and fixes
- [ ] **Status Page**: Link to gateway status page

## Emergency Procedures

### If Widget Stops Working
1. Check gateway status page
2. Review browser console errors
3. Verify API endpoints are responding
4. Roll back to previous widget version
5. Display fallback payment method
6. Contact gateway support

### If Payments Not Arriving
1. Verify wallet address is correct
2. Check transaction on block explorer
3. Confirm network (Polygon vs Ethereum)
4. Wait for network confirmations
5. Check gateway dashboard for payment status
6. Contact gateway support if funds missing

### If Webhooks Stop Arriving
1. Verify webhook endpoint is accessible
2. Check for signature validation errors
3. Review webhook retry queue in dashboard
4. Manually verify recent payments
5. Contact gateway support

---

## Quick Reference

**Widget Version**: 1.0.0
**Bundle Size**: 4.3KB minified
**Browser Support**: Chrome 90+, Firefox 88+, Safari 14+
**Networks Supported**: Polygon, Ethereum
**Tokens Supported**: USDC, USDT

**Support**:
- Docs: https://docs.gateway.io
- Email: support@gateway.io
- Status: https://status.gateway.io

**Example Code**:
```html
<script src="https://gateway.io/widget.js"></script>
<div id="pay-button"></div>
<script>
  StablecoinGateway.render('pay-button', {
    paymentLinkId: 'your-link-id',
    onComplete: (data) => {
      // Verify server-side!
      fetch('/verify', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  });
</script>
```
