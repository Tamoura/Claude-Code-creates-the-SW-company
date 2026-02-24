import { render, screen } from "@testing-library/react";
import { ProfileViewerItem } from "../ProfileViewerItem";
import type { ProfileViewer } from "@/types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: "en", dir: () => "ltr" },
  }),
}));

const viewer: ProfileViewer = {
  id: "v1",
  viewerId: "u2",
  viewerName: "Alice Smith",
  viewerAvatar: "https://img/alice.jpg",
  viewerHeadline: "UX Designer",
  viewedAt: "2026-02-20T10:00:00Z",
};

describe("ProfileViewerItem", () => {
  it("renders viewer name", () => {
    render(<ProfileViewerItem viewer={viewer} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("renders viewer headline", () => {
    render(<ProfileViewerItem viewer={viewer} />);
    expect(screen.getByText("UX Designer")).toBeInTheDocument();
  });

  it("renders avatar image", () => {
    render(<ProfileViewerItem viewer={viewer} />);
    const img = screen.getByRole("img", { name: /Alice Smith/i });
    expect(img).toHaveAttribute("src", "https://img/alice.jpg");
  });

  it("renders placeholder when no avatar", () => {
    render(<ProfileViewerItem viewer={{ ...viewer, viewerAvatar: undefined }} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
