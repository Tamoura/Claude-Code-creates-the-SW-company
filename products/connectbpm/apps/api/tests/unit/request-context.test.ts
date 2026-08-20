import { resolveRequestId } from '../../src/plugins/request-context';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('correlation id', () => {
  it('accepts a caller-supplied id', () => {
    expect(resolveRequestId({ headers: { 'x-request-id': 'abc-123' } })).toBe(
      'abc-123'
    );
  });

  it('mints one when the header is absent', () => {
    expect(resolveRequestId({ headers: {} })).toMatch(UUID);
  });

  it('mints one when the header is blank', () => {
    expect(resolveRequestId({ headers: { 'x-request-id': '   ' } })).toMatch(UUID);
  });

  it('refuses an unbounded caller-controlled id', () => {
    // It lands on every log line; an attacker must not control its size.
    const huge = 'x'.repeat(5000);
    expect(resolveRequestId({ headers: { 'x-request-id': huge } })).toMatch(UUID);
  });

  it('ignores a non-string header value', () => {
    expect(resolveRequestId({ headers: { 'x-request-id': ['a', 'b'] } })).toMatch(
      UUID
    );
  });
});
