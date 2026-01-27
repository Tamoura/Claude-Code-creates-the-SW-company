import { describe, it, expect } from "vitest";
import {
  generateServiceCatalogEntry,
  generateServiceCatalogEntries,
  generateServiceRequest,
  generateServiceRequests,
  generateSubscription,
  generateSubscriptions,
  generateFulfillmentRequest,
  generateFulfillmentRequests,
} from "./r2f-generator";

describe("R2F Generator", () => {
  describe("generateServiceCatalogEntry", () => {
    it("generates a service catalog entry with all required fields", () => {
      const entry = generateServiceCatalogEntry();

      expect(entry.id).toMatch(/^SVC-[A-Z0-9]{6}$/);
      expect(entry.name).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(["compute", "storage", "database", "networking", "security", "software"]).toContain(entry.category);
      expect(["active", "inactive", "deprecated"]).toContain(entry.status);
      expect(entry.price).toBeGreaterThanOrEqual(0);
      expect(entry.currency).toBe("USD");
      expect(entry.deliveryTime).toBeGreaterThan(0);
      expect(entry.provider).toBeTruthy();
      expect(Array.isArray(entry.capabilities)).toBe(true);
      expect(entry.capabilities.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.requirements)).toBe(true);
      expect(entry.sla).toBeDefined();
      expect(entry.sla.availability).toBeGreaterThanOrEqual(95);
      expect(entry.sla.availability).toBeLessThanOrEqual(100);
      expect(["basic", "standard", "premium"]).toContain(entry.sla.supportLevel);
      expect(entry.sla.responseTime).toBeGreaterThan(0);
      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.updatedAt).toBeInstanceOf(Date);
    });

    it("accepts a custom id", () => {
      const entry = generateServiceCatalogEntry("SVC-CUSTOM");
      expect(entry.id).toBe("SVC-CUSTOM");
    });
  });

  describe("generateServiceCatalogEntries", () => {
    it("generates multiple service catalog entries", () => {
      const entries = generateServiceCatalogEntries(5);
      expect(entries).toHaveLength(5);
      entries.forEach((entry) => {
        expect(entry.id).toMatch(/^SVC-[A-Z0-9]{6}$/);
      });
    });
  });

  describe("generateServiceRequest", () => {
    it("generates a service request with all required fields", () => {
      const request = generateServiceRequest();

      expect(request.id).toMatch(/^REQ-[A-Z0-9]{8}$/);
      expect(request.serviceId).toMatch(/^SVC-[A-Z0-9]{6}$/);
      expect(request.serviceName).toBeTruthy();
      expect(request.requestor).toBeTruthy();
      expect(request.requestorEmail).toContain("@");
      expect(["draft", "submitted", "approved", "rejected", "fulfilling", "fulfilled", "cancelled"]).toContain(request.status);
      expect([1, 2, 3, 4]).toContain(request.priority);
      expect(request.justification).toBeTruthy();
      expect(request.createdAt).toBeInstanceOf(Date);
      expect(request.updatedAt).toBeInstanceOf(Date);
      expect(typeof request.metadata).toBe("object");
    });

    it("includes approver for approved requests", () => {
      const request = generateServiceRequest();
      if (request.status === "approved" || request.status === "fulfilling" || request.status === "fulfilled") {
        expect(request.approver).toBeTruthy();
        expect(request.approvedAt).toBeInstanceOf(Date);
      }
    });

    it("includes rejection reason for rejected requests", () => {
      const request = generateServiceRequest();
      if (request.status === "rejected") {
        expect(request.rejectionReason).toBeTruthy();
      }
    });

    it("accepts a custom id", () => {
      const request = generateServiceRequest("REQ-CUSTOM01");
      expect(request.id).toBe("REQ-CUSTOM01");
    });
  });

  describe("generateServiceRequests", () => {
    it("generates multiple service requests", () => {
      const requests = generateServiceRequests(5);
      expect(requests).toHaveLength(5);
      requests.forEach((request) => {
        expect(request.id).toMatch(/^REQ-[A-Z0-9]{8}$/);
      });
    });
  });

  describe("generateSubscription", () => {
    it("generates a subscription with all required fields", () => {
      const subscription = generateSubscription();

      expect(subscription.id).toMatch(/^SUB-[A-Z0-9]{8}$/);
      expect(subscription.serviceId).toMatch(/^SVC-[A-Z0-9]{6}$/);
      expect(subscription.serviceName).toBeTruthy();
      expect(subscription.userId).toMatch(/^USR-[A-Z0-9]{6}$/);
      expect(subscription.userName).toBeTruthy();
      expect(["active", "suspended", "expired", "cancelled"]).toContain(subscription.status);
      expect(subscription.startDate).toBeInstanceOf(Date);
      expect(["monthly", "quarterly", "annual"]).toContain(subscription.billingCycle);
      expect(subscription.cost).toBeGreaterThanOrEqual(0);
      expect(subscription.currency).toBe("USD");
      expect(typeof subscription.autoRenew).toBe("boolean");
      expect(subscription.createdAt).toBeInstanceOf(Date);
      expect(subscription.updatedAt).toBeInstanceOf(Date);
    });

    it("includes end date for expired or cancelled subscriptions", () => {
      const subscription = generateSubscription();
      if (subscription.status === "expired" || subscription.status === "cancelled") {
        expect(subscription.endDate).toBeInstanceOf(Date);
      }
    });

    it("accepts a custom id", () => {
      const subscription = generateSubscription("SUB-CUSTOM01");
      expect(subscription.id).toBe("SUB-CUSTOM01");
    });
  });

  describe("generateSubscriptions", () => {
    it("generates multiple subscriptions", () => {
      const subscriptions = generateSubscriptions(5);
      expect(subscriptions).toHaveLength(5);
      subscriptions.forEach((subscription) => {
        expect(subscription.id).toMatch(/^SUB-[A-Z0-9]{8}$/);
      });
    });
  });

  describe("generateFulfillmentRequest", () => {
    it("generates a fulfillment request with all required fields", () => {
      const fulfillment = generateFulfillmentRequest();

      expect(fulfillment.id).toMatch(/^FUL-[A-Z0-9]{8}$/);
      expect(fulfillment.serviceRequestId).toMatch(/^REQ-[A-Z0-9]{8}$/);
      expect(["pending", "in_progress", "waiting", "completed", "failed"]).toContain(fulfillment.status);
      expect(["approval", "provisioning", "configuration", "validation", "delivery"]).toContain(fulfillment.currentStep);
      expect(fulfillment.assignee).toBeTruthy();
      expect(Array.isArray(fulfillment.steps)).toBe(true);
      expect(fulfillment.steps.length).toBe(5);
      expect(fulfillment.estimatedCompletion).toBeInstanceOf(Date);
      expect(fulfillment.createdAt).toBeInstanceOf(Date);
      expect(fulfillment.updatedAt).toBeInstanceOf(Date);
    });

    it("has properly structured steps", () => {
      const fulfillment = generateFulfillmentRequest();

      fulfillment.steps.forEach((step) => {
        expect(["approval", "provisioning", "configuration", "validation", "delivery"]).toContain(step.step);
        expect(["pending", "in_progress", "completed", "failed"]).toContain(step.status);
      });
    });

    it("includes actual completion date for completed fulfillments", () => {
      const fulfillment = generateFulfillmentRequest();
      if (fulfillment.status === "completed") {
        expect(fulfillment.actualCompletion).toBeInstanceOf(Date);
      }
    });

    it("accepts a custom id", () => {
      const fulfillment = generateFulfillmentRequest("FUL-CUSTOM01");
      expect(fulfillment.id).toBe("FUL-CUSTOM01");
    });
  });

  describe("generateFulfillmentRequests", () => {
    it("generates multiple fulfillment requests", () => {
      const fulfillments = generateFulfillmentRequests(5);
      expect(fulfillments).toHaveLength(5);
      fulfillments.forEach((fulfillment) => {
        expect(fulfillment.id).toMatch(/^FUL-[A-Z0-9]{8}$/);
      });
    });
  });
});
