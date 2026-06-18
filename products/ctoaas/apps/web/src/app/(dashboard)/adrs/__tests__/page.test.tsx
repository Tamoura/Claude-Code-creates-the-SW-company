import { render, screen } from "@testing-library/react";
import AdrsPage from "../page";

const mockAdrs = [
  {
    id: "adr-1",
    title: "Use PostgreSQL for primary datastore",
    status: "accepted" as const,
    context: "We need a relational database",
    decision: "Use PostgreSQL",
    consequences: "Need to manage migrations",
    alternatives: "MySQL, MongoDB",
    diagram: "",
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
  },
  {
    id: "adr-2",
    title: "Adopt Fastify over Express",
    status: "proposed" as const,
    context: "Express is slower",
    decision: "Use Fastify",
    consequences: "Better performance",
    alternatives: "Express, Koa",
    diagram: "",
    createdAt: "2026-03-10T00:00:00Z",
    updatedAt: "2026-03-10T00:00:00Z",
  },
  {
    id: "adr-3",
    title: "Deprecate legacy API v1",
    status: "deprecated" as const,
    context: "V2 is stable",
    decision: "Deprecate v1",
    consequences: "Clients must migrate",
    alternatives: "",
    diagram: "",
    createdAt: "2026-02-15T00:00:00Z",
    updatedAt: "2026-03-05T00:00:00Z",
  },
];

jest.mock("@/hooks/useAdrs", () => ({
  useAdrs: () => ({
    adrs: mockAdrs,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe("AdrsPage", () => {
  it("renders the page heading", () => {
    render(<AdrsPage />);
    expect(
      screen.getByRole("heading", {
        name: /architecture decision records/i,
      })
    ).toBeInTheDocument();
  });

  it("renders ADR table with titles", () => {
    render(<AdrsPage />);
    expect(
      screen.getByText("Use PostgreSQL for primary datastore")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Adopt Fastify over Express")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Deprecate legacy API v1")
    ).toBeInTheDocument();
  });

  it("renders status badges in table rows", () => {
    render(<AdrsPage />);
    const badges = screen.getAllByText("Accepted");
    // One in the status filter dropdown option, one as a badge in the table
    expect(badges.length).toBeGreaterThanOrEqual(1);
    // Check for badge-styled elements specifically
    const badgeElements = badges.filter((el) =>
      el.className.includes("rounded-full")
    );
    expect(badgeElements).toHaveLength(1);
  });

  it("renders New ADR link", () => {
    render(<AdrsPage />);
    const newLink = screen.getByRole("link", { name: /new adr/i });
    expect(newLink).toBeInTheDocument();
    expect(newLink).toHaveAttribute("href", "/adrs/new");
  });

  it("renders links to ADR detail pages", () => {
    render(<AdrsPage />);
    const link = screen.getByRole("link", {
      name: /use postgresql/i,
    });
    expect(link).toHaveAttribute("href", "/adrs/adr-1");
  });

  it("renders search input", () => {
    render(<AdrsPage />);
    expect(
      screen.getByPlaceholderText(/search by title/i)
    ).toBeInTheDocument();
  });

  it("renders status filter", () => {
    render(<AdrsPage />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
