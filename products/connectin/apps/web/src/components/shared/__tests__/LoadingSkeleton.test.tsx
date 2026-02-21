import React from "react";
import { render, screen } from "@testing-library/react";
import { LoadingSkeleton, PostCardSkeleton } from "../LoadingSkeleton";

describe("LoadingSkeleton", () => {
  describe("text variant (default)", () => {
    it("renders a single line by default", () => {
      const { container } = render(<LoadingSkeleton />);
      // The wrapper div contains one child bar div
      const bars = container.querySelectorAll(".h-4");
      expect(bars).toHaveLength(1);
    });

    it("renders the correct number of lines when lines prop is supplied", () => {
      const { container } = render(<LoadingSkeleton lines={4} />);
      const bars = container.querySelectorAll(".h-4");
      expect(bars).toHaveLength(4);
    });

    it("sets the last line to 75% width when there are multiple lines", () => {
      const { container } = render(<LoadingSkeleton lines={3} />);
      const bars = Array.from(container.querySelectorAll(".h-4")) as HTMLElement[];
      expect(bars[bars.length - 1].style.width).toBe("75%");
    });

    it("sets each line to 100% width when there is only one line", () => {
      const { container } = render(<LoadingSkeleton lines={1} />);
      const bars = Array.from(container.querySelectorAll(".h-4")) as HTMLElement[];
      expect(bars[0].style.width).toBe("100%");
    });

    it("has the animate-pulse class on each bar", () => {
      const { container } = render(<LoadingSkeleton lines={2} />);
      const bars = container.querySelectorAll(".animate-pulse");
      expect(bars.length).toBeGreaterThanOrEqual(2);
    });

    it("is hidden from assistive technology (aria-hidden)", () => {
      const { container } = render(<LoadingSkeleton />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("circular variant", () => {
    it("renders a rounded-full element", () => {
      const { container } = render(<LoadingSkeleton variant="circular" />);
      const el = container.firstChild as HTMLElement;
      expect(el).toHaveClass("rounded-full");
    });

    it("applies the animate-pulse class", () => {
      const { container } = render(<LoadingSkeleton variant="circular" />);
      expect(container.firstChild).toHaveClass("animate-pulse");
    });

    it("uses the supplied width and height via inline styles", () => {
      const { container } = render(
        <LoadingSkeleton variant="circular" width="60px" height="60px" />
      );
      const el = container.firstChild as HTMLElement;
      expect(el.style.width).toBe("60px");
      expect(el.style.height).toBe("60px");
    });

    it("defaults to 40px width and height", () => {
      const { container } = render(<LoadingSkeleton variant="circular" />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.width).toBe("40px");
      expect(el.style.height).toBe("40px");
    });

    it("is hidden from assistive technology (aria-hidden)", () => {
      const { container } = render(<LoadingSkeleton variant="circular" />);
      expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("rectangular variant", () => {
    it("renders a rounded-md element (not rounded-full)", () => {
      const { container } = render(<LoadingSkeleton variant="rectangular" />);
      const el = container.firstChild as HTMLElement;
      expect(el).toHaveClass("rounded-md");
      expect(el).not.toHaveClass("rounded-full");
    });

    it("applies the animate-pulse class", () => {
      const { container } = render(<LoadingSkeleton variant="rectangular" />);
      expect(container.firstChild).toHaveClass("animate-pulse");
    });

    it("uses the supplied height via inline style", () => {
      const { container } = render(
        <LoadingSkeleton variant="rectangular" height="120px" />
      );
      const el = container.firstChild as HTMLElement;
      expect(el.style.height).toBe("120px");
    });

    it("defaults to 200px height", () => {
      const { container } = render(<LoadingSkeleton variant="rectangular" />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.height).toBe("200px");
    });

    it("is hidden from assistive technology (aria-hidden)", () => {
      const { container } = render(<LoadingSkeleton variant="rectangular" />);
      expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    });
  });
});

describe("PostCardSkeleton", () => {
  it("renders with the accessible label 'Loading post'", () => {
    render(<PostCardSkeleton />);
    expect(screen.getByLabelText("Loading post")).toBeInTheDocument();
  });

  it("contains multiple animate-pulse elements", () => {
    const { container } = render(<PostCardSkeleton />);
    const pulseEls = container.querySelectorAll(".animate-pulse");
    expect(pulseEls.length).toBeGreaterThan(1);
  });

  it("includes a circular skeleton for the avatar", () => {
    const { container } = render(<PostCardSkeleton />);
    const circular = container.querySelector(".rounded-full.animate-pulse");
    expect(circular).toBeInTheDocument();
  });

  it("includes a rectangular skeleton for the image placeholder", () => {
    const { container } = render(<PostCardSkeleton />);
    const rectangular = container.querySelector(".rounded-md.animate-pulse");
    expect(rectangular).toBeInTheDocument();
  });
});
