// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import { importX } from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import globals from 'globals';

export default defineConfig([
  // ============================================================
  // Global ignores
  // ============================================================
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.svelte-kit/**',
      '**/.wrangler/**',
      '**/coverage/**',
      '**/generated/**',
      '**/*.d.ts',
      '**/*.js', // composite build outputs (not config files)
    ],
  },

  // ============================================================
  // TypeScript source files (NOT .svelte)
  // Explicit project array — each file is matched to its
  // nearest tsconfig. Root configs and test files fall back
  // to tsconfig.eslint.json.
  // ============================================================
  {
    files: ['**/*.{ts,mts,cts}'],
    ignores: ['**/*.svelte.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: [
          './tsconfig.eslint.json',
          './apps/*/tsconfig.json',
          './apps/*/test/tsconfig.json',
          './packages/*/tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ============================================================
  // JavaScript config files (not type-checked)
  // ============================================================
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
  },

  // ============================================================
  // Import rules (order, duplicates, extensions, resolvability)
  // ============================================================
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    extends: [importX.flatConfigs.recommended, importX.flatConfigs.typescript],
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: [
            './tsconfig.eslint.json',
            './apps/*/tsconfig.json',
            './apps/*/.svelte-kit/tsconfig.json',
            './apps/*/test/tsconfig.json',
            './packages/*/tsconfig.json',
          ],
        }),
      ],
    },
    rules: {
      // tseslint re-exports configs as named exports; the import is intentional
      'import-x/no-named-as-default-member': 'off',
    },
  },

  // ============================================================
  // Svelte files (.svelte + companion .svelte.js / .svelte.ts)
  // svelte.configs.recommended already sets svelte-eslint-parser
  // and handles <script lang="ts"> internally.
  // Do NOT add tseslint.configs here — it overrides the parser.
  // ============================================================
  {
    files: ['**/*.svelte', '**/*.svelte.js', '**/*.svelte.ts'],
    extends: [svelte.configs.recommended],
    languageOptions: {
      parserOptions: {
        extraFileExtensions: ['.svelte'],
        svelteFeatures: { runes: true },
        parser: tseslint.parser,
        projectService: {
          defaultProject: 'tsconfig.eslint.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // ============================================================
  // Svelte-specific: suppress TS rules that fire incorrectly
  // inside { } template expressions
  // ============================================================
  {
    files: ['**/*.svelte'],
    settings: {
      svelte: {
        ignoreWarnings: [
          '@typescript-eslint/no-unsafe-assignment',
          '@typescript-eslint/no-unsafe-member-access',
        ],
      },
    },
  },

  // ============================================================
  // Test files: disable rules that fail on virtual modules
  // (cloudflare:test) and SELF global
  // ============================================================
  {
    files: ['**/test/**', '**/tests/**', '**/__tests__/**', '**/__mocks__/**'],
    rules: {
      'import-x/no-unresolved': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },

  // ============================================================
  // Web source: $lib SvelteKit alias not resolved by import resolver.
  // TypeScript (tsc -b) already validates these imports.
  // The no-unsafe-* errors cascade from the unresolved $lib imports
  // (the type checker types them as `error` type).
  // ============================================================
  {
    files: ['apps/web/src/**/*.ts'],
    rules: {
      'import-x/no-unresolved': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
]);
