import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EasyApplyButton } from "../EasyApplyButton";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: "en", dir: () => "ltr" },
  }),
}));

describe("EasyApplyButton", () => {
  it("renders easy apply button with lightning icon text", () => {
    render(<EasyApplyButton onEasyApply={jest.fn()} isApplied={false} isLoading={false} />);
    expect(screen.getByRole("button", { name: /jobs.easyApply/i })).toBeInTheDocument();
  });

  it("shows applied state when already applied", () => {
    render(<EasyApplyButton onEasyApply={jest.fn()} isApplied={true} isLoading={false} />);
    expect(screen.getByText("jobs.applied")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<EasyApplyButton onEasyApply={jest.fn()} isApplied={false} isLoading={true} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onEasyApply when clicked", async () => {
    const user = userEvent.setup();
    const onEasyApply = jest.fn();
    render(<EasyApplyButton onEasyApply={onEasyApply} isApplied={false} isLoading={false} />);
    await user.click(screen.getByRole("button", { name: /jobs.easyApply/i }));
    expect(onEasyApply).toHaveBeenCalled();
  });

  it("stops event propagation", async () => {
    const user = userEvent.setup();
    const parentClick = jest.fn();
    render(
      <div onClick={parentClick}>
        <EasyApplyButton onEasyApply={jest.fn()} isApplied={false} isLoading={false} />
      </div>
    );
    await user.click(screen.getByRole("button", { name: /jobs.easyApply/i }));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
