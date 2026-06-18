import { render, screen, fireEvent } from "@testing-library/react";
import { RadarDetail } from "../RadarDetail";
import type { RadarItem } from "@/types/radar";

const mockItem: RadarItem = {
  id: "item-1",
  name: "React",
  quadrant: "languages-frameworks",
  ring: "adopt",
  description: "A JavaScript library for building user interfaces",
  rationale: "Industry standard, large ecosystem, strong community support",
  isNew: false,
  isUserStack: true,
  relatedTechnologies: ["Next.js", "TypeScript", "Redux"],
  relevanceScore: 95,
};

const mockNewItem: RadarItem = {
  id: "item-2",
  name: "Bun",
  quadrant: "platforms-infrastructure",
  ring: "assess",
  description: "Fast JavaScript runtime",
  rationale: "Promising performance",
  isNew: true,
  isUserStack: false,
  relatedTechnologies: [],
  relevanceScore: null,
};

describe("RadarDetail", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    onClose.mockClear();
  });

  it("renders technology name", () => {
    render(<RadarDetail item={mockItem} onClose={onClose} />);
    expect(
      screen.getByRole("heading", { name: /react/i })
    ).toBeInTheDocument();
  });

  it("renders ring badge", () => {
    render(<RadarDetail item={mockItem} onClose={onClose} />);
    expect(screen.getByText("Adopt")).toBeInTheDocument();
  });

  it("renders quadrant label", () => {
    render(<RadarDetail item={mockItem} onClose={onClose} />);
    expect(
      screen.getByText("Languages & Frameworks")
    ).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<RadarDetail item={mockItem} onClose={onClose} />);
    expect(
      screen.getByText(
        "A JavaScript library for building user interfaces"
      )
    ).toBeInTheDocument();
  });

  it("renders rationale", () => {
    render(<RadarDetail item={mockItem} onClose={onClose} />);
    expect(
      screen.getByText(/industry standard, large ecosystem/i)
    ).toBeInTheDocument();
  });

  it("renders related technologies", () => {
    render(<RadarDetail item={mockItem} onClose={onClose} />);
    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Redux")).toBeInTheDocument();
  });

  it("renders relevance score when present", () => {
    render(<RadarDetail item={mockItem} onClose={onClose} />);
    expect(screen.getByText("95%")).toBeInTheDocument();
  });

  it("does not render relevance score when null", () => {
    render(<RadarDetail item={mockNewItem} onClose={onClose} />);
    expect(screen.queryByText(/relevance score/i)).not.toBeInTheDocument();
  });

  it("shows user stack badge when applicable", () => {
    render(<RadarDetail item={mockItem} onClose={onClose} />);
    expect(screen.getByText("In your tech stack")).toBeInTheDocument();
  });

  it("shows new badge for new items", () => {
    render(<RadarDetail item={mockNewItem} onClose={onClose} />);
    expect(screen.getByLabelText("New technology")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    render(<RadarDetail item={mockItem} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close details"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
