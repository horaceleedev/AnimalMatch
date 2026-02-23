import { Crop, Individual } from '../types';
import { useIdentifyIndividual } from './useIdentifyIndividual';

type CropToIndividualResult = {
  bestScore: number | null;
  avgTopK: number | null;
  pairCount: number;
  isLoading: boolean;
  error: string | null;
};

export function useCompareCropToIndividual(
  crop: Crop | null,
  individual: Individual | null,
  allCrops: Crop[],
  allIndividuals: Individual[]
): CropToIndividualResult {
  const result = useIdentifyIndividual(crop, allCrops, allIndividuals);
  const candidate = individual
    ? result.candidates.find(c => c.id === individual.id)
    : undefined;
  const pairCount = (crop && individual)
    ? allCrops.filter(c =>
        c.body_part === 'face' &&
        c.individual === individual.id &&
        c.imageUrl &&
        c.id !== crop.id &&
        c.imageUrl !== crop.imageUrl
      ).length
    : 0;

  return {
    bestScore: candidate?.bestMatchScore ?? candidate?.score ?? null,
    avgTopK: candidate?.avgScore ?? null,
    pairCount,
    isLoading: result.isLoading,
    error: result.error,
  };
}
