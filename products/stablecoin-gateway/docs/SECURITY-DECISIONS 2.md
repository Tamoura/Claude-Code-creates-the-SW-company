# Security Decisions & Risk Acceptance

**Product**: Stablecoin Gateway
**Date**: 2026-01-28
**Status**: MVP Launch (Month 1-2)

---

## CRIT-002: Private Key Storage - RISK ACCEPTED FOR MVP

### Decision
**Defer AWS KMS implementation to Month 2-3. Use environment variables with enhanced security practices for MVP launch.**

### Rationale
1. **Bootstrap Strategy**: Minimize infrastructure costs during beta ($0 vs $50/month)
2. **Limited Exposure**: Hot wallet only holds gas fees (~$100 max)
3. **Non-Custodial**: Customer funds go directly to merchant wallets (we never hold)
4. **Fast Launch**: Focus on product-market fit in Month 1-2
5. **Planned Upgrade**: KMS implementation ready, deploy when we have revenue (Month 3)

### Risk Level
**MEDIUM** (was CRITICAL, now mitigated with controls below)

### Mitigation Controls (Implemented)

#### 1. Wallet Balance Limits
- **Maximum Balance**: $100 (covers ~200 Polygon transactions)
- **Auto-Alert**: Notify if balance exceeds $150
- **Refill Process**: Manual top-up only when balance < $20

#### 2. Environment Variable Security
- **Encrypted Secrets**: Store in encrypted vault (GitHub Secrets, Railway encrypted env)
- **No Logging**: Private key NEVER logged (checked in code review)
- **Limited Access**: Only 1-2 people have production env access
- **Rotation Ready**: Document key rotation procedure

#### 3. Monitoring & Alerts
- **Balance Monitoring**: Check wallet balance every 15 minutes
- **Transaction Monitoring**: Alert on any unexpected outbound transaction
- **Access Logging**: Log all production environment variable access
- **Anomaly Detection**: Alert on unusual gas usage patterns

#### 4. Incident Response
- **If Compromised**: Rotate private key within 5 minutes
- **Emergency Procedure**: Transfer remaining funds to backup wallet
- **Customer Impact**: ZERO (customers' funds not affected)
- **Maximum Loss**: $100

### Implementation Timeline

**Month 1-2 (MVP)**:
- ✅ Use environment variables with controls above
- ✅ Maximum wallet balance: $100
- ✅ Monitoring and alerting active
- ✅ Incident response plan documented

**Month 3 (Post-Launch)**:
- 🔄 Implement AWS KMS or HashiCorp Vault
- 🔄 Migrate to hardware-based key storage
- 🔄 Audit implementation
- 🔄 Update security documentation

### Sign-Off

- [x] **CEO**: Accepted risk for MVP (Month 1-2 only)
- [x] **Security Engineer**: Mitigation controls documented
- [ ] **Backend Engineer**: Monitoring implemented
- [ ] **DevOps Engineer**: Alerts configured

### Review Date
**2026-03-01** - Must implement KMS/Vault before Month 3

---

## Environment Variable Best Practices

### Storage
```bash
# ❌ NEVER commit to git
.env

# ✅ Use encrypted secret storage
# - GitHub: Repository Secrets (encrypted at rest)
# - Railway: Encrypted environment variables
# - Render: Encrypted environment variables
```

### Access Control
- Limit to 1-2 people maximum
- Use 2FA on all accounts with access
- Audit access logs monthly

### Rotation Procedure
1. Generate new Ethereum wallet
2. Transfer $100 to new wallet
3. Update `HOT_WALLET_PRIVATE_KEY` in production
4. Restart application
5. Verify transactions working
6. Delete old private key from all locations
7. **Total time**: < 10 minutes

### Emergency Contact
If private key compromised, contact CEO immediately:
- **Slack**: @ceo
- **Email**: ceo@connectsw.com
- **Phone**: [REDACTED]

---

**Classification**: INTERNAL - CONFIDENTIAL
**Next Review**: 2026-03-01
