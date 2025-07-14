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
    rules: {
      // Disable common annoying rules
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      
      // React rules
      "react-hooks/exhaustive-deps": "off",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      
      // General rules
      "no-console": "off",
      "prefer-const": "off",
      "no-var": "off",
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-redeclare": "off",
      "no-empty": "off",
      "no-constant-condition": "off",
      "no-fallthrough": "off",
      "no-case-declarations": "off",
      "no-useless-escape": "off",
      "no-prototype-builtins": "off",
      "no-async-promise-executor": "off",
      "no-misleading-character-class": "off",
      "no-irregular-whitespace": "off",
      "no-control-regex": "off",
      "no-regex-spaces": "off",
      "no-unsafe-finally": "off",
      "no-unsafe-negation": "off",
      "no-unsafe-optional-chaining": "off",
      "no-unsafe-unary-negation": "off",
      "no-unsafe-assignment": "off",
      "no-unsafe-call": "off",
      "no-unsafe-member-access": "off",
      "no-unsafe-return": "off",
      
      // Next.js rules
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-sync-scripts": "off",
      "@next/next/no-page-custom-font": "off",
      "@next/next/no-css-tags": "off",
      "@next/next/no-head-element": "off",
      "@next/next/no-typos": "off",
      "@next/next/no-unwanted-polyfillio": "off",
      "@next/next/no-before-interactive-script-outside-document": "off",
      "@next/next/no-duplicate-head": "off",
      "@next/next/no-script-component-in-head": "off",
      "@next/next/no-styled-jsx-in-document": "off",
      "@next/next/no-title-in-document-head": "off",
      "@next/next/no-google-font-display": "off",
      "@next/next/no-sync-scripts": "off",
      "@next/next/no-unwanted-polyfillio": "off",
      "@next/next/no-before-interactive-script-outside-document": "off",
      "@next/next/no-duplicate-head": "off",
      "@next/next/no-script-component-in-head": "off",
      "@next/next/no-styled-jsx-in-document": "off",
      "@next/next/no-title-in-document-head": "off",
      "@next/next/no-google-font-display": "off",
    },
  },
];

export default eslintConfig;
