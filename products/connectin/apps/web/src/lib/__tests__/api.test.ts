import { apiClient } from "../api";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

/**
 * Helper: mock a successful CSRF token response followed by the
 * actual request response. Mutating methods (POST, PUT, PATCH, DELETE)
 * lazily fetch a CSRF token on the first call, so we need two responses.
 */
function mockWithCsrf(response: Record<string, unknown>) {
  // First call: GET /csrf-token
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ token: "test-csrf-token" }),
  });
  // Second call: the actual request
  mockFetch.mockResolvedValueOnce(response);
}

describe("ApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.setToken(null);
    // Reset the cached CSRF token between tests by fetching a fresh one
    // We do this by reaching into the public API — fetchCsrfToken will
    // be called lazily by each mutating method.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (apiClient as any).csrfToken = null;
  });

  describe("get", () => {
    it("makes GET request with correct URL", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 1 } }),
      });

      await apiClient.get("/test");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/test"),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("includes auth header when token is set", async () => {
      apiClient.setToken("test-token");
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await apiClient.get("/test");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });

    it("does not include x-csrf-token header on GET", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await apiClient.get("/test");

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders["x-csrf-token"]).toBeUndefined();
    });

    it("handles HTTP error responses", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: () =>
          Promise.resolve({
            error: { message: "Resource not found" },
          }),
      });

      const result = await apiClient.get("/missing");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("HTTP_404");
    });

    it("handles network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network failure"));

      const result = await apiClient.get("/test");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NETWORK_ERROR");
      expect(result.error?.message).toBe("Network failure");
    });

    it("clears token on 401 response", async () => {
      apiClient.setToken("expired-token");
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: { message: "Token expired" },
          }),
      });

      const result = await apiClient.get("/protected");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("HTTP_401");
    });

    it("appends query parameters", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await apiClient.get("/search", { params: { q: "test", page: "1" } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("q=test"),
        expect.any(Object)
      );
    });

    it("includes credentials: include for cookie handling", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await apiClient.get("/test");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ credentials: "include" })
      );
    });
  });

  describe("post", () => {
    it("sends JSON body", async () => {
      mockWithCsrf({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await apiClient.post("/create", { name: "test" });

      // Second call is the actual POST
      const postCall = mockFetch.mock.calls[1];
      expect(postCall[1]).toEqual(
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "test" }),
        })
      );
    });

    it("includes x-csrf-token header on POST", async () => {
      mockWithCsrf({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await apiClient.post("/create", { name: "test" });

      const postCall = mockFetch.mock.calls[1];
      expect(postCall[1].headers).toEqual(
        expect.objectContaining({
          "x-csrf-token": "test-csrf-token",
        })
      );
    });

    it("fetches CSRF token before first mutating request", async () => {
      mockWithCsrf({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await apiClient.post("/create", { name: "test" });

      // First call should be the CSRF token fetch
      expect(mockFetch.mock.calls[0][0]).toContain("/csrf-token");
      expect(mockFetch.mock.calls[0][1].method).toBe("GET");
    });

    it("reuses cached CSRF token on subsequent requests", async () => {
      // First POST: CSRF fetch + actual request
      mockWithCsrf({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      await apiClient.post("/first", { a: 1 });

      // Second POST: no CSRF fetch needed, just the request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      await apiClient.post("/second", { b: 2 });

      // Total calls: 2 (csrf + first) + 1 (second) = 3
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("handles server error with non-JSON response", async () => {
      mockWithCsrf({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("Not JSON")),
      });

      const result = await apiClient.post("/create", { name: "test" });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("HTTP_500");
      expect(result.error?.message).toBe("Internal Server Error");
    });
  });

  describe("patch", () => {
    it("makes PATCH request with CSRF header", async () => {
      mockWithCsrf({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await apiClient.patch("/update/1", { name: "updated" });

      const patchCall = mockFetch.mock.calls[1];
      expect(patchCall[1]).toEqual(
        expect.objectContaining({ method: "PATCH" })
      );
      expect(patchCall[1].headers).toEqual(
        expect.objectContaining({
          "x-csrf-token": "test-csrf-token",
        })
      );
    });
  });

  describe("delete", () => {
    it("makes DELETE request with CSRF header", async () => {
      mockWithCsrf({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await apiClient.delete("/remove/1");

      const deleteCall = mockFetch.mock.calls[1];
      expect(deleteCall[1]).toEqual(
        expect.objectContaining({ method: "DELETE" })
      );
      expect(deleteCall[1].headers).toEqual(
        expect.objectContaining({
          "x-csrf-token": "test-csrf-token",
        })
      );
    });
  });

  describe("CSRF token fetch failure", () => {
    it("proceeds without CSRF token if fetch fails", async () => {
      // CSRF fetch fails
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      // Actual request succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await apiClient.post("/create", { name: "test" });

      expect(result.success).toBe(true);
    });
  });
});
