import { render, screen } from "@testing-library/react";
import DashboardPage from "../page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/useConversations", () => ({
  useConversations: () => ({
    conversations: [
      {
        id: "conv-1",
        title: "Architecture Review",
        createdAt: "2026-03-14T10:00:00Z",
        updatedAt: "2026-03-14T10:30:00Z",
        messageCount: 5,
      },
      {
        id: "conv-2",
        title: "Team Scaling",
        createdAt: "2026-03-13T09:00:00Z",
        updatedAt: "2026-03-13T09:45:00Z",
        messageCount: 8,
      },
    ],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/useRisks", () => ({
  useRiskSummary: () => ({
    data: {
      categories: [
        { category: "tech-debt", score: 7, trend: "up", activeCount: 5 },
        { category: "vendor", score: 4, trend: "stable", activeCount: 2 },
        { category: "compliance", score: 8, trend: "up", activeCount: 3 },
        {
          category: "operational",
          score: 2,
          trend: "down",
          activeCount: 1,
        },
      ],
      lastGeneratedAt: "2026-03-14T00:00:00Z",
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

describe("DashboardPage", () => {
  it("renders welcome section", () => {
    render(<DashboardPage />);
    expect(
      screen.getByRole("heading", { name: /welcome/i })
    ).toBeInTheDocument();
  });

  it("renders recent conversations card", () => {
    render(<DashboardPage />);
    expect(screen.getByText(/recent conversations/i)).toBeInTheDocument();
    expect(screen.getByText("Architecture Review")).toBeInTheDocument();
    expect(screen.getByText("Team Scaling")).toBeInTheDocument();
  });

  it("renders risk posture card with colored indicators", () => {
    render(<DashboardPage />);
    expect(screen.getByText(/risk posture/i)).toBeInTheDocument();
  });

  it("renders quick actions card with 4 action buttons", () => {
    render(<DashboardPage />);
    expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new chat/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view risks/i })
    ).toBeInTheDocument();
  });

  it("renders profile completeness card with progress bar", () => {
    render(<DashboardPage />);
    expect(screen.getByText(/profile completeness/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("has links to relevant pages", () => {
    render(<DashboardPage />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/chat");
    expect(hrefs).toContain("/risks");
  });
});
