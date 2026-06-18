import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        jsx: "react-jsx",
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^react$": "<rootDir>/../../../../node_modules/.pnpm/react@18.3.1/node_modules/react",
    "^react/(.*)$": "<rootDir>/../../../../node_modules/.pnpm/react@18.3.1/node_modules/react/$1",
    "^react-dom$": "<rootDir>/../../../../node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom",
    "^react-dom/(.*)$": "<rootDir>/../../../../node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/$1",
    "^next/link$": "<rootDir>/src/__mocks__/next/link.js",
    "^next/navigation$": "<rootDir>/src/__mocks__/next/navigation.ts",
    "\\.(css|less|scss|sass)$": "<rootDir>/src/__mocks__/styleMock.ts",
    "\\.(jpg|jpeg|png|gif|webp|svg|ico)$":
      "<rootDir>/src/__mocks__/fileMock.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/__mocks__/**",
    "!src/types/**",
  ],
  coverageThreshold: {
    global: {
      branches: 45,
      functions: 50,
      lines: 60,
      statements: 60,
    },
  },
};

export default config;
