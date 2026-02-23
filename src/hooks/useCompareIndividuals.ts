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

type CompareIndividualsResult = {
  bestScore: number | null;
  avgTopK: number | null;
  topScores: number[];
  pairCount: number;
  isLoading: boolean;
  error: string | null;
};

const embeddingCache = new Map<string, Float32Array>();

function makeEmbeddingCacheKey(modelUrl: string, imageUrl: string): string {
  return `${modelUrl}::${imageUrl}`;
}

export function useCompareIndividuals(
  individualA: Individual | null,
  individualB: Individual | null,
  allCrops: Crop[],
  modelUrl: string = DEFAULT_MODEL_URL,
  modelSpec: EmbeddingModelSpec = DEFAULT_EMBEDDING_MODEL_SPEC,
  topK: number = 5
): CompareIndividualsResult {
  const [result, setResult] = useState<CompareIndividualsResult>({
    bestScore: null,
    avgTopK: null,
    topScores: [],
    pairCount: 0,
    isLoading: false,
    error: null,
  });

  const { session, isLoading: isModelLoading, error: modelError } = useEmbeddingModel(modelUrl);

  useEffect(() => {
    if (!individualA || !individualB) {
      setResult({ bestScore: null, avgTopK: null, topScores: [], pairCount: 0, isLoading: false, error: null });
      return;
    }

    if (isModelLoading) {
      setResult(prev => ({ ...prev, isLoading: true, error: null }));
      return;
    }

    if (modelError) {
      setResult({ bestScore: null, avgTopK: null, topScores: [], pairCount: 0, isLoading: false, error: modelError });
      return;
    }

    if (!session) {
      setResult({ bestScore: null, avgTopK: null, topScores: [], pairCount: 0, isLoading: false, error: 'Model not available' });
      return;
    }

    let cancelled = false;

    async function compareIndividuals() {
      setResult(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const faceCropsA = allCrops.filter(c =>
          c.individual === individualA.id && c.body_part === 'face' && c.imageUrl
        );
        const faceCropsB = allCrops.filter(c =>
          c.individual === individualB.id && c.body_part === 'face' && c.imageUrl
        );

        if (faceCropsA.length === 0 || faceCropsB.length === 0) {
          setResult({
            bestScore: null,
            avgTopK: null,
            topScores: [],
            pairCount: 0,
            isLoading: false,
            error: 'No face crops available for one or both individuals',
          });
          return;
        }

        const embeddingsA: Float32Array[] = [];
        for (const crop of faceCropsA) {
          const key = makeEmbeddingCacheKey(modelUrl, crop.imageUrl!);
          let embedding = embeddingCache.get(key);
          if (!embedding) {
            const img = await loadImageFromUrl(crop.imageUrl!);
            const tensor = preprocessImage(img, modelSpec);
            embedding = await getEmbeddingWithFallback(session, tensor, modelUrl, true, modelSpec);
            embeddingCache.set(key, embedding);
          }
          embeddingsA.push(embedding);
          if (cancelled) return;
        }

        const embeddingsB: Float32Array[] = [];
        for (const crop of faceCropsB) {
          const key = makeEmbeddingCacheKey(modelUrl, crop.imageUrl!);
          let embedding = embeddingCache.get(key);
          if (!embedding) {
            const img = await loadImageFromUrl(crop.imageUrl!);
            const tensor = preprocessImage(img, modelSpec);
            embedding = await getEmbeddingWithFallback(session, tensor, modelUrl, true, modelSpec);
            embeddingCache.set(key, embedding);
          }
          embeddingsB.push(embedding);
          if (cancelled) return;
        }

        const scores: number[] = [];
        for (const embA of embeddingsA) {
          for (const embB of embeddingsB) {
            scores.push(cosineSimilarity(embA, embB));
          }
        }

        scores.sort((a, b) => b - a);
        const topScores = scores.slice(0, topK);
        const bestScore = scores.length > 0 ? scores[0] : null;
        const avgTopK = topScores.length > 0
          ? topScores.reduce((a, b) => a + b, 0) / topScores.length
          : null;

        if (!cancelled) {
          setResult({
            bestScore,
            avgTopK,
            topScores,
            pairCount: scores.length,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setResult({
            bestScore: null,
            avgTopK: null,
            topScores: [],
            pairCount: 0,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    compareIndividuals();

    return () => {
      cancelled = true;
    };
  }, [individualA?.id, individualB?.id, allCrops, isModelLoading, modelError, session, modelUrl, modelSpec, topK]);

  return result;
}
