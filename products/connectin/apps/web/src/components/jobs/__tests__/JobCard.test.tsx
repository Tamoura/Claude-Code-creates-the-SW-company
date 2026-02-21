import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JobCard } from "../JobCard";
import type { Job } from "@/types";

const baseJob: Job = {
  id: "job-1",
  title: "Frontend Engineer",
  company: "Acme Corp",
  location: "Dubai, UAE",
  workType: "REMOTE",
  experienceLevel: "MID",
  description: "Build amazing things",
  requirements: "React, TypeScript",
  salaryMin: 8000,
  salaryMax: 12000,
  salaryCurrency: "USD",
  language: "en",
  status: "OPEN",
  applicantCount: 5,
  createdAt: new Date().toISOString(),
  isApplied: false,
  isSaved: false,
};

describe("JobCard", () => {
  const onApply = jest.fn();
  const onSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("content rendering", () => {
    it("renders the job title", () => {
      render(<JobCard job={baseJob} onApply={onApply} onSave={onSave} />);
      expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
    });

    it("renders the company name", () => {
      render(<JobCard job={baseJob} onApply={onApply} onSave={onSave} />);
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    it("renders the location when provided", () => {
      render(<JobCard job={baseJob} onApply={onApply} onSave={onSave} />);
      expect(screen.getByText("Dubai, UAE")).toBeInTheDocument();
    });

    it("does not render location section when location is absent", () => {
      const jobNoLocation: Job = { ...baseJob, location: undefined };
      render(<JobCard job={jobNoLocation} onApply={onApply} onSave={onSave} />);
      expect(screen.queryByText("Dubai, UAE")).not.toBeInTheDocument();
    });

    it("renders the work type badge", () => {
      render(<JobCard job={baseJob} onApply={onApply} onSave={onSave} />);
      expect(screen.getByText("Remote")).toBeInTheDocument();
    });

    it("renders 'Hybrid' for HYBRID work type", () => {
      const hybridJob: Job = { ...baseJob, workType: "HYBRID" };
      render(<JobCard job={hybridJob} onApply={onApply} onSave={onSave} />);
      expect(screen.getByText("Hybrid")).toBeInTheDocument();
    });

    it("renders 'On-site' for ONSITE work type", () => {
      const onsiteJob: Job = { ...baseJob, workType: "ONSITE" };
      render(<JobCard job={onsiteJob} onApply={onApply} onSave={onSave} />);
      expect(screen.getByText("On-site")).toBeInTheDocument();
    });

    it("renders the experience level badge", () => {
      render(<JobCard job={baseJob} onApply={onApply} onSave={onSave} />);
      expect(screen.getByText("Mid")).toBeInTheDocument();
    });

    it("renders salary range when salaryMin and salaryMax are present", () => {
      render(<JobCard job={baseJob} onApply={onApply} onSave={onSave} />);
      expect(screen.getByText(/\$8,000.*\$12,000/)).toBeInTheDocument();
    });

    it("does not render salary when salaryMin is absent", () => {
      const jobNoSalary: Job = { ...baseJob, salaryMin: undefined, salaryMax: undefined };
      render(<JobCard job={jobNoSalary} onApply={onApply} onSave={onSave} />);
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });

    it("renders applicant count", () => {
      render(<JobCard job={baseJob} onApply={onApply} onSave={onSave} />);
      expect(screen.getByText(/5/)).toBeInTheDocument();
    });
  });

  describe("action buttons — unapplied job", () => {
    it("renders Apply button when job is not applied", () => {
      render(<JobCard job={baseJob} onApply={onApply} onSave={onSave} />);
      expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument();
    });

    it("renders Save button when job is not saved", () => {
      render(<JobCard job={baseJob} onApply={onApply} onSave={onSave} />);
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });

    it("calls onApply with jobId when Apply button is clicked", async () => {
      const user = userEvent.setup();
      render(<JobCard job={baseJob} onApply={onApply} onSave={onSave} />);
      await user.click(screen.getByRole("button", { name: /apply/i }));
      expect(onApply).toHaveBeenCalledWith("job-1");
    });

    it("calls onSave with jobId and false when Save button is clicked on unsaved job", async () => {
      const user = userEvent.setup();
      render(<JobCard job={baseJob} onApply={onApply} onSave={onSave} />);
      await user.click(screen.getByRole("button", { name: /save/i }));
      expect(onSave).toHaveBeenCalledWith("job-1", false);
    });
  });

  describe("action buttons — applied job", () => {
    it("shows Applied chip when isApplied is true", () => {
      const appliedJob: Job = { ...baseJob, isApplied: true };
      render(<JobCard job={appliedJob} onApply={onApply} onSave={onSave} />);
      expect(screen.getByText("Applied")).toBeInTheDocument();
    });

    it("does not show Apply button when isApplied is true", () => {
      const appliedJob: Job = { ...baseJob, isApplied: true };
      render(<JobCard job={appliedJob} onApply={onApply} onSave={onSave} />);
      expect(screen.queryByRole("button", { name: /^apply$/i })).not.toBeInTheDocument();
    });
  });

  describe("action buttons — saved job", () => {
    it("calls onSave with jobId and true when Unsave is clicked on saved job", async () => {
      const user = userEvent.setup();
      const savedJob: Job = { ...baseJob, isSaved: true };
      render(<JobCard job={savedJob} onApply={onApply} onSave={onSave} />);
      await user.click(screen.getByRole("button", { name: /unsave/i }));
      expect(onSave).toHaveBeenCalledWith("job-1", true);
    });
  });

  describe("accessibility", () => {
    it("renders as an article element with accessible label", () => {
      render(<JobCard job={baseJob} onApply={onApply} onSave={onSave} />);
      expect(
        screen.getByRole("article", { name: /frontend engineer/i })
      ).toBeInTheDocument();
    });

    it("has cursor-pointer on the card", () => {
      render(<JobCard job={baseJob} onApply={onApply} onSave={onSave} />);
      const article = screen.getByRole("article", { name: /frontend engineer/i });
      expect(article.className).toContain("cursor-pointer");
    });
  });
});
