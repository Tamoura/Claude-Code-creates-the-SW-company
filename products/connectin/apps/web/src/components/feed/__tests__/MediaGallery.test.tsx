import React from "react";
import { render, screen } from "@testing-library/react";
import { MediaGallery } from "../MediaGallery";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

const singleImage = [
  { url: "https://example.com/img1.jpg", alt: "Image 1", width: 800, height: 600 },
];

const twoImages = [
  { url: "https://example.com/img1.jpg", alt: "Image 1", width: 800, height: 600 },
  { url: "https://example.com/img2.jpg", alt: "Image 2", width: 800, height: 600 },
];

const fourImages = [
  { url: "https://example.com/img1.jpg", alt: "Image 1", width: 800, height: 600 },
  { url: "https://example.com/img2.jpg", alt: "Image 2", width: 800, height: 600 },
  { url: "https://example.com/img3.jpg", alt: "Image 3", width: 800, height: 600 },
  { url: "https://example.com/img4.jpg", alt: "Image 4", width: 800, height: 600 },
];

describe("MediaGallery", () => {
  it("renders single image at full width", () => {
    render(<MediaGallery images={singleImage} />);
    expect(screen.getByRole("img", { name: "Image 1" })).toBeInTheDocument();
  });

  it("renders two images side by side", () => {
    render(<MediaGallery images={twoImages} />);
    expect(screen.getByRole("img", { name: "Image 1" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Image 2" })).toBeInTheDocument();
  });

  it("renders grid for 3+ images", () => {
    render(<MediaGallery images={fourImages} />);
    expect(screen.getAllByRole("img").length).toBeGreaterThanOrEqual(2);
  });

  it("shows +N overlay when more than 4 images are provided", () => {
    const fiveImages = [
      ...fourImages,
      { url: "https://example.com/img5.jpg", alt: "Image 5", width: 800, height: 600 },
    ];
    render(<MediaGallery images={fiveImages} />);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("returns null when images array is empty", () => {
    const { container } = render(<MediaGallery images={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
