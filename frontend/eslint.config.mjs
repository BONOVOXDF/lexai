import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Regra nova/agressiva do React 19 que marca padrões comuns de
      // carregamento (setMounted(true) no efeito, fetch inicial) como erro.
      "react-hooks/set-state-in-effect": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "out/**", "next-env.d.ts"]),
]);
