import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/register",
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "register.title": "Join ConnectIn",
        "register.subtitle": "Create your professional profile",
        "register.submit": "Create Account",
        "register.hasAccount": "Already have an account?",
        "register.login": "Log In",
        "register.terms": "I agree to the",
        "register.termsLink": "Terms of Service",
        "register.and": "and",
        "register.privacyLink": "Privacy Policy",
        "fields.displayName": "Display Name",
        "fields.email": "Email",
        "fields.password": "Password",
        "fields.confirmPassword": "Confirm Password",
        "validation.nameRequired": "Display name is required",
        "validation.emailRequired": "Email is required",
        "validation.emailInvalid": "Please enter a valid email address",
        "validation.passwordRequired": "Password is required",
        "validation.passwordMin":
          "Password must be at least 8 characters",
        "validation.passwordUpper":
          "Must contain at least one uppercase letter",
        "validation.passwordNumber":
          "Must contain at least one number",
        "validation.passwordSpecial":
          "Must contain at least one special character",
        "validation.termsRequired": "You must agree to the terms",
        "passwordHint": "8+ chars, 1 uppercase, 1 number, 1 special character",
      };
      return translations[key] || key;
    },
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

// Mock auth context
const mockRegister = jest.fn();
jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({
    register: mockRegister,
    isLoading: false,
    error: null,
    isAuthenticated: false,
  }),
}));

import RegisterPage from "../register/page";

describe("RegisterPage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders register form with all fields", () => {
    render(<RegisterPage />);

    expect(screen.getByText("Join ConnectIn")).toBeInTheDocument();
    expect(
      screen.getByText("Create your professional profile")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Account" })
    ).toBeInTheDocument();
  });

  it("shows validation error for empty display name", async () => {
    render(<RegisterPage />);

    await user.click(
      screen.getByRole("button", { name: "Create Account" })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Display name is required")
      ).toBeInTheDocument();
    });
  });

  it("shows validation error for invalid email", async () => {
    render(<RegisterPage />);

    await user.type(screen.getByLabelText("Display Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "invalid");
    await user.click(
      screen.getByRole("button", { name: "Create Account" })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Please enter a valid email address")
      ).toBeInTheDocument();
    });
  });

  it("shows validation error for short password", async () => {
    render(<RegisterPage />);

    await user.type(screen.getByLabelText("Display Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(
      screen.getByRole("button", { name: "Create Account" })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters")
      ).toBeInTheDocument();
    });
  });

  it("calls register with valid data on submit", async () => {
    mockRegister.mockResolvedValue(true);
    render(<RegisterPage />);

    await user.type(screen.getByLabelText("Display Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "Password1!");
    await user.type(
      screen.getByLabelText("Confirm Password"),
      "Password1!"
    );
    await user.click(
      screen.getByRole("button", { name: "Create Account" })
    );

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        "Test User",
        "test@example.com",
        "Password1!"
      );
    });
  });

  it("redirects to feed on successful registration", async () => {
    mockRegister.mockResolvedValue(true);
    render(<RegisterPage />);

    await user.type(screen.getByLabelText("Display Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "Password1!");
    await user.type(
      screen.getByLabelText("Confirm Password"),
      "Password1!"
    );
    await user.click(
      screen.getByRole("button", { name: "Create Account" })
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/feed");
    });
  });

  it("has link to login page", () => {
    render(<RegisterPage />);

    const loginLink = screen.getByText("Log In");
    expect(loginLink.closest("a")).toHaveAttribute("href", "/login");
  });

  it("shows password requirements hint", () => {
    render(<RegisterPage />);

    expect(
      screen.getByText("8+ chars, 1 uppercase, 1 number, 1 special character")
    ).toBeInTheDocument();
  });
});
