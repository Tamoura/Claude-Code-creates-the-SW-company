import { describe, it, expect } from "vitest";
import { dataService } from "./data-service";

describe("MockDataService", () => {
  describe("D2C Data", () => {
    it("provides incidents", () => {
      const incidents = dataService.getIncidents();
      expect(Array.isArray(incidents)).toBe(true);
      expect(incidents.length).toBeGreaterThan(0);
    });

    it("retrieves incident by ID", () => {
      const incidents = dataService.getIncidents();
      const firstIncident = incidents[0];
      const retrieved = dataService.getIncidentById(firstIncident.id);

      expect(retrieved).toEqual(firstIncident);
    });

    it("returns undefined for non-existent incident ID", () => {
      const retrieved = dataService.getIncidentById("NON-EXISTENT");
      expect(retrieved).toBeUndefined();
    });

    it("provides events", () => {
      const events = dataService.getEvents();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
    });

    it("provides changes", () => {
      const changes = dataService.getChanges();
      expect(Array.isArray(changes)).toBe(true);
      expect(changes.length).toBeGreaterThan(0);
    });
  });

  describe("S2P Data", () => {
    it("provides demands", () => {
      const demands = dataService.getDemands();
      expect(Array.isArray(demands)).toBe(true);
      expect(demands.length).toBeGreaterThan(0);
    });

    it("retrieves demand by ID", () => {
      const demands = dataService.getDemands();
      const firstDemand = demands[0];
      const retrieved = dataService.getDemandById(firstDemand.id);

      expect(retrieved).toEqual(firstDemand);
    });

    it("provides portfolio items", () => {
      const items = dataService.getPortfolioItems();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
    });

    it("provides investments", () => {
      const investments = dataService.getInvestments();
      expect(Array.isArray(investments)).toBe(true);
      expect(investments.length).toBeGreaterThan(0);
    });
  });

  describe("R2F Data", () => {
    it("provides service catalog", () => {
      const catalog = dataService.getServiceCatalog();
      expect(Array.isArray(catalog)).toBe(true);
      expect(catalog.length).toBeGreaterThan(0);
    });

    it("retrieves service catalog entry by ID", () => {
      const catalog = dataService.getServiceCatalog();
      const firstEntry = catalog[0];
      const retrieved = dataService.getServiceCatalogEntryById(firstEntry.id);

      expect(retrieved).toEqual(firstEntry);
    });

    it("returns undefined for non-existent catalog entry ID", () => {
      const retrieved = dataService.getServiceCatalogEntryById("NON-EXISTENT");
      expect(retrieved).toBeUndefined();
    });

    it("provides service requests", () => {
      const requests = dataService.getServiceRequests();
      expect(Array.isArray(requests)).toBe(true);
      expect(requests.length).toBeGreaterThan(0);
    });

    it("retrieves service request by ID", () => {
      const requests = dataService.getServiceRequests();
      const firstRequest = requests[0];
      const retrieved = dataService.getServiceRequestById(firstRequest.id);

      expect(retrieved).toEqual(firstRequest);
    });

    it("provides subscriptions", () => {
      const subscriptions = dataService.getSubscriptions();
      expect(Array.isArray(subscriptions)).toBe(true);
      expect(subscriptions.length).toBeGreaterThan(0);
    });

    it("retrieves subscription by ID", () => {
      const subscriptions = dataService.getSubscriptions();
      const firstSubscription = subscriptions[0];
      const retrieved = dataService.getSubscriptionById(firstSubscription.id);

      expect(retrieved).toEqual(firstSubscription);
    });

    it("provides fulfillment requests", () => {
      const fulfillments = dataService.getFulfillmentRequests();
      expect(Array.isArray(fulfillments)).toBe(true);
      expect(fulfillments.length).toBeGreaterThan(0);
    });

    it("retrieves fulfillment request by ID", () => {
      const fulfillments = dataService.getFulfillmentRequests();
      const firstFulfillment = fulfillments[0];
      const retrieved = dataService.getFulfillmentRequestById(firstFulfillment.id);

      expect(retrieved).toEqual(firstFulfillment);
    });
  });

  describe("Dashboard Metrics", () => {
    it("provides complete dashboard metrics", () => {
      const metrics = dataService.getDashboardMetrics();

      expect(metrics).toHaveProperty("s2p");
      expect(metrics).toHaveProperty("r2d");
      expect(metrics).toHaveProperty("r2f");
      expect(metrics).toHaveProperty("d2c");

      expect(typeof metrics.s2p.totalDemands).toBe("number");
      expect(typeof metrics.s2p.activeDemands).toBe("number");
      expect(typeof metrics.s2p.portfolioItems).toBe("number");
      expect(typeof metrics.s2p.totalInvestment).toBe("number");

      expect(typeof metrics.d2c.openIncidents).toBe("number");
      expect(typeof metrics.d2c.criticalIncidents).toBe("number");
      expect(typeof metrics.d2c.openChanges).toBe("number");
    });

    it("calculates active demands correctly", () => {
      const metrics = dataService.getDashboardMetrics();
      const demands = dataService.getDemands();
      const activeDemands = demands.filter(
        (d) => d.status === "new" || d.status === "assessing"
      ).length;

      expect(metrics.s2p.activeDemands).toBe(activeDemands);
    });

    it("calculates open incidents correctly", () => {
      const metrics = dataService.getDashboardMetrics();
      const incidents = dataService.getIncidents();
      const openIncidents = incidents.filter(
        (inc) => inc.status !== "resolved" && inc.status !== "closed"
      ).length;

      expect(metrics.d2c.openIncidents).toBe(openIncidents);
    });

    it("calculates R2F metrics correctly", () => {
      const metrics = dataService.getDashboardMetrics();
      const requests = dataService.getServiceRequests();
      const subscriptions = dataService.getSubscriptions();

      const pendingRequests = requests.filter(
        (req) => req.status === "submitted" || req.status === "approved" || req.status === "fulfilling"
      ).length;

      const activeSubscriptions = subscriptions.filter(
        (sub) => sub.status === "active"
      ).length;

      expect(metrics.r2f.pendingRequests).toBe(pendingRequests);
      expect(metrics.r2f.activeSubscriptions).toBe(activeSubscriptions);
      expect(typeof metrics.r2f.avgFulfillmentTime).toBe("number");
      expect(metrics.r2f.avgFulfillmentTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Data Consistency", () => {
    it("returns same data on multiple calls", () => {
      const incidents1 = dataService.getIncidents();
      const incidents2 = dataService.getIncidents();

      expect(incidents1).toEqual(incidents2);
    });
  });
});
