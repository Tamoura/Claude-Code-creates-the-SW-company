import { faker } from "@faker-js/faker";
import type {
  Incident,
  IncidentStatus,
  IncidentSeverity,
  IncidentPriority,
  Event,
  EventSeverity,
  Change,
  ChangeStatus,
  ChangeType,
  ChangeRisk,
} from "@/types/d2c";

const incidentStatuses: IncidentStatus[] = ["new", "assigned", "in_progress", "pending", "resolved", "closed"];
const incidentTitles = [
  "Database Connection Timeout",
  "Application Server Not Responding",
  "Slow Response Time on API",
  "User Unable to Login",
  "Email Service Disruption",
  "Network Connectivity Issues",
  "Disk Space Critical on Server",
  "Memory Leak in Production App",
  "SSL Certificate Expiration Warning",
  "Load Balancer Health Check Failing",
];

export function generateIncident(id?: string): Incident {
  const status = faker.helpers.arrayElement(incidentStatuses);
  const createdAt = faker.date.recent({ days: 30 });
  const updatedAt = faker.date.between({ from: createdAt, to: new Date() });

  return {
    id: id || `INC-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    title: faker.helpers.arrayElement(incidentTitles),
    description: faker.lorem.paragraph(),
    status,
    severity: faker.helpers.arrayElement([1, 2, 3, 4]) as IncidentSeverity,
    priority: faker.helpers.arrayElement([1, 2, 3, 4]) as IncidentPriority,
    assignee: faker.person.fullName(),
    affectedService: faker.helpers.arrayElement([
      "Web Application",
      "API Gateway",
      "Database",
      "Email Service",
      "Authentication Service",
      "File Storage",
    ]),
    createdAt,
    updatedAt,
    resolvedAt: status === "resolved" || status === "closed" ? updatedAt : undefined,
    relatedCIs: faker.helpers.multiple(() => `CI-${faker.string.alphanumeric(4).toUpperCase()}`, { count: { min: 1, max: 3 } }),
  };
}

export function generateIncidents(count: number): Incident[] {
  return Array.from({ length: count }, () => generateIncident());
}

const eventTitles = [
  "High CPU Usage Detected",
  "Backup Completed Successfully",
  "Security Scan Started",
  "Deploy Completed",
  "Service Health Check Failed",
  "Threshold Breached: Memory Usage",
  "Authentication Failure",
  "Database Query Slow",
];

export function generateEvent(id?: string): Event {
  const severity = faker.helpers.arrayElement(["info", "warning", "error", "critical"] as EventSeverity[]);

  return {
    id: id || `EVT-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`,
    title: faker.helpers.arrayElement(eventTitles),
    description: faker.lorem.sentence(),
    severity,
    source: faker.helpers.arrayElement([
      "Monitoring System",
      "Application Log",
      "Network Device",
      "Security Tool",
      "Database",
    ]),
    timestamp: faker.date.recent({ days: 7 }),
    acknowledged: faker.datatype.boolean(),
    relatedCI: faker.helpers.maybe(() => `CI-${faker.string.alphanumeric(4).toUpperCase()}`, { probability: 0.7 }),
  };
}

export function generateEvents(count: number): Event[] {
  return Array.from({ length: count }, () => generateEvent());
}

const changeTypes: ChangeType[] = ["standard", "normal", "emergency"];
const changeStatuses: ChangeStatus[] = ["draft", "submitted", "approved", "scheduled", "implementing", "completed", "failed", "cancelled"];
const changeRisks: ChangeRisk[] = ["low", "medium", "high", "critical"];

const changeTitles = [
  "Upgrade Database to v15",
  "Deploy Application v2.3",
  "Apply Security Patches",
  "Network Configuration Update",
  "Add New Load Balancer",
  "Certificate Renewal",
  "Firewall Rule Update",
  "OS Upgrade",
];

export function generateChange(id?: string): Change {
  const status = faker.helpers.arrayElement(changeStatuses);
  const scheduledStart = faker.date.soon({ days: 14 });
  const scheduledEnd = faker.date.soon({ days: 1, refDate: scheduledStart });

  return {
    id: id || `CHG-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    title: faker.helpers.arrayElement(changeTitles),
    description: faker.lorem.paragraph(),
    status,
    type: faker.helpers.arrayElement(changeTypes),
    risk: faker.helpers.arrayElement(changeRisks),
    requestor: faker.person.fullName(),
    implementer: faker.person.fullName(),
    scheduledStart,
    scheduledEnd,
    actualStart: status === "implementing" || status === "completed" ? scheduledStart : undefined,
    actualEnd: status === "completed" ? scheduledEnd : undefined,
    affectedCIs: faker.helpers.multiple(() => `CI-${faker.string.alphanumeric(4).toUpperCase()}`, { count: { min: 1, max: 5 } }),
  };
}

export function generateChanges(count: number): Change[] {
  return Array.from({ length: count }, () => generateChange());
}
