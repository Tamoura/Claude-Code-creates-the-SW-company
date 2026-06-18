import { renderHook, act, waitFor } from "@testing-library/react";
import { useRiskSummary, useRiskCategory, useRiskActions } from "../useRisks";
import { apiClient } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApiGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockApiPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

const mockSummary = {
  success: true,
  data: {
    categories: [
      { category: "tech-debt", score: 7, trend: "up", activeCount: 5 },
      { category: "vendor", score: 4, trend: "stable", activeCount: 2 },
      { category: "compliance", score: 8, trend: "up", activeCount: 3 },
      { category: "operational", score: 2, trend: "down", activeCount: 1 },
    ],
    lastGeneratedAt: "2026-03-14T00:00:00Z",
  },
};

const mockCategoryDetail = {
  success: true,
  data: {
    category: "tech-debt",
    score: 7,
    trend: "up",
    items: [
      {
        id: "risk-1",
        category: "tech-debt",
        title: "Legacy Node.js version",
        description: "Running Node 14 which is EOL",
        severity: 8,
        trend: "up",
        status: "active",
        affectedSystems: ["API Gateway"],
        mitigations: ["Upgrade to Node 20"],
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-14T00:00:00Z",
      },
    ],
  },
};

describe("useRiskSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches risk summary on mount", async () => {
    mockApiGet.mockResolvedValueOnce(mockSummary);
    const { result } = renderHook(() => useRiskSummary());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiGet).toHaveBeenCalledWith("/risks");
    expect(result.current.data?.categories).toHaveLength(4);
    expect(result.current.error).toBeNull();
  });

  it("sets error on API failure", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: false,
      error: { code: "HTTP_500", message: "Server error" },
    });
    const { result } = renderHook(() => useRiskSummary());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("Server error");
    expect(result.current.data).toBeNull();
  });
});

describe("useRiskCategory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches category detail on mount", async () => {
    mockApiGet.mockResolvedValueOnce(mockCategoryDetail);
    const { result } = renderHook(() => useRiskCategory("tech-debt"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockApiGet).toHaveBeenCalledWith("/risks/tech-debt");
    expect(result.current.data?.items).toHaveLength(1);
  });
});

describe("useRiskActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("generates risks from profile", async () => {
    mockApiPost.mockResolvedValueOnce({ success: true, data: {} });
    const { result } = renderHook(() => useRiskActions());

    await act(async () => {
      await result.current.generateRisks();
    });

    expect(mockApiPost).toHaveBeenCalledWith("/risks/generate");
    expect(result.current.isGenerating).toBe(false);
  });
});
