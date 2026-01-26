import { useState } from "react";
import { Alert } from "antd";

export function WebGPUBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <Alert
      type="warning"
      banner
      message={
        <>
          Your browser isn’t using <strong>WebGPU</strong>, so AI features may run slower than expected.
          For better performance, switch to a supported browser (e.g. the latest version of Chrome, Edge, or Firefox)
          or <a href="https://enablegpu.com" target="_blank" rel="noopener noreferrer">enable WebGPU in your browser settings</a>.
        </>
      }
      closable
      onClose={() => setDismissed(true)}
    />
  );
}

export default WebGPUBanner;
