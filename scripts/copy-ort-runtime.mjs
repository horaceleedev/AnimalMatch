import fs from 'node:fs'
import path from 'node:path'

const files = [
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
]

const srcDir = path.resolve('node_modules/onnxruntime-web/dist')
const destDir = path.resolve('src/assets/onnxruntime')

fs.mkdirSync(destDir, { recursive: true })

for (const file of files) {
  fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file))
}
