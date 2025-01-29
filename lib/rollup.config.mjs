import { createRequire } from "node:module";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { dts } from "rollup-plugin-dts";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

const tsconfig = "./tsconfig.json";
const include = ["src/**/*.ts"];

const banner = `/**
 * Fluid v${pkg.version}
 * Copyright ${new Date().getFullYear()} ${pkg.author}
 * @license MIT
 */`;

/** @type {import('rollup').RollupOptions[]} **/
export default [
  {
    input: "src/index.ts",
    output: [
      {
        // dir: "dist",
        format: "esm",
        file: "dist/esm/index.mjs",
        sourcemap: true,
      },
      {
        format: "cjs",
        file: "dist/cjs/index.cjs",
        sourcemap: true,
      },
    ],
    external:['three'],
    plugins: [
      typescript({ tsconfig, include }),
      terser({ format: { comments: false, preamble: banner } }),
    ],
  },
  {
    input: "./src/index.ts",
    output: [{ file: "dist/index.d.ts", format: "es" }],
    external:['three'],
    plugins: [dts()],
  },
];