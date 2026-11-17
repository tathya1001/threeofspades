import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        // The game server, shared rules and tests are plain CommonJS run by Node.
        files: ["server/**/*.js", "shared/**/*.js", "test/**/*.js"],
        languageOptions: {
            sourceType: "commonjs",
            globals: globals.node,
        },
        rules: {
            "@typescript-eslint/no-require-imports": "off",
        },
    },
    globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
])

export default eslintConfig
