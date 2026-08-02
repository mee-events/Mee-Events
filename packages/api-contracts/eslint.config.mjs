import sharedConfig from "../shared-types/eslint.config.mjs";

export default [
  {
    ignores: ["dist/**", "build/**", "coverage/**"],
  },
  ...sharedConfig,
];
