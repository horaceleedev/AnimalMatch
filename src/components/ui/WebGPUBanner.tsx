import { Alert } from "antd";
import { useState } from "react";

export function WebGPUBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <Alert
      type="warning"
      banner
      message={
        <>
          Your browser is not using <strong>WebGPU</strong>, so AI inference will run significantly slower using CPU fallback.
          Consider switching to a compatible browser (e.g. latest Chrome, Edge, or Firefox), or enabling WebGPU, if disabled, in your browser settings.
        </>
      }
      closable
      onClose={() => setDismissed(true)}
    />
  );
}

export default WebGPUBanner;
