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
  });

  describe("Data Consistency", () => {
    it("returns same data on multiple calls", () => {
      const incidents1 = dataService.getIncidents();
      const incidents2 = dataService.getIncidents();

      expect(incidents1).toEqual(incidents2);
    });
  });
});
