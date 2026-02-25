import { renderHook, act, waitFor } from "@testing-library/react";
import { useMediaUpload } from "../useMediaUpload";

const mockPost = jest.fn();

jest.mock("@/lib/api", () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

function createFile(name: string, type: string): File {
  return new File(["content"], name, { type });
}

describe("useMediaUpload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts with empty uploads", () => {
    const { result } = renderHook(() => useMediaUpload());
    expect(result.current.uploads).toEqual([]);
  });

  it("starts with isUploading false", () => {
    const { result } = renderHook(() => useMediaUpload());
    expect(result.current.isUploading).toBe(false);
  });

  it("adds upload entry on upload call", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { id: "media-1", url: "https://example.com/img.jpg" },
    });
    const { result } = renderHook(() => useMediaUpload());

    await act(async () => {
      await result.current.upload(createFile("photo.jpg", "image/jpeg"));
    });

    expect(result.current.uploads).toHaveLength(1);
  });

  it("sets upload url from response", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { id: "media-1", url: "https://example.com/img.jpg" },
    });
    const { result } = renderHook(() => useMediaUpload());

    await act(async () => {
      await result.current.upload(createFile("photo.jpg", "image/jpeg"));
    });

    expect(result.current.uploads[0].url).toBe("https://example.com/img.jpg");
  });

  it("removes upload by index", async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { id: "media-1", url: "https://example.com/img1.jpg" },
    });
    const { result } = renderHook(() => useMediaUpload());

    await act(async () => {
      await result.current.upload(createFile("photo.jpg", "image/jpeg"));
    });

    act(() => {
      result.current.removeUpload(0);
    });

    expect(result.current.uploads).toHaveLength(0);
  });

  it("sets error when upload fails", async () => {
    mockPost.mockResolvedValueOnce({
      success: false,
      error: { code: "UPLOAD_FAILED", message: "Upload failed" },
    });
    const { result } = renderHook(() => useMediaUpload());

    await act(async () => {
      await result.current.upload(createFile("photo.jpg", "image/jpeg"));
    });

    expect(result.current.error).toBe("Upload failed");
  });
});
