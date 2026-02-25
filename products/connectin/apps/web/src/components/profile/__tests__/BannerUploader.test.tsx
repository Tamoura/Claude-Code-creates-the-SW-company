import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BannerUploader } from "../BannerUploader";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

const mockPut = jest.fn();

jest.mock("@/lib/api", () => ({
  apiClient: {
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

describe("BannerUploader", () => {
  const onBannerUpdated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    URL.createObjectURL = jest.fn(() => "blob:mock-banner");
  });

  it("renders the edit banner button", () => {
    render(<BannerUploader onBannerUpdated={onBannerUpdated} />);
    expect(screen.getByRole("button", { name: /edit banner/i })).toBeInTheDocument();
  });

  it("shows current banner image when bannerUrl provided", () => {
    render(
      <BannerUploader
        bannerUrl="https://example.com/banner.jpg"
        onBannerUpdated={onBannerUpdated}
      />
    );
    expect(
      screen.getByRole("img", { name: /profile banner/i })
    ).toBeInTheDocument();
  });

  it("shows gradient placeholder when no bannerUrl", () => {
    const { container } = render(<BannerUploader onBannerUpdated={onBannerUpdated} />);
    const banner = container.querySelector(".bg-gradient-to-r");
    expect(banner).toBeInTheDocument();
  });

  it("renders hidden file input", () => {
    render(<BannerUploader onBannerUpdated={onBannerUpdated} />);
    expect(screen.getByTestId("banner-file-input")).toBeInTheDocument();
  });

  it("calls onBannerUpdated after successful upload", async () => {
    const user = userEvent.setup();
    mockPut.mockResolvedValueOnce({
      success: true,
      data: { bannerUrl: "https://example.com/new-banner.jpg" },
    });
    render(<BannerUploader onBannerUpdated={onBannerUpdated} />);
    const input = screen.getByTestId("banner-file-input");
    await user.upload(
      input,
      new File(["content"], "banner.jpg", { type: "image/jpeg" })
    );
    await waitFor(() => expect(onBannerUpdated).toHaveBeenCalled());
  });
});
