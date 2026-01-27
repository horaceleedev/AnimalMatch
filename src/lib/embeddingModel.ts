import * as ort from "onnxruntime-web";

// Vite will rewrite these into URLs in the built output.
const mjsUrl = new URL("../assets/onnxruntime/ort-wasm-simd-threaded.jsep.mjs", import.meta.url).toString();
const wasmUrl = new URL("../assets/onnxruntime/ort-wasm-simd-threaded.jsep.wasm", import.meta.url).toString();

ort.env.wasm.wasmPaths = { mjs: mjsUrl, wasm: wasmUrl };

ort.env.wasm.numThreads = 1;   // disable WASM threading (Vite cannot support it)
// Vite won't transform /public .mjs imports; use direct fetch-based loading instead.
ort.env.wasm.proxy = true;
ort.env.wasm.simd = true;      // SIMD OK
ort.env.logLevel = "warning";

/* -------------------------
   Defaults (can be overridden per model)
   ------------------------- */
export type EmbeddingModelSpec = {
  inputName: string;
  outputName: string;
  inputWidth: number;
  inputHeight: number;
  mean: [number, number, number];
  std: [number, number, number];
};

export const DEFAULT_EMBEDDING_MODEL_SPEC: EmbeddingModelSpec = {
  inputName: "x",
  outputName: "embeddings",
  inputWidth: 440,
  inputHeight: 440,
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],
};

export const DEFAULT_MODEL_URL = "/models/miewid.onnx";

const wasmFallbackSessions = new Map<string, ort.InferenceSession>();
const sessionLocks = new WeakMap<ort.InferenceSession, Promise<void>>();

async function withSessionLock<T>(session: ort.InferenceSession, fn: () => Promise<T>): Promise<T> {
  const tail = sessionLocks.get(session) ?? Promise.resolve();
  let release: () => void = () => {};
  const next = new Promise<void>(resolve => {
    release = resolve;
  });
  const newTail = tail.then(() => next);
  sessionLocks.set(session, newTail);
  await tail;
  try {
    return await fn();
  } finally {
    release();
    if (sessionLocks.get(session) === newTail) {
      sessionLocks.delete(session);
    }
  }
}

/* -------------------------
   Helper: probe GPU adapter info (optional)
   ------------------------- */
export async function probeAdapter(): Promise<unknown | null> {
  if (!("gpu" in navigator)) {
    console.log("[GPU] navigator.gpu not present");
    return null;
  }
  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    console.log("[GPU] adapter:", adapter);
    if (adapter?.requestAdapterInfo) {
      try {
        const info = await adapter.requestAdapterInfo();
        console.log("[GPU] adapter info:", info);
        return info;
      } catch (e) {
        console.warn("[GPU] adapter.requestAdapterInfo() failed:", e);
      }
    }
    return adapter;
  } catch (e) {
    console.error("[GPU] probeAdapter failed:", e);
    return null;
  }
}

function resolvePublicUrl(url: string): string {
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const basePath = (import.meta as any).env?.BASE_URL ?? "/";
  const base = new URL(basePath, window.location.origin);
  return new URL(url.replace(/^\//, ""), base).toString();
}
/* -------------------------
   Core: create session from URL with safe cloning & WebGPU -> WASM fallback
   - Pass an absolute or relative URL to the model file (.ort or .onnx).
   - This function fetches bytes, clones the ArrayBuffer (so a failed WebGPU attempt
     cannot detach the only buffer), then tries WebGPU, falling back to WASM.
   ------------------------- */
export async function loadModelFromUrl(
  modelUrl: string,
  preferWebGPU: boolean = true
): Promise<ort.InferenceSession> {
  const resolvedUrl = resolvePublicUrl(modelUrl);
  console.log("[ORT] fetching model from", resolvedUrl);
  const resp = await fetch(resolvedUrl);
  if (!resp.ok) throw new Error(`Failed to fetch model: ${resp.status} ${resp.statusText}`);
  const bytes = await resp.arrayBuffer();
  console.log("[ORT] fetched model bytes:", bytes.byteLength);

  // clones so a provider that transfers ownership won't detach buffer
  const bytesForWebgpu = bytes.slice(0);
  const bytesForWasm = bytes.slice(0);

  const hasGpu = "gpu" in navigator;
  const tryGpu = preferWebGPU && hasGpu;

  if (preferWebGPU && !hasGpu) {
    throw new Error("WebGPU is not available in this environment (navigator.gpu missing)");
  }

  if (tryGpu) {
    try {
      console.log("[ORT] trying WebGPU provider");
      const sess = await ort.InferenceSession.create(bytesForWebgpu, { executionProviders: ["webgpu", "wasm"], graphOptimizationLevel: "all"});
      console.log("[ORT] WebGPU session created");
      debugSession(sess);
      return sess;
    } catch (webgpuErr) {
      console.error("[ORT] WebGPU session creation FAILED", webgpuErr);
      console.warn("[ORT] falling back to WASM");
    }
  }

  // WASM fallback (or only try wasm)
  try {
    console.log("[ORT] creating session with WASM provider");
    const sessWasm = await ort.InferenceSession.create(bytesForWasm, { executionProviders: ["wasm"], graphOptimizationLevel: "all"});
    (sessWasm as any).__ortProvider = "wasm";
    console.log("[ORT] WASM session created");
    debugSession(sessWasm);
    return sessWasm;
  } catch (wasmErr) {
    console.error("[ORT] WASM session creation FAILED", wasmErr);
    throw wasmErr;
  }
}

/* -------------------------
   Simple smoke test: load model + run on deterministic test image
   ------------------------- */
export async function runEmbeddingSmokeTest(
  modelUrl: string,
  preferWebGPU: boolean = true,
  useSyntheticInput: boolean = false,
  imageUrl?: string
): Promise<void> {
  const session = await loadModelFromUrl(modelUrl, preferWebGPU);
  const provider = (session as any).__ortProvider ?? "unknown";
  console.log(`embedding session created (${provider})`, session);
  let tensor: ort.Tensor;
  if (useSyntheticInput) {
    tensor = createInputTensor();
  } else if (imageUrl) {
    const img = await loadImageFromUrl(imageUrl);
    tensor = preprocessImage(img);
  } else {
    tensor = preprocessImage(generateTestImage());
  }
  const embedding = await getEmbeddingWithFallback(session, tensor, modelUrl, preferWebGPU);
  console.log(`embedding length (${modelUrl}:${provider}): ${embedding.length}`);
  console.log("embedding preview:", Array.from(embedding.slice(0, 8)));
}

/* -------------------------
   Small helper to log session metadata (non-throwing)
   ------------------------- */
function debugSession(session: ort.InferenceSession) {
  try {
    console.log("[ORT] getExecutionProviders():", (session as any).getExecutionProviders?.() ?? (session as any).executionProviders);
    console.log("[ORT] inputMetadata:", session.inputNames.map(n => session.inputMetadata[n]));
    console.log("[ORT] outputMetadata:", session.outputNames.map(n => session.outputMetadata[n]));
  } catch (err) {
    console.warn("[ORT] error querying session metadata:", err);
  }
}

export function preprocessImage(
  source: CanvasImageSource,
  spec: EmbeddingModelSpec = DEFAULT_EMBEDDING_MODEL_SPEC
): ort.Tensor {
  const { inputWidth: width, inputHeight: height, mean, std } = spec;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D canvas context");
  ctx.drawImage(source, 0, 0, width, height);

  const pixels = ctx.getImageData(0, 0, width, height).data;
  const n = width * height;
  const data = new Float32Array(3 * n);

  for (let i = 0; i < n; i++) {
    const j = i * 4;
    data[i] = (pixels[j] / 255 - mean[0]) / std[0];
    data[n + i] = (pixels[j + 1] / 255 - mean[1]) / std[1];
    data[2 * n + i] = (pixels[j + 2] / 255 - mean[2]) / std[2];
  }

  return new ort.Tensor("float32", data, [1, 3, height, width]);
}

/* -------------------------
   Load image from URL (browser)
   ------------------------- */
export async function loadImageFromUrl(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageUrl;
  });
}

/* -------------------------
   Small helper to create a deterministic test image (canvas)
   ------------------------- */
export function generateTestImage(
  width: number = DEFAULT_EMBEDDING_MODEL_SPEC.inputWidth,
  height: number = DEFAULT_EMBEDDING_MODEL_SPEC.inputHeight
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D canvas context");

  const img = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      img.data[i] = x % 256;
      img.data[i + 1] = y % 256;
      img.data[i + 2] = (x + y) % 256;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/* -------------------------
   Create a synthetic input tensor (useful for smoke tests)
   ------------------------- */
export function createInputTensor(
  spec: EmbeddingModelSpec = DEFAULT_EMBEDDING_MODEL_SPEC,
  fillValue: number = 0
): ort.Tensor {
  const { inputWidth: width, inputHeight: height } = spec;
  const data = new Float32Array(1 * 3 * width * height);
  if (fillValue !== 0) data.fill(fillValue);
  return new ort.Tensor("float32", data, [1, 3, height, width]);
}

/* -------------------------
   Run model to get embeddings (and normalize)
   - session: an ort.InferenceSession (returned from loadModelFromUrl)
   - inputTensor: ort.Tensor
   ------------------------- */
export async function getEmbedding(
  session: ort.InferenceSession,
  inputTensor: ort.Tensor,
  spec: EmbeddingModelSpec = DEFAULT_EMBEDDING_MODEL_SPEC
): Promise<Float32Array> {
  // sanity checks
  if (!session) throw new Error("session is required");
  const dims = inputTensor.dims;
  if (
    dims.length !== 4 ||
    dims[1] !== 3 ||
    dims[2] !== spec.inputHeight ||
    dims[3] !== spec.inputWidth
  ) {
    throw new Error(
      `invalid input shape: expected [N, 3, ${spec.inputHeight}, ${spec.inputWidth}], got [${dims}]`
    );
  }

  const feeds: Record<string, ort.Tensor> = { [spec.inputName]: inputTensor };
  const results = await withSessionLock(session, () => session.run(feeds));
  if (!results[spec.outputName]) throw new Error(`model output '${spec.outputName}' not found`);
  const emb = results[spec.outputName].data as Float32Array;

  // L2-normalize (in place)
  let norm = 0;
  for (let i = 0; i < emb.length; i++) norm += emb[i] * emb[i];
  norm = Math.sqrt(norm) + 1e-12;
  for (let i = 0; i < emb.length; i++) emb[i] /= norm;

  return emb;
}

function isWebgpuRuntimeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /webgpu|wgsl|shader|CreateShaderModule|validation/i.test(err.message);
}

export async function getEmbeddingWithFallback(
  session: ort.InferenceSession,
  inputTensor: ort.Tensor,
  modelUrl: string,
  preferWebGPU: boolean,
  spec: EmbeddingModelSpec = DEFAULT_EMBEDDING_MODEL_SPEC
): Promise<Float32Array> {
  try {
    return await getEmbedding(session, inputTensor, spec);
  } catch (err) {
    if (!preferWebGPU || !isWebgpuRuntimeError(err)) throw err;

    console.warn(`[ORT] WebGPU run failed for model ${modelUrl}, retrying with WASM fallback`, err);
    let wasmSession = wasmFallbackSessions.get(modelUrl);
    if (!wasmSession) {
      wasmSession = await loadModelFromUrl(modelUrl, false);
      wasmFallbackSessions.set(modelUrl, wasmSession);
    }
    return getEmbedding(wasmSession, inputTensor, spec);
  }
}

/* -------------------------
   Small debug helpers
   ------------------------- */
export function inspectEmbedding(embedding: Float32Array): void {
  const len = embedding.length;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < len; i++) {
    const v = embedding[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  console.log("embedding inspection:");
  console.log(`dimensions: ${len}`);
  console.log(`range: [${min.toFixed(4)}, ${max.toFixed(4)}]`);
  console.log(`first 5: [${Array.from(embedding.slice(0, 5)).map(v => v.toFixed(4)).join(", ")}]`);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new Error("dimension mismatch");
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
