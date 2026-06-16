import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    pool: "threads",
    poolOptions: {
      threads: { singleThread: true },
    },
    exclude: [
      "**/node_modules/**",
      "**/e2e/**", // Exclude Playwright E2E tests
      "components/projects/__tests__/clip-edit-bugs.exploration.test.tsx",
    ],
    coverage: {
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["lib/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/node_modules/**",
        "**/e2e/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
