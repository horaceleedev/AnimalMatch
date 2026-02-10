import { useEffect, useState } from 'react';
import { Crop, Individual } from '../types';
import {
  preprocessImage,
  getEmbeddingWithFallback,
  cosineSimilarity,
  type EmbeddingModelSpec,
  DEFAULT_EMBEDDING_MODEL_SPEC,
  DEFAULT_MODEL_URL,
  loadImageFromUrl,
} from '../lib/embeddingModel';
import { useEmbeddingModel } from './useEmbeddingModel';

type EmbeddingData = {
  cropId: string;
  individualId: string;
  embedding: Float32Array;
};

type IdentificationCandidate = {
  id: string;
  label: string;
  score: number;
  probability: number;
  thumbnailUrl?: string;
  bestMatchScore?: number; // score of the best matching crop for this individual
  avgScore?: number; // average score across all crops for this individual
};

type IdentificationResult = {
  candidates: IdentificationCandidate[];
  isLoading: boolean;
  error: string | null;
};

// TODO: Move embedding cache to a shared (DB-backed) cache for persistence and cross-session reuse.
const embeddingCache = new Map<string, Float32Array>();

function makeEmbeddingCacheKey(modelUrl: string, imageUrl: string): string {
  return `${modelUrl}::${imageUrl}`;
}

async function loadImageFromUrl(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageUrl;
  });
}

function softmax(scores: number[], temperature: number = 10): number[] {
  const expScores = scores.map(s => Math.exp(s / temperature));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  return expScores.map(s => s / sumExp);
}

export function useIdentifyIndividual(
  crop: Crop | null,
  allCrops: Crop[],
  individuals: Individual[],
  precomputedEmbeddings?: Map<string, EmbeddingData>,
  modelUrl: string = DEFAULT_MODEL_URL,
  modelSpec: EmbeddingModelSpec = DEFAULT_EMBEDDING_MODEL_SPEC
): IdentificationResult {
  const [result, setResult] = useState<IdentificationResult>({
    candidates: [],
    isLoading: false,
    error: null,
  });
  const { session, isLoading: isModelLoading, error: modelError } = useEmbeddingModel(modelUrl);

  useEffect(() => {
    console.log('[useIdentifyIndividual] effect start', {
      cropId: crop?.id ?? null,
      allCropsCount: allCrops.length,
      individualsCount: individuals.length,
      modelUrl,
      isModelLoading,
      modelError,
      hasSession: !!session,
    });

    if (!crop) {
      console.log('[useIdentifyIndividual] no crop, skipping');
      setResult({ candidates: [], isLoading: false, error: null });
      return;
    }
    if (isModelLoading) {
      console.log('[useIdentifyIndividual] model loading, waiting');
      setResult(prev => ({ ...prev, isLoading: true, error: null }));
      return;
    }

    if (modelError) {
      console.warn('[useIdentifyIndividual] model error', modelError);
      setResult({ candidates: [], isLoading: false, error: modelError });
      return;
    }

    if (!session) {
      console.warn('[useIdentifyIndividual] no session, skipping');
      setResult({ candidates: [], isLoading: false, error: 'Model not available' });
      return;
    }

    let cancelled = false;

    async function identifyCrop() {
      setResult(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log('[useIdentifyIndividual] Starting identification for crop:', crop!.id);
        console.log('[useIdentifyIndividual] Total crops available:', allCrops.length);

        // Load model
        console.log('[useIdentifyIndividual] Loading model...');
        console.log('[useIdentifyIndividual] Model loaded successfully');

        // Load and preprocess query image
        console.log('[useIdentifyIndividual] Loading query image:', crop!.imageUrl);
        const queryImg = await loadImageFromUrl(crop!.imageUrl);
        const queryKey = makeEmbeddingCacheKey(modelUrl, crop!.imageUrl);
        let queryEmbedding = embeddingCache.get(queryKey);
        if (!queryEmbedding) {
          const queryImg = await loadImageFromUrl(crop!.imageUrl);
          const queryTensor = preprocessImage(queryImg, modelSpec);
          queryEmbedding = await getEmbeddingWithFallback(session, queryTensor, modelUrl, true, modelSpec);
          embeddingCache.set(queryKey, queryEmbedding);
        }
        console.log('[useIdentifyIndividual] Query embedding computed, length:', queryEmbedding.length);

        if (cancelled) return;

        // Get all crops that belong to individuals (exclude the query crop)
        const galleryCrops = allCrops.filter(c =>
          c.body_part === 'face' &&
          c.individual &&
          c.id !== crop!.id &&
          c.imageUrl !== crop!.imageUrl
        );
        console.log('[useIdentifyIndividual] Gallery crops with individuals:', galleryCrops.length);
        

        // Compute embeddings for gallery crops (in production, these would be pre-computed)
        const galleryData: Array<{ crop: Crop; embedding: Float32Array }> = [];
        
        console.log('[useIdentifyIndividual] Computing embeddings for gallery crops...');
        for (const galleryCrop of galleryCrops) {
          try {
            const cacheKey = makeEmbeddingCacheKey(modelUrl, galleryCrop.imageUrl);
            let embedding = embeddingCache.get(cacheKey);
            if (!embedding) {
              const img = await loadImageFromUrl(galleryCrop.imageUrl);
              const tensor = preprocessImage(img, modelSpec);
              embedding = await getEmbeddingWithFallback(session, tensor, modelUrl, true, modelSpec);
              embeddingCache.set(cacheKey, embedding);
            }
            galleryData.push({ crop: galleryCrop, embedding });
            
          } catch (err) {
            console.warn(`[useIdentifyIndividual] Failed to process crop ${galleryCrop.id}:`, err);
          }
          
          if (cancelled) return;
        }
        console.log('[useIdentifyIndividual] Total gallery embeddings computed:', galleryData.length);

        // Compute similarities and group by individual
        const individualScores = new Map<string, { scores: number[]; individual: Individual }>();

        console.log('[useIdentifyIndividual] Computing similarities...');
        for (const { crop: galleryCrop, embedding } of galleryData) {
          const similarity = cosineSimilarity(queryEmbedding, embedding);
          const individualId = galleryCrop.individual;
          
          
          if (!individualScores.has(individualId)) {
            const individual = individuals.find(ind => ind.id === individualId);
            if (individual) {
              individualScores.set(individualId, { scores: [], individual });
            } else {
              console.warn(`[useIdentifyIndividual] Individual ${individualId} not found in individuals list`);
            }
          }
          
          individualScores.get(individualId)?.scores.push(similarity);
        }
        console.log('[useIdentifyIndividual] Unique individuals with scores:', individualScores.size);

        // Build candidates with best match and average scores
        const candidates: IdentificationCandidate[] = [];
        
        console.log('[useIdentifyIndividual] Building candidates...');
        for (const [individualId, { scores, individual }] of individualScores.entries()) {
          const bestScore = Math.max(...scores);
          const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          
          
          
          candidates.push({
            id: individualId,
            label: individual.name || `Individual ${individualId}`,
            score: bestScore,
            probability: 0, // Will be set after softmax
            bestMatchScore: bestScore,
            avgScore: avgScore,
          });
        }

        // Sort by best match score
        candidates.sort((a, b) => (b.bestMatchScore ?? b.score) - (a.bestMatchScore ?? a.score));
        console.log('[useIdentifyIndividual] Total candidates built:', candidates.length);

        // Apply softmax to get probabilities
        const topK = 5;
        const topCandidates = candidates.slice(0, topK);
        const probabilities = softmax(topCandidates.map(c => c.score));
        
        topCandidates.forEach((candidate, i) => {
          candidate.probability = probabilities[i];
        });

        console.log('[useIdentifyIndividual] Top candidates:', topCandidates.map(c => ({ 
          label: c.label, 
          probability: c.probability.toFixed(4),
          bestMatch: c.bestMatchScore?.toFixed(4)
        })));

        if (!cancelled) {
          setResult({
            candidates,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        console.error('[useIdentifyIndividual] Error during identification:', err);
        if (!cancelled) {
          setResult({
            candidates: [],
            isLoading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    identifyCrop();

    return () => {
      cancelled = true;
    };
  }, [crop?.id, allCrops, individuals, isModelLoading, modelError, session]);

  return result;
}
