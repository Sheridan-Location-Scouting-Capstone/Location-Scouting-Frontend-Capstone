import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/auth-session.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.object.name='auth'][object.property.name='api'][property.name='getSession']",
          message:
            "Use getCurrentUser() or requireUser() from @/lib/auth-session.",
        },
      ],
    },
  },
];

export default eslintConfig;
