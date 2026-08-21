# @connectsw/eslint-config

Shared ESLint configuration for all ConnectSW products.

## Usage

Install the package and its peer dependencies:

```bash
npm install --save-dev @connectsw/eslint-config eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-config-prettier eslint-plugin-prettier
```

In your `.eslintrc.js` or `eslint.config.js`:

```js
// .eslintrc.js
module.exports = {
  extends: ['@connectsw/eslint-config'],
  // Add product-specific overrides here
};
```

## What's Included

- TypeScript parser (`@typescript-eslint/parser`)
- TypeScript rules (`@typescript-eslint/recommended`)
- Prettier integration (`eslint-config-prettier` + `eslint-plugin-prettier`)
- Relaxed rules for test files (`*.test.ts`, `*.spec.ts`)

## Customizing

Override any rule in your product's `.eslintrc.js`:

```js
module.exports = {
  extends: ['@connectsw/eslint-config'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off', // if needed for legacy code
  },
};
```
