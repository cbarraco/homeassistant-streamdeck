import { rm } from "fs/promises";
import { resolve } from "path";
import { spawn } from "child_process";

async function main() {
    const pluginRoot = process.cwd();
    const buildDir = resolve(pluginRoot, "../../build");
    const pluginBundle = resolve(buildDir, "ca.barraco.carlo.homeassistant.streamDeckPlugin");

    await rm(pluginBundle, { force: true }).catch(() => undefined);

    await new Promise((resolvePromise, rejectPromise) => {
        const child = spawn("DistributionTool", ["-b", "-i", pluginRoot, "-o", buildDir], {
            stdio: "inherit",
            shell: process.platform === "win32",
        });
        child.on("close", (code) => {
            if (code === 0) {
                resolvePromise(undefined);
            } else {
                rejectPromise(new Error(`DistributionTool exited with code ${code}`));
            }
        });
        child.on("error", (error) => rejectPromise(error));
    });

    console.log("Created Stream Deck plugin bundle in", buildDir);
}

main().catch((error) => {
    console.error("Failed to package plugin", error);
    process.exit(1);
});
