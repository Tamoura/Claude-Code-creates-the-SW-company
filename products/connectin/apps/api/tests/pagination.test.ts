import { decodeCursor, encodeCursor } from '../src/lib/pagination';
import { BadRequestError } from '../src/lib/errors';

describe('Cursor Pagination (RISK-018)', () => {
  it('decodes a valid cursor', () => {
    const date = new Date('2025-01-01T00:00:00.000Z');
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const cursor = encodeCursor(date, id);

    const result = decodeCursor(cursor);
    expect(result).not.toBeNull();
    expect(result!.createdAt.toISOString()).toBe(
      date.toISOString()
    );
    expect(result!.id).toBe(id);
  });

  it('returns null for empty/absent cursor', () => {
    expect(decodeCursor('')).toBeNull();
  });

  it('throws BadRequestError for garbled base64', () => {
    expect(() => decodeCursor('not-valid-base64!!!')).toThrow(
      BadRequestError
    );
  });

  it('throws BadRequestError for invalid date in cursor', () => {
    const cursor = Buffer.from(
      JSON.stringify({ createdAt: 'not-a-date', id: '550e8400-e29b-41d4-a716-446655440000' })
    ).toString('base64');

    expect(() => decodeCursor(cursor)).toThrow(BadRequestError);
  });

  it('throws BadRequestError for non-UUID id in cursor', () => {
    const cursor = Buffer.from(
      JSON.stringify({
        createdAt: new Date().toISOString(),
        id: 'not-a-uuid',
      })
    ).toString('base64');

    expect(() => decodeCursor(cursor)).toThrow(BadRequestError);
  });
});
