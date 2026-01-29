import { useMemo } from 'react';
import useCasesData from '../data/use-cases.json';
import { UseCaseSchema, UseCase } from '../types';

export function useUseCases(): UseCase[] {
  return useMemo(() => {
    // Validate data with Zod schema
    return useCasesData.map((data) => UseCaseSchema.parse(data));
  }, []);
}

export function useUseCaseBySlug(slug: string): UseCase | undefined {
  const useCases = useUseCases();
  return useMemo(() => {
    return useCases.find((uc) => uc.slug === slug);
  }, [useCases, slug]);
}

export function useUseCasesByIds(ids: string[]): UseCase[] {
  const useCases = useUseCases();
  return useMemo(() => {
    return useCases.filter((uc) => ids.includes(uc.id));
  }, [useCases, ids]);
}
