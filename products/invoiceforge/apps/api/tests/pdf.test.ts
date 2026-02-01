import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { setupTestDb, cleanDb, closeDb } from './setup';
import {
  setAnthropicClient,
} from '../src/modules/invoices/ai-service';
import { setPdfGenerator } from '../src/modules/invoices/handlers';

let app: FastifyInstance;

const validUser = {
  email: 'pdftest@example.com',
  password: 'SecurePass123!',
  name: 'PDF Test User',
};

// Minimal valid PDF bytes (PDF magic header + minimal structure)
const FAKE_PDF_BYTES = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF'
);

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

function createFakeAnthropicClient() {
  return {
    messages: {
      create: async () => ({
        content: [
          {
            type: 'tool_use',
            name: 'create_invoice',
            input: {
              clientName: 'PDF Client Inc',
              clientEmail: 'pdf@client.com',
              items: [
                {
                  description: 'Design Work',
                  quantity: 8,
                  unitPrice: 12500,
                  unitType: 'hours',
                },
                {
                  description: 'Development',
                  quantity: 20,
                  unitPrice: 15000,
                  unitType: 'hours',
                },
              ],
              taxRate: 850,
              dueDate: null,
              notes: 'Net 30 terms apply',
            },
          },
        ],
      }),
    },
  } as unknown;
}

function createFakePdfGenerator() {
  return {
    generatePDF: async (_data: any) => FAKE_PDF_BYTES,
    generateFilename: (invoiceNumber: string, clientName: string | null) => {
      const slug = clientName
        ? clientName.toLowerCase().replace(/\s+/g, '-')
        : 'invoice';
      return `${invoiceNumber}-${slug}.pdf`;
    },
  };
}

async function registerUser(application: FastifyInstance) {
  const res = await application.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: validUser,
  });
  const body = res.json();
  return { token: body.accessToken, userId: body.user.id };
}

async function createInvoice(
  application: FastifyInstance,
  token: string
) {
  const res = await application.inject({
    method: 'POST',
    url: '/api/invoices/generate',
    headers: authHeader(token),
    payload: {
      prompt: 'Invoice PDF Client Inc for design and development work',
    },
  });
  return res.json();
}

beforeAll(async () => {
  await setupTestDb();
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(async () => {
  setAnthropicClient(null);
  setPdfGenerator(null);
  await app.close();
  await closeDb();
});

describe('GET /api/invoices/:id/pdf', () => {
  let accessToken: string;

  beforeEach(async () => {
    await cleanDb();
    setAnthropicClient(createFakeAnthropicClient() as never);
    setPdfGenerator(createFakePdfGenerator());
    const auth = await registerUser(app);
    accessToken = auth.token;
  });

  it('should generate a PDF for an invoice', async () => {
    const invoice = await createInvoice(app, accessToken);

    const response = await app.inject({
      method: 'GET',
      url: `/api/invoices/${invoice.id}/pdf`,
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain(
      'attachment; filename='
    );
    expect(response.headers['content-disposition']).toContain(
      'INV-0001'
    );
    // PDF starts with %PDF magic bytes
    expect(response.rawPayload[0]).toBe(0x25); // %
    expect(response.rawPayload[1]).toBe(0x50); // P
    expect(response.rawPayload[2]).toBe(0x44); // D
    expect(response.rawPayload[3]).toBe(0x46); // F
  });

  it('should return 404 for non-existent invoice', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await app.inject({
      method: 'GET',
      url: `/api/invoices/${fakeId}/pdf`,
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(404);
  });

  it('should require authentication', async () => {
    const invoice = await createInvoice(app, accessToken);

    const response = await app.inject({
      method: 'GET',
      url: `/api/invoices/${invoice.id}/pdf`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should include correct filename with slugified client name', async () => {
    const invoice = await createInvoice(app, accessToken);

    const response = await app.inject({
      method: 'GET',
      url: `/api/invoices/${invoice.id}/pdf`,
      headers: authHeader(accessToken),
    });

    const disposition = response.headers['content-disposition'] as string;
    expect(disposition).toContain('pdf-client-inc');
  });
});
