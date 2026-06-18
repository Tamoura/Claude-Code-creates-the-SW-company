"use client";

import { CopilotKit } from "@copilotkit/react-core";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5015";

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CopilotKit runtimeUrl={`${API_URL}/api/v1/copilot`}>
      {children}
    </CopilotKit>
  );
}
