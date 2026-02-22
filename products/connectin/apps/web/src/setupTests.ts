import "@testing-library/jest-dom";

// Global react-i18next mock: t(key) returns the key so tests remain
// locale-independent and don't require a full i18n provider setup.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: "en", dir: () => "ltr" },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: "3rdParty", init: jest.fn() },
}));
