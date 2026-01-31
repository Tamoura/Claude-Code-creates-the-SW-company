import { faker } from "@faker-js/faker";
import type {
  Demand,
  DemandStatus,
  DemandPriority,
  PortfolioItem,
  PortfolioItemStatus,
  Investment,
  InvestmentStatus,
  InvestmentType,
  Proposal,
  ProposalStatus,
  RiskLevel,
  RoadmapItem,
  RoadmapItemStatus,
} from "@/types/s2p";

const demandStatuses: DemandStatus[] = ["new", "under_review", "approved", "rejected", "in_portfolio"];
const demandPriorities: DemandPriority[] = ["critical", "high", "medium", "low"];
const departments = [
  "Sales",
  "Marketing",
  "Finance",
  "HR",
  "Operations",
  "Customer Service",
  "Product",
  "Engineering",
  "Legal",
  "IT",
];

const demandTitles = [
  "New Customer Portal",
  "Mobile App Development",
  "Data Analytics Platform",
  "Cloud Migration",
  "Legacy System Modernization",
  "AI-Powered Chatbot",
  "Security Infrastructure Upgrade",
  "Enterprise Resource Planning System",
  "Business Intelligence Dashboard",
  "DevOps Pipeline Automation",
  "Automated Workflow System",
  "Customer Relationship Management",
  "Supply Chain Optimization",
  "Digital Marketing Platform",
  "Employee Self-Service Portal",
];

export function generateDemand(id?: string): Demand {
  const createdAt = faker.date.recent({ days: 60 });
  const updatedAt = faker.date.between({ from: createdAt, to: new Date() });

  return {
    id: id || `DMD-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    title: faker.helpers.arrayElement(demandTitles),
    description: faker.lorem.paragraph(),
    status: faker.helpers.arrayElement(demandStatuses),
    priority: faker.helpers.arrayElement(demandPriorities),
    requestor: faker.person.fullName(),
    department: faker.helpers.arrayElement(departments),
    businessValue: faker.number.int({ min: 100000, max: 5000000 }),
    estimatedCost: faker.number.int({ min: 50000, max: 2000000 }),
    createdAt,
    updatedAt,
  };
}

export function generateDemands(count: number): Demand[] {
  return Array.from({ length: count }, () => generateDemand());
}

const portfolioStatuses: PortfolioItemStatus[] = ["backlog", "planned", "active", "on_hold", "completed", "cancelled"];
const quarters = ["Q1", "Q2", "Q3", "Q4"];

export function generatePortfolioItem(id?: string): PortfolioItem {
  const status = faker.helpers.arrayElement(portfolioStatuses);
  const hasStartDate = status !== "backlog";

  return {
    id: id || `PBI-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    title: faker.helpers.arrayElement(demandTitles),
    description: faker.lorem.paragraph(),
    status,
    priority: faker.helpers.arrayElement(demandPriorities),
    strategicAlignment: faker.number.int({ min: 40, max: 100 }),
    dependencies: faker.number.int({ min: 0, max: 5 }),
    owner: faker.person.fullName(),
    targetQuarter: faker.helpers.arrayElement(quarters),
    startDate: hasStartDate ? faker.date.recent({ days: 30 }) : undefined,
    targetDate: hasStartDate ? faker.date.soon({ days: 180 }) : undefined,
  };
}

export function generatePortfolioItems(count: number): PortfolioItem[] {
  return Array.from({ length: count }, () => generatePortfolioItem());
}

const investmentStatuses: InvestmentStatus[] = ["proposed", "approved", "active", "on_hold", "completed", "cancelled"];
const investmentTypes: InvestmentType[] = ["strategic", "operational", "compliance", "innovation"];
const kpiExamples = [
  "Revenue Growth",
  "Cost Reduction",
  "Customer Satisfaction",
  "Time to Market",
  "Employee Productivity",
  "Market Share",
  "Compliance Score",
];

export function generateInvestment(id?: string): Investment {
  const budget = faker.number.int({ min: 500000, max: 10000000 });
  const spent = faker.number.int({ min: 0, max: budget });
  const startDate = faker.date.past({ years: 1 });
  const status = faker.helpers.arrayElement(investmentStatuses);

  return {
    id: id || `INV-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    name: faker.helpers.arrayElement(demandTitles),
    description: faker.lorem.paragraph(),
    type: faker.helpers.arrayElement(investmentTypes),
    status,
    budget,
    spent,
    roi: faker.number.float({ min: -10, max: 150, fractionDigits: 1 }),
    owner: faker.person.fullName(),
    startDate,
    endDate: status === "completed" ? faker.date.recent({ days: 30 }) : faker.date.soon({ days: 180 }),
    kpis: faker.helpers.arrayElements(kpiExamples, { min: 2, max: 4 }),
  };
}

export function generateInvestments(count: number): Investment[] {
  return Array.from({ length: count }, () => generateInvestment());
}

const proposalStatuses: ProposalStatus[] = ["draft", "submitted", "under_review", "approved", "rejected"];
const riskLevels: RiskLevel[] = ["low", "medium", "high"];

export function generateProposal(id?: string): Proposal {
  const createdAt = faker.date.recent({ days: 90 });
  const status = faker.helpers.arrayElement(proposalStatuses);

  return {
    id: id || `PROP-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    title: faker.helpers.arrayElement(demandTitles),
    description: faker.lorem.paragraph(),
    businessCase: faker.lorem.paragraphs(2),
    status,
    requestor: faker.person.fullName(),
    estimatedCost: faker.number.int({ min: 100000, max: 5000000 }),
    expectedROI: faker.number.float({ min: 10, max: 200, fractionDigits: 1 }),
    strategicAlignment: faker.number.int({ min: 40, max: 100 }),
    riskLevel: faker.helpers.arrayElement(riskLevels),
    createdAt,
    decisionDate: status === "approved" || status === "rejected" ? faker.date.recent({ days: 14 }) : undefined,
  };
}

export function generateProposals(count: number): Proposal[] {
  return Array.from({ length: count }, () => generateProposal());
}

const roadmapStatuses: RoadmapItemStatus[] = ["planned", "in_progress", "completed", "delayed", "cancelled"];
const milestoneExamples = [
  "Requirements Complete",
  "Design Approved",
  "Development Started",
  "Testing Complete",
  "Go-Live",
  "Post-Launch Review",
];

export function generateRoadmapItem(id?: string): RoadmapItem {
  const year = faker.helpers.arrayElement([2026, 2027]);
  const quarter = faker.helpers.arrayElement(quarters);

  return {
    id: id || `RDM-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    title: faker.helpers.arrayElement(demandTitles),
    description: faker.lorem.sentence(),
    quarter,
    year,
    status: faker.helpers.arrayElement(roadmapStatuses),
    dependencies: faker.helpers.multiple(() => `RDM-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`, {
      count: { min: 0, max: 3 },
    }),
    owner: faker.person.fullName(),
    milestones: faker.helpers.arrayElements(milestoneExamples, { min: 2, max: 4 }),
  };
}

export function generateRoadmapItems(count: number): RoadmapItem[] {
  return Array.from({ length: count }, () => generateRoadmapItem());
}
