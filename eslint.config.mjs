import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import importPlugin from 'eslint-plugin-import';

// The project predates the strict react-hooks / no-explicit-any rules that
// `eslint-config-next@16` enables. The previous `eslint-config-next@^0.2.4`
// pin never exported these flat-config rules, so they were never enforced and
// the existing codebase uses `any` pervasively. Downgrade them to warnings so
// `npm run lint` / `next build` can complete while the issues remain visible.
const legacyBaselineRules = {
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-hooks/set-state-in-effect': 'warn',
    'react-hooks/static-components': 'warn',
    'react-hooks/refs': 'warn',
    'react-hooks/immutability': 'warn',
    'react-hooks/purity': 'warn',
    'react-hooks/rules-of-hooks': 'warn',
    'react/no-unescaped-entities': 'warn',
    'prefer-const': 'warn',
  },
};

// eslint-config-next already bundles `eslint-plugin-jsx-a11y` and the react
// hooks rules; here we additionally enable import ordering (warn) so imports
// stay consistent without blocking the build. `no-explicit-any` stays a warn
// (not error) deliberately — promoting it to error is tracked in GAP 3.2/3.6
// and would currently fail the build given 96+ existing `any` usages.
const importRules = {
  plugins: { import: importPlugin },
  rules: {
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'never',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  legacyBaselineRules,
  importRules,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
  ]),
]);

export default eslintConfig;
