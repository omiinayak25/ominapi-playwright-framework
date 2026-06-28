// =============================================================================
// eslint.config.mjs — Static analysis rules (ESLint 9 "flat config")
// -----------------------------------------------------------------------------
// WHY IT EXISTS:
//   ESLint enforces code QUALITY and consistency that a formatter (Prettier)
//   cannot — e.g. banning `any`, requiring `await` on floating promises,
//   forbidding `console.log`. This scales team discipline automatically.
//
// WHY FLAT CONFIG:
//   `.eslintrc` is deprecated. ESLint 9 uses this `eslint.config.mjs` array
//   format: each object is a layer applied in order. It is the current standard.
//
// HOW IT WORKS:
//   We compose recommended rule sets from `typescript-eslint`, then add our own
//   overrides, then let `eslint-config-prettier` turn OFF any stylistic rules
//   that would fight Prettier (so the two tools never conflict).
// =============================================================================
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // 1) Files/dirs ESLint should never look at.
  {
    ignores: [
      'node_modules',
      'dist',
      'playwright-report',
      'test-results',
      'allure-results',
    ],
  },

  // 2) TypeScript recommended rules WITH type information (most powerful tier).
  ...tseslint.configs.recommendedTypeChecked,

  // 3) Project-specific rules & parser wiring.
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        // Lets type-aware rules read the real types from tsconfig.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The master prompt's #1 rule: avoid `any`. Warn so prototyping isn't blocked.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Forces you to handle/await every Promise — kills silent async bugs.
      '@typescript-eslint/no-floating-promises': 'error',

      // Catches `await`-ing a non-Promise (a common copy-paste mistake).
      '@typescript-eslint/await-thenable': 'error',

      // Prefer `import type { X }` for type-only imports (smaller output, clarity).
      '@typescript-eslint/consistent-type-imports': 'error',

      // Unused vars are errors, but allow intentional `_`-prefixed throwaways.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Use the framework Logger instead of raw console (set up in src/utils).
      'no-console': 'warn',
    },
  },

  // 4) Config/build files run in Node and don't need type-aware linting.
  {
    files: ['*.mjs', '*.config.ts'],
    ...tseslint.configs.disableTypeChecked,
  },

  // 5) MUST be last: disables formatting rules so Prettier owns formatting.
  prettierConfig,
);
