import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SlugSettings } from "../SlugSettings";
import { apiClient } from "@/lib/api";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: "en", dir: () => "ltr" },
  }),
}));

jest.mock("@/lib/api", () => ({
  apiClient: { put: jest.fn() },
}));

describe("SlugSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders slug input field", () => {
    render(<SlugSettings currentSlug="" onSlugUpdated={jest.fn()} />);
    expect(screen.getByRole("textbox", { name: /slug.label/i })).toBeInTheDocument();
  });

  it("shows current slug value", () => {
    render(<SlugSettings currentSlug="john-doe" onSlugUpdated={jest.fn()} />);
    expect(screen.getByDisplayValue("john-doe")).toBeInTheDocument();
  });

  it("shows preview URL", () => {
    render(<SlugSettings currentSlug="john-doe" onSlugUpdated={jest.fn()} />);
    expect(screen.getByText(/connectin.*\/john-doe/i)).toBeInTheDocument();
  });

  it("validates slug format (no spaces or special chars)", async () => {
    const user = userEvent.setup();
    render(<SlugSettings currentSlug="" onSlugUpdated={jest.fn()} />);
    const input = screen.getByRole("textbox", { name: /slug.label/i });
    await user.clear(input);
    await user.type(input, "invalid slug!");
    await user.click(screen.getByRole("button", { name: /slug.claim/i }));
    expect(screen.getByText("slug.invalidFormat")).toBeInTheDocument();
  });

  it("validates minimum length", async () => {
    const user = userEvent.setup();
    render(<SlugSettings currentSlug="" onSlugUpdated={jest.fn()} />);
    const input = screen.getByRole("textbox", { name: /slug.label/i });
    await user.clear(input);
    await user.type(input, "ab");
    await user.click(screen.getByRole("button", { name: /slug.claim/i }));
    expect(screen.getByText("slug.tooShort")).toBeInTheDocument();
  });

  it("submits valid slug", async () => {
    const user = userEvent.setup();
    const onSlugUpdated = jest.fn();
    (apiClient.put as jest.Mock).mockResolvedValue({ success: true, data: { slug: "new-slug" } });
    render(<SlugSettings currentSlug="" onSlugUpdated={onSlugUpdated} />);
    const input = screen.getByRole("textbox", { name: /slug.label/i });
    await user.type(input, "new-slug");
    await user.click(screen.getByRole("button", { name: /slug.claim/i }));
    await waitFor(() => expect(onSlugUpdated).toHaveBeenCalledWith("new-slug"));
  });

  it("shows error on API failure", async () => {
    const user = userEvent.setup();
    (apiClient.put as jest.Mock).mockResolvedValue({
      success: false,
      error: { code: "TAKEN", message: "slug.taken" },
    });
    render(<SlugSettings currentSlug="" onSlugUpdated={jest.fn()} />);
    await user.type(screen.getByRole("textbox", { name: /slug.label/i }), "taken-slug");
    await user.click(screen.getByRole("button", { name: /slug.claim/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("disables button while submitting", async () => {
    const user = userEvent.setup();
    (apiClient.put as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<SlugSettings currentSlug="" onSlugUpdated={jest.fn()} />);
    await user.type(screen.getByRole("textbox", { name: /slug.label/i }), "valid-slug");
    await user.click(screen.getByRole("button", { name: /slug.claim/i }));
    expect(screen.getByRole("button", { name: /slug.claim/i })).toBeDisabled();
  });
});
