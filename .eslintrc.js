module.exports = {
    root: true,
    env: {
        node: true
    },
    parser: 'vue-eslint-parser',
    parserOptions: {
        parser: '@typescript-eslint/parser',
        sourceType: "module"
    },
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'plugin:vue/vue3-strongly-recommended',
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ],
    rules: {
        "vue/html-indent": ["error", 4, {}]
    }
};