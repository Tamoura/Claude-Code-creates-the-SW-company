import { renderHook, act, waitFor } from "@testing-library/react";
import { useJobs } from "../useJobs";
import { apiClient } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockJobsResponse = {
  success: true,
  data: [
    {
      id: "job-1",
      title: "Dev",
      company: "Acme",
      workType: "REMOTE",
      experienceLevel: "MID",
      description: "D",
      language: "en",
      status: "OPEN",
      applicantCount: 0,
      createdAt: "2026-01-01",
      isApplied: false,
      isSaved: false,
    },
  ],
  meta: { cursor: null, hasMore: false, count: 1 },
};

describe("useJobs - easyApply", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockResolvedValue(mockJobsResponse);
  });

  it("easyApplyToJob calls POST /jobs/:id/easy-apply", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: "app-1", appliedAt: "2026-01-01" },
    });
    const { result } = renderHook(() => useJobs());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.easyApplyToJob("job-1");
    });
    expect(apiClient.post).toHaveBeenCalledWith("/jobs/job-1/easy-apply", {});
  });

  it("marks job as applied after successful easy apply", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: "app-1", appliedAt: "2026-01-01" },
    });
    const { result } = renderHook(() => useJobs());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.easyApplyToJob("job-1");
    });
    expect(result.current.jobs[0].isApplied).toBe(true);
  });

  it("throws on easy apply failure", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: false,
      error: { code: "ERR", message: "Profile incomplete" },
    });
    const { result } = renderHook(() => useJobs());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(
      act(async () => {
        await result.current.easyApplyToJob("job-1");
      })
    ).rejects.toThrow("Profile incomplete");
  });
});
