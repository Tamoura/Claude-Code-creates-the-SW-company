import { render, screen } from "@testing-library/react";
import AdrDetailPage from "../page";

const mockAdr = {
  id: "adr-1",
  title: "Use PostgreSQL for primary datastore",
  status: "accepted" as const,
  context: "We need a relational database with strong ACID compliance.",
  decision: "Use PostgreSQL 15+ as the primary data store.",
  consequences: "Need to manage migrations and backups.",
  alternatives: "MySQL was considered but lacks JSON support depth.",
  diagram: "graph TD\n  A[App] --> B[PostgreSQL]",
  createdAt: "2026-03-01T10:00:00Z",
  updatedAt: "2026-03-05T14:30:00Z",
};

jest.mock("@/hooks/useAdrs", () => ({
  useAdr: () => ({
    adr: mockAdr,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useAdrActions: () => ({
    updateStatus: jest.fn(),
    deleteAdr: jest.fn(),
    isSaving: false,
    isDeleting: false,
    error: null,
  }),
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "adr-1" }),
  useRouter: () => ({ push: jest.fn() }),
}));

describe("AdrDetailPage", () => {
  it("renders ADR title", () => {
    render(<AdrDetailPage />);
    expect(
      screen.getByRole("heading", {
        name: /use postgresql for primary datastore/i,
      })
    ).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(<AdrDetailPage />);
    expect(screen.getByText("Accepted")).toBeInTheDocument();
  });

  it("renders context section", () => {
    render(<AdrDetailPage />);
    expect(screen.getByText(/context/i)).toBeInTheDocument();
    expect(
      screen.getByText(/relational database with strong acid/i)
    ).toBeInTheDocument();
  });

  it("renders decision section", () => {
    render(<AdrDetailPage />);
    expect(
      screen.getByText(/use postgresql 15\+/i)
    ).toBeInTheDocument();
  });

  it("renders consequences section", () => {
    render(<AdrDetailPage />);
    expect(
      screen.getByText(/manage migrations and backups/i)
    ).toBeInTheDocument();
  });

  it("renders alternatives section", () => {
    render(<AdrDetailPage />);
    expect(
      screen.getByText(/mysql was considered/i)
    ).toBeInTheDocument();
  });

  it("renders diagram as code block", () => {
    render(<AdrDetailPage />);
    expect(
      screen.getByText(/graph TD/)
    ).toBeInTheDocument();
  });

  it("renders edit link", () => {
    render(<AdrDetailPage />);
    const editLink = screen.getByRole("link", { name: /edit/i });
    expect(editLink).toHaveAttribute("href", "/adrs/adr-1/edit");
  });

  it("renders back to ADRs link", () => {
    render(<AdrDetailPage />);
    const backLink = screen.getByRole("link", { name: /back to adrs/i });
    expect(backLink).toHaveAttribute("href", "/adrs");
  });

  it("renders status transition buttons for accepted ADR", () => {
    render(<AdrDetailPage />);
    expect(
      screen.getByRole("button", { name: /move to deprecated/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /move to superseded/i })
    ).toBeInTheDocument();
  });

  it("renders delete button", () => {
    render(<AdrDetailPage />);
    expect(
      screen.getByRole("button", { name: /delete adr/i })
    ).toBeInTheDocument();
  });
});
