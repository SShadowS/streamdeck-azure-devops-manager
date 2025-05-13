module.exports = {
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": [
    "@typescript-eslint",
    "jest"
  ],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:jest/recommended"
  ],
  "env": {
    "node": true,
    "jest/globals": true
  },
  "rules": {
    // SOLID principles support
    "max-classes-per-file": ["error", 1],  // Encourages Single Responsibility
    "@typescript-eslint/no-explicit-any": "error", // Encourages proper typing
    "@typescript-eslint/explicit-member-accessibility": ["error", { "accessibility": "explicit" }], // Clear access modifiers
    "@typescript-eslint/explicit-function-return-type": ["error", { "allowExpressions": true }], // Clear return types
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "interface",
        "format": ["PascalCase"],
        "custom": {
          "regex": "^I[A-Z]",
          "match": true
        }
      }
    ],
    // Code quality
    "no-console": "warn",
    "eqeqeq": ["error", "always"],
    "curly": "error",
    // Style
    "indent": ["error", 2],
    "quotes": ["error", "single", { "avoidEscape": true }],
    "semi": ["error", "always"]
  }
}
