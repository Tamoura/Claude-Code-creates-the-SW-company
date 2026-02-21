import React from "react";
import { render, screen } from "@testing-library/react";

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
        "landing.hero.title":
          "Your Professional Network,\nBuilt Arabic-First",
        "landing.hero.subtitle":
          "AI-powered networking for Arab tech professionals worldwide",
        "landing.hero.cta": "Get Started -- Free",
        "landing.hero.login": "Log In",
        "landing.features.ai.title": "AI-Native",
        "landing.features.ai.description":
          "AI profile optimizer and smart matching",
        "landing.features.arabic.title": "Arabic-First",
        "landing.features.arabic.description":
          "RTL-native design and bilingual content",
        "landing.features.privacy.title": "Privacy-First",
        "landing.features.privacy.description":
          "Your data, your control",
        "landing.features.openSource.title": "Open Source",
        "landing.features.openSource.description":
          "Community-driven open platform",
        "landing.footer.about": "About",
        "landing.footer.privacy": "Privacy",
        "landing.footer.terms": "Terms",
        "landing.footer.contact": "Contact",
        "landing.footer.copyright":
          "ConnectIn. All rights reserved.",
        "app.name": "ConnectIn",
      };
      return translations[key] || key;
    },
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

import LandingPage from "../page";

describe("LandingPage", () => {
  it("renders hero section with title and subtitle", () => {
    render(<LandingPage />);

    expect(
      screen.getByText(/Your Professional Network/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "AI-powered networking for Arab tech professionals worldwide"
      )
    ).toBeInTheDocument();
  });

  it("renders CTA button linking to register", () => {
    render(<LandingPage />);

    const cta = screen.getByText("Get Started -- Free");
    expect(cta.closest("a")).toHaveAttribute("href", "/register");
  });

  it("renders login link", () => {
    render(<LandingPage />);

    const login = screen.getByText("Log In");
    expect(login.closest("a")).toHaveAttribute("href", "/login");
  });

  it("renders all four feature cards", () => {
    render(<LandingPage />);

    expect(screen.getByText("AI-Native")).toBeInTheDocument();
    expect(screen.getByText("Arabic-First")).toBeInTheDocument();
    expect(screen.getByText("Privacy-First")).toBeInTheDocument();
    expect(screen.getByText("Open Source")).toBeInTheDocument();
  });

  it("renders feature descriptions", () => {
    render(<LandingPage />);

    expect(
      screen.getByText("AI profile optimizer and smart matching")
    ).toBeInTheDocument();
    expect(
      screen.getByText("RTL-native design and bilingual content")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your data, your control")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Community-driven open platform")
    ).toBeInTheDocument();
  });

  it("renders footer with links", () => {
    render(<LandingPage />);

    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
    expect(screen.getByText("Terms")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });
});
