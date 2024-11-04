import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./test/setup.js",
    mockReset: true
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "/src": resolve(__dirname, "./src")
    }
  }
});
