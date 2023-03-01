module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
    },
    plugins: ['@typescript-eslint'],
    ignorePatterns: ['**/*.js', 'test/'],
    rules: {
        '@typescript-eslint/no-empty-interface': ['warn'],
        '@typescript-eslint/await-thenable': ['warn'],
        '@typescript-eslint/no-explicit-any': 'off',
    },
};
