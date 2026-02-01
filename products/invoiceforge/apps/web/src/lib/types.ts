export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  client: {
    id: string | null;
    name: string;
    email: string | null;
    matched: boolean;
  } | null;
  items: InvoiceItem[];
  subtotal: number; // cents
  taxRate: number; // basis points
  taxAmount: number; // cents
  total: number; // cents
  currency: string;
  invoiceDate: string;
  dueDate: string;
  notes: string | null;
  aiPrompt: string | null;
  shareToken: string | null;
  paymentLink: string | null;
  paidAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // cents
  amount: number; // cents
  sortOrder: number;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InvoiceSummary {
  totalOutstanding: number; // cents
  paidThisMonth: number; // cents
  invoicesThisMonth: number;
}

export interface GenerateInvoiceRequest {
  prompt: string;
  clientId?: string;
}

export interface UpdateInvoiceRequest {
  invoiceNumber?: string;
  status?: InvoiceStatus;
  clientId?: string;
  items?: Omit<InvoiceItem, 'id' | 'sortOrder'>[];
  taxRate?: number;
  invoiceDate?: string;
  dueDate?: string;
  notes?: string;
}

export interface CreateClientRequest {
  name: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  notes?: string;
}

export type UpdateClientRequest = Partial<CreateClientRequest>;

export interface PublicInvoice {
  invoiceNumber: string;
  status: InvoiceStatus;
  fromBusinessName: string | null;
  fromName: string;
  client: {
    id: string | null;
    name: string;
    email: string | null;
    address: string | null;
  } | null;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  notes: string | null;
  paymentLink: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  businessName: string | null;
  subscriptionTier: 'free' | 'pro' | 'team';
  invoiceCountThisMonth: number;
  invoiceLimitThisMonth: number | null;
  stripeConnected: boolean;
  createdAt: string;
}

export interface Subscription {
  tier: 'free' | 'pro' | 'team';
  invoicesUsedThisMonth: number;
  invoicesRemainingThisMonth: number | null;
  resetDate: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}
