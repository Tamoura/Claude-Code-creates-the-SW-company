import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplyModal } from "../ApplyModal";

describe("ApplyModal", () => {
  const defaultProps = {
    jobId: "job-1",
    jobTitle: "Frontend Engineer",
    company: "Acme Corp",
    onApply: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the modal with job title in header", () => {
      render(<ApplyModal {...defaultProps} />);
      expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
    });

    it("renders company name in header", () => {
      render(<ApplyModal {...defaultProps} />);
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    it("renders cover note textarea", () => {
      render(<ApplyModal {...defaultProps} />);
      expect(
        screen.getByRole("textbox", { name: /cover note/i })
      ).toBeInTheDocument();
    });

    it("renders Apply button", () => {
      render(<ApplyModal {...defaultProps} />);
      expect(screen.getByRole("button", { name: /^apply$/i })).toBeInTheDocument();
    });

    it("renders Cancel button", () => {
      render(<ApplyModal {...defaultProps} />);
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("has aria-modal attribute", () => {
      render(<ApplyModal {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it("shows character counter starting at 0/500", () => {
      render(<ApplyModal {...defaultProps} />);
      expect(screen.getByText("0 / 500")).toBeInTheDocument();
    });
  });

  describe("cover note textarea", () => {
    it("allows typing in the cover note textarea", async () => {
      const user = userEvent.setup();
      render(<ApplyModal {...defaultProps} />);

      const textarea = screen.getByRole("textbox", { name: /cover note/i });
      await user.type(textarea, "I am interested!");
      expect(textarea).toHaveValue("I am interested!");
    });

    it("updates character counter as user types", async () => {
      const user = userEvent.setup();
      render(<ApplyModal {...defaultProps} />);

      const textarea = screen.getByRole("textbox", { name: /cover note/i });
      await user.type(textarea, "Hello");
      expect(screen.getByText("5 / 500")).toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("calls onApply with jobId and cover note when submitted", async () => {
      const user = userEvent.setup();
      const onApply = jest.fn().mockResolvedValue("app-1");
      render(<ApplyModal {...defaultProps} onApply={onApply} />);

      const textarea = screen.getByRole("textbox", { name: /cover note/i });
      await user.type(textarea, "Great opportunity!");

      await user.click(screen.getByRole("button", { name: /^apply$/i }));

      expect(onApply).toHaveBeenCalledWith("job-1", "Great opportunity!");
    });

    it("calls onApply with empty cover note when textarea is blank", async () => {
      const user = userEvent.setup();
      const onApply = jest.fn().mockResolvedValue("app-1");
      render(<ApplyModal {...defaultProps} onApply={onApply} />);

      await user.click(screen.getByRole("button", { name: /^apply$/i }));

      expect(onApply).toHaveBeenCalledWith("job-1", "");
    });

    it("disables Apply button while submitting", async () => {
      const user = userEvent.setup();
      let resolve!: (v: string | undefined) => void;
      const onApply = jest.fn(
        () => new Promise<string | undefined>((r) => (resolve = r))
      );
      render(<ApplyModal {...defaultProps} onApply={onApply} />);

      await user.click(screen.getByRole("button", { name: /^apply$/i }));
      expect(screen.getByRole("button", { name: /applying/i })).toBeDisabled();

      act(() => resolve("app-1"));
    });

    it("closes modal on successful apply", async () => {
      const user = userEvent.setup();
      const onApply = jest.fn().mockResolvedValue("app-1");
      const onClose = jest.fn();
      render(<ApplyModal {...defaultProps} onApply={onApply} onClose={onClose} />);

      await user.click(screen.getByRole("button", { name: /^apply$/i }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("shows error message when apply fails", async () => {
      const user = userEvent.setup();
      const onApply = jest.fn().mockResolvedValue(undefined);
      render(<ApplyModal {...defaultProps} onApply={onApply} />);

      await user.click(screen.getByRole("button", { name: /^apply$/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });
  });

  describe("cancellation", () => {
    it("calls onClose when Cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<ApplyModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("calls onClose when Escape key is pressed", async () => {
      const user = userEvent.setup();
      render(<ApplyModal {...defaultProps} />);

      await user.keyboard("{Escape}");
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});

// Need act imported for async tests
import { act } from "@testing-library/react";
