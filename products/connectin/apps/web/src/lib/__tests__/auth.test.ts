import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  isAuthenticated,
  parseJwtPayload,
} from "../auth";

describe("auth token management", () => {
  beforeEach(() => {
    clearAccessToken();
  });

  it("returns null when no token is set", () => {
    expect(getAccessToken()).toBeNull();
  });

  it("stores and retrieves token", () => {
    setAccessToken("test-token-123");
    expect(getAccessToken()).toBe("test-token-123");
  });

  it("clears token", () => {
    setAccessToken("test-token-123");
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
  });

  it("isAuthenticated returns false when no token", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("isAuthenticated returns true when token exists", () => {
    setAccessToken("test-token-123");
    expect(isAuthenticated()).toBe(true);
  });
});

describe("parseJwtPayload", () => {
  it("parses a valid JWT payload", () => {
    // Create a simple JWT with known payload
    const payload = { sub: "user-1", email: "test@example.com", iat: 1234567890 };
    const encoded = btoa(JSON.stringify(payload));
    const token = `header.${encoded}.signature`;

    const result = parseJwtPayload(token);
    expect(result).toEqual(payload);
  });

  it("returns null for invalid token", () => {
    expect(parseJwtPayload("not-a-jwt")).toBeNull();
  });

  it("returns null for malformed base64", () => {
    expect(parseJwtPayload("header.!!!invalid!!!.signature")).toBeNull();
  });
});
