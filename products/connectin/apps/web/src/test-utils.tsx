import type { User } from "@/types";

// Mock auth context value
interface MockAuthValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: jest.Mock;
  register: jest.Mock;
  logout: jest.Mock;
}

export function createMockAuth(
  overrides: Partial<MockAuthValue> = {}
): MockAuthValue {
  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    error: null,
    login: jest.fn().mockResolvedValue(true),
    register: jest.fn().mockResolvedValue(true),
    logout: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
