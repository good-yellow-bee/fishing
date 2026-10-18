/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Libraries get chunks of their own, so a release that only changes the app's code leaves them
        // in the phone's cache and a returning player downloads the new app code alone.
        manualChunks(id) {
          // Vite's preload helper and Rollup's CommonJS helpers would otherwise land in the lake chunk and drag it into every page.
          if (id.includes("vite/preload-helper") || id.includes("commonjsHelpers")) return "libs";
          if (!id.includes("/node_modules/")) return undefined;
          // three.js and the React bindings with everything they bring, loaded only with the lake.
          if (/\/node_modules\/(three|three-[^/]+|@react-three\/[^/]+|troika-[^/]+|camera-controls|maath|meshline|stats-gl|@monogrid\/[^/]+|zustand|suspend-react|its-fine|react-use-measure|tunnel-rat|@use-gesture\/[^/]+|detect-gpu|hls\.js|@mediapipe\/[^/]+|use-sync-external-store|webgl-[^/]+|bidi-js|require-from-string)\//.test(id)) return "lake-libs";
          return "libs";
        },
      },
    },
  },
  test: {
    // Tests switch to Polish synchronously, so the lazily loaded Polish book is in place before each file runs.
    setupFiles: ["./src/testSetup.ts"],
  },
  optimizeDeps: {
    exclude: ["@stillwater/shared"],
  },
});
