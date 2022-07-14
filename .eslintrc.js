module.exports = {
  extends: [
    "@remix-run/eslint-config",
    "@remix-run/eslint-config/node",
    "@remix-run/eslint-config/internal",
  ],
  rules: {
    "import/order": ["error", { "newlines-between": "always" }],
  },
};
