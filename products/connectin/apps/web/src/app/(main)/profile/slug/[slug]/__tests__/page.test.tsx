import { render, screen, waitFor } from "@testing-library/react";
import SlugProfilePage from "../page";
import { apiClient } from "@/lib/api";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: "en", dir: () => "ltr" },
  }),
}));
jest.mock("@/lib/api", () => ({ apiClient: { get: jest.fn() } }));
jest.mock("next/navigation", () => ({ useParams: () => ({ slug: "john-doe" }) }));

describe("SlugProfilePage", () => {
  it("fetches profile by slug", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        id: "p1",
        userId: "u1",
        headlineEn: "Engineer",
        completenessScore: 80,
        experiences: [],
        education: [],
        skills: [],
      },
    });
    render(<SlugProfilePage />);
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith("/profiles/by-slug/john-doe")
    );
  });

  it("renders profile when found", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        id: "p1",
        userId: "u1",
        headlineEn: "Engineer",
        completenessScore: 80,
        experiences: [],
        education: [],
        skills: [],
      },
    });
    render(<SlugProfilePage />);
    await waitFor(() => expect(screen.getByText("Engineer")).toBeInTheDocument());
  });

  it("shows not found message for invalid slug", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      success: false,
      error: { code: "NOT_FOUND", message: "Not found" },
    });
    render(<SlugProfilePage />);
    await waitFor(() =>
      expect(screen.getByText("profile.notFound")).toBeInTheDocument()
    );
  });
});
