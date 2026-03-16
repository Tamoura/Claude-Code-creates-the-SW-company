# Open Source Licensing: A CTO's Operational Guide

Open source software forms the foundation of virtually every modern technology stack, but the licenses governing that software carry real legal and business consequences. Understanding the spectrum from permissive to copyleft licenses, knowing what triggers compliance obligations, and maintaining an auditable inventory of your dependencies are operational responsibilities that fall squarely on the CTO.

This guide covers the major license families, their practical implications for commercial software, compatibility constraints, and the tools and processes needed to manage open source risk at scale.

## When This Matters / When It Doesn't

| When It Matters | When It Doesn't |
|-----------------|-----------------|
| You distribute software to customers (on-prem, SDKs, mobile apps) | You use only permissive-licensed libraries in an internal tool |
| You run a SaaS product that incorporates AGPL-licensed code | You are evaluating a library in a throwaway prototype |
| You are preparing for acquisition, IPO, or due diligence | You are using well-known frameworks with clear permissive licenses (React, Express) |
| You contribute company code to open source projects | You consume APIs from open source projects without embedding their code |
| Your product is an embedded system or device firmware | Your entire stack is proprietary with no third-party dependencies (rare) |
| A customer or partner contract includes IP warranties | |

## License Families: Detailed Breakdown

### Permissive Licenses

Permissive licenses impose minimal restrictions. You can use, modify, and redistribute the code in proprietary products with few obligations beyond attribution.

**MIT License.** The most popular open source license by volume. Requires only that you include the original copyright notice and license text in distributions. No restrictions on sublicensing, commercial use, or combining with proprietary code. The entire license is 171 words. This simplicity is its strength and its weakness: it provides almost no patent protection for either party.

**Apache License 2.0.** Similar permissiveness to MIT but adds an explicit patent grant. Contributors automatically grant users a royalty-free patent license covering their contributions. It also includes a patent retaliation clause: if you sue the project or any contributor for patent infringement related to the software, your patent license terminates. This makes Apache 2.0 the preferred permissive license for enterprise software and corporate-backed projects. The Linux Foundation, Apache Software Foundation, and most Google open source projects use it.

**BSD Licenses (2-Clause and 3-Clause).** Functionally similar to MIT. The 3-Clause variant adds a "no endorsement" clause preventing use of the project's name to promote derived products. The original 4-Clause BSD included an advertising clause that created compatibility headaches and is now considered obsolete.

### Copyleft Licenses

Copyleft licenses require that derivative works be distributed under the same or a compatible license. The scope of what constitutes a "derivative work" varies significantly across copyleft licenses, and this is where most compliance complexity lives.

**GPL v2.** Requires that if you distribute a binary that links to GPL v2 code, you must make the complete corresponding source code available under GPL v2. The key trigger is *distribution*. Internal use within your organization does not trigger GPL obligations. What constitutes "linking" has been debated extensively: static linking clearly creates a derivative work, dynamic linking is less clear (the FSF says it does, others disagree), and using a GPL library through a network API generally does not.

**GPL v3.** Extends GPL v2 with additional provisions: an explicit patent grant (similar to Apache 2.0), anti-tivoization clauses (preventing hardware lockdown of modified software), and compatibility with more licenses. GPL v3 is incompatible with GPL v2-only code (without the "or later" clause), which has caused practical problems in the Linux kernel ecosystem since Linus Torvalds licensed the kernel under GPL v2 only.

**LGPL (Lesser GPL).** Designed specifically for libraries. Allows proprietary software to dynamically link against LGPL libraries without triggering copyleft on the proprietary code. If you modify the LGPL library itself, those modifications must be released under LGPL. This makes LGPL practical for system libraries (glibc, GTK) while preserving the ability for commercial software to use them.

**AGPL (Affero GPL).** Closes the "SaaS loophole" in GPL. If you modify AGPL-licensed code and provide it as a network service (even without distributing binaries), you must make the complete source code of your modified version available to users of that service. This has profound implications for SaaS companies. Google internally bans AGPL-licensed code entirely. Many enterprises have similar policies. If you use MongoDB (pre-SSPL), Grafana (AGPL components), or Mastodon in your stack, understand your AGPL obligations.

**MPL 2.0 (Mozilla Public License).** A "file-level" copyleft. If you modify an MPL-licensed file, the modified file must be released under MPL. But you can combine MPL files with proprietary files in the same project without the copyleft extending. This makes MPL a practical middle ground: it protects the original project's files while allowing commercial integration.

### Source-Available Licenses

These are not "open source" by the OSI definition but are frequently confused with open source.

**BSL (Business Source License).** Used by MariaDB, CockroachDB, HashiCorp (Terraform, Vault, Consul), and Sentry. Allows non-production use freely but restricts production use without a commercial license. After a specified change date (typically 3-4 years), the code converts to a permissive open source license. The BSL is essentially "delayed open source."

**SSPL (Server Side Public License).** Created by MongoDB after they switched from AGPL. Requires that if you offer the SSPL-licensed software as a service, you must release the complete source code of your entire service stack (not just the MongoDB modifications) under SSPL. The OSI rejected SSPL as an open source license. AWS responded by building DocumentDB (MongoDB-compatible) from scratch rather than complying with SSPL.

**Elastic License 2.0.** Used by Elasticsearch after their re-licensing from Apache 2.0. Prohibits providing the software as a managed service and circumventing license key functionality. AWS responded by forking Elasticsearch into OpenSearch under Apache 2.0.

## License Compatibility Matrix

Not all open source licenses can be combined in a single project. Key incompatibilities:

| Combination | Compatible? | Notes |
|-------------|-------------|-------|
| MIT + Apache 2.0 | Yes | Apache 2.0 absorbs MIT |
| MIT + GPL v3 | Yes | Result must be GPL v3 |
| Apache 2.0 + GPL v2 only | No | Patent clause conflict |
| Apache 2.0 + GPL v3 | Yes | Result must be GPL v3 |
| GPL v2 only + GPL v3 | No | Unless "or later" clause present |
| LGPL + Proprietary | Yes | Dynamic linking only |
| MPL 2.0 + GPL v3 | Yes | MPL 2.0 has explicit GPL compatibility |
| AGPL + Proprietary | No | Unless separate processes with no linking |

## Real-World Cases

**Google's AGPL Ban.** Google has publicly documented their internal policy prohibiting AGPL-licensed code in any Google project. Their rationale: the network-use trigger is too vague, and the risk of inadvertently triggering copyleft across their interconnected service mesh is unacceptable. Many enterprises have adopted similar policies.

**MongoDB AGPL to SSPL (2018).** MongoDB was originally AGPL-licensed. Cloud providers (primarily AWS) offered MongoDB as a managed service without contributing back. MongoDB switched to SSPL, explicitly requiring that anyone offering MongoDB as a service release their entire management stack. AWS built DocumentDB instead of complying.

**Elasticsearch Apache 2.0 to Elastic License (2021).** Elastic NV re-licensed Elasticsearch from Apache 2.0, citing AWS's Amazon Elasticsearch Service as exploiting their work. AWS forked the Apache 2.0 version as OpenSearch. The Linux Foundation now hosts OpenSearch. In 2024, Elastic added AGPL as an additional license option.

**HashiCorp BSL Switch (2023).** HashiCorp moved Terraform, Vault, Consul, and other tools from MPL 2.0 to BSL 1.1. The community responded by forking Terraform as OpenTofu under the Linux Foundation. IBM subsequently acquired HashiCorp for $6.4 billion.

**Meta's Llama License.** Meta released Llama 2 and Llama 3 under a custom license that is permissive for most uses but restricts companies with over 700 million monthly active users (effectively targeting only Google, Apple, Amazon, and Microsoft). This is neither OSI-approved open source nor traditional proprietary licensing, representing a new category of "open-weight" AI model licensing.

## Decision Framework

When choosing how to handle open source licensing in your organization:

1. **Inventory first.** You cannot manage what you do not measure. Generate a complete SBOM before making policy decisions.
2. **Classify by distribution model.** SaaS-only companies face different risks than companies distributing binaries. AGPL is the primary concern for SaaS; GPL/LGPL matter more for distributed software.
3. **Set a license allowlist.** Explicitly approve licenses your organization will accept. A common enterprise allowlist: MIT, Apache 2.0, BSD 2-Clause, BSD 3-Clause, ISC, MPL 2.0, LGPL (dynamic linking only). Everything else requires legal review.
4. **Automate enforcement.** Integrate license scanning into CI/CD. Block builds that introduce disallowed licenses.
5. **Review quarterly.** Dependencies update, projects re-license, and your distribution model may change.

## Common Mistakes

1. **Assuming "open source" means "free to use however you want."** Every open source license has conditions. Even MIT requires attribution.
2. **Ignoring transitive dependencies.** Your project may use 50 direct dependencies but 2,000 transitive ones. A single AGPL-licensed transitive dependency can create obligations for your entire application.
3. **Treating license compliance as a one-time audit.** Dependencies change with every `npm install` or `pip install`. Compliance must be continuous.
4. **Conflating "source available" with "open source."** BSL, SSPL, and custom licenses like Llama's are not open source. They carry significant restrictions.
5. **Not having a contribution policy.** When employees contribute to open source projects, they may be assigning IP rights. Without a clear policy (including CLA processes), you create ambiguity about who owns what.
6. **Relying on GitHub's license detection.** GitHub's automatic license detection is frequently wrong for multi-licensed projects, projects with license exceptions, or projects where the license file does not match the actual terms in source file headers.

## Tools and Processes

**SBOM Generation.** A Software Bill of Materials lists every component, its version, and its license. Formats: SPDX (ISO standard) and CycloneDX (OWASP standard). Generate SBOMs as part of your build pipeline.

**FOSSA.** Commercial license compliance platform. Deep dependency analysis across 20+ package managers. Policy engine for allowlists/blocklists. Generates attribution documents. Strong integration with CI/CD systems.

**Snyk Open Source.** Combines vulnerability scanning with license compliance. Identifies license risks alongside security risks in the same workflow. Free tier available for open source projects.

**license-checker (npm).** Simple command-line tool for Node.js projects. Run `npx license-checker --summary` to get a quick overview of licenses in your dependency tree. Useful for ad-hoc checks but insufficient for enterprise compliance.

**scancode-toolkit.** Open source tool from AboutCode for detailed license detection. Scans actual file contents rather than relying on package metadata, catching cases where declared licenses do not match file headers.

**OSS Review Toolkit (ORT).** Open source compliance automation from HERE Technologies. Combines source code scanning, dependency analysis, and license evaluation into a single pipeline.

## Key Metrics and Checklist

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| SBOM coverage | 100% of production dependencies | Cannot manage what you do not measure |
| License scan frequency | Every CI build | Catches new introductions immediately |
| Policy violation resolution time | Less than 48 hours | Prevents accumulation of compliance debt |
| Copyleft dependency count | Tracked quarterly | Trend indicates risk trajectory |
| Attribution document accuracy | Verified per release | Required by virtually all licenses |

**Pre-Release Checklist:**

- [ ] SBOM generated and archived for this release
- [ ] All dependencies scanned against license allowlist
- [ ] No unapproved copyleft licenses in dependency tree
- [ ] Attribution/NOTICES file updated with all required acknowledgments
- [ ] Any LGPL dependencies confirmed as dynamically linked
- [ ] License scan results reviewed by designated compliance owner
- [ ] Contribution policy current and acknowledged by all engineers

## References

- Open Source Initiative, "The Open Source Definition," https://opensource.org/osd
- Software Package Data Exchange (SPDX), https://spdx.dev/
- OWASP CycloneDX SBOM Standard, https://cyclonedx.org/
- Free Software Foundation, "Various Licenses and Comments About Them," https://www.gnu.org/licenses/license-list.html
- "Open Source License Compliance in Software Supply Chains," Linux Foundation, 2024
- Kyle E. Mitchell, "The License Zero Manifesto," https://licensezero.com/
- Heather Meeker, "Open Source for Business," 3rd Edition, 2020
- FOSSA Documentation, https://docs.fossa.com/
