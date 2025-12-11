import { Alert } from "antd";
import { useState } from "react";

export function WebGPUBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <Alert
      type="error"
      banner
      message={
        <>
          Your browser does not support <strong>WebGPU</strong>.
          Consider switching to a compatible browser (e.g. latest Chrome, Edge, or Firefox), or enabling WebGPU in your browser settings.
        </>
      }
      closable
      onClose={() => setDismissed(true)}
    />
  );
}

export default WebGPUBanner;