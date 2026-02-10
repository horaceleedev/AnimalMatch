import { useEffect, useState } from "react";

// Hook that checks if WebGPU is supported in the current browser
export function useWebGPU() {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const hasAPI = typeof navigator !== "undefined" && "gpu" in navigator;

    if (!hasAPI) {
      setSupported(false);
      return;
    }

    navigator.gpu!.requestAdapter()
      .then(adapter => setSupported(!!adapter))
      .catch(() => setSupported(false));
  }, []);

  return supported;
}
