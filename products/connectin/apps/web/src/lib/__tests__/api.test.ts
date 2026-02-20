import { apiClient } from "../api";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("ApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.setToken(null);
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
  });

  describe("post", () => {
    it("sends JSON body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await apiClient.post("/create", { name: "test" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "test" }),
        })
      );
    });

    it("handles server error with non-JSON response", async () => {
      mockFetch.mockResolvedValue({
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
    it("makes PATCH request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await apiClient.patch("/update/1", { name: "updated" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  describe("delete", () => {
    it("makes DELETE request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await apiClient.delete("/remove/1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });
});
