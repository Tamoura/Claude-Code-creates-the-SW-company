import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config';
import { BadRequestError } from '../../lib/errors';
import { fuzzyMatchClient } from '../clients/service';

export const aiInvoiceOutputSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional().nullable(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().int().positive(),
    unitPrice: z.number().int().positive(),
    unitType: z.enum(['hours', 'days', 'items', 'flat']).default('hours'),
  })).min(1),
  taxRate: z.number().int().min(0).max(10000).default(0),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type AIInvoiceOutput = z.infer<typeof aiInvoiceOutputSchema>;

const SYSTEM_PROMPT = `You are an invoice data extraction assistant.
Parse the user's natural language description into structured invoice data.

Rules:
- Extract the client/company name
- Extract line items with description, quantity, and unit price
- ALL monetary amounts must be in CENTS (e.g., $125/hr = 12500)
- Tax rate must be in BASIS POINTS (e.g., 8.5% = 850, 10% = 1000)
- If no tax is mentioned, use 0
- If a due date is mentioned, return it as ISO date (YYYY-MM-DD)
- If no due date is mentioned, return null
- Extract any notes or special instructions
- Unit types: "hours" for hourly work, "days" for daily rates,
  "items" for physical items, "flat" for flat-fee services
- If the description is too vague to extract billable items,
  set items to an empty array
- Never generate $0 invoices - all items must have positive prices`;

const TOOL_SCHEMA = {
  name: 'create_invoice',
  description: 'Create a structured invoice from parsed data',
  input_schema: {
    type: 'object' as const,
    properties: {
      clientName: {
        type: 'string',
        description: 'Name of the client or company',
      },
      clientEmail: {
        type: ['string', 'null'],
        description: 'Client email if mentioned',
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            quantity: {
              type: 'integer',
              description: 'Number of units',
            },
            unitPrice: {
              type: 'integer',
              description: 'Price per unit in CENTS',
            },
            unitType: {
              type: 'string',
              enum: ['hours', 'days', 'items', 'flat'],
            },
          },
          required: ['description', 'quantity', 'unitPrice'],
        },
        description: 'Line items for the invoice',
      },
      taxRate: {
        type: 'integer',
        description: 'Tax rate in basis points (850 = 8.5%)',
      },
      dueDate: {
        type: ['string', 'null'],
        description: 'Due date as ISO string or null',
      },
      notes: {
        type: ['string', 'null'],
        description: 'Additional notes',
      },
    },
    required: ['clientName', 'items'],
  },
};

export interface GenerateInvoiceResult {
  clientName: string;
  clientEmail?: string | null;
  clientId?: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    unitType: string;
  }>;
  taxRate: number;
  dueDate: string;
  notes?: string | null;
}

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
  }
  return anthropicClient;
}

/**
 * Allow tests to replace the Anthropic client
 */
export function setAnthropicClient(client: Anthropic | null): void {
  anthropicClient = client;
}

export async function generateInvoice(
  prompt: string,
  userId: string,
  db: PrismaClient
): Promise<GenerateInvoiceResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [TOOL_SCHEMA],
    tool_choice: { type: 'tool', name: 'create_invoice' },
    messages: [{ role: 'user', content: prompt }],
  });

  // Extract tool use result
  const toolBlock = response.content.find(
    (block) => block.type === 'tool_use'
  );

  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new BadRequestError(
      'Could not parse invoice from the provided description'
    );
  }

  const parsed = aiInvoiceOutputSchema.safeParse(toolBlock.input);

  if (!parsed.success) {
    throw new BadRequestError(
      'Could not extract valid invoice data. '
      + 'Please provide clearer details about the client, '
      + 'services, and amounts.'
    );
  }

  const data = parsed.data;

  if (data.items.length === 0) {
    throw new BadRequestError(
      'No billable items could be extracted. '
      + 'Please describe the services or items to invoice.'
    );
  }

  // Check for $0 total
  const hasPositiveTotal = data.items.some(
    (item) => item.quantity * item.unitPrice > 0
  );
  if (!hasPositiveTotal) {
    throw new BadRequestError(
      'Invoice total cannot be $0. '
      + 'Please include valid quantities and prices.'
    );
  }

  // Fuzzy match client
  const matchedClient = await fuzzyMatchClient(
    db, userId, data.clientName
  );

  // Default due date: Net 30 from today
  let dueDate: string;
  if (data.dueDate) {
    dueDate = data.dueDate;
  } else {
    const now = new Date();
    now.setDate(now.getDate() + 30);
    dueDate = now.toISOString().split('T')[0];
  }

  return {
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    clientId: matchedClient?.id || null,
    items: data.items.map((item) => ({
      ...item,
      unitType: item.unitType || 'hours',
    })),
    taxRate: data.taxRate || 0,
    dueDate,
    notes: data.notes,
  };
}
