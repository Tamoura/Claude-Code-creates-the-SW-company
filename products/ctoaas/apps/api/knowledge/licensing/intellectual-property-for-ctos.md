# Intellectual Property Protection for Technology Companies

Intellectual property is the primary asset class for most technology companies. Unlike physical assets, IP can be copied at zero marginal cost, making protection both critical and challenging. For CTOs, IP strategy is not merely a legal exercise: it directly affects hiring practices, open source participation, vendor relationships, product architecture, and competitive positioning. The wrong IP decisions early on can create existential risks that surface during fundraising, acquisition due diligence, or competitive disputes.

This guide covers the practical IP considerations a CTO faces, from employee agreements to patent strategy to the emerging questions around AI-generated code.

## When This Matters / When It Doesn't

| When It Matters | When It Doesn't |
|-----------------|-----------------|
| You are building proprietary technology that differentiates your product | You are assembling commodity components into a standard architecture |
| You are preparing for fundraising, IPO, or acquisition | You are running an open source project with no commercial ambitions |
| You hire contractors or freelancers who write code for you | All code is written by full-time employees with standard agreements in place |
| Your engineers contribute to open source projects on company time | Your company has no open source involvement |
| You use AI code generation tools (Copilot, Claude, etc.) in production | AI-assisted code is used only in prototypes or internal tools with no IP sensitivity |
| Competitors are in your space with aggressive patent portfolios | You operate in a space with minimal patent activity |
| You operate in a jurisdiction with strong trade secret laws | |

## Detailed Breakdown

### Patents vs Trade Secrets vs Copyrights

Software companies have three primary mechanisms for protecting intellectual property. Each has different strengths, costs, and strategic applications.

**Patents.** A patent grants a 20-year monopoly on an invention in exchange for public disclosure. In software, patents protect methods, processes, and systems (not code itself). Filing a US patent costs $15,000-$40,000 through prosecution. International filing (PCT) adds $50,000-$150,000. The process takes 2-4 years. Patents are examined for novelty and non-obviousness, and a significant percentage of software patent applications are rejected or narrowed substantially.

**When to patent.** Patent when the invention is independently discoverable, when infringement is detectable, and when the 20-year timeline matters. Good candidates: novel algorithms with measurable advantages, unique hardware-software integration, innovative data pipelines visible in product behavior.

**When NOT to patent.** When the invention is better kept secret, when enforcement would be impractical, or when the technology will be obsolete within 5 years. Do not patent purely to inflate portfolio size: low-quality patents are expensive to maintain and provide no real protection.

**Trade secrets.** A trade secret is any information that derives economic value from not being generally known and is subject to reasonable efforts to maintain its secrecy. Trade secrets have no filing cost, no expiration (they last as long as the secret is maintained), and no public disclosure. Protection is lost if the secret is independently discovered, reverse-engineered, or improperly disclosed.

**What qualifies.** Proprietary algorithms, training data, customer lists, pricing strategies, business processes. The key requirement: "reasonable measures" to protect the secret (access controls, NDAs, employee training, documented classification).

**Trade secrets vs patents.** If a competitor could independently develop the same technology, a patent is stronger (independent discovery is not a defense). If the technology is difficult to reverse-engineer, trade secrets may be superior (no expiration, no disclosure). Google's search ranking algorithm is a modern example of trade secret strategy.

**Copyrights.** Copyright automatically protects source code, documentation, UI designs, and databases at the moment of creation (US registration adds enforcement benefits). Copyright protects the expression (specific code), not the idea (algorithm or method). A competitor can write code that does the same thing; they cannot copy yours. The Oracle v. Google Supreme Court decision (2021) established that copying APIs for interoperability can constitute fair use.

### Employee IP Assignment Agreements

Every employee who writes code, designs systems, or creates any work product must have a signed IP assignment agreement. Without one, the employee may have a claim to ownership of the code they wrote.

**What the agreement must cover.** Assignment of all work product created during employment and related to the company's business. "Work product" must be defined broadly to include inventions, code, designs, documentation, and ideas. The agreement should include a "prior inventions" disclosure schedule where the employee lists any pre-existing IP they are bringing with them (to avoid future disputes about what they owned before joining).

**State law variations (US).** California, Delaware, Illinois, Minnesota, North Carolina, Washington, and other states have laws limiting the scope of IP assignment agreements. California Labor Code Section 2870, for example, prohibits employers from claiming ownership of inventions that an employee develops entirely on their own time, without using company resources, and that are unrelated to the company's business. Your agreements must comply with applicable state law, and overly broad agreements may be unenforceable.

**International variations.** In many European countries, employee inventions belong to the employer by default, but employees may be entitled to additional compensation for particularly valuable inventions (Germany's Arbeitnehmererfindungsgesetz is a notable example). In the UK, the Patents Act 1977 assigns employment-related patents to the employer.

**Timing.** The assignment agreement must be signed before the employee writes any code. An agreement signed after employment begins may require additional consideration to be enforceable. Best practice: make the assignment agreement part of the offer letter or day-one onboarding.

### Contractor IP Ownership Pitfalls

This is one of the most common and most dangerous IP mistakes in technology companies. Under US copyright law, the default rule is that the creator of a work owns the copyright. The "work for hire" doctrine (which assigns ownership to the hiring party) applies to employees but has limited application to independent contractors.

**The critical rule.** For a work created by an independent contractor to be "work for hire" under US law, it must fall within one of nine specific Copyright Act categories (which do not include "software" as a standalone category) AND both parties must sign a written agreement. Even then, some courts have found contractor-created software does not qualify.

**The safe solution.** Do not rely on work-for-hire designation. Use an explicit IP assignment clause in every contractor agreement. The contractor assigns all rights, title, and interest irrevocably and worldwide. Include a moral rights waiver where applicable.

**Due diligence risk.** Acquiring companies review contractor agreements. If any contractor who wrote significant code lacks a clear IP assignment, this creates a cloud on your title to the software. This has derailed acquisitions and forced companies to track down former contractors for retroactive assignments.

### Open Source Contribution Policies

When your employees contribute to open source projects, they are potentially giving away company IP. A contribution policy defines the rules of engagement.

**What the policy should cover.** Which projects employees may contribute to (allowlist or approval process). Whether contributions require review before submission. How to handle CLA (Contributor License Agreement) requirements. Whether employees can contribute on company time. How to ensure contributions do not include proprietary code or trade secrets.

**CLA considerations.** Many projects require contributors to sign a CLA granting broad rights. Some (Apache Individual CLA, Developer Certificate of Origin) are well-understood and low-risk. Others may grant rights you do not intend to give. Review each CLA before allowing employees to sign.

### AI-Generated Code IP Questions

The use of AI code generation tools (GitHub Copilot, Anthropic Claude, OpenAI Codex, Cursor, and others) introduces novel IP questions that do not yet have clear legal answers in most jurisdictions.

**Copyright ownership.** The US Copyright Office has stated that works generated entirely by AI without human creative input are not copyrightable. Works that involve sufficient human creativity (using AI as a tool, with significant human selection, arrangement, and modification) can be copyrighted by the human author. The boundary between these categories is unclear and fact-specific.

**Practical implications.** Code generated by AI tools should be treated as a starting point, not a final product. Engineers should review, modify, and integrate AI-generated code with sufficient human judgment that the resulting work reflects human creativity. Document this practice. Avoid shipping entire files of unmodified AI output as the sole implementation of critical features.

**Training data and infringement risk.** AI models are trained on publicly available code under various licenses. The class-action Doe v. GitHub case alleges Copilot reproduces copyrighted code without attribution. Mitigations: use AI tools offering indemnification (Copilot Business/Enterprise), filter suggestions against known snippets, and audit AI-generated code periodically.

**Trade secret exposure.** Sending proprietary code to AI APIs may expose trade secrets. Enterprise-tier tools (Copilot Enterprise, Claude for Business) contractually commit to not using inputs for training. Free tiers often do not make this commitment. Review vendor terms before use.

### Non-Compete and Non-Solicitation Agreements

**Non-competes.** Enforceability varies dramatically by jurisdiction. California bans non-competes entirely. The FTC proposed a nationwide ban in 2024 but it was struck down by federal courts. Many states enforce only narrowly tailored non-competes. In the EU, non-competes generally require compensation during the restriction period.

**Non-solicitation.** Non-solicitation agreements (preventing departed employees from recruiting your team or soliciting your customers) are more broadly enforceable than non-competes. Keep them reasonable in duration (12-24 months) and scope.

**For the CTO.** In California and increasingly elsewhere, your protection against employees leaving with knowledge is through trade secret law and IP assignment agreements, not non-competes.

### Defensive Patent Strategies

If you are not going to build an offensive patent portfolio, you still need a defensive strategy against patent assertion.

**Prior art documentation.** Systematically document your innovations with dates, even if you do not patent them. Publish defensive publications (through services like the Defensive Patent License or IP.com) that create prior art, preventing others from patenting the same ideas. This costs a fraction of a patent filing.

**Patent pledges and pools.** Organizations like the Open Invention Network (OIN) provide a patent non-aggression pact for Linux-related technologies. Google's Open Patent Non-Assertion Pledge covers specific patents. These provide protection without the cost of building your own portfolio.

**Insurance.** Patent litigation insurance is available from specialized carriers. RPX Corporation offers a membership model providing patent risk mitigation through acquisition and licensing.

### Patent Trolls (Patent Assertion Entities)

Patent assertion entities (PAEs), commonly called "patent trolls," acquire patents to extract licensing fees through litigation threats. They account for approximately 60% of US patent lawsuits.

**How to handle a demand letter.** Do not ignore it. Do not respond without counsel. Forward immediately to your IP attorney. Make no admissions about your product's functionality. Many PAE demands are speculative and will not lead to litigation if handled properly.

**Cost calculus.** Defending a patent suit through trial costs $2-5 million. Many companies settle for $100K-$500K because it is cheaper than litigating. The America Invents Act (2011) created Inter Partes Review (IPR) at the PTAB, which invalidates claims in 60-70% of proceedings and provides a lower-cost defensive tool.

## Decision Framework

1. **Audit your current IP position.** Do all employees have signed IP assignment agreements? All contractors? Are there gaps from the early days of the company?
2. **Classify your innovations.** For each significant innovation, determine: Is this independently discoverable? Is it visible in the product? What is its competitive lifespan? This determines patent vs. trade secret.
3. **Establish a contribution policy.** Before your engineers start contributing to open source, define the rules. It is much harder to claw back a contribution than to approve one.
4. **Evaluate AI tool exposure.** Inventory every AI tool your team uses for code generation. Review data handling terms. Implement enterprise tiers where available. Establish usage guidelines.
5. **Plan for due diligence.** Even if you are not planning an exit, maintain your IP records as if you are. Clean IP ownership is a prerequisite for fundraising, partnerships, and acquisition.

## Common Mistakes

1. **No contractor IP assignment.** The single most common and most dangerous IP mistake. Every contractor who writes code needs an explicit, signed IP assignment. Work-for-hire designation alone is insufficient for software.
2. **Backdated or missing employee agreements.** Early employees (including founders) sometimes lack proper IP assignment agreements. Fixing this retroactively is legally complex and may require additional consideration.
3. **Uncontrolled open source contributions.** An engineer contributing proprietary algorithms to an open source project under an Apache or MIT license has effectively given away company IP irrevocably. This has happened to real companies.
4. **Over-relying on patents for protection.** Patents are expensive, slow, and difficult to enforce. For most startups, trade secrets, speed of execution, and network effects provide better protection than patents.
5. **Ignoring AI code generation risks.** Using consumer-tier AI tools to process proprietary code without reviewing data handling terms is a trade secret risk. Using unmodified AI output without review creates copyright uncertainty.
6. **No prior inventions disclosure.** Without a schedule of prior inventions signed at hire, a departing employee can claim that key IP they developed during employment was actually their pre-existing work.
7. **Assuming "public" means "free to use."** Code on public GitHub repositories, data on public websites, and APIs with no authentication all have owners and licenses. Public availability does not grant usage rights.

## Key Metrics and Checklist

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| IP assignment agreement coverage | 100% of employees and contractors | Any gap is a potential ownership dispute |
| Prior inventions disclosure coverage | 100% of technical hires | Prevents retroactive claims |
| Open source contribution policy adoption | Acknowledged by all engineers | Prevents inadvertent IP disclosure |
| Contractor agreement audit frequency | Quarterly for active contractors | Identifies gaps before they become problems |
| AI tool data handling review | Annually per tool | Ensures trade secrets are not exposed to training data |
| Patent/trade secret classification | All significant innovations classified | Ensures appropriate protection mechanism is applied |

**IP Health Checklist:**

- [ ] All employees have signed IP assignment agreements compliant with applicable law
- [ ] All contractors have explicit IP assignment clauses (not relying on work-for-hire alone)
- [ ] Prior inventions disclosure completed for all technical hires
- [ ] Open source contribution policy published and acknowledged
- [ ] CLA review process established for open source project contributions
- [ ] AI code generation tools inventoried with data handling terms reviewed
- [ ] AI usage guidelines published (review requirements, indemnification tiers, prohibited uses)
- [ ] Key innovations classified as patent or trade secret with rationale documented
- [ ] Trade secret material identified and protected (access controls, NDA coverage, documentation)
- [ ] Defensive patent strategy defined (prior art publication, patent pool membership, or insurance)
- [ ] IP ownership chain documented and ready for due diligence review
- [ ] Non-compete and non-solicitation agreements compliant with applicable jurisdiction

## References

- US Patent and Trademark Office, https://www.uspto.gov/
- US Copyright Office, "Copyright Registration Guidance: Works Containing Material Generated by Artificial Intelligence," 2023
- Oracle America v. Google LLC, 593 U.S. (2021) (Supreme Court decision on API fair use)
- Doe v. GitHub (N.D. Cal.), AI code generation copyright class action
- California Labor Code Section 2870 (employee invention assignment limitations)
- Open Invention Network, https://www.openinventionnetwork.com/
- RPX Corporation, https://www.rpxcorp.com/
- World Intellectual Property Organization, https://www.wipo.int/
- Heather Meeker, "Open (Source) for Business," 3rd Edition, 2020
- FTC, "Non-Compete Clause Rulemaking," 2024
- European Patent Office, "Guidelines for Examination," https://www.epo.org/
