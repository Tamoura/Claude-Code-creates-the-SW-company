# Password and Secrets Storage: From Hashing to Key Management

Storing passwords and secrets correctly is a non-negotiable security requirement. A single breach exposing plaintext or weakly hashed passwords can destroy user trust, trigger regulatory penalties, and generate years of reputational damage. This guide covers password hashing algorithms, salt and pepper strategies, key derivation functions, secrets management platforms, and rotation policies. The goal is to give CTOs a clear, actionable framework for ensuring that credentials and secrets are stored, transmitted, and rotated according to current best practices.

## When to Use / When NOT to Use

| Scenario | Recommended Approach | Avoid |
|----------|---------------------|-------|
| Storing user login passwords | Argon2id with tuned parameters | MD5, SHA-1, SHA-256 without salt, bcrypt with low cost factor |
| API keys for third-party integrations | Secrets manager (Vault, AWS Secrets Manager) with automatic rotation | Environment variables in source code, .env files committed to git |
| Database connection strings | Secrets manager with IAM-based access, or IAM database authentication | Hardcoded in config files, shared via Slack or email |
| Encryption keys for data at rest | KMS (AWS KMS, GCP Cloud KMS) with envelope encryption | Storing raw encryption keys alongside the encrypted data |
| JWT signing keys | Secrets manager with rotation; use RS256 (asymmetric) for distributed verification | HS256 with a static secret shared across services |
| One-time tokens (password reset, email verification) | Cryptographically random token, hashed (SHA-256) before storage, with expiry | Sequential or predictable tokens, stored in plaintext |
| Machine-to-machine authentication | Short-lived tokens via OAuth2 client_credentials flow, or mutual TLS | Long-lived API keys with no rotation or audit trail |

## Password Hashing Deep Dive

### Why Hashing, Not Encryption

Passwords must be hashed, not encrypted. Encryption is reversible with the right key -- if an attacker obtains the key, all passwords are exposed. Hashing is a one-way function: the original password cannot be recovered from the hash. Authentication works by hashing the submitted password and comparing hashes.

### Algorithm Comparison

| Algorithm | Memory-Hard | GPU-Resistant | Recommended | Notes |
|-----------|-------------|---------------|-------------|-------|
| **Argon2id** | Yes | Yes | Primary choice | Winner of the 2015 Password Hashing Competition. Hybrid of Argon2i (side-channel resistant) and Argon2d (GPU-resistant). |
| **bcrypt** | No | Moderate | Acceptable | Well-established, widely supported. 72-byte input limit. Not memory-hard, so vulnerable to FPGA/ASIC attacks at scale. |
| **scrypt** | Yes | Yes | Acceptable | Memory-hard, but harder to tune correctly than Argon2. Used by Litecoin for proof-of-work. |
| **PBKDF2** | No | No | Legacy only | NIST-approved but not GPU-resistant. Still used where FIPS compliance requires it. Minimum 600,000 iterations per OWASP 2023 guidance. |
| **SHA-256/SHA-512** | No | No | Never for passwords | Fast hash functions are the wrong tool. A single GPU can compute billions of SHA-256 hashes per second. |
| **MD5** | No | No | Never | Broken. Collisions found. Over 10 trillion hashes per second on modern hardware. |

### Argon2id Parameter Tuning

OWASP recommends these minimum parameters for Argon2id:

- **Memory:** 19 MiB (19456 KiB) minimum. Higher is better -- 64 MiB is a good target if your server can handle the concurrent load.
- **Iterations (time cost):** 2 minimum. Increase until hashing takes 0.5-1 second per attempt on your production hardware.
- **Parallelism:** Match to available CPU cores, typically 1-4.

**Tuning procedure:** Set memory to the maximum your server can afford per concurrent login (memory * max_concurrent_logins < available RAM). Then increase iterations until the hash takes ~500ms. This balances security against denial-of-service risk from expensive hashing.

### Salt

A salt is a random value unique to each password hash. It ensures that two users with the same password produce different hashes, defeating precomputed rainbow table attacks.

**Requirements:**
- Generated using a cryptographically secure random number generator (CSPRNG)
- At least 16 bytes (128 bits) long
- Unique per user and regenerated when the password changes
- Stored alongside the hash (modern algorithms like bcrypt and Argon2 include the salt in the output string)

### Pepper

A pepper is a secret value added to all passwords before hashing. Unlike salt, the pepper is not stored in the database -- it is stored in application configuration or a secrets manager.

**Purpose:** Even if the database is fully compromised, an attacker cannot crack passwords without the pepper. This adds defense-in-depth beyond salt.

**Implementation approaches:**
1. **Prepend pepper to password before hashing:** `hash = argon2id(pepper + password, salt)`. Simple but requires rehashing all passwords if the pepper is rotated.
2. **Encrypt the hash with the pepper as key:** `stored = AES_encrypt(hash, pepper)`. Allows pepper rotation by re-encrypting hashes without requiring users to re-enter passwords. This is the preferred approach.

**OWASP recommendation:** Use HMAC with the pepper as the key: `hash = argon2id(HMAC_SHA256(pepper, password), salt)`. The pepper can be rotated by layering HMAC operations.

## Secrets Management

### Platform Comparison

| Platform | Best For | Pricing Model | Key Features |
|----------|----------|---------------|--------------|
| **HashiCorp Vault** | Multi-cloud, on-premise, complex policies | Open source + Enterprise | Dynamic secrets, PKI, transit encryption, policy-as-code |
| **AWS Secrets Manager** | AWS-native applications | Per secret + per API call | Automatic rotation for RDS/Redshift/DocumentDB, CloudFormation integration |
| **AWS Systems Manager Parameter Store** | Simple key-value secrets on AWS | Free tier + standard/advanced tiers | Lower cost than Secrets Manager, but no built-in rotation |
| **GCP Secret Manager** | GCP-native applications | Per secret version + per access | IAM-based access, automatic replication, audit logging |
| **Azure Key Vault** | Azure-native applications | Per operation | HSM-backed keys, certificate management, managed identity integration |
| **Doppler** | Developer experience, multi-environment | Per seat | CLI-first, environment syncing, change logs |
| **1Password Secrets Automation** | Teams already using 1Password | Included in business plans | Connect server for infrastructure secrets, good developer UX |

### Secret Lifecycle Management

1. **Creation:** Generate secrets using CSPRNG. Never let humans choose secrets. Use minimum 256 bits of entropy for cryptographic keys, 128 bits for API tokens.

2. **Storage:** Store in a secrets manager with access control. Never in source code, .env files committed to git, CI/CD pipeline definitions, or Slack messages.

3. **Access:** Principle of least privilege. Each service accesses only the secrets it needs. Use IAM roles (not shared credentials) for AWS services. Audit all access.

4. **Rotation:** Automate rotation on a schedule. Database passwords: every 90 days. API keys: every 180 days. Encryption keys: annually, with key versioning for backward compatibility.

5. **Revocation:** Immediately revoke secrets that may have been compromised. Have a runbook for emergency rotation. Practice this runbook quarterly.

6. **Deletion:** Remove old secret versions after confirming no service depends on them. Maintain an audit trail of deletions.

## Real-World Examples

### Dropbox: bcrypt + Pepper with Global Salt Migration

Dropbox published their password storage architecture, which uses three layers: SHA-512 to normalize password length (bcrypt's 72-byte limit), bcrypt for the actual password hash, and AES-256 encryption of the bcrypt hash using a global pepper stored in hardware security modules (HSMs). This layered approach provides defense-in-depth: even if the database and application servers are compromised, the pepper in HSMs protects the hashes. When they needed to rotate the pepper, they re-encrypted all bcrypt hashes with the new pepper without requiring users to change passwords.

### LinkedIn: The Cost of Getting It Wrong

In 2012, LinkedIn suffered a breach exposing 6.5 million password hashes stored as unsalted SHA-1. Attackers cracked the majority within days using GPU-accelerated brute force. LinkedIn subsequently migrated to bcrypt with salt. The breach cost LinkedIn significant reputational damage and ultimately a $1.25 million settlement. The lesson: using a fast hash function without salt is equivalent to storing passwords in plaintext against a determined attacker.

### GitHub: Token Hashing and Prefix Identification

GitHub stores authentication tokens (personal access tokens, OAuth tokens) hashed with SHA-256 in the database. The plaintext token is shown to the user only once at creation time. Tokens include a human-readable prefix (`ghp_` for personal access tokens, `gho_` for OAuth) that allows identifying the token type without querying the database. This pattern enables fast revocation: a leaked token can be identified by prefix and format without decrypting or comparing hashes.

### AWS: Automatic Secrets Rotation

AWS Secrets Manager provides built-in rotation for RDS database passwords using Lambda functions. The rotation process: (1) create a new password, (2) set it on the database, (3) update the secret in Secrets Manager, (4) test the new credentials, (5) mark the old credentials as deprecated. The entire process happens without application downtime because applications fetch the current secret value at connection time rather than caching it.

## Decision Framework

### Choose Argon2id When...

- You are building a new application with no legacy constraints
- Your language/framework has a well-maintained Argon2 library
- You can afford the memory cost per concurrent authentication attempt
- You want the strongest available protection against GPU/ASIC attacks

### Choose bcrypt When...

- Argon2 is not available in your language or framework
- You need broad compatibility and well-understood behavior
- Your passwords are under 72 bytes (virtually all human-generated passwords)
- You set the cost factor to at least 12 (2023 hardware baseline)

### Choose a Secrets Manager When...

- You have more than one service that needs shared secrets
- You need to rotate secrets without redeploying applications
- You need an audit trail of who accessed what secret and when
- You are in a regulated industry (SOC2, PCI-DSS, HIPAA)

### Use KMS Envelope Encryption When...

- You encrypt data at rest in your application
- You need to rotate encryption keys without re-encrypting all data
- You want hardware-backed key protection
- You need to separate key management from data storage

## Common Mistakes

**1. Storing passwords with fast hash functions.** SHA-256, even with a salt, is unsuitable for password hashing because it is designed to be fast. An attacker with a modern GPU can compute 10 billion SHA-256 hashes per second. Argon2id at 64MiB memory and 2 iterations takes ~500ms per hash on a server -- the attacker must spend 500ms per guess per password.

**2. Hardcoding secrets in source code.** This includes .env files committed to git, Docker Compose files with database passwords, CI/CD pipeline configurations with API keys, and Terraform state files with secrets. All of these end up in version history, which persists even after deletion. Use a secrets manager or encrypted environment injection at deployment time.

**3. Not rotating secrets after employee departure.** When an engineer leaves the company, assume they had access to every secret they could have seen. Rotate database passwords, API keys, signing keys, and any shared credentials within 24 hours of departure.

**4. Using the same secret across environments.** Development, staging, and production must use different secrets. A compromised development secret should never grant production access. Secrets managers support environment-specific secret paths for this reason.

**5. Logging secrets.** Audit your logging pipeline to ensure that request bodies, headers, and environment variables containing secrets are never written to log files. Use structured logging with explicit field allowlists rather than logging entire objects.

**6. No emergency rotation runbook.** When a secret is compromised (it will happen eventually), you need to rotate it within minutes, not hours. Document the rotation procedure, automate it where possible, test it quarterly, and measure the time from detection to rotation completion.

**7. Storing plaintext password reset tokens.** Reset tokens are equivalent to passwords. Store them hashed (SHA-256 is fine for high-entropy random tokens) and set short expiration times (15-60 minutes). Invalidate all outstanding reset tokens when a password is changed.

## Key Metrics to Track

| Metric | Why It Matters | Target |
|--------|---------------|--------|
| Hash computation time | Too fast = vulnerable; too slow = DoS risk | 250ms-1s per hash |
| Failed authentication rate | Spike may indicate credential stuffing | Alert on > 2x baseline |
| Secret age (days since last rotation) | Old secrets are higher risk | < 90 days for passwords, < 365 days for encryption keys |
| Secrets in code scan findings | Detects hardcoded credentials | Zero (block in CI) |
| Time to rotate (emergency) | Measures incident response capability | < 15 minutes |
| Secrets access audit coverage | Percentage of secret accesses with audit trail | 100% |
| bcrypt/Argon2 cost factor | Ensures parameters are current | Review annually, increase as hardware improves |
| Pepper rotation age | Defense-in-depth layer freshness | < 1 year |

## References

- OWASP Password Storage Cheat Sheet (2023 revision) -- minimum algorithm parameters
- Password Hashing Competition results: password-hashing.net -- Argon2 specification and rationale
- Dropbox engineering blog: "How Dropbox securely stores your passwords" (2016)
- LinkedIn breach analysis: multiple security research publications (2012-2016)
- GitHub engineering blog: "Behind GitHub's new authentication token formats" (2021)
- AWS documentation: Secrets Manager rotation for Amazon RDS
- HashiCorp Vault documentation: Dynamic secrets and transit encryption engine
- NIST SP 800-63B: Digital Identity Guidelines, Authentication and Lifecycle Management (2020 revision)
- Troy Hunt, "Our password hashing has no clothes" (2017) -- analysis of real-world password storage failures
