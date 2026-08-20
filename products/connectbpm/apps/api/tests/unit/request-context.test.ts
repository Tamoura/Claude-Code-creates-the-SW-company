import { resolveRequestId } from '../../src/plugins/request-context';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('[NFR-017] correlation id — on every log line and every response', () => {
  it('[NFR-017] accepts a caller-supplied id', () => {
    expect(resolveRequestId({ headers: { 'x-request-id': 'abc-123' } })).toBe(
      'abc-123'
    );
  });

  it('[NFR-017] mints one when the header is absent', () => {
    expect(resolveRequestId({ headers: {} })).toMatch(UUID);
  });

  it('[NFR-017] mints one when the header is blank', () => {
    expect(resolveRequestId({ headers: { 'x-request-id': '   ' } })).toMatch(UUID);
  });

  it('[NFR-008] refuses an unbounded caller-controlled id', () => {
    // It lands on every log line; an attacker must not control its size.
    const huge = 'x'.repeat(5000);
    expect(resolveRequestId({ headers: { 'x-request-id': huge } })).toMatch(UUID);
  });

  it('[NFR-008] ignores a non-string header value', () => {
    expect(resolveRequestId({ headers: { 'x-request-id': ['a', 'b'] } })).toMatch(
      UUID
    );
  });
});
