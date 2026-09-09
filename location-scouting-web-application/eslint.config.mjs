import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
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
