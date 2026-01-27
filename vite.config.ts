import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from "vite-plugin-svgr";
import tsconfigPaths from 'vite-tsconfig-paths'

function wasmMimeTypePlugin(): Plugin {
  return {
    name: 'wasm-mime-type',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), svgr({
    svgrOptions: {
      icon: true,
      svgProps: {
        /* Custom override for Material Symbols. The original viewBox was "0 -960 960 960".
        This was overridden to make the Material Symbols icons look a bit larger as they were
        previously smaller than the Ant Icons
        */
        viewBox: "40 -920 880 880"
      }
    }
  }), tsconfigPaths(), wasmMimeTypePlugin()]
})
