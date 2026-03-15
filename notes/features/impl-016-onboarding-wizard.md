# IMPL-016: Onboarding Wizard

## Task
Build 4-step onboarding wizard at /onboarding route for CTOaaS.

## Key Decisions
- Uses existing dashboard layout (sidebar + main)
- React Hook Form + Zod per step
- API: GET /api/v1/onboarding/step/current, PUT /api/v1/onboarding/step/:step, PUT /api/v1/onboarding/complete
- Step 1 required, steps 2-4 skippable
- Indigo accent (matching auth pages)

## Files Created
- src/app/(dashboard)/onboarding/page.tsx
- src/components/onboarding/Step1CompanyBasics.tsx
- src/components/onboarding/Step2TechStack.tsx
- src/components/onboarding/Step3Challenges.tsx
- src/components/onboarding/Step4Preferences.tsx
- src/components/onboarding/StepIndicator.tsx
- src/components/onboarding/SearchableMultiSelect.tsx
- src/lib/validations/onboarding.ts
- Tests in __tests__ directories

## Patterns Followed
- Same mock pattern as login tests (jest.mock next/navigation, @/lib/api)
- Same form pattern as login (useForm + zodResolver)
- Same styling: indigo accent, gray borders, min-h-[48px] touch targets
