import { render, screen, fireEvent } from "@testing-library/react";
import { RadarChart } from "../RadarChart";
import type { RadarItem } from "@/types/radar";

const mockItems: RadarItem[] = [
  {
    id: "item-1",
    name: "React",
    quadrant: "languages-frameworks",
    ring: "adopt",
    description: "A JavaScript library for building user interfaces",
    rationale: "Industry standard for web UIs",
    isNew: false,
    isUserStack: true,
    relatedTechnologies: ["Next.js", "TypeScript"],
    relevanceScore: 95,
  },
  {
    id: "item-2",
    name: "Deno",
    quadrant: "platforms-infrastructure",
    ring: "assess",
    description: "A modern runtime for JavaScript",
    rationale: "Promising alternative to Node.js",
    isNew: true,
    isUserStack: false,
    relatedTechnologies: ["Node.js"],
    relevanceScore: 40,
  },
  {
    id: "item-3",
    name: "Terraform",
    quadrant: "tools",
    ring: "trial",
    description: "Infrastructure as code tool",
    rationale: "Multi-cloud infrastructure management",
    isNew: false,
    isUserStack: false,
    relatedTechnologies: ["Pulumi"],
    relevanceScore: 70,
  },
];

describe("RadarChart", () => {
  const onSelectItem = jest.fn();

  beforeEach(() => {
    onSelectItem.mockClear();
  });

  it("renders SVG with ring circles", () => {
    render(<RadarChart items={mockItems} onSelectItem={onSelectItem} />);
    expect(screen.getByTestId("ring-0")).toBeInTheDocument();
    expect(screen.getByTestId("ring-1")).toBeInTheDocument();
    expect(screen.getByTestId("ring-2")).toBeInTheDocument();
    expect(screen.getByTestId("ring-3")).toBeInTheDocument();
  });

  it("renders dots for each item", () => {
    render(<RadarChart items={mockItems} onSelectItem={onSelectItem} />);
    expect(screen.getByTestId("radar-dot-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("radar-dot-item-2")).toBeInTheDocument();
    expect(screen.getByTestId("radar-dot-item-3")).toBeInTheDocument();
  });

  it("provides accessible labels for dots", () => {
    render(<RadarChart items={mockItems} onSelectItem={onSelectItem} />);
    expect(
      screen.getByRole("button", {
        name: /react, adopt ring, languages & frameworks quadrant/i,
      })
    ).toBeInTheDocument();
  });

  it("calls onSelectItem when dot is clicked", () => {
    render(<RadarChart items={mockItems} onSelectItem={onSelectItem} />);
    fireEvent.click(screen.getByTestId("radar-dot-item-1"));
    expect(onSelectItem).toHaveBeenCalledWith(mockItems[0]);
  });

  it("calls onSelectItem on keyboard Enter", () => {
    render(<RadarChart items={mockItems} onSelectItem={onSelectItem} />);
    fireEvent.keyDown(screen.getByTestId("radar-dot-item-2"), {
      key: "Enter",
    });
    expect(onSelectItem).toHaveBeenCalledWith(mockItems[1]);
  });

  it("shows tooltip on hover", () => {
    render(<RadarChart items={mockItems} onSelectItem={onSelectItem} />);
    fireEvent.mouseEnter(screen.getByTestId("radar-dot-item-1"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("has accessible role and label on container", () => {
    render(<RadarChart items={mockItems} onSelectItem={onSelectItem} />);
    expect(
      screen.getByRole("img", {
        name: /technology radar chart/i,
      })
    ).toBeInTheDocument();
  });

  it("marks new items with star indicator", () => {
    render(<RadarChart items={mockItems} onSelectItem={onSelectItem} />);
    const newDot = screen.getByRole("button", {
      name: /deno.*new/i,
    });
    expect(newDot).toBeInTheDocument();
  });
});
