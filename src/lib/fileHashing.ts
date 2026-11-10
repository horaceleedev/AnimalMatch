export const sampleHashByteLimit = 1024 * 1024;

const arrayBufferToHex = (buffer: ArrayBuffer) => (
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
);

export const hashFileSample = async (file: File, byteLimit = sampleHashByteLimit) => {
  const bytesToHash = Math.min(file.size, byteLimit);
  const fileHead = await file.slice(0, bytesToHash).arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", fileHead);

  return {
    hash: arrayBufferToHex(hash),
    bytesHashed: bytesToHash,
  };
};
