import { useEffect, useState } from 'react';
import * as ort from 'onnxruntime-web';
import { loadModelFromUrl } from '../lib/embeddingModel';

type EmbeddingModelState = {
  session: ort.InferenceSession | null;
  isLoading: boolean;
  error: string | null;
};

const modelSessions = new Map<string, ort.InferenceSession>();
const modelPromises = new Map<string, Promise<ort.InferenceSession>>();

async function getModel(modelUrl: string): Promise<ort.InferenceSession> {
  const cached = modelSessions.get(modelUrl);
  if (cached) return cached;

  const inFlight = modelPromises.get(modelUrl);
  if (inFlight) return inFlight;

  const promise = loadModelFromUrl(modelUrl).then(session => {
    modelSessions.set(modelUrl, session);
    modelPromises.delete(modelUrl);
    return session;
  });
  modelPromises.set(modelUrl, promise);
  return promise;
}

export function useEmbeddingModel(modelUrl: string): EmbeddingModelState & { preload: () => Promise<ort.InferenceSession> } {
  const [state, setState] = useState<EmbeddingModelState>(() => {
    const cached = modelSessions.get(modelUrl) ?? null;
    return { session: cached, isLoading: !cached, error: null };
  });

  useEffect(() => {
    if (!modelUrl) return;

    const cached = modelSessions.get(modelUrl) ?? null;
    if (cached) {
      setState({ session: cached, isLoading: false, error: null });
      return;
    }

    let cancelled = false;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    getModel(modelUrl)
      .then(session => {
        if (!cancelled) setState({ session, isLoading: false, error: null });
      })
      .catch(err => {
        if (!cancelled) {
          setState({
            session: null,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [modelUrl]);

  return {
    ...state,
    preload: () => getModel(modelUrl),
  };
}
