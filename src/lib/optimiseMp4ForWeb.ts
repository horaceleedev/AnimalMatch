import type { OptimiseMp4Response } from "./mp4FastStart.worker";

export interface OptimiseMp4ForWebResult {
  file: File;
  wasOptimised: boolean;
}

export const optimiseMp4ForWeb = (file: File): Promise<OptimiseMp4ForWebResult> => {
  const worker = new Worker(new URL("./mp4FastStart.worker.ts", import.meta.url), { type: "module" });

  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<OptimiseMp4Response>) => {
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

    worker.postMessage(file);
  });
};
