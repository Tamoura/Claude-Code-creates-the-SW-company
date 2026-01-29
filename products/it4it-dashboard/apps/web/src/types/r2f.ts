/**
 * Request to Fulfill (R2F) Value Stream Types
 */

export type ServiceCategory = "compute" | "storage" | "database" | "networking" | "security" | "software";
export type ServiceStatus = "active" | "inactive" | "deprecated";

export interface ServiceCatalogEntry {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  status: ServiceStatus;
  price: number;
  currency: string;
  deliveryTime: number; // in hours
  provider: string;
  capabilities: string[];
  requirements: string[];
  sla: {
    availability: number; // percentage
    supportLevel: "basic" | "standard" | "premium";
    responseTime: number; // in hours
  };
  createdAt: Date;
  updatedAt: Date;
}

export type RequestStatus = "draft" | "submitted" | "approved" | "rejected" | "fulfilling" | "fulfilled" | "cancelled";
export type RequestPriority = 1 | 2 | 3 | 4; // 1=Urgent, 4=Low

export interface ServiceRequest {
  id: string;
  serviceId: string;
  serviceName: string;
  requestor: string;
  requestorEmail: string;
  status: RequestStatus;
  priority: RequestPriority;
  justification: string;
  approver?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export type SubscriptionStatus = "active" | "suspended" | "expired" | "cancelled";
export type BillingCycle = "monthly" | "quarterly" | "annual";

export interface Subscription {
  id: string;
  serviceId: string;
  serviceName: string;
  userId: string;
  userName: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate?: Date;
  billingCycle: BillingCycle;
  cost: number;
  currency: string;
  autoRenew: boolean;
  relatedRequest?: string;
  lastBilledAt?: Date;
  nextBillingAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type FulfillmentStatus = "pending" | "in_progress" | "waiting" | "completed" | "failed";
export type FulfillmentStep = "approval" | "provisioning" | "configuration" | "validation" | "delivery";

export interface FulfillmentRequest {
  id: string;
  serviceRequestId: string;
  status: FulfillmentStatus;
  currentStep: FulfillmentStep;
  assignee: string;
  steps: {
    step: FulfillmentStep;
    status: "pending" | "in_progress" | "completed" | "failed";
    startedAt?: Date;
    completedAt?: Date;
    notes?: string;
  }[];
  blockers?: string[];
  estimatedCompletion: Date;
  actualCompletion?: Date;
  createdAt: Date;
  updatedAt: Date;
}
