"use client";

import React, { createContext, useContext, useState } from "react";
import {
  ELIGIBLE_COMPANY,
  ELIGIBLE_CRITERIA,
  EligibilityCriterion,
} from "@/lib/mock-data";

interface AppState {
  company: typeof ELIGIBLE_COMPANY | null;
  isEligible: boolean;
  criteria: EligibilityCriterion[];
  isNrgpListed: boolean;
  disbursementType: "auto" | "manual";
  uploadedFiles: Record<string, { name: string; size: number }[]>;
  applicationRef: string;
  currentStep: number;
}

interface AppContextType {
  state: AppState;
  setCompany: (company: typeof ELIGIBLE_COMPANY) => void;
  setEligibility: (eligible: boolean, criteria: EligibilityCriterion[]) => void;
  setNrgpStatus: (listed: boolean) => void;
  addFile: (section: string, file: { name: string; size: number }) => void;
  setStep: (step: number) => void;
  toggleNrgpForDemo: () => void;
}

const defaultState: AppState = {
  company: null,
  isEligible: true,
  criteria: ELIGIBLE_CRITERIA,
  isNrgpListed: true,
  disbursementType: "auto",
  uploadedFiles: {},
  applicationRef: "QDB-RELIEF-2025-00847",
  currentStep: 0,
};

const AppContext = createContext<AppContextType>({
  state: defaultState,
  setCompany: () => {},
  setEligibility: () => {},
  setNrgpStatus: () => {},
  addFile: () => {},
  setStep: () => {},
  toggleNrgpForDemo: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);

  const setCompany = (company: typeof ELIGIBLE_COMPANY) => {
    setState((prev) => ({ ...prev, company }));
  };

  const setEligibility = (eligible: boolean, criteria: EligibilityCriterion[]) => {
    setState((prev) => ({ ...prev, isEligible: eligible, criteria }));
  };

  const setNrgpStatus = (listed: boolean) => {
    setState((prev) => ({
      ...prev,
      isNrgpListed: listed,
      disbursementType: listed ? "auto" : "manual",
    }));
  };

  const addFile = (section: string, file: { name: string; size: number }) => {
    setState((prev) => ({
      ...prev,
      uploadedFiles: {
        ...prev.uploadedFiles,
        [section]: [...(prev.uploadedFiles[section] || []), file],
      },
    }));
  };

  const setStep = (step: number) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  };

  const toggleNrgpForDemo = () => {
    setState((prev) => {
      const newListed = !prev.isNrgpListed;
      return {
        ...prev,
        isNrgpListed: newListed,
        disbursementType: newListed ? "auto" : "manual",
      };
    });
  };

  return (
    <AppContext.Provider
      value={{
        state,
        setCompany,
        setEligibility,
        setNrgpStatus,
        addFile,
        setStep,
        toggleNrgpForDemo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
