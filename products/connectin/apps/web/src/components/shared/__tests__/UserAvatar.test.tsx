import React from "react";
import { render, screen } from "@testing-library/react";
import { UserAvatar } from "../UserAvatar";

describe("UserAvatar", () => {
  describe("initials fallback", () => {
    it("renders initials when no avatarUrl is provided", () => {
      render(<UserAvatar displayName="Ahmad Hassan" />);
      expect(screen.getByText("AH")).toBeInTheDocument();
    });

    it("renders a single initial for a one-word name", () => {
      render(<UserAvatar displayName="Ahmad" />);
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("renders first and last initials for a two-word name", () => {
      render(<UserAvatar displayName="Sara Ali" />);
      expect(screen.getByText("SA")).toBeInTheDocument();
    });

    it("sets aria-label to the display name on the initials container", () => {
      render(<UserAvatar displayName="Ahmad Hassan" />);
      expect(screen.getByLabelText("Ahmad Hassan")).toBeInTheDocument();
    });
  });

  describe("image rendering", () => {
    it("renders an img element when avatarUrl is provided", () => {
      render(
        <UserAvatar displayName="Ahmad Hassan" avatarUrl="https://example.com/avatar.jpg" />
      );
      const img = screen.getByAltText("Ahmad Hassan's profile photo");
      expect(img).toBeInTheDocument();
      expect(img.tagName).toBe("IMG");
      expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    });

    it("does not render initials text when avatarUrl is provided", () => {
      render(
        <UserAvatar displayName="Ahmad Hassan" avatarUrl="https://example.com/avatar.jpg" />
      );
      expect(screen.queryByText("AH")).not.toBeInTheDocument();
    });
  });

  describe("online indicator", () => {
    it("shows the online indicator when isOnline is true", () => {
      render(<UserAvatar displayName="Ahmad Hassan" isOnline={true} />);
      expect(
        screen.getByLabelText("Ahmad Hassan is online")
      ).toBeInTheDocument();
    });

    it("does not show the online indicator when isOnline is false", () => {
      render(<UserAvatar displayName="Ahmad Hassan" isOnline={false} />);
      expect(
        screen.queryByLabelText("Ahmad Hassan is online")
      ).not.toBeInTheDocument();
    });

    it("does not show the online indicator when isOnline is omitted", () => {
      render(<UserAvatar displayName="Ahmad Hassan" />);
      expect(
        screen.queryByLabelText("Ahmad Hassan is online")
      ).not.toBeInTheDocument();
    });
  });

  describe("size variants", () => {
    const sizes = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;

    const sizeClassMap: Record<(typeof sizes)[number], string> = {
      xs: "h-6",
      sm: "h-8",
      md: "h-10",
      lg: "h-16",
      xl: "h-24",
      "2xl": "h-32",
    };

    sizes.forEach((size) => {
      it(`applies the correct height class for size="${size}"`, () => {
        render(<UserAvatar displayName="Test User" size={size} />);
        // The initials div carries the size class
        const initialsEl = screen.getByLabelText("Test User");
        expect(initialsEl).toHaveClass(sizeClassMap[size]);
      });
    });

    it("defaults to the md size class when no size prop is given", () => {
      render(<UserAvatar displayName="Test User" />);
      expect(screen.getByLabelText("Test User")).toHaveClass("h-10");
    });
  });
});
