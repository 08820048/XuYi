import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-config-next 16.4 / eslint-plugin-react-hooks 7 引入的 React Compiler 适配规则。
    // 它们指出的是「写法可以更适配编译器」，不是缺陷；既有代码（尤其 NovelEditor）暂按警告处理，
    // 后续逐步整理后再恢复为 error。
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build artifacts:
    ".open-next/**",
    ".wrangler/**",
    "worker-configuration.d.ts",
    // Companion tools in /ecosystem ship vendored or generated files that
    // should be linted within their own package context instead of the app root.
    "ecosystem/chrome-clipper/lib/**",
    "ecosystem/obsidian-publisher/main.js",
  ]),
]);

export default eslintConfig;
