module.exports = {
    env: {
        browser: true,
        es2021: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script'
    },
    globals: {
        'Telegram': 'readonly',
        'Tone': 'readonly',
        'GameConfig': 'readonly',
        'wordDictionaries': 'readonly',
        'WordGame': 'readonly'
    },
    rules: {
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'no-unused-vars': 'warn',
        'no-console': 'off',
        'no-alert': 'warn',
        'prefer-const': 'error',
        'no-var': 'error',
        'eqeqeq': 'error',
        'no-trailing-spaces': 'error',
        'comma-dangle': ['error', 'never'],
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never'],
        'space-before-function-paren': ['error', 'never'],
        'keyword-spacing': 'error',
        'space-infix-ops': 'error',
        'no-multiple-empty-lines': ['error', { 'max': 2 }],
        'max-len': ['warn', { 'code': 120 }]
    }
};
