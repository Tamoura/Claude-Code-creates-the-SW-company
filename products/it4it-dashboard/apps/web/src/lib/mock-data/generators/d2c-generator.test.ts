import { describe, it, expect } from "vitest";
import { generateIncident, generateIncidents, generateEvent, generateEvents, generateChange, generateChanges } from "./d2c-generator";

describe("D2C Generators", () => {
  describe("generateIncident", () => {
    it("generates a valid incident", () => {
      const incident = generateIncident();

      expect(incident).toHaveProperty("id");
      expect(incident).toHaveProperty("title");
      expect(incident).toHaveProperty("description");
      expect(incident.status).toMatch(/new|assigned|in_progress|pending|resolved|closed/);
      expect([1, 2, 3, 4]).toContain(incident.severity);
      expect([1, 2, 3, 4]).toContain(incident.priority);
      expect(incident).toHaveProperty("assignee");
      expect(incident).toHaveProperty("affectedService");
      expect(incident.createdAt).toBeInstanceOf(Date);
      expect(incident.updatedAt).toBeInstanceOf(Date);
      expect(Array.isArray(incident.relatedCIs)).toBe(true);
    });

    it("generates incident with custom ID", () => {
      const incident = generateIncident("INC-CUSTOM");
      expect(incident.id).toBe("INC-CUSTOM");
    });

    it("sets resolvedAt for resolved/closed incidents", () => {
      const incidents = generateIncidents(20);
      const resolvedIncidents = incidents.filter(
        (inc) => inc.status === "resolved" || inc.status === "closed"
      );

      resolvedIncidents.forEach((inc) => {
        expect(inc.resolvedAt).toBeInstanceOf(Date);
      });
    });
  });

  describe("generateIncidents", () => {
    it("generates specified number of incidents", () => {
      const incidents = generateIncidents(10);
      expect(incidents).toHaveLength(10);
    });

    it("generates unique incident IDs", () => {
      const incidents = generateIncidents(20);
      const ids = incidents.map((inc) => inc.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(20);
    });
  });

  describe("generateEvent", () => {
    it("generates a valid event", () => {
      const event = generateEvent();

      expect(event).toHaveProperty("id");
      expect(event).toHaveProperty("title");
      expect(event).toHaveProperty("description");
      expect(["info", "warning", "error", "critical"]).toContain(event.severity);
      expect(event).toHaveProperty("source");
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(typeof event.acknowledged).toBe("boolean");
    });
  });

  describe("generateChange", () => {
    it("generates a valid change", () => {
      const change = generateChange();

      expect(change).toHaveProperty("id");
      expect(change).toHaveProperty("title");
      expect(change).toHaveProperty("description");
      expect(["draft", "submitted", "approved", "scheduled", "implementing", "completed", "failed", "cancelled"]).toContain(change.status);
      expect(["standard", "normal", "emergency"]).toContain(change.type);
      expect(["low", "medium", "high", "critical"]).toContain(change.risk);
      expect(change.scheduledStart).toBeInstanceOf(Date);
      expect(change.scheduledEnd).toBeInstanceOf(Date);
      expect(Array.isArray(change.affectedCIs)).toBe(true);
    });
  });
});
