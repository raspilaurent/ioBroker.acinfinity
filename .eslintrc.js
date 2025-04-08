module.exports = {
    root: true,
    env: {
        node: true,
        es6: true,
        mocha: true
    },
    extends: [
        "eslint:recommended"
    ],
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: "module"
    },
    rules: {
        indent: ["error", 4, { SwitchCase: 1 }],
        "no-console": "off",
        quotes: ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],
        semi: ["error", "always"]
    }
};