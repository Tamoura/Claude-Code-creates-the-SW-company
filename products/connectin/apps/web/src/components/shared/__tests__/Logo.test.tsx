import React from "react";
import { render, screen } from "@testing-library/react";
import { Logo } from "../Logo";

describe("Logo", () => {
  it("renders the 'C' placeholder letter", () => {
    render(<Logo />);
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("renders the brand name with 'Connect' and 'In' parts", () => {
    render(<Logo />);
    // The word "Connect" and "In" are in separate nodes; query by partial text.
    expect(screen.getByLabelText("ConnectIn")).toBeInTheDocument();
    expect(screen.getByText("In")).toBeInTheDocument();
  });

  it("has an aria-label of 'ConnectIn' on the root element", () => {
    render(<Logo />);
    expect(screen.getByLabelText("ConnectIn")).toBeInTheDocument();
  });

  describe("size variants", () => {
    it("applies the sm height class for size='sm'", () => {
      render(<Logo size="sm" />);
      // The 'C' circle carries the size classes
      const circle = screen.getByText("C");
      expect(circle).toHaveClass("h-6");
    });

    it("applies the md height class for size='md' (default)", () => {
      render(<Logo />);
      const circle = screen.getByText("C");
      expect(circle).toHaveClass("h-8");
    });

    it("applies the lg height class for size='lg'", () => {
      render(<Logo size="lg" />);
      const circle = screen.getByText("C");
      expect(circle).toHaveClass("h-10");
    });
  });
});
