/* eslint-env node */

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
    extraFileExtensions: ['.svelte']
  },
  plugins: ['@typescript-eslint', 'svelte', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:svelte/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  overrides: [
    {
      files: ['*.svelte'],
      parser: 'svelte-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.svelte'],
        sourceType: 'module',
        ecmaVersion: 'latest'
      }
    }
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.json', './tsconfig.node.json']
      }
    }
  },
  env: {
    browser: true,
    es2022: true
  },
  rules: {
    'import/no-unresolved': 'off'
  }
};


