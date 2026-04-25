import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  // Browser + Node globals for all files
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022, ...globals.node },
    },
  },

  // Vue 3 recommended rules (includes vue-eslint-parser for .vue files)
  ...pluginVue.configs['flat/recommended'],

  // TypeScript recommended rules
  ...tsPlugin.configs['flat/recommended'],

  // Project-specific overrides for .ts and .vue sources
  {
    files: ['src/**/*.{ts,vue}', 'tests/**/*.{ts,vue}'],
    plugins: { '@typescript-eslint': tsPlugin },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
]
