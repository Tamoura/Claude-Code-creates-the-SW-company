import { render, screen } from "@testing-library/react";
import {
  DemandStatusBadge,
  PortfolioStatusBadge,
  InvestmentStatusBadge,
  ProposalStatusBadge,
} from "./status-badge";

describe("S2P Status Badges", () => {
  describe("DemandStatusBadge", () => {
    it("should render 'New' status with outline variant", () => {
      render(<DemandStatusBadge status="new" />);
      const badge = screen.getByText("New");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'Under Review' status with info variant", () => {
      render(<DemandStatusBadge status="under_review" />);
      const badge = screen.getByText("Under Review");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'Approved' status with success variant", () => {
      render(<DemandStatusBadge status="approved" />);
      const badge = screen.getByText("Approved");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'Rejected' status with destructive variant", () => {
      render(<DemandStatusBadge status="rejected" />);
      const badge = screen.getByText("Rejected");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'In Portfolio' status with default variant", () => {
      render(<DemandStatusBadge status="in_portfolio" />);
      const badge = screen.getByText("In Portfolio");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("PortfolioStatusBadge", () => {
    it("should render 'Backlog' status with outline variant", () => {
      render(<PortfolioStatusBadge status="backlog" />);
      const badge = screen.getByText("Backlog");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'Planned' status with info variant", () => {
      render(<PortfolioStatusBadge status="planned" />);
      const badge = screen.getByText("Planned");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'Active' status with success variant", () => {
      render(<PortfolioStatusBadge status="active" />);
      const badge = screen.getByText("Active");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'On Hold' status with warning variant", () => {
      render(<PortfolioStatusBadge status="on_hold" />);
      const badge = screen.getByText("On Hold");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'Completed' status with default variant", () => {
      render(<PortfolioStatusBadge status="completed" />);
      const badge = screen.getByText("Completed");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'Cancelled' status with secondary variant", () => {
      render(<PortfolioStatusBadge status="cancelled" />);
      const badge = screen.getByText("Cancelled");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("InvestmentStatusBadge", () => {
    it("should render 'Proposed' status with outline variant", () => {
      render(<InvestmentStatusBadge status="proposed" />);
      const badge = screen.getByText("Proposed");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'Approved' status with info variant", () => {
      render(<InvestmentStatusBadge status="approved" />);
      const badge = screen.getByText("Approved");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'Active' status with success variant", () => {
      render(<InvestmentStatusBadge status="active" />);
      const badge = screen.getByText("Active");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'On Hold' status with warning variant", () => {
      render(<InvestmentStatusBadge status="on_hold" />);
      const badge = screen.getByText("On Hold");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'Completed' status with default variant", () => {
      render(<InvestmentStatusBadge status="completed" />);
      const badge = screen.getByText("Completed");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'Cancelled' status with secondary variant", () => {
      render(<InvestmentStatusBadge status="cancelled" />);
      const badge = screen.getByText("Cancelled");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("ProposalStatusBadge", () => {
    it("should render 'Draft' status with outline variant", () => {
      render(<ProposalStatusBadge status="draft" />);
      const badge = screen.getByText("Draft");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'Submitted' status with info variant", () => {
      render(<ProposalStatusBadge status="submitted" />);
      const badge = screen.getByText("Submitted");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'Under Review' status with warning variant", () => {
      render(<ProposalStatusBadge status="under_review" />);
      const badge = screen.getByText("Under Review");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'Approved' status with success variant", () => {
      render(<ProposalStatusBadge status="approved" />);
      const badge = screen.getByText("Approved");
      expect(badge).toBeInTheDocument();
    });

    it("should render 'Rejected' status with destructive variant", () => {
      render(<ProposalStatusBadge status="rejected" />);
      const badge = screen.getByText("Rejected");
      expect(badge).toBeInTheDocument();
    });
  });
});
