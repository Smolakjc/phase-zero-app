import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@phase-zero/shared": path.resolve(__dirname, "packages/shared/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: [
      "packages/*/src/__tests__/**/*.test.ts",
      "backend/src/__tests__/**/*.test.ts",
      "frontend/__tests__/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "frontend/e2e/**"],
  },
});

