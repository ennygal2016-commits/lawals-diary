import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      "*.html",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      // The service-role client must never be imported into client components.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["**/supabase/service*"], message: "Server-only. Import from server code only." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/**", "src/app/api/**", "scripts/**", "tests/**"],
    rules: { "no-restricted-imports": "off" },
  },
];

export default config;
