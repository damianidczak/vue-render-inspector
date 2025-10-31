import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  // Base JavaScript configuration
  js.configs.recommended,

  // Vue configuration
  ...pluginVue.configs['flat/essential'],

  // Prettier configuration (disables conflicting rules)
  eslintConfigPrettier,

  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      'vite.config.js',
      'vitest.config.js'
    ]
  },

  // Custom rules
  {
    files: ['**/*.{js,mjs,cjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Browser
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        performance: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',

        // Node.js
        process: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',

        // Testing
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',

        // Vue Render Inspector globals
        __VUE_RENDER_INSPECTOR__: 'writable',

        // Vue 3 globals (commonly used in examples)
        ref: 'readonly',
        reactive: 'readonly',
        computed: 'readonly',
        watch: 'readonly',
        watchEffect: 'readonly',
        onMounted: 'readonly',
        onUnmounted: 'readonly',
        h: 'readonly',

        // Common variables in examples and code documentation
        items: 'readonly',
        data: 'readonly',
        props: 'readonly',
        newItem: 'readonly',
        item: 'readonly',
        handler: 'readonly',
        handler1: 'readonly',
        handler2: 'readonly',
        processData: 'readonly',
        largeObject: 'readonly',
        expensiveCalculation: 'readonly',
        anotherObject: 'readonly',
        fetch: 'readonly',
        filteredItems: 'readonly',
        handleChange: 'readonly',
        initializeComponent1: 'readonly',
        initializeComponent2: 'readonly',
        initializeComponent3: 'readonly',
        processComplexObject: 'readonly',
        processedData: 'readonly',
        sortedItems: 'readonly',
        sourceData: 'readonly',
        derivedValue: 'readonly',
        complexObject: 'readonly',
        rawData: 'readonly',
        computeValue: 'readonly',
        processedItems: 'readonly',
        prop1: 'readonly',
        prop2: 'readonly',
        prop3: 'readonly',
        prop4: 'readonly',
        filteredData: 'readonly',
        expensive: 'readonly',
        filtered: 'readonly',
        handleData: 'readonly',
        handler3: 'readonly',
        handler4: 'readonly',
        init1: 'readonly',
        init2: 'readonly',
        init3: 'readonly',
        mapped: 'readonly',
        newData: 'readonly',
        result: 'readonly',
        sorted: 'readonly',
        source: 'readonly',
        sourceValue: 'readonly',
        sortedData: 'readonly',
        selectedItems: 'readonly',
        handleComplexDataChange: 'readonly'
      }
    },
    rules: {
      // Vue specific rules
      'vue/multi-word-component-names': 'off',
      'vue/no-reserved-component-names': 'off',

      // General JavaScript rules
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_'
        }
      ],

      // Best practices
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',

      // ES6+ features
      'arrow-body-style': ['error', 'as-needed'],
      'object-shorthand': ['error', 'always'],
      'no-duplicate-imports': 'error',

      // Allow certain patterns
      'no-prototype-builtins': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  }
]
