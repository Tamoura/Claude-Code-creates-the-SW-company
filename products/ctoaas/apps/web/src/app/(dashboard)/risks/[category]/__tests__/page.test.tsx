import { render, screen, fireEvent } from "@testing-library/react";
import CategoryPage from "../page";

const mockUpdateStatus = jest.fn().mockResolvedValue(true);

jest.mock("@/hooks/useRisks", () => ({
  useRiskCategory: () => ({
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
        {
          id: "risk-2",
          category: "tech-debt",
          title: "Outdated React",
          description: "Using React 16",
          severity: 5,
          trend: "stable",
          status: "mitigated",
          affectedSystems: ["Frontend"],
          mitigations: ["Upgrade to React 18"],
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-14T00:00:00Z",
        },
      ],
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useRiskActions: () => ({
    updateStatus: mockUpdateStatus,
    isUpdating: false,
    error: null,
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useParams: () => ({ category: "tech-debt" }),
}));

describe("CategoryPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders category heading", () => {
    render(<CategoryPage />);
    expect(
      screen.getByRole("heading", { name: /tech debt/i })
    ).toBeInTheDocument();
  });

  it("renders risk items", () => {
    render(<CategoryPage />);
    expect(screen.getByText("Legacy Node.js version")).toBeInTheDocument();
    expect(screen.getByText("Outdated React")).toBeInTheDocument();
  });

  it("has back link to risk dashboard", () => {
    render(<CategoryPage />);
    const backLink = screen.getByRole("link", { name: /back to risk/i });
    expect(backLink).toHaveAttribute("href", "/risks");
  });

  it("renders status filter dropdown", () => {
    render(<CategoryPage />);
    expect(screen.getByRole("combobox", { name: /filter/i })).toBeInTheDocument();
  });

  it("renders category score", () => {
    render(<CategoryPage />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});
