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

  describe("R2D Data", () => {
    it("provides requirements", () => {
      const requirements = dataService.getRequirements();
      expect(Array.isArray(requirements)).toBe(true);
      expect(requirements.length).toBeGreaterThan(0);
    });

    it("retrieves requirement by ID", () => {
      const requirements = dataService.getRequirements();
      const firstRequirement = requirements[0];
      const retrieved = dataService.getRequirementById(firstRequirement.id);

      expect(retrieved).toEqual(firstRequirement);
    });

    it("provides builds", () => {
      const builds = dataService.getBuilds();
      expect(Array.isArray(builds)).toBe(true);
      expect(builds.length).toBeGreaterThan(0);
    });

    it("retrieves build by ID", () => {
      const builds = dataService.getBuilds();
      const firstBuild = builds[0];
      const retrieved = dataService.getBuildById(firstBuild.id);

      expect(retrieved).toEqual(firstBuild);
    });

    it("provides deployments", () => {
      const deployments = dataService.getDeployments();
      expect(Array.isArray(deployments)).toBe(true);
      expect(deployments.length).toBeGreaterThan(0);
    });

    it("retrieves deployment by ID", () => {
      const deployments = dataService.getDeployments();
      const firstDeployment = deployments[0];
      const retrieved = dataService.getDeploymentById(firstDeployment.id);

      expect(retrieved).toEqual(firstDeployment);
    });

    it("provides releases", () => {
      const releases = dataService.getReleases();
      expect(Array.isArray(releases)).toBe(true);
      expect(releases.length).toBeGreaterThan(0);
    });

    it("retrieves release by ID", () => {
      const releases = dataService.getReleases();
      const firstRelease = releases[0];
      const retrieved = dataService.getReleaseById(firstRelease.id);

      expect(retrieved).toEqual(firstRelease);
    });

    it("provides pipelines", () => {
      const pipelines = dataService.getPipelines();
      expect(Array.isArray(pipelines)).toBe(true);
      expect(pipelines.length).toBeGreaterThan(0);
    });

    it("retrieves pipeline by ID", () => {
      const pipelines = dataService.getPipelines();
      const firstPipeline = pipelines[0];
      const retrieved = dataService.getPipelineById(firstPipeline.id);

      expect(retrieved).toEqual(firstPipeline);
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

    it("calculates R2D metrics correctly", () => {
      const metrics = dataService.getDashboardMetrics();
      const pipelines = dataService.getPipelines();
      const builds = dataService.getBuilds();
      const releases = dataService.getReleases();

      const activePipelines = pipelines.filter((pipe) => pipe.status === "active").length;
      const failedBuilds = builds.filter((build) => build.status === "failed").length;
      const pendingReleases = releases.filter((rel) => rel.status === "scheduled" || rel.status === "in_progress").length;

      expect(metrics.r2d.activePipelines).toBe(activePipelines);
      expect(metrics.r2d.failedBuilds).toBe(failedBuilds);
      expect(metrics.r2d.pendingReleases).toBe(pendingReleases);
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
