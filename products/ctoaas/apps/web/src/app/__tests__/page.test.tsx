import { render, screen } from "@testing-library/react";
import LandingPage from "../page";

describe("LandingPage", () => {
  beforeEach(() => {
    render(<LandingPage />);
  });

  describe("Hero section", () => {
    it("renders the main heading", () => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /ai-powered advisory for technology leaders/i,
        })
      ).toBeInTheDocument();
    });

    it("renders Get Started CTA linking to /signup", () => {
      const cta = screen.getAllByRole("link", { name: /get started/i });
      expect(cta.length).toBeGreaterThanOrEqual(1);
      expect(cta[0]).toHaveAttribute("href", "/signup");
    });

    it("renders Learn More link pointing to #features", () => {
      const link = screen.getByRole("link", { name: /learn more/i });
      expect(link).toHaveAttribute("href", "#features");
    });
  });

  describe("Features section", () => {
    it("renders all 6 feature cards", () => {
      expect(screen.getByText("Strategic Advisory")).toBeInTheDocument();
      expect(screen.getByText("Knowledge-Backed")).toBeInTheDocument();
      expect(screen.getByText("Risk Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Cost Analysis")).toBeInTheDocument();
      expect(screen.getByText("Technology Radar")).toBeInTheDocument();
      expect(screen.getByText("Decision Records")).toBeInTheDocument();
    });

    it("renders features section heading", () => {
      expect(
        screen.getByRole("heading", { name: /what you get/i })
      ).toBeInTheDocument();
    });
  });

  describe("How It Works section", () => {
    it("renders how it works heading", () => {
      expect(
        screen.getByRole("heading", { name: /how it works/i })
      ).toBeInTheDocument();
    });

    it("renders 3 steps", () => {
      expect(screen.getByText("Sign Up")).toBeInTheDocument();
      expect(screen.getByText("Complete Profile")).toBeInTheDocument();
      expect(screen.getByText("Start Advisory")).toBeInTheDocument();
    });
  });

  describe("Pricing section", () => {
    it("renders pricing heading", () => {
      expect(
        screen.getByRole("heading", { name: /pricing/i })
      ).toBeInTheDocument();
    });

    it("renders 3 pricing tiers", () => {
      expect(screen.getByText("Free")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
      expect(screen.getByText("Enterprise")).toBeInTheDocument();
    });

    it("renders price for Pro tier", () => {
      expect(screen.getByText(/\$99/)).toBeInTheDocument();
    });
  });

  describe("Footer", () => {
    it("renders footer with ConnectSW attribution", () => {
      expect(screen.getByText(/ctoaas by connectsw/i)).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("renders sign in link", () => {
      expect(
        screen.getByRole("link", { name: /sign in/i })
      ).toBeInTheDocument();
    });
  });
});
