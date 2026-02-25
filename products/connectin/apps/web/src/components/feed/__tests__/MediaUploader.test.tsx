import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediaUploader } from "../MediaUploader";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

const mockPost = jest.fn();

jest.mock("@/lib/api", () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

// Helper to create a mock file
function createFile(name: string, type: string): File {
  return new File(["content"], name, { type });
}

describe("MediaUploader", () => {
  const onUpload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the file attachment button", () => {
    render(<MediaUploader onUpload={onUpload} />);
    expect(screen.getByRole("button", { name: /attach/i })).toBeInTheDocument();
  });

  it("renders file input (hidden)", () => {
    render(<MediaUploader onUpload={onUpload} />);
    const input = screen.getByTestId("media-file-input");
    expect(input).toBeInTheDocument();
  });

  it("shows thumbnail preview after selecting an image", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { id: "media-1", url: "https://example.com/img.jpg" },
    });

    // Mock URL.createObjectURL
    URL.createObjectURL = jest.fn(() => "blob:mock-url");

    render(<MediaUploader onUpload={onUpload} />);
    const input = screen.getByTestId("media-file-input");
    const file = createFile("photo.jpg", "image/jpeg");
    await user.upload(input, file);

    // Preview image should appear
    await waitFor(() =>
      expect(screen.getByRole("img")).toBeInTheDocument()
    );
  });

  it("does not allow more than 4 images", async () => {
    render(
      <MediaUploader
        onUpload={onUpload}
        currentCount={4}
      />
    );
    expect(screen.getByRole("button", { name: /attach/i })).toBeDisabled();
  });

  it("calls onUpload after successful upload", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({
      success: true,
      data: { id: "media-1", url: "https://example.com/img.jpg" },
    });
    URL.createObjectURL = jest.fn(() => "blob:mock-url");

    render(<MediaUploader onUpload={onUpload} />);
    const input = screen.getByTestId("media-file-input");
    await user.upload(input, createFile("photo.jpg", "image/jpeg"));

    await waitFor(() =>
      expect(onUpload).toHaveBeenCalledWith(
        expect.objectContaining({ url: "https://example.com/img.jpg" })
      )
    );
  });
});
