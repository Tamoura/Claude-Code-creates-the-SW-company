import type { FastifyReply } from 'fastify';
import { sendOk, sendError } from '../../../src/lib/response';

function fakeReply(): FastifyReply & { sent: unknown; code: number } {
  const reply = {
    code: 0,
    sent: undefined as unknown,
    status(statusCode: number) {
      reply.code = statusCode;
      return reply;
    },
    send(body: unknown) {
      reply.sent = body;
      return reply;
    },
  };
  return reply as unknown as FastifyReply & { sent: unknown; code: number };
}

describe('response envelope', () => {
  it('sendOk defaults to 200 and passes the payload through', () => {
    const reply = fakeReply();
    sendOk(reply, { id: 'abc' });
    expect(reply.code).toBe(200);
    expect(reply.sent).toEqual({ id: 'abc' });
  });

  it('sendOk honours an explicit status', () => {
    const reply = fakeReply();
    sendOk(reply, { id: 'abc' }, 201);
    expect(reply.code).toBe(201);
  });

  it('sendError always nests under `error`', () => {
    const reply = fakeReply();
    sendError(reply, {
      status: 404,
      code: 'NOT_FOUND',
      message: 'Resource not found',
      requestId: 'req-9',
    });
    expect(reply.code).toBe(404);
    expect(reply.sent).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        details: undefined,
        requestId: 'req-9',
      },
    });
  });

  it('sendError carries field-level details', () => {
    const reply = fakeReply();
    sendError(reply, {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'name', message: 'required' }],
    });
    expect(reply.sent).toMatchObject({
      error: { details: [{ field: 'name', message: 'required' }] },
    });
  });
});
