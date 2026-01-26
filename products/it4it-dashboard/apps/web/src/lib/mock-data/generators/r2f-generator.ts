import { faker } from "@faker-js/faker";
import type {
  ServiceCatalogEntry,
  ServiceCategory,
  ServiceStatus,
  ServiceRequest,
  RequestStatus,
  RequestPriority,
  Subscription,
  SubscriptionStatus,
  BillingCycle,
  FulfillmentRequest,
  FulfillmentStatus,
  FulfillmentStep,
} from "@/types/r2f";

const serviceCategories: ServiceCategory[] = ["compute", "storage", "database", "networking", "security", "software"];
const serviceStatuses: ServiceStatus[] = ["active", "inactive", "deprecated"];

const serviceNames = {
  compute: ["Virtual Machine", "Kubernetes Cluster", "Container Instance", "Batch Processing"],
  storage: ["Object Storage", "Block Storage", "File Storage", "Backup Storage"],
  database: ["PostgreSQL Database", "MySQL Database", "MongoDB Instance", "Redis Cache"],
  networking: ["Load Balancer", "VPN Gateway", "Content Delivery Network", "DNS Service"],
  security: ["Firewall", "DDoS Protection", "SSL Certificate", "Security Audit"],
  software: ["Development Tools", "Office Suite", "Project Management", "Monitoring Tool"],
};

export function generateServiceCatalogEntry(id?: string): ServiceCatalogEntry {
  const category = faker.helpers.arrayElement(serviceCategories);
  const createdAt = faker.date.past({ years: 2 });
  const updatedAt = faker.date.between({ from: createdAt, to: new Date() });

  return {
    id: id || `SVC-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    name: faker.helpers.arrayElement(serviceNames[category]),
    description: faker.lorem.paragraph(),
    category,
    status: faker.helpers.arrayElement(serviceStatuses),
    price: Number(faker.finance.amount({ min: 10, max: 5000, dec: 2 })),
    currency: "USD",
    deliveryTime: faker.helpers.arrayElement([1, 2, 4, 8, 24, 48, 72]),
    provider: faker.company.name(),
    capabilities: faker.helpers.multiple(
      () => faker.helpers.arrayElement([
        "High Availability",
        "Auto Scaling",
        "Backup & Recovery",
        "Monitoring",
        "Security Hardened",
        "Multi-Region",
        "Disaster Recovery",
        "24/7 Support",
      ]),
      { count: { min: 2, max: 5 } }
    ),
    requirements: faker.helpers.multiple(
      () => faker.helpers.arrayElement([
        "Approval from Manager",
        "Budget Allocated",
        "Security Review",
        "Compliance Check",
        "Technical Assessment",
      ]),
      { count: { min: 0, max: 3 } }
    ),
    sla: {
      availability: faker.helpers.arrayElement([95, 99, 99.5, 99.9, 99.99]),
      supportLevel: faker.helpers.arrayElement(["basic", "standard", "premium"] as const),
      responseTime: faker.helpers.arrayElement([1, 2, 4, 8, 24]),
    },
    createdAt,
    updatedAt,
  };
}

export function generateServiceCatalogEntries(count: number): ServiceCatalogEntry[] {
  return Array.from({ length: count }, () => generateServiceCatalogEntry());
}

const requestStatuses: RequestStatus[] = ["draft", "submitted", "approved", "rejected", "fulfilling", "fulfilled", "cancelled"];

const justifications = [
  "Required for new project implementation",
  "Current capacity insufficient for growing demands",
  "Replacing legacy system",
  "Cost optimization initiative",
  "Security compliance requirement",
  "Business continuity improvement",
  "Performance enhancement needed",
  "Team productivity improvement",
];

const rejectionReasons = [
  "Budget constraints",
  "Insufficient justification",
  "Alternative solution available",
  "Security concerns",
  "Compliance issues",
  "Resource unavailability",
];

export function generateServiceRequest(id?: string): ServiceRequest {
  const status = faker.helpers.arrayElement(requestStatuses);
  const createdAt = faker.date.recent({ days: 60 });
  const updatedAt = faker.date.between({ from: createdAt, to: new Date() });

  const request: ServiceRequest = {
    id: id || `REQ-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`,
    serviceId: `SVC-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    serviceName: faker.helpers.arrayElement(Object.values(serviceNames).flat()),
    requestor: faker.person.fullName(),
    requestorEmail: faker.internet.email(),
    status,
    priority: faker.helpers.arrayElement([1, 2, 3, 4]) as RequestPriority,
    justification: faker.helpers.arrayElement(justifications),
    createdAt,
    updatedAt,
    metadata: {
      department: faker.helpers.arrayElement(["Engineering", "Operations", "Marketing", "Sales", "HR", "Finance"]),
      costCenter: faker.string.alphanumeric({ length: 6, casing: "upper" }),
    },
  };

  if (status === "approved" || status === "fulfilling" || status === "fulfilled") {
    request.approver = faker.person.fullName();
    request.approvedAt = faker.date.between({ from: createdAt, to: updatedAt });
    request.estimatedDelivery = faker.date.soon({ days: 14, refDate: request.approvedAt });

    if (status === "fulfilled") {
      request.actualDelivery = faker.date.between({ from: request.approvedAt, to: new Date() });
    }
  }

  if (status === "rejected") {
    request.rejectionReason = faker.helpers.arrayElement(rejectionReasons);
  }

  return request;
}

export function generateServiceRequests(count: number): ServiceRequest[] {
  return Array.from({ length: count }, () => generateServiceRequest());
}

const subscriptionStatuses: SubscriptionStatus[] = ["active", "suspended", "expired", "cancelled"];
const billingCycles: BillingCycle[] = ["monthly", "quarterly", "annual"];

export function generateSubscription(id?: string): Subscription {
  const status = faker.helpers.arrayElement(subscriptionStatuses);
  const startDate = faker.date.past({ years: 1 });
  const billingCycle = faker.helpers.arrayElement(billingCycles);
  // Create a date before startDate for createdAt
  const createdAtFrom = new Date(startDate);
  createdAtFrom.setDate(createdAtFrom.getDate() - faker.number.int({ min: 7, max: 90 }));
  const createdAt = faker.date.between({ from: createdAtFrom, to: startDate });
  const updatedAt = faker.date.between({ from: startDate, to: new Date() });

  const subscription: Subscription = {
    id: id || `SUB-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`,
    serviceId: `SVC-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    serviceName: faker.helpers.arrayElement(Object.values(serviceNames).flat()),
    userId: `USR-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    userName: faker.person.fullName(),
    status,
    startDate,
    billingCycle,
    cost: Number(faker.finance.amount({ min: 50, max: 3000, dec: 2 })),
    currency: "USD",
    autoRenew: faker.datatype.boolean(),
    relatedRequest: faker.helpers.maybe(() => `REQ-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`, { probability: 0.7 }),
    createdAt,
    updatedAt,
  };

  if (status === "active") {
    subscription.lastBilledAt = faker.date.recent({ days: 30 });
    const daysToAdd = billingCycle === "monthly" ? 30 : billingCycle === "quarterly" ? 90 : 365;
    subscription.nextBillingAt = new Date(subscription.lastBilledAt);
    subscription.nextBillingAt.setDate(subscription.nextBillingAt.getDate() + daysToAdd);
  }

  if (status === "expired" || status === "cancelled") {
    subscription.endDate = faker.date.between({ from: startDate, to: new Date() });
  }

  return subscription;
}

export function generateSubscriptions(count: number): Subscription[] {
  return Array.from({ length: count }, () => generateSubscription());
}

const fulfillmentStatuses: FulfillmentStatus[] = ["pending", "in_progress", "waiting", "completed", "failed"];
const fulfillmentSteps: FulfillmentStep[] = ["approval", "provisioning", "configuration", "validation", "delivery"];

export function generateFulfillmentRequest(id?: string): FulfillmentRequest {
  const status = faker.helpers.arrayElement(fulfillmentStatuses);
  const createdAt = faker.date.recent({ days: 30 });
  const updatedAt = faker.date.between({ from: createdAt, to: new Date() });

  const currentStepIndex = status === "completed"
    ? 4
    : status === "pending"
      ? 0
      : faker.number.int({ min: 0, max: 4 });

  const steps = fulfillmentSteps.map((step, index) => {
    const stepStatus =
      index < currentStepIndex
        ? "completed"
        : index === currentStepIndex
          ? status === "completed" ? "completed" : "in_progress"
          : "pending";

    const stepData: FulfillmentRequest["steps"][0] = {
      step,
      status: stepStatus as "pending" | "in_progress" | "completed" | "failed",
    };

    if (stepStatus === "completed") {
      stepData.startedAt = faker.date.between({ from: createdAt, to: updatedAt });
      stepData.completedAt = faker.date.between({ from: stepData.startedAt, to: updatedAt });
    } else if (stepStatus === "in_progress") {
      stepData.startedAt = faker.date.between({ from: createdAt, to: updatedAt });
    }

    if (faker.datatype.boolean({ probability: 0.2 })) {
      stepData.notes = faker.lorem.sentence();
    }

    return stepData;
  });

  const fulfillment: FulfillmentRequest = {
    id: id || `FUL-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`,
    serviceRequestId: `REQ-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`,
    status,
    currentStep: fulfillmentSteps[currentStepIndex],
    assignee: faker.person.fullName(),
    steps,
    estimatedCompletion: faker.date.soon({ days: 7 }),
    createdAt,
    updatedAt,
  };

  if (status === "waiting") {
    fulfillment.blockers = faker.helpers.multiple(
      () => faker.helpers.arrayElement([
        "Waiting for approval",
        "Resource unavailable",
        "Dependencies not met",
        "Technical issue",
        "External vendor delay",
      ]),
      { count: { min: 1, max: 3 } }
    );
  }

  if (status === "completed") {
    fulfillment.actualCompletion = faker.date.between({ from: createdAt, to: updatedAt });
  }

  return fulfillment;
}

export function generateFulfillmentRequests(count: number): FulfillmentRequest[] {
  return Array.from({ length: count }, () => generateFulfillmentRequest());
}
