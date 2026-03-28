import { cp, rm, mkdir } from "fs/promises";
import { resolve } from "path";

const root = process.cwd();
const devDir = resolve(root, "dist", "dev");
const runtimeDir = resolve(root, "dist", "runtime");

async function main() {
    await rm(runtimeDir, { recursive: true, force: true });
    await mkdir(runtimeDir, { recursive: true });
    await cp(devDir, runtimeDir, { recursive: true });
    console.log("Copied dev build to dist/runtime");
}

main().catch((error) => {
    console.error("Failed to copy dev build", error);
    process.exit(1);
});
