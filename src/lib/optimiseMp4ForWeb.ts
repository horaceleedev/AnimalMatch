interface OptimiseMp4Request {
  id: string;
  file: File;
}

interface OptimiseMp4Response {
  id: string;
  file?: File;
  wasOptimised?: boolean;
  error?: string;
}

export interface OptimiseMp4ForWebResult {
  file: File;
  wasOptimised: boolean;
}

const createWorkerRequestId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const optimiseMp4ForWeb = (file: File): Promise<OptimiseMp4ForWebResult> => {
  const worker = new Worker(new URL("./mp4FastStart.worker.ts", import.meta.url), { type: "module" });
  const id = createWorkerRequestId();

  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<OptimiseMp4Response>) => {
      if (event.data.id !== id) return;

      worker.terminate();

      if (event.data.error || !event.data.file) {
        reject(new Error(event.data.error || "Video web optimisation failed."));
        return;
      }

      resolve({
        file: event.data.file,
        wasOptimised: Boolean(event.data.wasOptimised),
      });
    };

    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "Video web optimisation failed."));
    };

    const request: OptimiseMp4Request = { id, file };
    worker.postMessage(request);
  });
};
