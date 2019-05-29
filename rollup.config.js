import typescript from "rollup-plugin-typescript2";

const defaults = (from, to) => ({
  input: from,
  output: {
    file: to,
    format: "iife",
    preferConst: true,
    globals: {
      "classes": "classes",
    },
  },
  external: [ "classes" ],

  plugins: [ typescript() ],
});

export default [
  defaults("src/computercraft/client/index.ts", "src/behaviours/scripts/client/client.js"),
  defaults("src/computercraft/server/index.ts", "src/behaviours/scripts/server/server.js"),
  defaults("src/computercraft/ui/index.ts", "src/resources/experimental_ui/cct_gui.js"),
];
