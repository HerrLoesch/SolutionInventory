import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  eslintConfigPrettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // Vite build-time constant, see vite.config.js
        __APP_VERSION__: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      // Vuetify's own slot-prop convention (`#item="{ props }"`, `#activator="{ props }"`)
      // is used throughout this codebase and always shadows an unrelated `props` — the
      // destructured slot prop and defineProps()'s `props` never interact.
      'vue/no-template-shadow': 'off'
    }
  },
  {
    files: ['tests/**/*.js', 'electron/**/*.js', '*.config.js', 'cucumber.js'],
    languageOptions: {
      globals: { ...globals.node }
    }
  },
  {
    files: ['tests/**/*.spec.js'],
    languageOptions: {
      globals: { ...globals.vitest }
    }
  },
  {
    ignores: ['dist/**', 'release/**', 'node_modules/**', 'cucumber-report.html', 'test-results/**']
  }
]
