import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RisksPage from "../page";

const mockGenerateRisks = jest.fn();
const mockSummaryData = {
  categories: [
    { category: "tech-debt", score: 7, trend: "up", activeCount: 5 },
    { category: "vendor", score: 4, trend: "stable", activeCount: 2 },
    { category: "compliance", score: 8, trend: "up", activeCount: 3 },
    { category: "operational", score: 2, trend: "down", activeCount: 1 },
  ],
  lastGeneratedAt: "2026-03-14T00:00:00Z",
};

jest.mock("@/hooks/useRisks", () => ({
  useRiskSummary: () => ({
    data: mockSummaryData,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useRiskActions: () => ({
    generateRisks: mockGenerateRisks,
    isGenerating: false,
    error: null,
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe("RisksPage", () => {
  it("renders the page heading", () => {
    render(<RisksPage />);
    expect(
      screen.getByRole("heading", { name: /risk dashboard/i })
    ).toBeInTheDocument();
  });

  it("renders 4 category cards", () => {
    render(<RisksPage />);
    expect(screen.getByText("Tech Debt")).toBeInTheDocument();
    expect(screen.getByText("Vendor")).toBeInTheDocument();
    expect(screen.getByText("Compliance")).toBeInTheDocument();
    expect(screen.getByText("Operational")).toBeInTheDocument();
  });

  it("renders generate risks button", () => {
    render(<RisksPage />);
    expect(
      screen.getByRole("button", { name: /generate risks/i })
    ).toBeInTheDocument();
  });

  it("calls generateRisks when button clicked", () => {
    render(<RisksPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /generate risks/i })
    );
    expect(mockGenerateRisks).toHaveBeenCalled();
  });

  it("shows category links", () => {
    render(<RisksPage />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/risks/tech-debt");
    expect(hrefs).toContain("/risks/vendor");
    expect(hrefs).toContain("/risks/compliance");
    expect(hrefs).toContain("/risks/operational");
  });
});
