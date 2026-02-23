import { renderHook, act, waitFor } from "@testing-library/react";
import { useJobs } from "../useJobs";

// Mock the API client
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

const makeJob = (overrides: Record<string, unknown> = {}) => ({
  id: "job-1",
  title: "Frontend Engineer",
  company: "Acme Corp",
  location: "Dubai, UAE",
  workType: "REMOTE" as const,
  experienceLevel: "MID" as const,
  description: "Build amazing things",
  requirements: "React, TypeScript",
  salaryMin: 8000,
  salaryMax: 12000,
  salaryCurrency: "USD",
  language: "en",
  status: "OPEN" as const,
  applicantCount: 5,
  createdAt: new Date().toISOString(),
  isApplied: false,
  isSaved: false,
  ...overrides,
});

const job1 = makeJob({ id: "job-1", title: "Frontend Engineer" });
const job2 = makeJob({ id: "job-2", title: "Backend Engineer", workType: "ONSITE" as const });

describe("useJobs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with empty jobs array", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [job1],
        meta: { cursor: null, hasMore: false, count: 1 },
      });

      const { result } = renderHook(() => useJobs());
      expect(result.current.jobs).toEqual([]);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("starts with isLoading true while fetching", () => {
      let resolve!: (v: unknown) => void;
      mockGet.mockReturnValueOnce(new Promise((r) => (resolve = r)));

      const { result } = renderHook(() => useJobs());
      expect(result.current.isLoading).toBe(true);

      act(() => {
        resolve({
          success: true,
          data: [],
          meta: { cursor: null, hasMore: false, count: 0 },
        });
      });
    });

    it("starts with hasMore false", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [],
        meta: { cursor: null, hasMore: false, count: 0 },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.hasMore).toBe(false);
    });

    it("starts with null error", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [],
        meta: { cursor: null, hasMore: false, count: 0 },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBeNull();
    });

    it("starts with default empty filters", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [],
        meta: { cursor: null, hasMore: false, count: 0 },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.filters).toEqual({
        q: "",
        location: "",
        workType: "",
        experienceLevel: "",
      });
    });
  });

  describe("fetching jobs", () => {
    it("calls /jobs on mount", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [job1],
        meta: { cursor: null, hasMore: false, count: 1 },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockGet).toHaveBeenCalledWith(
        "/jobs",
        expect.objectContaining({ params: expect.any(Object) })
      );
    });

    it("sets jobs on successful fetch", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [job1, job2],
        meta: { cursor: null, hasMore: false, count: 2 },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.jobs).toHaveLength(2);
      expect(result.current.jobs[0].id).toBe("job-1");
    });

    it("sets hasMore from meta response", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [job1],
        meta: { cursor: "cursor-1", hasMore: true, count: 1 },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.hasMore).toBe(true);
    });

    it("sets error on API failure", async () => {
      mockGet.mockResolvedValueOnce({
        success: false,
        error: { code: "SERVER_ERROR", message: "Something went wrong" },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe("Something went wrong");
      expect(result.current.jobs).toEqual([]);
    });

    it("sets error on network failure", async () => {
      mockGet.mockRejectedValueOnce(new Error("Network down"));

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe("Network error. Please try again.");
    });
  });

  describe("setFilter", () => {
    it("updates filter value", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: [],
        meta: { cursor: null, hasMore: false, count: 0 },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.setFilter("q", "React developer");
      });

      expect(result.current.filters.q).toBe("React developer");
    });

    it("resets cursor and refetches when filter changes", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: [],
        meta: { cursor: null, hasMore: false, count: 0 },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const callsBefore = mockGet.mock.calls.length;

      await act(async () => {
        result.current.setFilter("workType", "REMOTE");
      });

      await waitFor(() => expect(mockGet.mock.calls.length).toBeGreaterThan(callsBefore));
    });

    it("passes filter values as query params to /jobs", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: [],
        meta: { cursor: null, hasMore: false, count: 0 },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        result.current.setFilter("workType", "REMOTE");
      });

      await waitFor(() => {
        const lastCall = mockGet.mock.calls[mockGet.mock.calls.length - 1];
        expect(lastCall[1].params.workType).toBe("REMOTE");
      });
    });
  });

  describe("loadMore", () => {
    it("appends jobs when loadMore is called", async () => {
      mockGet
        .mockResolvedValueOnce({
          success: true,
          data: [job1],
          meta: { cursor: "cursor-1", hasMore: true, count: 1 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: [job2],
          meta: { cursor: null, hasMore: false, count: 1 },
        });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.jobs).toHaveLength(1);

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.jobs).toHaveLength(2);
      expect(result.current.jobs[1].id).toBe("job-2");
    });

    it("does not load more when hasMore is false", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [job1],
        meta: { cursor: null, hasMore: false, count: 1 },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it("sets isLoadingMore during loadMore", async () => {
      let resolveSecond!: (v: unknown) => void;
      mockGet
        .mockResolvedValueOnce({
          success: true,
          data: [job1],
          meta: { cursor: "cursor-1", hasMore: true, count: 1 },
        })
        .mockReturnValueOnce(new Promise((r) => (resolveSecond = r)));

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.loadMore();
      });

      expect(result.current.isLoadingMore).toBe(true);

      act(() => {
        resolveSecond({
          success: true,
          data: [job2],
          meta: { cursor: null, hasMore: false, count: 1 },
        });
      });

      await waitFor(() => expect(result.current.isLoadingMore).toBe(false));
    });
  });

  describe("saveJob / unsaveJob", () => {
    it("optimistically sets isSaved to true when saving", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [job1],
        meta: { cursor: null, hasMore: false, count: 1 },
      });
      mockPost.mockResolvedValueOnce({ success: true, data: {} });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.saveJob("job-1");
      });

      expect(result.current.jobs[0].isSaved).toBe(true);
    });

    it("optimistically sets isSaved to false when unsaving", async () => {
      const savedJob = makeJob({ id: "job-1", isSaved: true });
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [savedJob],
        meta: { cursor: null, hasMore: false, count: 1 },
      });
      mockDelete.mockResolvedValueOnce({ success: true, data: {} });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.unsaveJob("job-1");
      });

      expect(result.current.jobs[0].isSaved).toBe(false);
    });

    it("calls POST /jobs/:id/save when saving", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [job1],
        meta: { cursor: null, hasMore: false, count: 1 },
      });
      mockPost.mockResolvedValueOnce({ success: true, data: {} });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.saveJob("job-1");
      });

      expect(mockPost).toHaveBeenCalledWith("/jobs/job-1/save");
    });

    it("calls DELETE /jobs/:id/save when unsaving", async () => {
      const savedJob = makeJob({ id: "job-1", isSaved: true });
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [savedJob],
        meta: { cursor: null, hasMore: false, count: 1 },
      });
      mockDelete.mockResolvedValueOnce({ success: true, data: {} });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.unsaveJob("job-1");
      });

      expect(mockDelete).toHaveBeenCalledWith("/jobs/job-1/save");
    });

    it("reverts isSaved optimistic update when save API fails", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [job1],
        meta: { cursor: null, hasMore: false, count: 1 },
      });
      mockPost.mockResolvedValueOnce({
        success: false,
        error: { code: "ERROR", message: "Failed" },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.saveJob("job-1");
      });

      expect(result.current.jobs[0].isSaved).toBe(false);
    });
  });

  describe("applyToJob", () => {
    it("sets isApplied on the job after successful application", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [job1],
        meta: { cursor: null, hasMore: false, count: 1 },
      });
      mockPost.mockResolvedValueOnce({
        success: true,
        data: { applicationId: "app-1", appliedAt: new Date().toISOString() },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.applyToJob("job-1");
      });

      expect(result.current.jobs[0].isApplied).toBe(true);
    });

    it("returns application id on success", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [job1],
        meta: { cursor: null, hasMore: false, count: 1 },
      });
      mockPost.mockResolvedValueOnce({
        success: true,
        data: { id: "app-42", appliedAt: new Date().toISOString() },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let applicationId: string | undefined;
      await act(async () => {
        applicationId = await result.current.applyToJob("job-1");
      });

      expect(applicationId).toBe("app-42");
    });

    it("calls POST /jobs/:id/apply with coverNote when provided", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [job1],
        meta: { cursor: null, hasMore: false, count: 1 },
      });
      mockPost.mockResolvedValueOnce({
        success: true,
        data: { applicationId: "app-1", appliedAt: new Date().toISOString() },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.applyToJob("job-1", "I am very interested.");
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/jobs/job-1/apply",
        expect.objectContaining({ coverNote: "I am very interested." })
      );
    });

    it("throws and does not set isApplied when API fails", async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: [job1],
        meta: { cursor: null, hasMore: false, count: 1 },
      });
      mockPost.mockResolvedValueOnce({
        success: false,
        error: { code: "ERROR", message: "Failed to apply" },
      });

      const { result } = renderHook(() => useJobs());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.applyToJob("job-1");
        })
      ).rejects.toThrow("Failed to apply");

      expect(result.current.jobs[0].isApplied).toBe(false);
    });
  });
});
