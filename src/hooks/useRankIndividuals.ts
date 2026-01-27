import { useEffect, useState } from 'react';
import { Crop, Individual } from '../types';
import { useEmbeddingModel } from './useEmbeddingModel';
import {
  DEFAULT_MODEL_URL,
  DEFAULT_EMBEDDING_MODEL_SPEC,
  type EmbeddingModelSpec,
  loadImageFromUrl,
  preprocessImage,
  getEmbeddingWithFallback,
  cosineSimilarity,
} from '../lib/embeddingModel';

type IndividualRank = {
  bestScore: number | null;
  avgTopK: number | null;
  pairCount: number;
};

type RankIndividualsResult = {
  scoresById: Map<string, IndividualRank>;
  isLoading: boolean;
  error: string | null;
};

const embeddingCache = new Map<string, Float32Array>();

function makeEmbeddingCacheKey(modelUrl: string, imageUrl: string): string {
  return `${modelUrl}::${imageUrl}`;
}

export function useRankIndividuals(
  baseIndividual: Individual | null,
  candidates: Individual[],
  allCrops: Crop[],
  modelUrl: string = DEFAULT_MODEL_URL,
  modelSpec: EmbeddingModelSpec = DEFAULT_EMBEDDING_MODEL_SPEC,
  topK: number = 5
): RankIndividualsResult {
  const [result, setResult] = useState<RankIndividualsResult>({
    scoresById: new Map(),
    isLoading: false,
    error: null,
  });

  const { session, isLoading: isModelLoading, error: modelError } = useEmbeddingModel(modelUrl);

  useEffect(() => {
    if (!baseIndividual || candidates.length === 0) {
      setResult({ scoresById: new Map(), isLoading: false, error: null });
      return;
    }

    if (isModelLoading) {
      setResult(prev => ({ ...prev, isLoading: true, error: null }));
      return;
    }

    if (modelError) {
      setResult({ scoresById: new Map(), isLoading: false, error: modelError });
      return;
    }

    if (!session) {
      setResult({ scoresById: new Map(), isLoading: false, error: 'Model not available' });
      return;
    }

    let cancelled = false;

    async function rankIndividuals() {
      setResult(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const baseFaceCrops = allCrops.filter(c =>
          c.individual === baseIndividual.id && c.body_part === 'face' && c.imageUrl
        );
        if (baseFaceCrops.length === 0) {
          setResult({ scoresById: new Map(), isLoading: false, error: 'No face crops for base individual' });
          return;
        }

        const baseEmbeddings: Float32Array[] = [];
        for (const crop of baseFaceCrops) {
          const key = makeEmbeddingCacheKey(modelUrl, crop.imageUrl!);
          let embedding = embeddingCache.get(key);
          if (!embedding) {
            const img = await loadImageFromUrl(crop.imageUrl!);
            const tensor = preprocessImage(img, modelSpec);
            embedding = await getEmbeddingWithFallback(session, tensor, modelUrl, true, modelSpec);
            embeddingCache.set(key, embedding);
          }
          baseEmbeddings.push(embedding);
          if (cancelled) return;
        }

        const scoresById = new Map<string, IndividualRank>();
        for (const candidate of candidates) {
          const candidateFaceCrops = allCrops.filter(c =>
            c.individual === candidate.id && c.body_part === 'face' && c.imageUrl
          );
          if (candidateFaceCrops.length === 0) {
            scoresById.set(candidate.id, { bestScore: null, avgTopK: null, pairCount: 0 });
            continue;
          }

          const candidateEmbeddings: Float32Array[] = [];
          for (const crop of candidateFaceCrops) {
            const key = makeEmbeddingCacheKey(modelUrl, crop.imageUrl!);
            let embedding = embeddingCache.get(key);
            if (!embedding) {
              const img = await loadImageFromUrl(crop.imageUrl!);
              const tensor = preprocessImage(img, modelSpec);
              embedding = await getEmbeddingWithFallback(session, tensor, modelUrl, true, modelSpec);
              embeddingCache.set(key, embedding);
            }
            candidateEmbeddings.push(embedding);
            if (cancelled) return;
          }

          const scores: number[] = [];
          for (const embA of baseEmbeddings) {
            for (const embB of candidateEmbeddings) {
              scores.push(cosineSimilarity(embA, embB));
            }
          }
          scores.sort((a, b) => b - a);
          const topScores = scores.slice(0, topK);
          const bestScore = scores.length > 0 ? scores[0] : null;
          const avgTopK = topScores.length > 0
            ? topScores.reduce((a, b) => a + b, 0) / topScores.length
            : null;

          scoresById.set(candidate.id, {
            bestScore,
            avgTopK,
            pairCount: scores.length,
          });
        }

        if (!cancelled) {
          setResult({ scoresById, isLoading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setResult({
            scoresById: new Map(),
            isLoading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    rankIndividuals();

    return () => {
      cancelled = true;
    };
  }, [baseIndividual?.id, candidates, allCrops, isModelLoading, modelError, session, modelUrl, modelSpec, topK]);

  return result;
}
