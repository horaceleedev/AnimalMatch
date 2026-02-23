import { useEffect, useState } from 'react';
import { Crop } from '../types';
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

type CompareCropsResult = {
  bestScore: number | null;
  avgTopK: number | null;
  pairCount: number;
  isLoading: boolean;
  error: string | null;
};

const embeddingCache = new Map<string, Float32Array>();

function makeEmbeddingCacheKey(modelUrl: string, imageUrl: string): string {
  return `${modelUrl}::${imageUrl}`;
}

export function useCompareCrops(
  cropA: Crop | null,
  cropB: Crop | null,
  modelUrl: string = DEFAULT_MODEL_URL,
  modelSpec: EmbeddingModelSpec = DEFAULT_EMBEDDING_MODEL_SPEC
): CompareCropsResult {
  const [result, setResult] = useState<CompareCropsResult>({
    bestScore: null,
    avgTopK: null,
    pairCount: 0,
    isLoading: false,
    error: null,
  });

  const { session, isLoading: isModelLoading, error: modelError } = useEmbeddingModel(modelUrl);

  useEffect(() => {
    if (!cropA || !cropB) {
      setResult({ bestScore: null, avgTopK: null, pairCount: 0, isLoading: false, error: null });
      return;
    }

    if (isModelLoading) {
      setResult(prev => ({ ...prev, isLoading: true, error: null }));
      return;
    }

    if (modelError) {
      setResult({ bestScore: null, avgTopK: null, pairCount: 0, isLoading: false, error: modelError });
      return;
    }

    if (!session) {
      setResult({ bestScore: null, avgTopK: null, pairCount: 0, isLoading: false, error: 'Model not available' });
      return;
    }

    let cancelled = false;

    async function compareCrops() {
      setResult(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        if (!cropA.imageUrl || !cropB.imageUrl) {
          setResult({
            bestScore: null,
            avgTopK: null,
            pairCount: 0,
            isLoading: false,
            error: 'Missing image for comparison',
          });
          return;
        }

        const keyA = makeEmbeddingCacheKey(modelUrl, cropA.imageUrl);
        let embeddingA = embeddingCache.get(keyA);
        if (!embeddingA) {
          const imgA = await loadImageFromUrl(cropA.imageUrl);
          const tensorA = preprocessImage(imgA, modelSpec);
          embeddingA = await getEmbeddingWithFallback(session, tensorA, modelUrl, true, modelSpec);
          embeddingCache.set(keyA, embeddingA);
        }
        if (cancelled) return;

        const keyB = makeEmbeddingCacheKey(modelUrl, cropB.imageUrl);
        let embeddingB = embeddingCache.get(keyB);
        if (!embeddingB) {
          const imgB = await loadImageFromUrl(cropB.imageUrl);
          const tensorB = preprocessImage(imgB, modelSpec);
          embeddingB = await getEmbeddingWithFallback(session, tensorB, modelUrl, true, modelSpec);
          embeddingCache.set(keyB, embeddingB);
        }
        if (cancelled) return;

        const score = cosineSimilarity(embeddingA, embeddingB);

        if (!cancelled) {
          setResult({
            bestScore: score,
            avgTopK: score,
            pairCount: 1,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setResult({
            bestScore: null,
            avgTopK: null,
            pairCount: 0,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    compareCrops();

    return () => {
      cancelled = true;
    };
  }, [cropA?.id, cropB?.id, cropA?.imageUrl, cropB?.imageUrl, isModelLoading, modelError, session, modelUrl, modelSpec]);

  return result;
}
