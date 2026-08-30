// ESLint 9 flat config.
//
// Replaces .eslintrc.json: the eslintrc format is frozen and ESLint 8 stopped
// receiving fixes in October 2024, which meant no modern plugin could be added
// to this project. Flat config is a plain JS module -- the config *is* the
// array ESLint runs, so there is no `extends` resolution to reason about.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Replaces "ignorePatterns". Must be its own object to apply globally.
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // Allow the deliberate `_req` / `_next` convention the Express error
      // handler needs -- previously suppressed with an inline eslint-disable.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Controllers hand rows straight to res.json(); `any` there is a real
      // smell worth seeing, but not worth failing a learning build over.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  {
    files: ['tests/**/*.ts'],
    languageOptions: { globals: { ...globals.jest } },
  },

  // jest.config.js is CommonJS. Without this block ESLint parses it as an ES
  // module and reports `module is not defined` -- a real error the eslintrc
  // setup never surfaced because `env.node` applied to every file at once.
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
  },
);
