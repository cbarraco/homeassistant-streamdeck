import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { readdirSync } from "node:fs";
import path from "node:path";
import url from "node:url";

const isWatching = !!process.env.ROLLUP_WATCH;
const sdPlugin = "ca.barraco.carlo.homeassistant.sdPlugin";

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
    input: "plugin/main.ts",
    output: {
        file: `${sdPlugin}/bin/plugin.js`,
        sourcemap: isWatching,
        sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
            return url.pathToFileURL(path.resolve(path.dirname(sourcemapPath), relativeSourcePath)).href;
        }
    },
    plugins: [
        {
            name: "action-autodiscovery",
            load(id) {
                if (!id.endsWith(`plugin${path.sep}actions${path.sep}index.ts`)) return null;
                const actionsDir = path.dirname(id);
                const imports = readdirSync(actionsDir)
                    .filter(f => f.endsWith(".ts") &&
                        f !== "index.ts" &&
                        f !== "base.ts" &&
                        f !== "registry.ts" &&
                        !f.endsWith("Utils.ts"))
                    .map(f => `import "./${f.replace(".ts", "")}";`)
                    .join("\n");
                return `${imports}\nexport { registerActions } from "./registry";\n`;
            },
        },
        {
            name: "watch-externals",
            buildStart: function () {
                this.addWatchFile(`${sdPlugin}/manifest.json`);
            },
        },
        typescript({
            mapRoot: isWatching ? "./" : undefined
        }),
        nodeResolve({
            browser: false,
            exportConditions: ["node"],
            preferBuiltins: true
        }),
        commonjs(),
        !isWatching && terser(),
        {
            name: "emit-module-package-file",
            generateBundle() {
                this.emitFile({ fileName: "package.json", source: `{ "type": "module" }`, type: "asset" });
            }
        }
    ]
};

export default config;
