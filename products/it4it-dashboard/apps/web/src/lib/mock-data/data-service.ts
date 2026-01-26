import { faker } from "@faker-js/faker";
import { generateIncidents, generateEvents, generateChanges } from "./generators/d2c-generator";
import { generateDemands, generatePortfolioItems, generateInvestments } from "./generators/s2p-generator";
import {
  generateServiceCatalogEntries,
  generateServiceRequests,
  generateSubscriptions,
  generateFulfillmentRequests,
} from "./generators/r2f-generator";
import {
  generateRequirements,
  generateBuilds,
  generateDeployments,
  generateReleases,
  generatePipelines,
} from "./generators/r2d-generator";
import type { Incident, Event, Change } from "@/types/d2c";
import type { Demand, PortfolioItem, Investment } from "@/types/s2p";
import type { ServiceCatalogEntry, ServiceRequest, Subscription, FulfillmentRequest } from "@/types/r2f";
import type { Requirement, Build, Deployment, Release, Pipeline } from "@/types/r2d";

/**
 * Mock Data Service
 *
 * Provides centralized access to mock data for all IT4IT value streams.
 * Data is generated once on initialization using a fixed seed for consistency.
 */

export interface DashboardMetrics {
  s2p: {
    totalDemands: number;
    activeDemands: number;
    portfolioItems: number;
    totalInvestment: number;
  };
  r2d: {
    activePipelines: number;
    failedBuilds: number;
    pendingReleases: number;
  };
  r2f: {
    pendingRequests: number;
    avgFulfillmentTime: number;
    activeSubscriptions: number;
  };
  d2c: {
    openIncidents: number;
    criticalIncidents: number;
    openChanges: number;
    totalEvents: number;
  };
}

class MockDataService {
  private incidents: Incident[] = [];
  private events: Event[] = [];
  private changes: Change[] = [];
  private demands: Demand[] = [];
  private portfolioItems: PortfolioItem[] = [];
  private investments: Investment[] = [];
  private serviceCatalog: ServiceCatalogEntry[] = [];
  private serviceRequests: ServiceRequest[] = [];
  private subscriptions: Subscription[] = [];
  private fulfillmentRequests: FulfillmentRequest[] = [];
  private requirements: Requirement[] = [];
  private builds: Build[] = [];
  private deployments: Deployment[] = [];
  private releases: Release[] = [];
  private pipelines: Pipeline[] = [];
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.initialized) return;

    // Use a fixed seed for consistent data across sessions
    faker.seed(12345);

    // Generate D2C data
    this.incidents = generateIncidents(50);
    this.events = generateEvents(100);
    this.changes = generateChanges(30);

    // Generate S2P data
    this.demands = generateDemands(40);
    this.portfolioItems = generatePortfolioItems(25);
    this.investments = generateInvestments(15);

    // Generate R2F data
    this.serviceCatalog = generateServiceCatalogEntries(30);
    this.serviceRequests = generateServiceRequests(60);
    this.subscriptions = generateSubscriptions(45);
    this.fulfillmentRequests = generateFulfillmentRequests(35);

    // Generate R2D data
    this.requirements = generateRequirements(50);
    this.builds = generateBuilds(80);
    this.deployments = generateDeployments(60);
    this.releases = generateReleases(20);
    this.pipelines = generatePipelines(15);

    this.initialized = true;
  }

  // D2C Methods
  getIncidents(): Incident[] {
    return this.incidents;
  }

  getIncidentById(id: string): Incident | undefined {
    return this.incidents.find((inc) => inc.id === id);
  }

  getEvents(): Event[] {
    return this.events;
  }

  getEventById(id: string): Event | undefined {
    return this.events.find((evt) => evt.id === id);
  }

  getChanges(): Change[] {
    return this.changes;
  }

  getChangeById(id: string): Change | undefined {
    return this.changes.find((chg) => chg.id === id);
  }

  // S2P Methods
  getDemands(): Demand[] {
    return this.demands;
  }

  getDemandById(id: string): Demand | undefined {
    return this.demands.find((dmd) => dmd.id === id);
  }

  getPortfolioItems(): PortfolioItem[] {
    return this.portfolioItems;
  }

  getPortfolioItemById(id: string): PortfolioItem | undefined {
    return this.portfolioItems.find((item) => item.id === id);
  }

  getInvestments(): Investment[] {
    return this.investments;
  }

  getInvestmentById(id: string): Investment | undefined {
    return this.investments.find((inv) => inv.id === id);
  }

  // R2F Methods
  getServiceCatalog(): ServiceCatalogEntry[] {
    return this.serviceCatalog;
  }

  getServiceCatalogEntryById(id: string): ServiceCatalogEntry | undefined {
    return this.serviceCatalog.find((svc) => svc.id === id);
  }

  getServiceRequests(): ServiceRequest[] {
    return this.serviceRequests;
  }

  getServiceRequestById(id: string): ServiceRequest | undefined {
    return this.serviceRequests.find((req) => req.id === id);
  }

  getSubscriptions(): Subscription[] {
    return this.subscriptions;
  }

  getSubscriptionById(id: string): Subscription | undefined {
    return this.subscriptions.find((sub) => sub.id === id);
  }

  getFulfillmentRequests(): FulfillmentRequest[] {
    return this.fulfillmentRequests;
  }

  getFulfillmentRequestById(id: string): FulfillmentRequest | undefined {
    return this.fulfillmentRequests.find((ful) => ful.id === id);
  }

  // R2D Methods
  getRequirements(): Requirement[] {
    return this.requirements;
  }

  getRequirementById(id: string): Requirement | undefined {
    return this.requirements.find((req) => req.id === id);
  }

  getBuilds(): Build[] {
    return this.builds;
  }

  getBuildById(id: string): Build | undefined {
    return this.builds.find((build) => build.id === id);
  }

  getDeployments(): Deployment[] {
    return this.deployments;
  }

  getDeploymentById(id: string): Deployment | undefined {
    return this.deployments.find((dep) => dep.id === id);
  }

  getReleases(): Release[] {
    return this.releases;
  }

  getReleaseById(id: string): Release | undefined {
    return this.releases.find((rel) => rel.id === id);
  }

  getPipelines(): Pipeline[] {
    return this.pipelines;
  }

  getPipelineById(id: string): Pipeline | undefined {
    return this.pipelines.find((pipe) => pipe.id === id);
  }

  // Dashboard Metrics
  getDashboardMetrics(): DashboardMetrics {
    const openIncidents = this.incidents.filter(
      (inc) => inc.status !== "resolved" && inc.status !== "closed"
    ).length;

    const criticalIncidents = this.incidents.filter(
      (inc) => inc.severity === 1 && inc.status !== "resolved" && inc.status !== "closed"
    ).length;

    const activeDemands = this.demands.filter(
      (dmd) => dmd.status === "new" || dmd.status === "assessing"
    ).length;

    const totalInvestment = this.investments
      .filter((inv) => inv.status === "active")
      .reduce((sum, inv) => sum + inv.allocatedBudget, 0);

    const openChanges = this.changes.filter(
      (chg) => chg.status !== "completed" && chg.status !== "cancelled"
    ).length;

    const pendingRequests = this.serviceRequests.filter(
      (req) => req.status === "submitted" || req.status === "approved" || req.status === "fulfilling"
    ).length;

    const activeSubscriptions = this.subscriptions.filter(
      (sub) => sub.status === "active"
    ).length;

    // Calculate average fulfillment time (in days)
    const fulfilledRequests = this.serviceRequests.filter(
      (req) => req.status === "fulfilled" && req.actualDelivery
    );
    const avgFulfillmentTime = fulfilledRequests.length > 0
      ? fulfilledRequests.reduce((sum, req) => {
          const days = Math.floor(
            (req.actualDelivery!.getTime() - req.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }, 0) / fulfilledRequests.length
      : 0;

    return {
      s2p: {
        totalDemands: this.demands.length,
        activeDemands,
        portfolioItems: this.portfolioItems.length,
        totalInvestment,
      },
      r2d: {
        activePipelines: this.pipelines.filter((pipe) => pipe.status === "active").length,
        failedBuilds: this.builds.filter((build) => build.status === "failed").length,
        pendingReleases: this.releases.filter((rel) => rel.status === "scheduled" || rel.status === "in_progress").length,
      },
      r2f: {
        pendingRequests,
        avgFulfillmentTime: Number(avgFulfillmentTime.toFixed(1)),
        activeSubscriptions,
      },
      d2c: {
        openIncidents,
        criticalIncidents,
        openChanges,
        totalEvents: this.events.length,
      },
    };
  }
}

// Export singleton instance
export const dataService = new MockDataService();
