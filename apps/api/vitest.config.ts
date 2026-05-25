import { defineConfig } from "vitest/config";

/**
 * Config por defecto (`npm test`): unit tests.
 * Los tests de integracion viven en `*.integration.test.ts` y usan su
 * propio config (`vitest.integration.config.ts`).
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["**/*.integration.test.ts", "node_modules/**", "dist/**"],
  },
});
