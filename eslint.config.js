// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import n from "eslint-plugin-n";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default [
  // 1) Ignorados (artefactos, generados y este propio archivo)
  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      "coverage/",
      "artifacts/",
      "cache/",
      "out/",
      "typechain*/",
      "types/ethers-contracts/**",
      "**/*.d.ts",
      "eslint.config.*",
    ],
  },

  // 2) Base JS y TS (sin type-check para velocidad/estabilidad)
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3) Plugin de imports recomendado
  importPlugin.flatConfigs.recommended,

  // 4) Entorno Node + resolvers + módulos especiales (Hardhat)
  {
    plugins: { n },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node, // habilita process, console, __dirname, etc.
      },
    },
    settings: {
      // Cómo resolver imports
      "import/resolver": {
        node: { extensions: [".js", ".cjs", ".mjs", ".ts"] },
        typescript: { alwaysTryTypes: true },
      },
      // Paquetes a tratar como "core modules" (no intentar resolver ruta)
      "import/core-modules": [
        "hardhat",
        "hardhat/config",
        "@nomicfoundation/hardhat-ethers",
        "@nomicfoundation/hardhat-toolbox-mocha-ethers",
        "@nomicfoundation/hardhat-verify",
        "@nomicfoundation/hardhat-verify/verify",
      ],
    },
    rules: {
      "n/no-missing-import": "off",
      "n/no-unsupported-features/es-syntax": "off",
      "import/order": [
        "warn",
        {
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
        },
      ],
    },
  },

  // 5) Reglas SOLO para TypeScript
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // 6) Reglas SOLO para JavaScript (no aplicar reglas TS en .js)
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  // 7) Tests (Mocha): habilitar globals y relajar algunas reglas
  {
    files: ["test/**/*.{js,ts,tsx}", "tests/**/*.{js,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha, // describe, it, before, after...
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-empty": "off",
    },
  },

  // 8) Scripts/CLI/Configs de Hardhat: permitir console, etc.
  {
    files: ["hardhat.config.{js,ts}", "scripts/**/*.{js,ts,mjs,cjs}", "tasks/**/*.{js,ts,mjs,cjs}"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
      "no-empty": "off",
    },
  },

  // 9) Desactivar choques con Prettier
  eslintConfigPrettier,
];
