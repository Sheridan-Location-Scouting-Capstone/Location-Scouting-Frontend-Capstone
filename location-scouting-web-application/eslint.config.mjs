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
        {
          selector:
            "JSXAttribute[name.name='href'][value.value=/src\\/app|location-scouting-web-application/]",
          message:
            "hrefs are routes, not file paths. Drop everything up to and including\n the route group, e.g. /productions/new",
        },
        {
          selector:
            "JSXAttribute[name.name='href'] > JSXExpressionContainer > TemplateLiteral[quasis.0.value.raw=/src\\/app|location-scouting-web-application/]",
          message:
            "hrefs are routes, not file paths. Drop everything up to and including\n the route group, e.g. /productions/new",
        },
      ],
    },
  },
];

export default eslintConfig;
