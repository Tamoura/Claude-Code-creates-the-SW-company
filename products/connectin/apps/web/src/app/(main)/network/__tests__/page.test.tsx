import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/network",
}));

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "network.myNetwork": "My Network",
        "network.pendingRequests": "Pending Requests",
        "network.myConnections": "My Connections",
        "network.searchConnections": "Search connections...",
        "network.noConnections": "You have no connections yet.",
        "network.noSearchResults": "No results found.",
        "actions.accept": "Accept",
        "actions.decline": "Decline",
      };
      return translations[key] || key;
    },
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

const mockAcceptConnection = jest.fn();
const mockRejectConnection = jest.fn();

let mockConnectionsState = {
  connections: [] as object[],
  pendingIncoming: [] as object[],
  pendingOutgoing: [] as object[],
  isLoading: false,
  error: null as string | null,
  acceptConnection: mockAcceptConnection,
  rejectConnection: mockRejectConnection,
  refetch: jest.fn(),
};

jest.mock("@/hooks/useConnections", () => ({
  useConnections: () => mockConnectionsState,
}));

import NetworkPage from "../page";

const mockConnection = {
  userId: "user-2",
  displayName: "Bob Jones",
  headline: "Product Manager",
  status: "connected" as const,
};

const mockPendingRequest = {
  connectionId: "conn-1",
  user: {
    id: "user-3",
    displayName: "Charlie Brown",
    headlineEn: "Designer",
  },
  requestedAt: new Date().toISOString(),
};

describe("NetworkPage", () => {
  beforeEach(() => {
    mockConnectionsState = {
      connections: [],
      pendingIncoming: [],
      pendingOutgoing: [],
      isLoading: false,
      error: null,
      acceptConnection: mockAcceptConnection,
      rejectConnection: mockRejectConnection,
      refetch: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("loading state", () => {
    it("shows a spinner while loading", () => {
      mockConnectionsState = { ...mockConnectionsState, isLoading: true };
      render(<NetworkPage />);

      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("does not render the heading while loading", () => {
      mockConnectionsState = { ...mockConnectionsState, isLoading: true };
      render(<NetworkPage />);

      expect(
        screen.queryByRole("heading", { name: "My Network" })
      ).not.toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows the error message when error is set", () => {
      mockConnectionsState = {
        ...mockConnectionsState,
        error: "Failed to load connections",
      };
      render(<NetworkPage />);

      expect(screen.getByText("Failed to load connections")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("renders the My Network heading", () => {
      render(<NetworkPage />);

      expect(
        screen.getByRole("heading", { name: "My Network", level: 1 })
      ).toBeInTheDocument();
    });

    it("renders the search input", () => {
      render(<NetworkPage />);

      expect(
        screen.getByPlaceholderText("Search connections...")
      ).toBeInTheDocument();
    });

    it("shows no-connections message when connections array is empty", () => {
      render(<NetworkPage />);

      expect(
        screen.getByText("You have no connections yet.")
      ).toBeInTheDocument();
    });

    it("does not render the Pending Requests section when pendingIncoming is empty", () => {
      render(<NetworkPage />);

      expect(
        screen.queryByRole("heading", { name: /pending requests/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("connections list", () => {
    it("renders connection cards with name and headline", () => {
      mockConnectionsState = {
        ...mockConnectionsState,
        connections: [mockConnection],
      };
      render(<NetworkPage />);

      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      expect(screen.getByText("Product Manager")).toBeInTheDocument();
    });

    it("shows the connection count badge in the heading", () => {
      mockConnectionsState = {
        ...mockConnectionsState,
        connections: [mockConnection],
      };
      render(<NetworkPage />);

      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  describe("search filter", () => {
    it("filters connections by display name as the user types", async () => {
      const user = userEvent.setup();
      const secondConnection = {
        userId: "user-5",
        displayName: "Diana Prince",
        headline: "Engineer",
        status: "connected" as const,
      };
      mockConnectionsState = {
        ...mockConnectionsState,
        connections: [mockConnection, secondConnection],
      };
      render(<NetworkPage />);

      const searchInput = screen.getByPlaceholderText("Search connections...");
      await user.type(searchInput, "Bob");

      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      expect(screen.queryByText("Diana Prince")).not.toBeInTheDocument();
    });

    it("shows no-search-results message when filter matches nothing", async () => {
      const user = userEvent.setup();
      mockConnectionsState = {
        ...mockConnectionsState,
        connections: [mockConnection],
      };
      render(<NetworkPage />);

      const searchInput = screen.getByPlaceholderText("Search connections...");
      await user.type(searchInput, "zzznomatch");

      expect(screen.getByText("No results found.")).toBeInTheDocument();
    });
  });

  describe("pending requests", () => {
    it("renders the Pending Requests section when there are incoming requests", () => {
      mockConnectionsState = {
        ...mockConnectionsState,
        pendingIncoming: [mockPendingRequest],
      };
      render(<NetworkPage />);

      expect(
        screen.getByRole("heading", { name: /pending requests/i, level: 2 })
      ).toBeInTheDocument();
    });

    it("renders requester name and headline", () => {
      mockConnectionsState = {
        ...mockConnectionsState,
        pendingIncoming: [mockPendingRequest],
      };
      render(<NetworkPage />);

      expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
      expect(screen.getByText("Designer")).toBeInTheDocument();
    });

    it("renders Accept and Decline buttons for each pending request", () => {
      mockConnectionsState = {
        ...mockConnectionsState,
        pendingIncoming: [mockPendingRequest],
      };
      render(<NetworkPage />);

      expect(
        screen.getByRole("button", {
          name: "Accept connection from Charlie Brown",
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: "Decline connection from Charlie Brown",
        })
      ).toBeInTheDocument();
    });

    it("calls acceptConnection with the connectionId when Accept is clicked", async () => {
      const user = userEvent.setup();
      mockConnectionsState = {
        ...mockConnectionsState,
        pendingIncoming: [mockPendingRequest],
      };
      render(<NetworkPage />);

      await user.click(
        screen.getByRole("button", {
          name: "Accept connection from Charlie Brown",
        })
      );

      expect(mockAcceptConnection).toHaveBeenCalledWith("conn-1");
    });

    it("calls rejectConnection with the connectionId when Decline is clicked", async () => {
      const user = userEvent.setup();
      mockConnectionsState = {
        ...mockConnectionsState,
        pendingIncoming: [mockPendingRequest],
      };
      render(<NetworkPage />);

      await user.click(
        screen.getByRole("button", {
          name: "Decline connection from Charlie Brown",
        })
      );

      expect(mockRejectConnection).toHaveBeenCalledWith("conn-1");
    });

    it("shows the pending request count badge", () => {
      mockConnectionsState = {
        ...mockConnectionsState,
        pendingIncoming: [mockPendingRequest],
      };
      render(<NetworkPage />);

      // The badge shows the count next to the "Pending Requests" heading
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });
});
