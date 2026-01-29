import {
  generateDemand,
  generateDemands,
  generatePortfolioItem,
  generatePortfolioItems,
  generateInvestment,
  generateInvestments,
  generateProposal,
  generateProposals,
  generateRoadmapItem,
  generateRoadmapItems,
} from "./s2p-generator";
import type {
  DemandStatus,
  DemandPriority,
  PortfolioItemStatus,
  InvestmentStatus,
  InvestmentType,
  ProposalStatus,
  RiskLevel,
  RoadmapItemStatus,
} from "@/types/s2p";

describe("S2P Generators", () => {
  describe("generateDemand", () => {
    it("should generate a demand with required fields", () => {
      const demand = generateDemand();

      expect(demand).toHaveProperty("id");
      expect(demand).toHaveProperty("title");
      expect(demand).toHaveProperty("description");
      expect(demand).toHaveProperty("status");
      expect(demand).toHaveProperty("priority");
      expect(demand).toHaveProperty("requestor");
      expect(demand).toHaveProperty("department");
      expect(demand).toHaveProperty("businessValue");
      expect(demand).toHaveProperty("estimatedCost");
      expect(demand).toHaveProperty("createdAt");
      expect(demand).toHaveProperty("updatedAt");
    });

    it("should generate a demand with valid status", () => {
      const demand = generateDemand();
      const validStatuses: DemandStatus[] = ["new", "under_review", "approved", "rejected", "in_portfolio"];

      expect(validStatuses).toContain(demand.status);
    });

    it("should generate a demand with valid priority", () => {
      const demand = generateDemand();
      const validPriorities: DemandPriority[] = ["critical", "high", "medium", "low"];

      expect(validPriorities).toContain(demand.priority);
    });

    it("should generate a demand with positive business value and cost", () => {
      const demand = generateDemand();

      expect(demand.businessValue).toBeGreaterThan(0);
      expect(demand.estimatedCost).toBeGreaterThan(0);
    });

    it("should generate a demand with updatedAt after createdAt", () => {
      const demand = generateDemand();

      expect(demand.updatedAt.getTime()).toBeGreaterThanOrEqual(demand.createdAt.getTime());
    });

    it("should generate a demand with custom id when provided", () => {
      const customId = "DMD-CUSTOM";
      const demand = generateDemand(customId);

      expect(demand.id).toBe(customId);
    });
  });

  describe("generateDemands", () => {
    it("should generate correct number of demands", () => {
      const count = 5;
      const demands = generateDemands(count);

      expect(demands).toHaveLength(count);
    });

    it("should generate demands with unique ids", () => {
      const demands = generateDemands(10);
      const ids = demands.map((d) => d.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(demands.length);
    });
  });

  describe("generatePortfolioItem", () => {
    it("should generate a portfolio item with required fields", () => {
      const item = generatePortfolioItem();

      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("description");
      expect(item).toHaveProperty("status");
      expect(item).toHaveProperty("priority");
      expect(item).toHaveProperty("strategicAlignment");
      expect(item).toHaveProperty("dependencies");
      expect(item).toHaveProperty("owner");
      expect(item).toHaveProperty("targetQuarter");
    });

    it("should generate a portfolio item with valid status", () => {
      const item = generatePortfolioItem();
      const validStatuses: PortfolioItemStatus[] = ["backlog", "planned", "active", "on_hold", "completed", "cancelled"];

      expect(validStatuses).toContain(item.status);
    });

    it("should generate a portfolio item with valid strategic alignment (0-100)", () => {
      const item = generatePortfolioItem();

      expect(item.strategicAlignment).toBeGreaterThanOrEqual(0);
      expect(item.strategicAlignment).toBeLessThanOrEqual(100);
    });

    it("should generate a portfolio item with valid quarter", () => {
      const item = generatePortfolioItem();
      const validQuarters = ["Q1", "Q2", "Q3", "Q4"];

      expect(validQuarters).toContain(item.targetQuarter);
    });

    it("should not have start date when status is backlog", () => {
      // Generate multiple items to eventually get a backlog status
      const items = generatePortfolioItems(20);
      const backlogItems = items.filter((i) => i.status === "backlog");

      if (backlogItems.length > 0) {
        backlogItems.forEach((item) => {
          expect(item.startDate).toBeUndefined();
        });
      }
    });

    it("should generate a portfolio item with custom id when provided", () => {
      const customId = "PBI-CUSTOM";
      const item = generatePortfolioItem(customId);

      expect(item.id).toBe(customId);
    });
  });

  describe("generatePortfolioItems", () => {
    it("should generate correct number of portfolio items", () => {
      const count = 7;
      const items = generatePortfolioItems(count);

      expect(items).toHaveLength(count);
    });

    it("should generate portfolio items with unique ids", () => {
      const items = generatePortfolioItems(10);
      const ids = items.map((i) => i.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(items.length);
    });
  });

  describe("generateInvestment", () => {
    it("should generate an investment with required fields", () => {
      const investment = generateInvestment();

      expect(investment).toHaveProperty("id");
      expect(investment).toHaveProperty("name");
      expect(investment).toHaveProperty("description");
      expect(investment).toHaveProperty("type");
      expect(investment).toHaveProperty("status");
      expect(investment).toHaveProperty("budget");
      expect(investment).toHaveProperty("spent");
      expect(investment).toHaveProperty("roi");
      expect(investment).toHaveProperty("owner");
      expect(investment).toHaveProperty("startDate");
      expect(investment).toHaveProperty("kpis");
    });

    it("should generate an investment with valid status", () => {
      const investment = generateInvestment();
      const validStatuses: InvestmentStatus[] = ["proposed", "approved", "active", "on_hold", "completed", "cancelled"];

      expect(validStatuses).toContain(investment.status);
    });

    it("should generate an investment with valid type", () => {
      const investment = generateInvestment();
      const validTypes: InvestmentType[] = ["strategic", "operational", "compliance", "innovation"];

      expect(validTypes).toContain(investment.type);
    });

    it("should generate an investment with spent not exceeding budget", () => {
      const investment = generateInvestment();

      expect(investment.spent).toBeLessThanOrEqual(investment.budget);
      expect(investment.spent).toBeGreaterThanOrEqual(0);
    });

    it("should generate an investment with positive budget", () => {
      const investment = generateInvestment();

      expect(investment.budget).toBeGreaterThan(0);
    });

    it("should generate an investment with at least 2 KPIs", () => {
      const investment = generateInvestment();

      expect(investment.kpis.length).toBeGreaterThanOrEqual(2);
    });

    it("should generate an investment with custom id when provided", () => {
      const customId = "INV-CUSTOM";
      const investment = generateInvestment(customId);

      expect(investment.id).toBe(customId);
    });
  });

  describe("generateInvestments", () => {
    it("should generate correct number of investments", () => {
      const count = 6;
      const investments = generateInvestments(count);

      expect(investments).toHaveLength(count);
    });

    it("should generate investments with unique ids", () => {
      const investments = generateInvestments(10);
      const ids = investments.map((i) => i.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(investments.length);
    });
  });

  describe("generateProposal", () => {
    it("should generate a proposal with required fields", () => {
      const proposal = generateProposal();

      expect(proposal).toHaveProperty("id");
      expect(proposal).toHaveProperty("title");
      expect(proposal).toHaveProperty("description");
      expect(proposal).toHaveProperty("businessCase");
      expect(proposal).toHaveProperty("status");
      expect(proposal).toHaveProperty("requestor");
      expect(proposal).toHaveProperty("estimatedCost");
      expect(proposal).toHaveProperty("expectedROI");
      expect(proposal).toHaveProperty("strategicAlignment");
      expect(proposal).toHaveProperty("riskLevel");
      expect(proposal).toHaveProperty("createdAt");
    });

    it("should generate a proposal with valid status", () => {
      const proposal = generateProposal();
      const validStatuses: ProposalStatus[] = ["draft", "submitted", "under_review", "approved", "rejected"];

      expect(validStatuses).toContain(proposal.status);
    });

    it("should generate a proposal with valid risk level", () => {
      const proposal = generateProposal();
      const validRiskLevels: RiskLevel[] = ["low", "medium", "high"];

      expect(validRiskLevels).toContain(proposal.riskLevel);
    });

    it("should generate a proposal with positive cost and ROI", () => {
      const proposal = generateProposal();

      expect(proposal.estimatedCost).toBeGreaterThan(0);
      expect(proposal.expectedROI).toBeGreaterThan(0);
    });

    it("should generate a proposal with decision date when approved or rejected", () => {
      const proposals = generateProposals(20);
      const decidedProposals = proposals.filter((p) => p.status === "approved" || p.status === "rejected");

      if (decidedProposals.length > 0) {
        decidedProposals.forEach((proposal) => {
          expect(proposal.decisionDate).toBeDefined();
        });
      }
    });

    it("should generate a proposal with custom id when provided", () => {
      const customId = "PROP-CUSTOM";
      const proposal = generateProposal(customId);

      expect(proposal.id).toBe(customId);
    });
  });

  describe("generateProposals", () => {
    it("should generate correct number of proposals", () => {
      const count = 8;
      const proposals = generateProposals(count);

      expect(proposals).toHaveLength(count);
    });

    it("should generate proposals with unique ids", () => {
      const proposals = generateProposals(10);
      const ids = proposals.map((p) => p.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(proposals.length);
    });
  });

  describe("generateRoadmapItem", () => {
    it("should generate a roadmap item with required fields", () => {
      const item = generateRoadmapItem();

      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("description");
      expect(item).toHaveProperty("quarter");
      expect(item).toHaveProperty("year");
      expect(item).toHaveProperty("status");
      expect(item).toHaveProperty("dependencies");
      expect(item).toHaveProperty("owner");
      expect(item).toHaveProperty("milestones");
    });

    it("should generate a roadmap item with valid status", () => {
      const item = generateRoadmapItem();
      const validStatuses: RoadmapItemStatus[] = ["planned", "in_progress", "completed", "delayed", "cancelled"];

      expect(validStatuses).toContain(item.status);
    });

    it("should generate a roadmap item with valid quarter", () => {
      const item = generateRoadmapItem();
      const validQuarters = ["Q1", "Q2", "Q3", "Q4"];

      expect(validQuarters).toContain(item.quarter);
    });

    it("should generate a roadmap item with valid year (2026 or 2027)", () => {
      const item = generateRoadmapItem();
      const validYears = [2026, 2027];

      expect(validYears).toContain(item.year);
    });

    it("should generate a roadmap item with at least 2 milestones", () => {
      const item = generateRoadmapItem();

      expect(item.milestones.length).toBeGreaterThanOrEqual(2);
    });

    it("should generate a roadmap item with dependencies array", () => {
      const item = generateRoadmapItem();

      expect(Array.isArray(item.dependencies)).toBe(true);
    });

    it("should generate a roadmap item with custom id when provided", () => {
      const customId = "RDM-CUSTOM";
      const item = generateRoadmapItem(customId);

      expect(item.id).toBe(customId);
    });
  });

  describe("generateRoadmapItems", () => {
    it("should generate correct number of roadmap items", () => {
      const count = 9;
      const items = generateRoadmapItems(count);

      expect(items).toHaveLength(count);
    });

    it("should generate roadmap items with unique ids", () => {
      const items = generateRoadmapItems(10);
      const ids = items.map((i) => i.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(items.length);
    });
  });
});
