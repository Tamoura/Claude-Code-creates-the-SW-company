// Article XIV: products lint with the shared config, not a bespoke one.
module.exports = {
  root: true,
  extends: ['@connectsw/eslint-config/backend'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['dist/', 'node_modules/', 'prisma/', 'tests/'],
};
