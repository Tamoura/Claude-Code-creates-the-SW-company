import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JobCard } from "../JobCard";
import type { Job } from "@/types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: "en", dir: () => "ltr" },
  }),
}));

const baseJob: Job = {
  id: "job-1",
  title: "Developer",
  company: "Acme",
  workType: "REMOTE",
  experienceLevel: "MID",
  description: "Build stuff",
  language: "en",
  status: "OPEN",
  applicantCount: 3,
  createdAt: "2026-01-01",
  isApplied: false,
  isSaved: false,
};

describe("JobCard - Easy Apply", () => {
  it("renders EasyApplyButton when onEasyApply is provided", () => {
    render(
      <JobCard
        job={baseJob}
        onApply={jest.fn()}
        onSave={jest.fn()}
        onEasyApply={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /jobs.easyApply/i })).toBeInTheDocument();
  });

  it("does not render EasyApplyButton when onEasyApply is not provided", () => {
    render(<JobCard job={baseJob} onApply={jest.fn()} onSave={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /jobs.easyApply/i })).not.toBeInTheDocument();
  });

  it("calls onEasyApply with jobId when EasyApplyButton clicked", async () => {
    const user = userEvent.setup();
    const onEasyApply = jest.fn();
    render(
      <JobCard
        job={baseJob}
        onApply={jest.fn()}
        onSave={jest.fn()}
        onEasyApply={onEasyApply}
      />
    );
    await user.click(screen.getByRole("button", { name: /jobs.easyApply/i }));
    expect(onEasyApply).toHaveBeenCalledWith("job-1");
  });
});
