import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The integration tests talk to the Supabase dev project from .env.local and skip when it isn't set.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  // tsconfig keeps JSX as-is for Next.js; tests (email templates) need it compiled.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Lets unit tests import server modules; the real guard still protects the Next.js build.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts", "src/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
