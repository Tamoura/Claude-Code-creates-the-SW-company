import { faker } from "@faker-js/faker";
import type {
  Demand,
  DemandStatus,
  DemandPriority,
  PortfolioItem,
  PortfolioItemStatus,
  Investment,
  InvestmentStatus,
} from "@/types/s2p";

const demandStatuses: DemandStatus[] = ["new", "assessing", "approved", "rejected", "in_portfolio"];
const demandPriorities: DemandPriority[] = ["critical", "high", "medium", "low"];

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
    businessValue: faker.number.int({ min: 100000, max: 5000000 }),
    estimatedCost: faker.number.int({ min: 50000, max: 2000000 }),
    createdAt,
    updatedAt,
  };
}

export function generateDemands(count: number): Demand[] {
  return Array.from({ length: count }, () => generateDemand());
}

const portfolioStatuses: PortfolioItemStatus[] = ["proposed", "planned", "in_progress", "completed", "on_hold"];

export function generatePortfolioItem(id?: string): PortfolioItem {
  const startDate = faker.date.soon({ days: 30 });
  const targetDate = faker.date.soon({ days: 180, refDate: startDate });

  return {
    id: id || `PBI-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    title: faker.helpers.arrayElement(demandTitles),
    description: faker.lorem.paragraph(),
    status: faker.helpers.arrayElement(portfolioStatuses),
    priority: faker.number.int({ min: 1, max: 10 }),
    investment: faker.number.int({ min: 100000, max: 5000000 }),
    expectedROI: faker.number.float({ min: 1.1, max: 3.5, fractionDigits: 2 }),
    owner: faker.person.fullName(),
    startDate,
    targetDate,
    progress: faker.number.int({ min: 0, max: 100 }),
  };
}

export function generatePortfolioItems(count: number): PortfolioItem[] {
  return Array.from({ length: count }, () => generatePortfolioItem());
}

const investmentStatuses: InvestmentStatus[] = ["active", "completed", "cancelled"];

export function generateInvestment(id?: string): Investment {
  const allocatedBudget = faker.number.int({ min: 500000, max: 10000000 });
  const spentToDate = faker.number.int({ min: 0, max: allocatedBudget });
  const expectedValue = faker.number.int({ min: allocatedBudget, max: allocatedBudget * 3 });
  const startDate = faker.date.past({ years: 1 });
  const endDate = faker.date.soon({ days: 180, refDate: startDate });

  return {
    id: id || `INV-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    name: faker.helpers.arrayElement(demandTitles),
    description: faker.lorem.paragraph(),
    status: faker.helpers.arrayElement(investmentStatuses),
    allocatedBudget,
    spentToDate,
    expectedValue,
    actualValue: faker.number.int({ min: expectedValue * 0.8, max: expectedValue * 1.2 }),
    startDate,
    endDate,
    sponsor: faker.person.fullName(),
  };
}

export function generateInvestments(count: number): Investment[] {
  return Array.from({ length: count }, () => generateInvestment());
}
