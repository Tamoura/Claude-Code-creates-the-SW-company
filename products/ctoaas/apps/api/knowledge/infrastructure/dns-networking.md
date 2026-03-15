# DNS and Networking Fundamentals for CTOs

DNS is the internet's directory service, translating human-readable domain names into IP addresses that machines use to route traffic. Every millisecond of DNS resolution latency multiplies across every user request, making DNS architecture a silent but critical factor in application performance. Understanding DNS deeply allows CTOs to make informed decisions about CDN strategy, multi-region deployment, disaster recovery, and incident response.

## When to Use / When NOT to Use

| Scenario | Recommended Approach | Avoid |
|----------|---------------------|-------|
| Global user base with latency requirements | GeoDNS with regional endpoints | Single-region A records |
| High-availability production services | Managed DNS (Route 53, Cloudflare, NS1) with health checks | Self-hosted BIND/CoreDNS in production |
| Development and staging environments | Simple A/CNAME records, short TTLs | Complex DNS architectures that add debugging overhead |
| Multi-cloud or hybrid deployments | DNS-based load balancing across providers | Hardcoded IPs or provider-specific internal DNS |
| Zero-downtime migrations | DNS cutover with pre-lowered TTLs | Instant DNS changes with high TTLs still cached |
| Internal service discovery (K8s, ECS) | Service mesh or internal DNS (CoreDNS, Consul) | Public DNS for internal service routing |

## How DNS Resolution Works

When a user types `app.example.com` into their browser, a chain of lookups occurs:

1. **Browser cache** -- The browser checks its own DNS cache first. Chrome caches entries for up to 60 seconds by default.
2. **OS resolver cache** -- The operating system maintains a DNS cache (controlled by `systemd-resolved` on Linux, `mDNSResponder` on macOS).
3. **Recursive resolver** -- The configured DNS resolver (typically the ISP's, or a public resolver like 8.8.8.8 or 1.1.1.1) receives the query.
4. **Root nameserver** -- The recursive resolver queries one of 13 root nameserver clusters to find the TLD nameserver for `.com`.
5. **TLD nameserver** -- The `.com` TLD nameserver returns the authoritative nameservers for `example.com`.
6. **Authoritative nameserver** -- The authoritative nameserver for `example.com` returns the actual IP address for `app.example.com`.
7. **Response propagation** -- The answer flows back through the chain, with each layer caching the result according to the TTL.

This entire process typically completes in 20-120ms for uncached queries. Cached queries resolve in under 1ms.

### Key Record Types

- **A** -- Maps a domain to an IPv4 address.
- **AAAA** -- Maps a domain to an IPv6 address.
- **CNAME** -- Aliases one domain to another. Cannot coexist with other record types at the zone apex.
- **MX** -- Mail exchange records, with priority values.
- **TXT** -- Arbitrary text, commonly used for SPF, DKIM, domain verification.
- **NS** -- Delegates a zone to specific nameservers.
- **SOA** -- Start of Authority, contains zone metadata including serial number and refresh intervals.
- **SRV** -- Service locator records, used by some service discovery systems.
- **CAA** -- Certificate Authority Authorization, controls which CAs can issue certificates for your domain.

## DNS Caching and TTL

TTL (Time To Live) is specified in seconds and controls how long resolvers cache a record. This is the single most important DNS configuration decision you will make.

**Low TTL (30-300 seconds):**
- Enables fast failover and traffic shifting
- Increases query volume to authoritative nameservers
- Higher DNS costs (most managed DNS providers charge per query)
- Better for services behind health-checked load balancers

**High TTL (3600-86400 seconds):**
- Reduces DNS query volume and costs
- Improves perceived performance for repeat visitors
- Makes changes slow to propagate (stale caches)
- Appropriate for stable infrastructure that rarely changes

**The TTL pre-lowering pattern:** Before a planned migration, lower TTLs from 3600s to 60s at least 48 hours in advance. This ensures old high-TTL entries expire before the cutover. After the migration stabilizes, raise TTLs back.

### Negative caching

Failed lookups (NXDOMAIN) are also cached, governed by the SOA record's minimum TTL field. If you create a new subdomain and it was recently queried, users may see NXDOMAIN responses until the negative cache expires. Plan for this during launches.

## Trade-offs

| Factor | Managed DNS (Route 53, Cloudflare) | Self-Hosted DNS |
|--------|-------------------------------------|-----------------|
| Reliability | 100% SLA (Route 53), globally distributed | Depends on your infrastructure |
| Cost | $0.50-1.00/million queries | Server costs, engineer time |
| Features | Health checks, GeoDNS, failover, DNSSEC | Full control, custom logic |
| Operational burden | Near zero | Significant (patching, monitoring, scaling) |
| Latency | Anycast networks, sub-ms in most regions | Depends on server locations |
| Vendor lock-in | Low (DNS is standardized) | None |

## CDN DNS Strategies

CDNs rely heavily on DNS to route users to the nearest edge node. Understanding these patterns helps when debugging performance issues or designing multi-CDN architectures.

**Anycast DNS:** The CDN provider advertises the same IP address from multiple locations via BGP. The network itself routes users to the nearest point of presence. Cloudflare and Fastly use this approach. It is transparent to the application.

**CNAME-based routing:** You CNAME your domain to the CDN's hostname (e.g., `d1234.cloudfront.net`). The CDN's DNS then resolves to the nearest edge. This adds one DNS hop but works with any CDN provider.

**GeoDNS with multi-CDN:** Services like NS1 or Cloudflare Load Balancing can route different geographic regions to different CDN providers. Netflix famously uses this pattern to optimize cost and performance across CDN partners.

**DNS prefetching:** Adding `<link rel="dns-prefetch" href="//cdn.example.com">` in your HTML tells browsers to resolve CDN domains before they are needed, eliminating DNS latency from the critical rendering path.

## Real-World Examples

**GitHub's DNS outage (2020):** A configuration change to GitHub's authoritative DNS caused widespread service disruption. The incident highlighted that even organizations with world-class infrastructure can be brought down by DNS misconfiguration. GitHub's post-mortem emphasized the need for DNS change validation tooling and canary deployments for DNS changes.

**Cloudflare's 1.1.1.1 launch (2018):** Cloudflare launched their public DNS resolver on April 1, 2018. They chose the 1.1.1.1 address specifically because it was memorable, but had to work with APNIC (the address was previously used as a traffic sink for research) and deal with countless network devices that had hardcoded 1.1.1.1 as a default or test address. This illustrates how deeply DNS assumptions are baked into infrastructure.

**Dyn DDoS attack (2016):** A massive botnet attack against Dyn, a major DNS provider, took down Twitter, Reddit, Spotify, and many other services. Companies that used multiple DNS providers or had DNS failover configured were less affected. This incident drove widespread adoption of multi-provider DNS strategies.

## Decision Framework

**Choose managed DNS (Route 53, Cloudflare DNS, Google Cloud DNS) when:**
- You need global availability without managing infrastructure
- Your team is small and cannot dedicate engineers to DNS operations
- You want integrated health checks and failover
- DNSSEC is a requirement and you want turnkey implementation

**Choose self-hosted DNS (CoreDNS, PowerDNS) when:**
- You need custom DNS logic (e.g., split-horizon for internal vs external)
- Regulatory requirements mandate that DNS resolution stays within your network
- You are building a DNS-based service discovery system within a private network

**Choose multi-provider DNS when:**
- Your application cannot tolerate any single provider's outage
- You have compliance requirements for infrastructure redundancy
- The cost of multi-provider is justified by the business impact of DNS downtime

## Troubleshooting DNS Issues

### Essential commands

```bash
# Full resolution trace showing each nameserver hop
dig +trace app.example.com

# Query a specific nameserver directly
dig @8.8.8.8 app.example.com

# Check all record types
dig app.example.com ANY

# Reverse DNS lookup
dig -x 203.0.113.50

# Check TTL remaining on cached entry
dig app.example.com | grep -E "^app"

# Test DNS propagation from multiple locations
# Use tools like dnschecker.org or whatsmydns.net
```

### Common issues and fixes

**Problem: Changes not propagating.** Check the TTL on the old record. Multiply by 2 for safety margin. Some ISP resolvers ignore TTL and cache for up to 48 hours. Solution: lower TTL well in advance of changes.

**Problem: CNAME at zone apex.** DNS standards prohibit CNAME records at the zone apex (`example.com` without a subdomain). Use ALIAS/ANAME records (provider-specific) or A records pointing to a stable IP. Cloudflare and Route 53 support zone apex aliases.

**Problem: Intermittent resolution failures.** Often caused by one of multiple authoritative nameservers being misconfigured. Use `dig +trace` to identify which nameserver returns incorrect results. Check that all NS records point to functional servers.

**Problem: High DNS latency.** Switch to a faster recursive resolver (Cloudflare 1.1.1.1, Google 8.8.8.8). For authoritative DNS, ensure your provider has points of presence near your users. Enable DNS prefetching in your application.

## Common Mistakes

1. **Setting high TTLs and then needing fast failover.** A 24-hour TTL means up to 24 hours of traffic going to a dead server after a failover. Use TTLs of 60-300 seconds for anything behind a health check.

2. **Not monitoring DNS resolution time.** DNS latency is invisible in most APM tools. Instrument it separately. A single slow authoritative nameserver can add 500ms+ to page loads for a subset of users.

3. **Assuming DNS propagation is instant.** Even with a 60-second TTL, recursive resolvers may cache longer. Always plan for propagation delays and test from multiple locations.

4. **Using DNS for load balancing without health checks.** Round-robin DNS sends traffic to all listed IPs regardless of health. Without health checks, failed servers continue receiving traffic until the record is manually updated.

5. **Forgetting about negative caching.** If you query a domain that does not exist yet, the NXDOMAIN response is cached. Creating the record does not immediately override this cache.

6. **Not securing DNS.** Without DNSSEC, DNS responses can be spoofed. Without CAA records, any CA can issue certificates for your domain. Both should be configured for production services.

## Key Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| DNS resolution time (P50/P95) | <50ms P50, <150ms P95 | Directly impacts first-page-load time |
| DNS query volume | Baseline + alerting on anomalies | Spikes may indicate DDoS or misconfiguration |
| TTL compliance rate | >99% of records have intentional TTLs | Prevents surprise caching behavior |
| DNSSEC validation rate | 100% of zones signed | Prevents DNS spoofing attacks |
| Authoritative nameserver health | 100% of NS records resolve | Single unhealthy NS causes intermittent failures |
| DNS provider uptime | >99.99% | Below this, consider multi-provider |

## References

- Mockapetris, P. "Domain Names - Concepts and Facilities" (RFC 1034), "Domain Names - Implementation and Specification" (RFC 1035), IETF, 1987.
- Cloudflare Learning Center. "What is DNS?" -- https://www.cloudflare.com/learning/dns/what-is-dns/
- AWS Route 53 Developer Guide. "How Amazon Route 53 Routes Traffic" -- https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/
- GitHub Engineering Blog. Post-mortem reports on DNS-related incidents, 2020.
- Dyn. "Analysis of the Friday October 21 Attack" -- post-mortem of the 2016 Mirai botnet DDoS, archived.
- NS1. "Multi-CDN DNS Architecture" -- https://ns1.com/resources
- Google Public DNS documentation -- https://developers.google.com/speed/public-dns
